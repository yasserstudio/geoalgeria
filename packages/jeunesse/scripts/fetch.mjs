#!/usr/bin/env node
/**
 * Fetch Algeria's youth establishments from the MJS GeoServer (kharitaDZ) and
 * emit JSON, CSV, and GeoJSON to ../data.
 *
 * Source: https://sig.mjs.gov.dz/dashboard/viewer
 *   The MJS (Ministry of Youth and Sports) runs a GeoServer behind a
 *   Nuxt dashboard. The "etablissements_de_jeunes" WMS layer is publicly
 *   queryable. We request all features as GeoJSON via the WMS GetMap endpoint
 *   (format=application/json;type=geojson), which bypasses the auth-gated WFS.
 *   This is the same official GIS that backs @geoalgeria/sports; the two are
 *   sister packages (sports infrastructure vs. youth establishments).
 *
 * v2 note: earlier releases sourced the ministry's public Arabic map. This build
 * moves to the authoritative GeoServer, more records (~2,300) and far richer
 * fields (capacity, address, PMR accessibility, operational status, built/land
 * area, reception year). The GeoServer publishes names in French; the Arabic
 * names from the legacy source are backfilled by nearest-neighbour geo-match
 * (scripts/seeds/names_ar.json) into `name_ar` where a confident match exists.
 *
 * Wilaya names from the source are French (all-caps, no diacritics). We resolve
 * them to numeric wilaya_code using a normalisation map built from the flagship
 * dataset's 69 wilayas.
 *
 * The GeoServer answers only from an Algerian vantage point, so every pull is
 * captured under sources/jeunesse/ and the package rebuilds from that capture
 * offline. The capture's exact shape: scripts/lib/mjs-sig.mjs.
 *
 * Usage: node scripts/fetch.mjs
 *        node scripts/fetch.mjs --cache    # rebuild from sources/jeunesse/sig-etablissements.json
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MIGRATIONS, writePackageV2, carryOverIds, readCommitted, readRetiredIds } from "../../../scripts/lib/v2-transforms.mjs";
import { fetchMjsLayer, readMjsCapture, MJS_SOURCE } from "../../../scripts/lib/mjs-sig.mjs";
import { captureMeta } from "../../../scripts/lib/source-store.mjs";
import { foldNameDashes, withoutEmDash } from "../../../scripts/lib/no-em-dash.mjs";
import { pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const DATASET = join(__dirname, "..", "..", "dataset", "data");
const NAMES_AR_SEED = join(__dirname, "seeds", "names_ar.json");

const LAYER = "etablissements_de_jeunes";
const CAPTURE = "sig-etablissements";
const SOURCE = MJS_SOURCE;

const MIN_EXPECTED = 1800;

// Backfill tolerance: an Arabic name is grafted onto a French record only when a
// legacy point sits within this many metres. Tight enough to avoid cross-labelling
// neighbours in dense urban clusters; loose enough to absorb the two sources'
// modest coordinate disagreement on the same site.
const NAME_AR_MAX_M = 200;

// The legacy map and this GIS use different type vocabularies. To avoid grafting a
// different kind of facility's Arabic name onto a record (a maison de jeunes sitting
// next to a salle polyvalente), a match must also be type-compatible: each new
// type code accepts only its legacy equivalent(s). New types with no legacy
// counterpart (FJ, BA) never match, so they stay `name_ar: null`. The legacy seed
// also carries CLJ (clubs de jeunes) and PAL (piscines) codes, which this layer
// doesn't publish: they have no new-type counterpart and are intentionally unused.
const LEGACY_TYPES_FOR = {
  MJ: ["MJ"], CSP: ["CS"], SPA: ["SPA"], AJ: ["AJ"],
  CJ: ["CJ"], CLS: ["CLS"], FJ: [], CC: ["CC"], BA: [],
};

// The MJS youth-establishment types: short, stable keys for the 9 the source
// publishes on this layer. `fr` is the cleaned French label; `ar` is an
// indicative Arabic label for non-French consumers (the per-record `name_ar`
// carries the institution's own Arabic name where matched).
const TYPE_MAP = {
  "Maison de Jeunes": { code: "MJ", fr: "Maison de jeunes", ar: "دار الشباب" },
  "Complexe Sportif de Proximite": { code: "CSP", fr: "Complexe sportif de proximité", ar: "مركب رياضي جواري" },
  "Salle Polyvalente": { code: "SPA", fr: "Salle polyvalente", ar: "قاعة متعددة الرياضات" },
  "Auberge de Jeunes": { code: "AJ", fr: "Auberge de jeunes", ar: "نزل الشباب" },
  "Camp de jeunes": { code: "CJ", fr: "Camp de jeunes", ar: "مخيم الشباب" },
  "Centre de Loisir Scientifique": { code: "CLS", fr: "Centre de loisirs scientifiques", ar: "مركز الترفيه العلمي" },
  "Foyer de Jeunes": { code: "FJ", fr: "Foyer de jeunes", ar: "نادي الشباب" },
  "Centre culturel": { code: "CC", fr: "Centre culturel", ar: "مركز ثقافي" },
  "Bloc d'accueil": { code: "BA", fr: "Bloc d'accueil", ar: "كتلة استقبال" },
};

// Wilaya name normalisation: MJS uses uppercase ASCII French; the flagship uses
// accented Title Case. We strip diacritics and case to match.
function buildWilayaMap() {
  const wilayas = JSON.parse(readFileSync(join(DATASET, "wilayas.json"), "utf-8")).wilayas;
  const map = {};
  for (const w of wilayas) {
    map[normalise(w.name_fr)] = String(w.code).padStart(2, "0");
  }
  return map;
}

function normalise(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// MJS uses variant names for some new wilayas; map them to the flagship form.
const WILAYA_ALIASES = {
  "AIN SALAH": "IN SALAH",
  "AIN GUEZZAM": "IN GUEZZAM",
  "EL MEGHAIER": "EL M GHAIR",
  "EL MENIA": "EL MENIAA",
};

// Algeria bounding box. An exact 0 on either axis is a placeholder, not a reading.
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat !== 0 && lng !== 0 &&
  lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

const clean = (s) => {
  if (s == null) return null;
  const v = String(s).replace(/\s+/g, " ").trim();
  return v === "" ? null : v;
};

// Names the GIS uses as "no value" placeholders: drop to null rather than ship.
const JUNK_NAME = new Set(["", "-", "ind", "néant", "neant", "n/a", "na", "."]);
const cleanName = (s) => {
  const v = clean(s);
  if (v == null) return null;
  return JUNK_NAME.has(v.toLowerCase()) ? null : v;
};

// Strip the "uuid:" prefix the GIS puts on referential values.
const stripUUID = (s) => {
  if (s == null) return null;
  const v = String(s);
  // A referential the GIS never had set comes back as a bare ":" (empty uuid,
  // empty label). That is absence, not a value.
  if (v === ":") return null;
  const idx = v.indexOf(":");
  if (idx > 0 && idx < 40 && /^[0-9a-f-]+$/.test(v.slice(0, idx))) {
    return clean(v.slice(idx + 1));
  }
  return clean(v);
};

function parseYear(v) {
  const s = stripUUID(v);
  if (!s) return null;
  const m = s.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function parseCapacity(v) {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseSurface(v) {
  if (v == null) return null;
  const s = String(v).replace(/,/g, ".").replace(/[^\d.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// --- Arabic name backfill (nearest-neighbour over the legacy seed) -----------
// Equirectangular metres, good enough at Algeria's latitudes for a sub-km test.
function metres(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat = ((aLat + bLat) / 2) * (Math.PI / 180);
  const x = dLng * Math.cos(lat);
  return Math.sqrt(dLat * dLat + x * x) * R;
}

function loadNamesArSeed() {
  if (!existsSync(NAMES_AR_SEED)) return [];
  try {
    const seed = JSON.parse(readFileSync(NAMES_AR_SEED, "utf8"));
    return Array.isArray(seed) ? seed.filter((s) => s.name_ar && inAlgeria(s.lat, s.lng)) : [];
  } catch (e) {
    throw new Error(`${NAMES_AR_SEED}: corrupt seed JSON: ${e.message}`);
  }
}

// Bucket the seed into ~0.05° cells (~5 km) so each lookup scans only nearby
// points instead of all 2,000+. Returns finder(lat,lng,typeCode) -> the nearest
// type-compatible legacy name_ar within tolerance, or null.
function buildNameArFinder(seed) {
  const CELL = 0.05;
  const key = (lat, lng) => `${Math.round(lat / CELL)}:${Math.round(lng / CELL)}`;
  const grid = new Map();
  for (const s of seed) {
    const k = key(s.lat, s.lng);
    (grid.get(k) || grid.set(k, []).get(k)).push(s);
  }
  return (lat, lng, typeCode) => {
    const allowed = LEGACY_TYPES_FOR[typeCode];
    if (!allowed || !allowed.length) return null;
    const cy = Math.round(lat / CELL);
    const cx = Math.round(lng / CELL);
    let best = null;
    let bestD = Infinity;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const bucket = grid.get(`${cy + dy}:${cx + dx}`);
        if (!bucket) continue;
        for (const s of bucket) {
          if (!allowed.includes(s.type_code)) continue;
          const d = metres(lat, lng, s.lat, s.lng);
          if (d < bestD) { bestD = d; best = s; }
        }
      }
    }
    return bestD <= NAME_AR_MAX_M && best ? best.name_ar : null;
  };
}

/**
 * The key a published id is carried on. The ids are a flat 5-digit space assigned
 * from sort position (wilaya, type, name), so nothing in a record's own id says
 * which id it shipped under. From the 2026-10-27 refresh every record publishes
 * the SIG's own per-record UUID as refs.mjs, which survives the ministry renaming,
 * re-addressing or re-placing an establishment, and ids are carried on it, as
 * sports carries its facilities.
 *
 * The one release before that, the published records carry no UUID, so that
 * transition is keyed on what the establishment is and where: its type, its
 * point, its names (folded exactly as the writer folds them) and its address
 * (dash-folded the same way, as the fetcher now publishes it).
 * That key cannot be the permanent one: any edit to those fields would retire an
 * id. It is unique over the published records and the 2026-10-27 rebuild and
 * pairs all 2,334, so the transition retires none; and the jeunesse review ledger
 * patches only wilaya_code and commune_code, so the committed side can be read as
 * shipped. carryOverIds refuses a duplicated key rather than pinning arbitrarily.
 *
 * Why a key was needed at all: a positional rebuild of the 2026-10-27 capture
 * repointed 213 published ids for a source that had not changed, because records
 * that tie on the sort keep their input order (the capture sorts by UUID, the
 * live response did not) and a record whose derived wilaya changed moved group.
 */
export const jeunesseContentKey = (r) => {
  const folded = foldNameDashes({ name: r.name ?? null, name_ar: r.name_ar ?? null });
  return JSON.stringify([r.type, r.lat, r.lng, folded.name, folded.name_ar, withoutEmDash(r.address ?? null)]);
};
export const mjsRefOf = (r) => r?.refs?.mjs ?? null;
/** The carry key for a rebuild against `committed`: the UUID once the published
 *  records carry one, the content key for the one transition before that. */
export const carryKeyFor = (committed) =>
  committed.length && committed.every((r) => mjsRefOf(r)) ? mjsRefOf : jeunesseContentKey;

// --- main ------------------------------------------------------------------
async function main() {
  const OFFLINE = process.argv.includes("--cache");
  const features = OFFLINE
    ? readMjsCapture({ pkg: "jeunesse", capture: CAPTURE, minExpected: MIN_EXPECTED })
    : await fetchMjsLayer({
        pkg: "jeunesse",
        capture: CAPTURE,
        layer: LAYER,
        minExpected: MIN_EXPECTED,
      });

  const wilayaMap = buildWilayaMap();
  const findNameAr = buildNameArFinder(loadNamesArSeed());
  const institutions = [];
  const dropped = [];
  const unknownTypes = new Set();
  const unmappedWilayas = new Set();
  let arMatched = 0;

  for (const feat of features) {
    const p = feat.properties;
    if (p.deleted === true || p.deleted === "true") continue;

    const coords = feat.geometry?.coordinates;
    if (!coords) { dropped.push({ id: p.id, reason: "no geometry" }); continue; }
    let [lng, lat] = coords;
    if (!inAlgeria(lat, lng)) {
      if (inAlgeria(lng, lat)) { [lat, lng] = [lng, lat]; }
      else { dropped.push({ id: p.id, reason: "out of bounds" }); continue; }
    }

    const typeRaw = stripUUID(p.type_de_letablissement);
    const typeEntry = typeRaw ? TYPE_MAP[typeRaw] : null;
    if (typeRaw && !typeEntry) unknownTypes.add(typeRaw);
    // type_code is a non-null contract, so a row the ministry has not typed yet
    // is an unfinished entry: drop it rather than guess. A row carrying a type
    // we do not know still throws below.
    if (!typeRaw) { dropped.push({ id: p.id, reason: "no type" }); continue; }

    const wilayaName = stripUUID(p.wilaya);
    if (!wilayaName) { dropped.push({ id: p.id, reason: "no wilaya" }); continue; }
    const normWilaya = normalise(wilayaName);
    const wilayaCode = wilayaMap[normWilaya] || wilayaMap[WILAYA_ALIASES[normWilaya]] || null;
    if (!wilayaCode) unmappedWilayas.add(wilayaName);

    const funcRaw = stripUUID(p.fonctionnel_ou_non_fonctionnel);
    const operational = funcRaw
      ? funcRaw.toLowerCase().includes("non") ? false
      : funcRaw.toLowerCase().startsWith("fonctionnel") ? true
      : null
      : null;

    const pmrRaw = p["accessibilite_aux_personnes_a_mobilite_e_reduite(pmr)"];
    const pmr = pmrRaw === "true" || pmrRaw === true ? true
      : pmrRaw === "false" || pmrRaw === false ? false
      : null;

    const name_ar = findNameAr(lat, lng, typeEntry?.code ?? null);
    if (name_ar) arMatched++;

    institutions.push({
      id: p.id,
      // The SIG's own per-record UUID, published as refs.mjs and the key ids are
      // carried on from now on (see carryKeyFor).
      uuid: p.id,
      name: cleanName(p.denomination_de_letablissement),
      name_ar,
      type_code: typeEntry?.code ?? null,
      type_fr: typeEntry?.fr ?? typeRaw ?? null,
      type_ar: typeEntry?.ar ?? null,
      // An address with a dash used as a separator is folded like a name, as sports does.
      address: withoutEmDash(clean(p.adresse_de_letablissement)),
      commune: stripUUID(p.commune),
      daira: stripUUID(p.daira),
      wilaya_code: wilayaCode,
      wilaya_name: wilayaName,
      capacity: parseCapacity(p.capacite_daccueil),
      year: parseYear(p.annee_de_reception),
      operational,
      pmr,
      surface_built_m2: parseSurface(p.surface_du_batie_en_m),
      surface_land_m2: parseSurface(p.surface_de_lassiette_en_m),
      lat,
      lng,
      source: SOURCE,
    });
  }

  if (unknownTypes.size) {
    throw new Error(`unknown type(s): ${[...unknownTypes].join(", ")}; extend TYPE_MAP`);
  }
  if (unmappedWilayas.size) {
    throw new Error(`unmapped wilaya(s): ${[...unmappedWilayas].join(", ")}; extend WILAYA_ALIASES`);
  }
  // type_code is a non-null contract (typed + advertised). A source row with an
  // empty type adds nothing to unknownTypes, so guard it explicitly rather than
  // silently shipping a null-typed record on a future refresh.
  const typeless = institutions.filter((r) => r.type_code == null);
  if (typeless.length) {
    throw new Error(`${typeless.length} record(s) with no type: investigate before shipping`);
  }

  institutions.sort((a, b) =>
    (a.wilaya_code || "99").localeCompare(b.wilaya_code || "99") ||
    (a.type_code || "").localeCompare(b.type_code || "") ||
    (a.name || "￿").localeCompare(b.name || "￿"),
  );

  const overflow = institutions.filter((r) => {
    const c = Number(r.wilaya_code);
    return !Number.isFinite(c) || c < 1 || c > 69;
  });
  if (overflow.length) {
    throw new Error(`wilaya_code out of [1,69]: ${overflow.length} record(s)`);
  }

  institutions.forEach((f, i) => { f.id = i + 1; });

  // --- emit v2 via the shared writer ---
  const cfg = MIGRATIONS.jeunesse;
  // The capture is the retrieval, so its own date is what the package states, live
  // or --cache alike: a replay of the same capture reproduces the metadata, and a
  // rebuild from a newer capture no longer keeps the previous pull's date.
  const { retrieved: updated } = captureMeta("jeunesse", CAPTURE);
  const retrieved = updated;
  // Pin every record to the id it shipped under (see carryKeyFor), reserve the
  // id of one that is gone, and mint a new record's id above every id ever used.
  const rows = institutions.map(cfg.map);
  const committed = readCommitted(DATA, "institutions.json") ?? [];
  const retiredIds = readRetiredIds(DATA);
  const keyOf = carryKeyFor(committed);
  const shipped = new Set(committed.map(keyOf));
  let highest = Math.max(0, ...[...committed.map((r) => r.id), ...retiredIds].map(Number).filter(Number.isFinite));
  let minted = 0;
  for (const r of rows) {
    if (shipped.has(keyOf(r))) continue;
    r.id = String(++highest).padStart(5, "0");
    minted++;
  }
  const retiredBefore = retiredIds.size;
  carryOverIds(rows, committed, keyOf, "jeunesse", retiredIds);
  console.log(`Ids: ${rows.length - minted} carried, ${minted} minted, ${retiredIds.size - retiredBefore} retired`);
  const { records: out, metadata } = writePackageV2({
    pkg: "jeunesse",
    dir: DATA,
    files: [{ file: "institutions.json", rows }],
    meta: cfg.meta,
    updated,
    retrieved,
    retiredIds,
  });

  console.log(`\nType breakdown:`);
  for (const [k, v] of Object.entries(metadata.by_type).sort((a, b) => b[1] - a[1])) {
    const entry = Object.values(TYPE_MAP).find((e) => e.code === k);
    console.log(`  ${String(v).padStart(5)}  ${k.padEnd(4)} ${entry?.fr || k}`);
  }
  console.log(`\nArabic names backfilled: ${arMatched}/${out.length}`);
  if (dropped.length) console.log(`Dropped ${dropped.length} record(s).`);
  console.log(`\nWrote ${out.length} youth establishments across ${metadata.wilayas_covered} wilayas to ${DATA} (v2).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
