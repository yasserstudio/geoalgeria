#!/usr/bin/env node
/**
 * Build @geoalgeria/enseignement-superieur: Algeria's higher-education network
 * (universities, grandes écoles, écoles normales supérieures, centres
 * universitaires) from the Ministère de l'Enseignement Supérieur (MESRS), and
 * emit JSON, CSV, and GeoJSON to ../data.
 *
 * Source (public): https://www.mesrs.dz/en/university-network/  (see mesrs.mjs)
 *   The ministry's listing gives each institution's official French name and its
 *   own website, but NO coordinates and no address. So this build supplies the
 *   geography itself, transparently:
 *
 *   - wilaya + commune come from the flagship `geoalgeria` dataset: every shipped
 *     coordinate is reconciled to its nearest flagship commune, and `wilaya_code`
 *     is that commune's, authoritative and in the 69-wilaya scheme.
 *   - coordinates are OSM/Nominatim campus geocodes captured once into
 *     scripts/seeds/coordinates.json (run `node scripts/geocode.mjs` to refresh).
 *     Each is cross-checked: if the geocoded point's wilaya disagrees with the
 *     wilaya named in the institution's title, the geocode is rejected and the
 *     record falls back to the wilaya centroid. `geo_precision` records which
 *     placement each row got: "campus" (geocoded point), or "wilaya" (centroid
 *     fallback). Names remain 100% MESRS; coordinates are a labelled enrichment.
 *
 * Usage: node scripts/fetch.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  MIGRATIONS, writePackageV2, resolveDates, carryOverIds, readCommitted, readRetiredIds,
  readRetiredMigrations, forwardRetiredId,
} from "../../../scripts/lib/v2-transforms.mjs";
import { captureMeta } from "../../../scripts/lib/source-store.mjs";
import { OWNER_CONFIRMATION_KM, COPY_RADIUS_M, AGREEMENT_KM } from "../../../scripts/review/thresholds.mjs";
import { metresBetween } from "../../../scripts/lib/seat-evidence.mjs";
import { PAGE, getHtml, parseInstitutions, instKey, classifyType, MIN_EXPECTED } from "./mesrs.mjs";
import { getHtmlAr, anchoredNamesAr, parseExtras, buildResolver, classifyTypeAr, PAGE_AR } from "./mesrs-ar.mjs";
import { PAGE_BAC, readBacInstitutions, assertBacName, bacSnapshot } from "./bac-2026.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const REF = join(__dirname, "..", "..", "dataset", "data", "geojson");
const DATASET = join(__dirname, "..", "..", "dataset", "data");
const SEED = join(__dirname, "seeds", "coordinates.json");
const SECOND_SOURCE_FILE = join(__dirname, "seeds", "second-source.json");
const OVERRIDES_FILE = join(__dirname, "seeds", "overrides.json");
const COMMUNE_LABELS_FILE = join(__dirname, "seeds", "commune-labels.json");
const BAC_SEED_FILE = join(__dirname, "seeds", "bac-2026.json");

// At least this share of records must carry a real campus geocode, else the build
// is assumed degraded (a missing/empty coordinate seed, or a geocode regression)
// and fails rather than silently shipping an all-centroid dataset. Headroom: the
// healthy build is ~55% campus.
const MIN_CAMPUS_RATIO = 0.4;

// Read a committed seed file, failing with the file path on corruption (vs a bare
// SyntaxError): keeps the loud-and-clear failure style of the rest of the build.
function readSeed(path) {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`${path}: corrupt seed JSON: ${e.message}`);
  }
}

// The captures behind each declared metadata source, so a source's `retrieved` is
// read off the capture manifest rather than typed into the config twice. `mesrs`
// covers the two listing captures and is only as fresh as the older of them. A
// missing capture or a capture with no date fails the build, because the
// alternative is publishing the run's date as a receipt for bytes nobody read.
const SOURCE_CAPTURES = { mesrs: ["mesrs-en", "mesrs-ar"], "bac-2026": ["bac-2026"] };
function datedSources(sources) {
  return sources.map((s) => {
    const captures = SOURCE_CAPTURES[s.key];
    if (!captures)
      throw new Error(`metadata source "${s.key}" has no capture behind it; add one to SOURCE_CAPTURES`);
    const dates = captures.map((name) => {
      const { retrieved } = captureMeta("enseignement-superieur", name) ?? {};
      if (!retrieved)
        throw new Error(`sources/enseignement-superieur/${name}.json: the capture manifest states no retrieved date`);
      return retrieved;
    });
    return { ...s, retrieved: dates.sort()[0] };
  });
}

// Algeria's bounding box (matches the repo's other geocoded validators). An exact
// 0 on either axis is a placeholder, not a real reading.
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat !== 0 && lng !== 0 && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

// The stable key a record's public id is pinned to across refreshes. The MESRS
// sources publish no id, so the website host is the natural one: each institution
// has its own. The 48 Arabic-only establishments publish no site, so they key on
// the Arabic name the ministry lists them under, and a record with neither keys on
// its French name. Verified unique over all committed records by the build below
// and, independently, by carryOverIds, which refuses a key that pins two records.
const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
};
export function carryKey(r) {
  const h = hostOf(r.website);
  if (h) return `host:${h}`;
  if (r.name_ar) return `ar:${r.name_ar}`;
  return r.name ? `fr:${r.name}` : null;
}

// --- flagship geo reference -------------------------------------------------
const communeFC = JSON.parse(readFileSync(join(REF, "communes.geojson"), "utf8"));
const COMMUNES = communeFC.features
  .map((f) => ({
    lat: f.geometry?.coordinates?.[1],
    lng: f.geometry?.coordinates?.[0],
    code: Number(f.properties?.wilaya_code),
    name: f.properties?.name_fr,
  }))
  .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));

const wilayaFC = JSON.parse(readFileSync(join(REF, "wilayas.geojson"), "utf8"));
const WILAYA = new Map(); // code -> { name_fr, lat, lng }
for (const f of wilayaFC.features) {
  const code = Number(f.properties?.code);
  const [lng, lat] = f.geometry?.coordinates || [];
  WILAYA.set(code, { name_fr: f.properties?.name_fr, lat, lng });
}

// Place→wilaya text resolver. Matches the institution name against WILAYA NAMES
// only (not all 1,528 communes): wilaya names are distinctive and rarely appear
// as an honorific, so this stays free of the eponym false-matches that scanning
// every commune would invite ("Université de Béjaïa" → 06, but "…– Saad Dahlab"
// matches nothing). Used as a cross-check on each geocode and as the fallback.
const normTok = (s) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const WILAYA_BY_NAME = new Map();
for (const [code, w] of WILAYA) {
  const n = normTok(w.name_fr);
  if (n) WILAYA_BY_NAME.set(n, code);
}
function wilayaFromName(name) {
  const toks = normTok(name).split(" ").filter(Boolean);
  for (let i = toks.length; i > 0; i--) {
    for (let len = Math.min(3, i); len >= 1; len--) {
      const phrase = toks.slice(i - len, i).join(" ");
      if (WILAYA_BY_NAME.has(phrase)) return WILAYA_BY_NAME.get(phrase);
    }
  }
  return null;
}

// Commune lookup by (name, wilaya_code) for the curated overrides: resolves a
// hand-asserted commune to its flagship centroid + code (so override coordinates
// are still the authoritative flagship data, never typed by hand).
const COMMUNE_BY_NW = new Map();
for (const c of COMMUNES) COMMUNE_BY_NW.set(`${normTok(c.name)}|${c.code}`, c);
const communeByName = (name, code) => COMMUNE_BY_NW.get(`${normTok(name)}|${Number(code)}`) || null;

const toRad = (d) => (d * Math.PI) / 180;
function nearestCommune(lat, lng) {
  let best = null, bd = Infinity;
  for (const c of COMMUNES) {
    const x = toRad(lng - c.lng) * Math.cos(toRad((lat + c.lat) / 2));
    const y = toRad(lat - c.lat);
    const d = x * x + y * y;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// docs/adr/0001: a campus point is exact on two independent Votes, and the open
// OpenStreetMap object is the one that ships. The second Vote is either an Owner
// reading (rule 6: off a proprietary map it may only confirm, within
// OWNER_CONFIRMATION_KM) or a Wikidata P625 (rule 3: within AGREEMENT_KM). Either
// a Wikidata P625 within COPY_RADIUS_M of the point is a Copied claim and casts no
// Vote; an Owner reading never is (ADR 0001, "Rule 6 in detail"). A recorded
// distance that is not the measured one is refused, so the seed cannot say more
// than its numbers. Returns how many second Votes the place carries.
const SECOND_VOTES = {
  owner_confirmation: { keys: ["point", "read_at", "read_by", "source", "confirms"], ceilingM: OWNER_CONFIRMATION_KM * 1000, copyRadiusM: 0 },
  wikidata_confirmation: { keys: ["item", "point", "read_at", "confirms"], ceilingM: AGREEMENT_KM * 1000, copyRadiusM: COPY_RADIUS_M },
};
function secondVotes(where, p) {
  let n = 0;
  for (const [field, rule] of Object.entries(SECOND_VOTES)) {
    const v = p[field];
    if (!v) continue;
    for (const k of rule.keys) if (v[k] == null) throw new Error(`${where}: ${field} needs ${k}`);
    if (v.confirms !== p.osm) throw new Error(`${where}: ${field} confirms ${v.confirms}, the point is ${p.osm}`);
    const [cLng, cLat] = v.point;
    const apart = metresBetween(cLng, cLat, p.lng, p.lat);
    if (!(apart < rule.ceilingM))
      throw new Error(`${where}: ${field} is ${Math.round(apart)} m from the point, past the ${rule.ceilingM} m ceiling`);
    if (rule.copyRadiusM && !(apart > rule.copyRadiusM))
      throw new Error(`${where}: ${field} is ${Math.round(apart)} m from the point, a Copied claim (within ${rule.copyRadiusM} m)`);
    if (Math.round(apart) !== v.metres_from_published_value)
      throw new Error(`${where}: ${field} says ${v.metres_from_published_value} m, it is ${Math.round(apart)} m`);
    n++;
  }
  return n;
}

// A campus placement as a seed states it: the OSM object's point, the wilaya the
// seed expects it to join, and optionally the commune its outline contains where
// the nearest-centre join answers a neighbour (the label moves, never the point,
// and never across a wilaya boundary).
function campusPlace(where, p) {
  if (!inAlgeria(p.lat, p.lng)) throw new Error(`${where}: campus coordinate is not a reading inside Algeria`);
  // docs/adr/0001 rule 6 as amended 2026-10-29: where no open object confirms
  // it, the Owner's own pin ships as the coordinate, its provenance stated.
  if (p.owner_pin) {
    for (const k of ["read_at", "read_by", "source", "entry"])
      if (p.owner_pin[k] == null) throw new Error(`${where}: owner_pin needs ${k}`);
    if (p.osm != null) throw new Error(`${where}: an owner_pin placement has no OSM object; one that confirms it ships instead`);
    const nc = nearestCommune(p.lat, p.lng);
    if (!nc) throw new Error(`${where}: owner pin joins no flagship commune`);
    if (p.wilaya_code != null && Number(p.wilaya_code) !== nc.code)
      throw new Error(`${where}: owner pin joins wilaya ${nc.code}, seed says ${p.wilaya_code}`);
    let commune = nc.name;
    if (p.commune != null) {
      const c = communeByName(p.commune, nc.code);
      if (!c) throw new Error(`${where}: commune "${p.commune}" does not resolve inside wilaya ${nc.code}`);
      commune = c.name;
    }
    return { lat: p.lat, lng: p.lng, wilaya_code: nc.code, commune, precision: "campus", votes: 1, ownerPin: true };
  }
  if (!/^(node|way|relation)\/\d+$/.test(String(p.osm)) || !Number.isInteger(p.osm_version) || !p.osm_timestamp)
    throw new Error(`${where}: a campus coordinate needs its OSM object as osm/osm_version/osm_timestamp`);
  const nc = nearestCommune(p.lat, p.lng);
  if (!nc) throw new Error(`${where}: campus coordinate joins no flagship commune`);
  // The seed names the wilaya it expects; a point that joins another one is a
  // transcription error, not a new fact, so the build stops.
  if (p.wilaya_code != null && Number(p.wilaya_code) !== nc.code)
    throw new Error(`${where}: campus coordinate joins wilaya ${nc.code}, seed says ${p.wilaya_code}`);
  let commune = nc.name;
  if (p.commune != null) {
    const c = communeByName(p.commune, nc.code);
    if (!c) throw new Error(`${where}: commune "${p.commune}" does not resolve inside wilaya ${nc.code}`);
    commune = c.name;
  }
  return { lat: p.lat, lng: p.lng, wilaya_code: nc.code, commune, precision: "campus", votes: 1 + secondVotes(where, p) };
}

// --- main -------------------------------------------------------------------
async function main() {
  console.log("Fetching MESRS university network…");
  const html = await getHtml();
  const insts = parseInstitutions(html);
  if (insts.length < MIN_EXPECTED) {
    throw new Error(`parsed ${insts.length} institutions; expected >= ${MIN_EXPECTED}: the listing markup may have changed`);
  }
  console.log(`  parsed ${insts.length} institutions`);

  // The ministry's BAC 2026 placement file, as the committed rights-safe
  // projection of its institution rows (scripts/bac-2026.mjs). It is the second
  // identity source: it renames two establishments the university-network
  // listing still carries under their old names, and it holds institutions that
  // listing omits entirely. Names are never typed in the seed, only re-accented:
  // assertBacName refuses one that is not the ministry's own row for that code.
  const bac = readBacInstitutions();
  const bacSeed = readSeed(BAC_SEED_FILE);

  // A listed name as this package would publish it: the listing writes an en dash
  // where a published name takes " - ", and no tracked file here may carry one
  // (AGENTS.md, "Don't"). Used to assert the name a seed rule expects to find,
  // rather than assume it, so a rule the ministry has overtaken fails the build
  // instead of silently overwriting a newer name or dropping a live record.
  const asPublished = (s) => String(s).replace(/\s*[\u2013\u2014]\s*/g, " - ");
  const assertListed = (where, key, expect) => {
    const i = insts.findIndex((inst) => instKey(inst) === key);
    if (i < 0) throw new Error(`${where}: no listed institution has key ${key}`);
    if (asPublished(insts[i].name) !== asPublished(expect))
      throw new Error(`${where}: expected the listing to still say\n  ${expect}\nbut it says\n  ${insts[i].name}`);
    return i;
  };

  // 1. Renames. Keyed by instKey (website host), so the record keeps its website
  //    and therefore its carried id: a rename moves a name, never a join key.
  let nRenamed = 0;
  for (const [code, rule] of Object.entries(bacSeed.renames ?? {})) {
    const where = `seeds/bac-2026.json renames.${code}`;
    assertBacName(code, rule.name, bac, where);
    const inst = insts[assertListed(where, rule.key, rule.expect)];
    inst.name = rule.name;
    Object.assign(inst, classifyType(rule.name));
    // The listing supplies the record, the placement file its current name, so
    // the record cites both: the composite form writePackageV2 checks against
    // metadata.sources[].
    inst.source_key = "mesrs+bac-2026";
    nRenamed++;
  }

  // 1b. Successions. An establishment the placement file names and the listing
  //     still carries as the predecessors a decree dissolved into it. Unlike a
  //     rename, this is not one record's name moving: the predecessors leave the
  //     listing here, the successor is built from the placement file below, and
  //     each predecessor's published id is retired and forwarded to it after the
  //     ids settle, so a consumer holding an old join key arrives at the record
  //     that carries the establishment now. Three records for one school, which
  //     is what the stale listing would otherwise produce, is the thing this
  //     prevents.
  const successions = [];
  for (const [code, rule] of Object.entries(bacSeed.successions ?? {})) {
    const where = `seeds/bac-2026.json successions.${code}`;
    assertBacName(code, rule.name, bac, where, rule.source_spelling ?? null);
    if (!rule.supersedes?.length)
      throw new Error(`${where}: a succession must name at least one superseded listed institution`);
    const superseded = [];
    for (const pred of rule.supersedes) {
      const i = assertListed(where, pred.key, pred.expect);
      superseded.push(insts[i]);
      insts.splice(i, 1);
    }
    successions.push({ code, rule, where, superseded });
  }

  const seed = readSeed(SEED);
  if (!Object.keys(seed).length) {
    console.warn("  ⚠️  no coordinate seed found: run `node scripts/geocode.mjs` first (the MIN_CAMPUS_RATIO guard below will fail this build)");
  }
  // Curated overrides for institutions Nominatim can't find AND whose title names
  // no wilaya (mostly Algiers/Koléa grandes écoles named by discipline). Each
  // asserts a commune (resolved to its flagship centroid) or, where the exact
  // commune is uncertain, just a wilaya. Keyed by instKey (website host).
  const overrides = readSeed(OVERRIDES_FILE);
  // Commune-label corrections for campus-precise geocodes: the nearest-centre
  // join below can label a campus with the neighbouring commune when its own
  // commune's centre is farther away. These re-label without moving the point.
  const communeLabels = readSeed(COMMUNE_LABELS_FILE);

  // Arabic listing: the Arabic name for the network (joined on website host) plus
  // the private + other-ministry institutions the English page omits entirely.
  console.log("Fetching MESRS Arabic listing (name_ar + private/other-ministry)…");
  const htmlAr = await getHtmlAr();
  const namesAr = anchoredNamesAr(htmlAr);
  const wilayasJson = JSON.parse(readFileSync(join(DATASET, "wilayas.json"), "utf8")).wilayas;
  const resolve = buildResolver(wilayasJson);
  const { extras, unresolved } = parseExtras(htmlAr, resolve);
  if (unresolved.length) console.warn(`  ⚠️  ${unresolved.length} extra(s) had no resolvable wilaya: ${unresolved.join("; ")}`);
  const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; } };

  // Campus points on two independent Votes (docs/adr/0001), for records the
  // Nominatim seed and the overrides do not hold that way: the open OSM object
  // that ships, plus the second Vote that makes it exact. Keyed by carryKey, so
  // it also reaches the Arabic-only extras, and it takes precedence over every
  // other placement. An entry no record reads is refused below, so a record that
  // leaves the sources cannot leave a stale point behind.
  const secondSource = readSeed(SECOND_SOURCE_FILE);
  const usedSecond = new Set();
  const fromSecondSource = (key, expectWilaya) => {
    const p = secondSource[key];
    if (!p) return null;
    usedSecond.add(key);
    const where = `seeds/second-source.json ${key}`;
    // The seed must say which wilaya it means, so a point copied onto the wrong
    // record fails here instead of relabelling it.
    if (p.wilaya_code == null) throw new Error(`${where}: a second-source placement needs its wilaya_code`);
    const pl = campusPlace(where, p);
    if (pl.votes < 2 && !pl.ownerPin) throw new Error(`${where}: a second-source placement needs its second Vote`);
    if (expectWilaya != null && pl.wilaya_code !== expectWilaya)
      throw new Error(`${where}: the point joins wilaya ${pl.wilaya_code}, the record says ${expectWilaya}`);
    return pl;
  };

  const records = [];
  const dropped = [];
  let nReject = 0; // geocodes rejected for landing in the wrong wilaya

  for (const inst of insts) {
    const nameW = wilayaFromName(inst.name); // cross-check / fallback
    const key = instKey(inst);
    const g = seed[key];
    let lat = null, lng = null, wilaya_code = null, commune = null, precision = null;
    const h0 = host(inst.website);

    // 0. A campus point on two independent Votes (seeds/second-source.json).
    // Expected wilaya: the one the title names, else the one the curated override
    // asserts, so a record whose name carries no wilaya is still checked.
    const ss = fromSecondSource(
      carryKey({ website: inst.website, name_ar: (h0 && namesAr.get(h0)) || null, name: inst.name }),
      nameW ?? (overrides[key]?.wilaya_code != null ? Number(overrides[key].wilaya_code) : null),
    );
    if (ss) ({ lat, lng, wilaya_code, commune, precision } = ss);

    // 1. Curated override: a commune (→ flagship centroid) or a bare wilaya. Takes
    // precedence over the Nominatim geocode (a two-Vote point above outranks
    // both): it both places the schools OSM can't find and CORRECTS the few
    // discipline-only names that geocode to a same-named school in another wilaya.
    if (wilaya_code == null && overrides[key]) {
      const ov = overrides[key];
      const c = ov.commune ? communeByName(ov.commune, ov.wilaya_code) : null;
      if (c) {
        lat = c.lat; lng = c.lng; wilaya_code = c.code; commune = c.name; precision = "commune";
      } else if (ov.wilaya_code != null && WILAYA.has(Number(ov.wilaya_code))) {
        const w = WILAYA.get(Number(ov.wilaya_code));
        lat = w.lat; lng = w.lng; wilaya_code = Number(ov.wilaya_code); commune = null; precision = "wilaya";
      }
    }

    // 2. Trusted campus geocode (rejected if it lands in a different wilaya than the title names).
    if (wilaya_code == null && g && inAlgeria(g.lat, g.lng)) {
      const nc = nearestCommune(g.lat, g.lng);
      if (nc && (!nameW || nameW === nc.code)) {
        lat = g.lat; lng = g.lng; wilaya_code = nc.code; commune = nc.name; precision = "campus";
        // Hand-verified commune label (seeds/commune-labels.json): keeps the
        // exact campus point and its precision, only the label changes, and
        // never across a wilaya boundary.
        const cl = communeLabels[key];
        if (cl) {
          const c = communeByName(cl.commune, cl.wilaya_code);
          if (c && c.code === wilaya_code) {
            commune = c.name;
          } else {
            console.warn(`  ⚠️  commune-label for ${key} ignored: ${cl.commune} (${cl.wilaya_code}) does not resolve inside wilaya ${wilaya_code}`);
          }
        }
      } else if (nc && nameW && nameW !== nc.code) {
        nReject++; // geocode disagrees with the named wilaya → don't trust it
      }
    }

    // 3. Wilaya named in the title → its centroid.
    if (wilaya_code == null && nameW != null) {
      const w = WILAYA.get(nameW);
      if (w && inAlgeria(w.lat, w.lng)) {
        lat = w.lat; lng = w.lng; wilaya_code = nameW; commune = null; precision = "wilaya";
      }
    }

    if (wilaya_code == null) {
      dropped.push(`${inst.name} [${key}]`); // no geocode, override, or named wilaya
      continue;
    }

    const h = host(inst.website);
    records.push({
      name: inst.name,
      name_ar: (h && namesAr.get(h)) || null,
      type: inst.type,
      type_fr: inst.type_fr,
      sector: "public",
      supervisory_ministry: null,
      website: inst.website,
      commune,
      wilaya_code: String(wilaya_code).padStart(2, "0"),
      wilaya_name: WILAYA.get(wilaya_code)?.name_fr ?? null,
      lat,
      lng,
      geo_precision: precision,
      source: PAGE,
      source_key: inst.source_key ?? null,
    });
  }

  // The private + other-ministry institutions (Arabic-only). No coordinates in the
  // source, so each is placed at its resolved wilaya's centroid (geo_precision
  // "wilaya"). name stays null: there is no official French name to ship.
  const networkCount = records.length;
  for (const e of extras) {
    const code = Number(e.wilaya_code);
    const w = WILAYA.get(code);
    if (!w || !inAlgeria(w.lat, w.lng)) { dropped.push(`${e.name_ar} [no wilaya centroid]`); continue; }
    const { type, type_fr } = classifyTypeAr(e.name_ar);
    const ss = fromSecondSource(carryKey({ website: e.website, name_ar: e.name_ar, name: null }), code);
    records.push({
      name: null,
      name_ar: e.name_ar,
      type,
      type_fr,
      sector: e.sector,
      supervisory_ministry: e.supervisory_ministry,
      website: e.website,
      commune: ss ? ss.commune : null,
      wilaya_code: String(code).padStart(2, "0"),
      wilaya_name: w.name_fr,
      lat: ss ? ss.lat : w.lat,
      lng: ss ? ss.lng : w.lng,
      geo_precision: ss ? "campus" : "wilaya",
      source: PAGE_AR,
    });
  }
  console.log(`  added ${records.length - networkCount} private/other-ministry institutions`);
  const unusedSecond = Object.keys(secondSource).filter((k) => !k.startsWith("_") && !usedSecond.has(k));
  if (unusedSecond.length)
    throw new Error(`seeds/second-source.json: no record reads ${unusedSecond.join(", ")}`);

  // 2. The institutions the BAC 2026 file holds and the university-network
  //    listing omits. The French name is the ministry's own row (assertBacName);
  //    the seed adds only what the placement file has no column for: the Arabic
  //    name as its institution or Wikidata publishes it, the website, the
  //    supervising ministry and the placement.
  //
  //    Placement follows docs/adr/0001: a "campus" entry carries the open
  //    coordinate of that institution's OWN OpenStreetMap object with the id,
  //    version and timestamp it was read at, and nothing else is accepted as
  //    exact; otherwise the record lands on its commune's or wilaya's flagship
  //    centroid with the reason recorded in the seed.
  //
  //    A succession's successor is built here too: it is a placement-file record
  //    like any other, with the same name, Arabic-name and placement rules. What
  //    is particular to it is only what step 1b did (its predecessors left the
  //    listing) and what the ledger does below (their ids forward to it).
  const bacCount = records.length;
  const bacEntries = [
    ...Object.entries(bacSeed.additions ?? {}).map(([code, add]) => ({
      code, add, where: `seeds/bac-2026.json additions.${code}`,
    })),
    ...successions.map((s) => ({ code: s.code, add: s.rule, where: s.where })),
  ];
  for (const { code, add, where } of bacEntries) {
    assertBacName(code, add.name, bac, where, add.source_spelling ?? null);
    const p = add.place ?? {};
    let lat = null, lng = null, wilaya_code = null, commune = null, precision = null;
    if (p.precision === "campus") {
      let votes, ownerPin;
      ({ lat, lng, wilaya_code, commune, precision, votes, ownerPin } = campusPlace(where, p));
      // Every campus point this file supplies is held to docs/adr/0001 in full:
      // its OSM object and a second independent Vote, or it is not exact.
      if (votes < 2 && !ownerPin) throw new Error(`${where}: a campus point needs a second Vote (owner_confirmation or wikidata_confirmation) or an owner_pin`);
    } else if (p.precision === "commune") {
      const c = communeByName(p.commune, p.wilaya_code);
      if (!c) throw new Error(`${where}: commune "${p.commune}" does not resolve inside wilaya ${p.wilaya_code}`);
      lat = c.lat; lng = c.lng; wilaya_code = c.code; commune = c.name; precision = "commune";
    } else if (p.precision === "wilaya") {
      const w = WILAYA.get(Number(p.wilaya_code));
      if (!w || !inAlgeria(w.lat, w.lng)) throw new Error(`${where}: wilaya ${p.wilaya_code} has no centroid`);
      lat = w.lat; lng = w.lng; wilaya_code = Number(p.wilaya_code); precision = "wilaya";
    } else {
      throw new Error(`${where}: place.precision must be campus, commune or wilaya`);
    }
    const { type, type_fr } = classifyType(add.name);
    records.push({
      name: add.name,
      name_ar: add.name_ar ?? null,
      type,
      type_fr,
      sector: add.sector ?? "public",
      supervisory_ministry: add.supervisory_ministry ?? null,
      website: add.website ?? null,
      commune,
      wilaya_code: String(wilaya_code).padStart(2, "0"),
      wilaya_name: WILAYA.get(wilaya_code)?.name_fr ?? null,
      lat,
      lng,
      geo_precision: precision,
      source: PAGE_BAC,
      source_key: "bac-2026",
      // Only a succession's successor carries this, so the ledger below can find
      // the record each retired predecessor forwards to without matching on name.
      succession: successions.find((s) => s.code === code) ?? null,
    });
  }
  console.log(
    `  added ${records.length - bacCount} institutions from the BAC 2026 file, renamed ${nRenamed}` +
      `, superseded ${successions.reduce((n, s) => n + s.superseded.length, 0)} listed record(s) by ${successions.length} successor(s)`,
  );

  // Sort by type then name, so the listing reads the way it always has.
  const TYPE_ORDER = { universite: 0, grande_ecole: 1, ens: 2, centre_universitaire: 3 };
  const sortName = (r) => r.name || r.name_ar || "";
  records.sort((a, b) => (TYPE_ORDER[a.type] - TYPE_ORDER[b.type]) || sortName(a).localeCompare(sortName(b), "fr"));

  // Stable ids. The sort position is NOT the id: inserting one institution mid
  // sequence would otherwise renumber every record after it and repoint every
  // published join key. Each record is pinned to the id it shipped under, keyed
  // on the same stable key carryOverIds uses below, and a genuinely new record
  // is minted above every id the package has ever used (live or retired), so a
  // new record can never land on a reserved slot.
  const committed = readCommitted(DATA, "institutions.json");
  const retiredIds = readRetiredIds(DATA);
  const retiredMigrations = readRetiredMigrations(DATA);
  const idByKey = new Map(committed.map((r) => [carryKey(r), String(r.id)]));
  const reserved = new Set([...retiredIds, ...committed.map((r) => String(r.id))].map(String));
  // Every id this package has ever issued is a zero-padded integer, and the mint
  // below counts above the largest of them. A non-numeric one would not be
  // counted, so a new record could be handed it: refuse instead of risking it.
  const unparsable = [...reserved].filter((id) => !/^\d+$/.test(id));
  if (unparsable.length)
    throw new Error(`reserved id(s) are not numeric, so a new id cannot be minted above them: ${unparsable.join(", ")}`);
  let nextId = reserved.size ? Math.max(...[...reserved].map(Number)) : 0;
  for (const r of records) {
    const was = idByKey.get(carryKey(r));
    if (was != null) { r.id = Number(was); continue; }
    r.id = ++nextId;
    if (reserved.has(String(r.id).padStart(5, "0")))
      throw new Error(`minted id ${r.id} is reserved; the mint must stay above every published and retired id`);
  }

  // Guards: fail loudly on a malformed build. Every record must carry at least one
  // name (French for the network, Arabic for the extras).
  const missing = records.filter((r) => (!r.name && !r.name_ar) || !r.type || !r.wilaya_code || !r.wilaya_name || r.lat == null || r.lng == null);
  if (missing.length) throw new Error(`${missing.length} record(s) missing a required field (${missing.slice(0, 3).map((r) => r.name || r.name_ar).join("; ")})`);
  const overflow = records.filter((r) => Number(r.wilaya_code) < 1 || Number(r.wilaya_code) > 69);
  if (overflow.length) throw new Error(`wilaya_code out of [1,69]: ${overflow.length} record(s)`);

  // The campus-geocode quality guard applies only to the public MESRS network: the
  // private/other-ministry extras are wilaya-precision by nature (no source coords),
  // so they're excluded from the ratio to keep the guard meaningful.
  const networkRecords = records.filter((r) => r.source === PAGE);
  const campus = networkRecords.filter((r) => r.geo_precision === "campus").length;
  if (campus < networkRecords.length * MIN_CAMPUS_RATIO) {
    throw new Error(
      `only ${campus}/${networkRecords.length} network records are campus-geocoded (< ${Math.round(MIN_CAMPUS_RATIO * 100)}%): ` +
        `regenerate the coordinate seed with \`node scripts/geocode.mjs\` before building`,
    );
  }

  // --- emit v2 via the shared writer ---
  const cfg = MIGRATIONS["enseignement-superieur"];
  // A --cache replay reproduces the committed dates: the source was NOT
  // re-fetched, so claiming today as `retrieved` would be a false receipt.
  // Only a live pull moves the dates (resolveDates, the shared rule).
  const { updated, retrieved } = resolveDates(
    DATA,
    process.argv.includes("--cache"),
  );
  const rows = records.map(cfg.map);
  // The shared id-stability contract (v2 decision 10/11): pin every still-present
  // record back to the id it shipped under, reserve the id of one that is gone,
  // and refuse a duplicated carry key or a duplicated id. The ids above are
  // already the carried ones, so this is the check that proves it rather than a
  // second assignment.
  carryOverIds(rows, committed, carryKey, "enseignement-superieur", retiredIds);

  // The decree's successions, in the ledger. carryOverIds has already reserved
  // each superseded record's id, because its carry key is no longer in the data;
  // what it cannot know is that the record did not disappear but was folded into
  // another one, so each is forwarded here. `rows` is `records` mapped one for
  // one and in the same order, which is what links a successor's row back to the
  // listed institutions it replaced.
  for (const [i, r] of records.entries()) {
    if (!r.succession) continue;
    const heir = String(rows[i].id);
    const { superseded, rule, where } = r.succession;
    for (const pred of superseded) {
      const was = idByKey.get(carryKey({ name: pred.name, name_ar: null, website: pred.website }));
      if (was == null) {
        // A replay: an earlier run already retired and forwarded this id, so the
        // committed data holds the heir and no longer the predecessor.
        if (committed.some((c) => String(c.id) === heir)) continue;
        throw new Error(`${where}: ${instKey(pred)} holds no published id, so there is nothing to forward`);
      }
      if (!retiredIds.has(was))
        throw new Error(`${where}: ${was} was not retired by carry-over; its carry key is still live`);
      const others = superseded.filter((p) => p !== pred).map((p) => p.name);
      forwardRetiredId(
        retiredMigrations,
        was,
        heir,
        `Merged into ${heir}, ${rule.name}, which carries this establishment now` +
          (others.length ? `, as it does ${others.join(" and ")}` : "") +
          `. ${rule.why}`,
      );
    }
  }

  const { records: out, metadata } = writePackageV2({
    pkg: "enseignement-superieur",
    dir: DATA,
    files: [{ file: "institutions.json", rows }],
    meta: { ...cfg.meta, sources: datedSources(cfg.meta.sources) },
    // The placement file's own bytes, so a published name can be checked against
    // the exact document it was read off without the PDF being redistributed.
    snapshots: { "bac-2026": bacSnapshot() },
    updated,
    retrieved,
    retiredIds,
    retiredMigrations,
  });

  console.log(`\nType breakdown:`);
  for (const [k, v] of Object.entries(metadata.by_type).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`);
  console.log(`Precision: ${Object.entries(metadata.by_geo_method).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  if (nReject) console.log(`Rejected ${nReject} geocode(s) that landed in the wrong wilaya (placed at the named wilaya's centroid).`);
  if (dropped.length) console.log(`Dropped ${dropped.length} unplaceable record(s): ${dropped.join("; ")}`);
  console.log(`\nWrote ${out.length} institutions across ${metadata.wilayas_covered} wilayas (all placed; ${campus} campus-geocoded) to ${DATA} (v2).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
