#!/usr/bin/env node
/**
 * Second-pass campus geocoder: match MESRS institutions that Nominatim's
 * name search missed (geocode.mjs) against OpenStreetMap's own
 * amenity=university|college features in Algeria.
 *
 * Nominatim indexes few of these écoles under their official MESRS French
 * name, but the campuses themselves are widely mapped — often under a short
 * form, an acronym, or an Arabic name. So: pull every DZ university/college
 * feature once (captured to sources/enseignement-superieur/osm-campuses.json),
 * token-match the un-seeded MESRS names against name/name:fr/official_name/
 * alt_name/name:ar, and print a scored proposal table.
 *
 * Nothing touches the committed seed unless --apply is passed, and then only
 * proposals at or above MIN_SCORE land; every applied entry records the OSM
 * element id and matched name in `term` so a match is auditable later.
 * fetch.mjs independently cross-checks every seed coordinate against the
 * wilaya named in the institution's title, so a wrong match with a wilaya in
 * the name is rejected downstream rather than shipped.
 *
 * Run:  node scripts/geocode-osm.mjs            # propose only (uses captures via --cache semantics)
 *       node scripts/geocode-osm.mjs --apply    # write accepted matches into seeds/coordinates.json
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getHtml, parseInstitutions, instKey, UA } from "./mesrs.mjs";
import { writeCapture, readCapture, captureMeta } from "../../../scripts/lib/source-store.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED = join(__dirname, "seeds", "coordinates.json");
const APPLY = process.argv.includes("--apply");
const OFFLINE = process.argv.includes("--cache");

// Accept a proposal only at/above this score. Deliberately draconian: the
// first propose-only run showed that anything softer accepts eponym-only and
// subject-only matches (a CFPA named after the same figure, a same-discipline
// département in another wilaya). 1.0 = every significant MESRS token present
// on the OSM side; score() additionally requires >=2 tokens and rejects
// school-type mismatches outright.
const MIN_SCORE = 1.0;

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const QUERY = `[out:json][timeout:120];
area["ISO3166-1"="DZ"][admin_level=2]->.dz;
nwr["amenity"~"^(university|college)$"](area.dz);
out center tags;`;

async function fetchCampuses() {
  if (OFFLINE) return readCapture("enseignement-superieur", "osm-campuses").elements;
  for (const ep of ENDPOINTS) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "User-Agent": `geoalgeria-data/1.0 (+https://geoalgeria.com) ${UA}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(QUERY),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json.elements) || json.elements.length < 500)
        throw new Error(`only ${json.elements?.length ?? 0} elements (truncated?)`);
      writeCapture(
        "enseignement-superieur",
        "osm-campuses",
        { ...json, elements: [...json.elements].sort((a, b) => a.type.localeCompare(b.type) || a.id - b.id) },
        { url: ep, records: json.elements.length },
      );
      return json.elements;
    } catch (e) {
      console.warn(`  ${ep}: ${e.message}; trying next…`);
    }
  }
  throw new Error("all Overpass endpoints failed");
}

// Accent-fold, lowercase, split; keep only tokens that discriminate.
const STOP = new Set([
  "ecole", "superieure", "superieur", "nationale", "national", "normale", "institut",
  "universite", "university", "centre", "universitaire", "de", "des", "du", "la", "le",
  "les", "et", "en", "d", "l", "ex", "the", "of", "college",
]);
export function tokens(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, " ")
    .split(" ")
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

// Wilaya/city words that, when present in the MESRS name, MUST appear on the
// OSM side too — a subject-only overlap ("informatique") must never relocate a
// school to another city's campus.
const PLACES = new Set(
  JSON.parse(readFileSync(join(__dirname, "..", "..", "dataset", "data", "wilayas.json"), "utf8"))
    .wilayas.flatMap((w) => tokens(`${w.name_fr} ${w.name_en} ${w.name_ar}`)),
);

// An OSM feature whose name marks it as one of these can never be a MESRS
// higher-education campus, whatever its token overlap — the first run matched
// a CFPA and a lycée purely through shared eponyms.
const WRONG_TYPE = /\b(cfpa|lyc[ée]e|cem\b|coll[èe]ge|primaire|متوسطة|ثانوية|ابتدائية|مركز التكوين)/i;

function score(mesrsName, tags) {
  const m = tokens(mesrsName);
  // Fewer than 2 significant tokens can't identify an institution (a bare
  // place name matches the whole city's campus soup).
  if (m.length < 2) return { s: 0 };
  const allNames = ["name", "name:fr", "name:en", "name:ar", "official_name", "alt_name", "short_name"]
    .map((k) => tags[k])
    .filter(Boolean);
  if (allNames.some((n) => WRONG_TYPE.test(n))) return { s: 0 };
  const osm = new Set(allNames.flatMap((n) => tokens(n)));
  const mPlaces = m.filter((t) => PLACES.has(t));
  if (mPlaces.length && !mPlaces.some((t) => osm.has(t))) return { s: 0 };
  // A placeless name needs 3+ identifying tokens: a 2-token subject pair
  // ("sciences politiques") matches a same-discipline département in any city.
  if (!mPlaces.length && m.length < 3) return { s: 0 };
  const hit = m.filter((t) => osm.has(t));
  return { s: hit.length / m.length, hit };
}

async function main() {
  const html = await getHtml();
  const insts = parseInstitutions(html);
  const seed = existsSync(SEED) ? JSON.parse(readFileSync(SEED, "utf8")) : {};
  const unseeded = insts.filter((i) => !seed[instKey(i)]);
  console.log(`${insts.length} institutions, ${unseeded.length} without a campus geocode.`);

  const campuses = (await fetchCampuses()).filter((e) => e.tags && (e.lat ?? e.center?.lat) != null);
  const meta = captureMeta("enseignement-superieur", "osm-campuses");
  console.log(`${campuses.length} OSM campus features (retrieved ${meta?.retrieved}).\n`);

  let applied = 0;
  for (const inst of unseeded) {
    let best = null;
    for (const e of campuses) {
      const { s } = score(inst.name, e.tags);
      if (s > (best?.s ?? 0)) best = { s, e };
    }
    if (!best || best.s <= 0) {
      console.log(`  ✗ ${inst.name}  →  no candidate`);
      continue;
    }
    const t = best.e.tags;
    const lat = best.e.lat ?? best.e.center.lat;
    const lng = best.e.lon ?? best.e.center.lon;
    const label = t.name || t["name:fr"] || t["name:ar"];
    const mark = best.s >= MIN_SCORE ? "✓" : "~";
    console.log(`  ${mark} [${best.s.toFixed(2)}] ${inst.name}\n        ↳ ${label}  (${best.e.type}/${best.e.id}  ${lat.toFixed(5)},${lng.toFixed(5)})`);
    if (APPLY && best.s >= MIN_SCORE) {
      seed[instKey(inst)] = {
        lat, lng,
        state: null,
        display_name: label,
        term: `osm-match ${best.e.type}/${best.e.id} score=${best.s.toFixed(2)}`,
        name: inst.name,
      };
      applied++;
    }
  }
  if (APPLY) {
    writeFileSync(SEED, JSON.stringify(seed, null, 2) + "\n");
    console.log(`\nApplied ${applied} match(es) ≥ ${MIN_SCORE} to seeds/coordinates.json.`);
  } else {
    console.log(`\nPropose-only run (nothing written). Re-run with --apply to accept ✓ matches.`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
