#!/usr/bin/env node
/**
 * Fetch Algeria's sports infrastructure from the MJS GeoServer (kharitaDZ)
 * and emit JSON, CSV, and GeoJSON to ../data.
 *
 * Source: https://sig.mjs.gov.dz/dashboard/viewer
 *   The MJS (Ministry of Youth and Sports) runs a GeoServer behind a
 *   Nuxt dashboard. The "infrastructures_sportives" WMS layer is publicly
 *   queryable. We request all features as GeoJSON via the WMS GetMap endpoint
 *   (format=application/json;type=geojson), which bypasses the auth-gated WFS.
 *
 * Each raw record carries ~35 fields; we keep the ones useful to consumers:
 * name, type, address, commune/daira/wilaya, capacity, built/land area, year
 * of reception, operational status, PMR accessibility, and GPS coordinates.
 *
 * Wilaya names from the source are French (all-caps, no diacritics). We resolve
 * them to numeric wilaya_code using a normalisation map built from the flagship
 * dataset's 69 wilayas.
 *
 * Usage: node scripts/fetch.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import {
  MIGRATIONS,
  writePackageV2,
  carryOverIds,
  readCommitted,
  readRetiredIds,
  loadReviewLedger,
} from "../../../scripts/lib/v2-transforms.mjs";
import { foldNameDashes } from "../../../scripts/lib/no-em-dash.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const DATASET = join(__dirname, "..", "..", "dataset", "data");

const WMS_URL =
  "https://sig.mjs.gov.dz/api/v1.0/geoserver/public/wms?" +
  "service=WMS&version=1.1.1&request=GetMap" +
  "&layers=infrastructures_sportives" +
  "&bbox=-9,18,12,38&width=1&height=1&srs=EPSG:4326" +
  "&format=application/json;type=geojson";

const SOURCE = "https://sig.mjs.gov.dz/dashboard/viewer";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const MIN_EXPECTED = 4000;

// Infrastructure type codes: short, stable keys for the 27 types the source publishes.
const TYPE_MAP = {
  "Terrains Sportif de Proximité": { code: "TSP", fr: "Terrain sportif de proximité" },
  "Aire de Jeux Football": { code: "AJF", fr: "Aire de jeux football" },
  "Salle OMS": { code: "SOMS", fr: "Salle OMS" },
  "Salle Spécialisée": { code: "SS", fr: "Salle spécialisée" },
  "Bassin de Natation": { code: "BN", fr: "Bassin de natation" },
  "Piscine 25m": { code: "P25", fr: "Piscine 25 m" },
  "Piscine de Proximité": { code: "PP", fr: "Piscine de proximité" },
  "Terrain de football": { code: "TF", fr: "Terrain de football" },
  "Stade de Football": { code: "SF", fr: "Stade de football" },
  "Stade OMS": { code: "STOMS", fr: "Stade OMS" },
  "Stade  OMS": { code: "STOMS", fr: "Stade OMS" },
  "Piste d'athlétisme": { code: "PA", fr: "Piste d'athlétisme" },
  "Parcour d'Athletisme": { code: "PCA", fr: "Parcours d'athlétisme" },
  "Boulodrome": { code: "BL", fr: "Boulodrome" },
  "Court de tennis": { code: "CT", fr: "Court de tennis" },
  "Unité  d'hébergement, de soin et de réccupuration": { code: "UHR", fr: "Unité d'hébergement et de récupération" },
  "Unité d'hébergement, de soin et de réccupuration": { code: "UHR", fr: "Unité d'hébergement et de récupération" },
  "Piscine 50m": { code: "P50", fr: "Piscine 50 m" },
  "Stade d'Athletisme": { code: "SA", fr: "Stade d'athlétisme" },
  "Centre Equestre": { code: "CE", fr: "Centre équestre" },
  "Base Nautique": { code: "BNA", fr: "Base nautique" },
  "Complexes sportif": { code: "CXS", fr: "Complexe sportif" },
  "aire de jeux de loisirs": { code: "AJL", fr: "Aire de jeux de loisirs" },
  "Champ de tir": { code: "CDT", fr: "Champ de tir" },
  "Centre de regroupement et de préparation": { code: "CRP", fr: "Centre de regroupement et de préparation" },
  "Ecole de jeunes talents": { code: "EJT", fr: "École de jeunes talents" },
  "terrain de replique": { code: "TR", fr: "Terrain de réplique" },
  "REALISATION, EQUIPEMENT  D'UN  ETABLISSEMENT D'EDUCATION PHYSIQUE ET SPORTIVE": { code: "EPS", fr: "Établissement d'éducation physique et sportive" },
  "REALISATION, EQUIPEMENT D'UN ETABLISSEMENT D'EDUCATION PHYSIQUE ET SPORTIVE": { code: "EPS", fr: "Établissement d'éducation physique et sportive" },
  "Grand Stade": { code: "GS", fr: "Grand stade" },
  "centre de formation regional": { code: "CFR", fr: "Centre de formation régional" },
};

// Wilaya name normalisation: MJS uses uppercase ASCII French; the flagship
// uses accented Title Case. We strip diacritics and case to match.
function buildWilayaMap() {
  const wilayas = JSON.parse(readFileSync(join(DATASET, "wilayas.json"), "utf-8")).wilayas;
  const map = {};
  for (const w of wilayas) {
    const code = String(w.code).padStart(2, "0");
    map[normalise(w.name_fr)] = code;
  }
  return map;
}

function normalise(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['-]/g, " ")
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

// Algeria bounding box.
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat !== 0 && lng !== 0 &&
  lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

const clean = (s) => {
  if (s == null) return null;
  const v = String(s).replace(/\s+/g, " ").trim();
  return v === "" ? null : v;
};

// Strip the "uuid:" prefix the GIS puts on referential values.
const stripUUID = (s) => {
  if (s == null) return null;
  const v = String(s);
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

// --- stable ids ------------------------------------------------------------
//
// Ids follow places: a facility keeps the id it shipped under, a genuinely new
// facility takes a fresh number, and a removed facility's number is never handed
// out again. The ids used to be positions in the sort order, so the October 2026
// pull (90 additions, no removals) would have moved 5,030 of the 5,141 published
// ids onto a different place (#306).
//
// The carry key is the facility's place, because the MJS GeoServer's own feature
// id is not in the published records: the generator overwrote it with the
// sequence number, so there is nothing else both sides can be keyed on. The key
// therefore reads only the fields that say WHICH place a record is, never the
// attributes the ministry revises (capacity, year, operational, pmr, surfaces),
// so a revision changes fields rather than retiring an id. A corrected
// coordinate or a renaming does retire one; publishing the ministry's feature id
// as `refs.mjs` on the next live pull is what would close that gap.
//
// Only fields the GENERATOR owns belong in the key. The key is read before
// writePackageV2, and the writer then patches fields from
// quality/overrides/sports.json and folds every name-keyed string through
// foldNameDashes, so a key that read either of those would compare a generator
// value against a published one and retire an id on a rebuild that changed
// nothing (empirically: `wilaya_code` cost 27 ids, 13 of them the reviewed
// corrections themselves, which then aborted the build at "review overrides:
// unknown record 02725"). Three things keep the two sides comparable:
// `wilaya_code` is out of the key, being GeoAlgeria-derived rather than ministry
// data (reconcileCurrentWilayaByCommune re-decides it from the commune index and
// the boundaries on every run); the name is folded exactly as the writer folds
// it; and the committed side is read through asGenerated below, which undoes the
// review ledger, so a reviewed coordinate or name correction cannot churn the id
// it corrected either.
const PLACE_FIELDS = ["commune", "type", "name", "address", "lat", "lng"];

/** The place a v2 sports record stands for, as a carry key. */
export const placeKeyOf = (r) => {
  const place = foldNameDashes(
    Object.fromEntries(PLACE_FIELDS.map((f) => [f, r[f] ?? null])),
  );
  return PLACE_FIELDS.map((f) => JSON.stringify(place[f])).join("|");
};

/**
 * A keyOf for carryOverIds over both sides of a rebuild. The MJS ships groups of
 * records whose every place field is identical (4 groups, 10 records as of the
 * June capture), and a carry key that cannot pin an id uniquely fails the build,
 * so twins are told apart by their position within their own group. They are
 * field-identical, so which of them keeps which id carries no meaning.
 *
 * @param {object[]} committed  the committed v2 records
 * @param {object[]} rows       the records being emitted
 * @returns {(r: object) => string}
 */
export function sportsCarryKey(committed, rows) {
  const keyed = new Map();
  for (const set of [committed, rows]) {
    const seen = new Map();
    for (const r of set) {
      const place = placeKeyOf(r);
      const nth = (seen.get(place) ?? 0) + 1;
      seen.set(place, nth);
      keyed.set(r, `${place}#${nth}`);
    }
  }
  return (r) => keyed.get(r) ?? placeKeyOf(r);
}

/**
 * The committed records as the generator produced them, with the review ledger's
 * corrections undone, which is the side of the comparison the carry key can
 * actually read.
 *
 * writePackageV2 applies quality/overrides/sports.json AFTER the fetcher has
 * keyed the rows, so a published record carries reviewed values the generator
 * never produces: 5 of the repo's 11 ledgers patch coordinates, and keying on a
 * reviewed coordinate retires the very id the review corrected (reproduced on
 * 01663: carried 0, minted 1, retired 1). The ledger cannot be applied to the
 * live rows instead, because it is keyed on the published id, which is what
 * carry-over is still deciding. Every patched field is required to appear in
 * `expect` with its pre-patch value, precisely so a build can be replayed, so
 * restoring `expect` (and dropping what `expect_absent` says the generator does
 * not emit) is the exact inverse of the patch the writer will apply, and leaves
 * both sides keyed on what the generator owns. Ids are never patchable, so the
 * returned records still carry the published ids carry-over pins back.
 *
 * @param {object[]} committed  the committed v2 records
 * @param {object|null} ledger  the review ledger, or null for a package with none
 * @param {string} file         the data file the decisions apply to
 */
export function asGenerated(committed, ledger, file) {
  const decisions = new Map(
    (ledger?.decisions ?? [])
      .filter((d) => d.file === file && d.publish_action === "patch")
      .map((d) => [String(d.record_id), d]),
  );
  if (!decisions.size) return committed;
  return committed.map((record) => {
    const decision = decisions.get(String(record.id));
    if (!decision) return record;
    const generated = { ...record, ...decision.expect };
    for (const field of decision.expect_absent ?? []) delete generated[field];
    return generated;
  });
}

/**
 * Give every record its public id: the one it already shipped under, or, for a
 * facility the source has never shipped, the next number above every id the
 * package has ever used (published or retired). Parking the new facilities above
 * that high-water mark first is what keeps them out of a published slot: the ids
 * here are a flat 5-digit space with no prefix to re-home them within.
 *
 * @param {object[]} rows          the v2 records being emitted (mutated in place)
 * @param {object[]} committed     the committed v2 records
 * @param {Set<string>} retiredIds the retired-id ledger, mutated with this run's
 * @param {object} [options]
 * @param {object|null} [options.ledger]  the review ledger to undo on the
 *                                 committed side; defaults to the package's own
 * @param {string} [options.file]  the data file the decisions apply to
 * @returns {{carried: number, minted: number, retired: number}}
 */
export function assignStableIds(
  rows,
  committed,
  retiredIds,
  { ledger = loadReviewLedger("sports"), file = "facilities.json" } = {},
) {
  const published = asGenerated(committed, ledger, file);
  const keyOf = sportsCarryKey(published, rows);
  const shipped = new Set(published.map(keyOf));
  let highest = 0;
  for (const id of [...published.map((r) => r.id), ...retiredIds]) {
    const n = Number(id);
    if (Number.isFinite(n) && n > highest) highest = n;
  }
  let minted = 0;
  for (const r of rows) {
    if (shipped.has(keyOf(r))) continue;
    r.id = String(++highest).padStart(5, "0");
    minted++;
  }
  const retiredBefore = retiredIds.size;
  carryOverIds(rows, published, keyOf, "sports", retiredIds);
  return {
    carried: rows.length - minted,
    minted,
    retired: retiredIds.size - retiredBefore,
  };
}

// --- main ------------------------------------------------------------------
async function main() {
  console.log("Fetching MJS sports infrastructure from GeoServer…");
  const res = await fetch(WMS_URL, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`WMS request failed: HTTP ${res.status}`);
  const raw = await res.json();

  if (!raw.features || !Array.isArray(raw.features)) {
    throw new Error("unexpected response: no features array");
  }
  if (raw.features.length < MIN_EXPECTED) {
    throw new Error(`only ${raw.features.length} features; expected >= ${MIN_EXPECTED}`);
  }
  console.log(`  fetched ${raw.features.length} raw features`);

  const wilayaMap = buildWilayaMap();
  const facilities = [];
  const dropped = [];
  const unknownTypes = new Set();
  const unmappedWilayas = new Set();

  for (const feat of raw.features) {
    const p = feat.properties;
    if (p.deleted === true || p.deleted === "true") continue;

    // Coordinates
    const coords = feat.geometry?.coordinates;
    if (!coords) { dropped.push({ id: p.id, reason: "no geometry" }); continue; }
    let [lng, lat] = coords;
    if (!inAlgeria(lat, lng)) {
      if (inAlgeria(lng, lat)) { [lat, lng] = [lng, lat]; }
      else { dropped.push({ id: p.id, reason: "out of bounds" }); continue; }
    }

    // Type: try exact match first, then whitespace-normalised
    const typeRaw = stripUUID(p.type_de_linfrastructure);
    let typeEntry = typeRaw ? TYPE_MAP[typeRaw] : null;
    if (!typeEntry && typeRaw) {
      const norm = typeRaw.replace(/\s+/g, " ").replace(/[‘’“”]/g, "'").trim();
      typeEntry = TYPE_MAP[norm] || Object.entries(TYPE_MAP).find(
        ([k]) => k.replace(/\s+/g, " ").replace(/[‘’“”]/g, "'").trim() === norm,
      )?.[1] || null;
    }
    if (typeRaw && !typeEntry) unknownTypes.add(typeRaw);

    // Wilaya → code
    const wilayaName = stripUUID(p.wilaya);
    const normWilaya = wilayaName ? normalise(wilayaName) : null;
    const wilayaCode = normWilaya
      ? wilayaMap[normWilaya] || wilayaMap[WILAYA_ALIASES[normWilaya]] || null
      : null;
    if (wilayaName && !wilayaCode) unmappedWilayas.add(wilayaName);

    // Operational status
    const funcRaw = stripUUID(p.fonctionnelle);
    const operational = funcRaw
      ? funcRaw.toLowerCase().startsWith("fonctionnel") ? true
      : funcRaw.toLowerCase().includes("non") ? false
      : null
      : null;

    // PMR accessibility
    const pmrRaw = p["accessibilite_aux_personnes_a_mobilite_reduite(pmr)"];
    const pmr = pmrRaw === "true" || pmrRaw === true ? true
      : pmrRaw === "false" || pmrRaw === false ? false
      : null;

    facilities.push({
      id: p.id,
      name: clean(p.nomination_de_linfrastructure),
      type_code: typeEntry?.code ?? null,
      type_fr: typeEntry?.fr ?? typeRaw ?? null,
      address: clean(p.adresse_de_linfrastructure),
      commune: stripUUID(p.commune),
      daira: stripUUID(p.daira),
      wilaya_code: wilayaCode,
      wilaya_name: wilayaName,
      capacity: parseCapacity(p.capacite_daccueil),
      year: parseYear(p.annee_de_reception),
      operational,
      pmr,
      surface_built_m2: parseSurface(p.surface_batie_m),
      surface_land_m2: parseSurface(p.surface_dassiette__m),
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

  // Sort by wilaya then type then name
  facilities.sort((a, b) =>
    (a.wilaya_code || "99").localeCompare(b.wilaya_code || "99") ||
    (a.type_code || "").localeCompare(b.type_code || "") ||
    (a.name || "").localeCompare(b.name || ""),
  );

  const overflow = facilities.filter(r => {
    const c = Number(r.wilaya_code);
    return !Number.isFinite(c) || c < 1 || c > 69;
  });
  if (overflow.length) {
    throw new Error(`wilaya_code out of [1,69]: ${overflow.length} record(s)`);
  }

  // Number the records in emission order; assignStableIds settles the public ids
  // below, once the committed data says which of them have shipped before.
  facilities.forEach((f, i) => { f.id = i + 1; });

  // --- emit v2 via the shared writer ---
  const cfg = MIGRATIONS.sports;
  const today = new Date().toISOString().slice(0, 10);
  const v2 = facilities.map(cfg.map);
  const committed = readCommitted(DATA, "facilities.json");
  const retiredIds = readRetiredIds(DATA);
  const ids = assignStableIds(v2, committed, retiredIds);
  if (committed.length)
    console.log(
      `  id carry-over: ${ids.carried}/${v2.length} facilities kept their published id, ` +
        `${ids.minted} new, ${ids.retired} retired`,
    );
  const { records: out, metadata } = writePackageV2({
    pkg: "sports",
    dir: DATA,
    files: [{ file: "facilities.json", rows: v2 }],
    meta: cfg.meta,
    updated: today,
    retrieved: today,
    retiredIds,
  });

  console.log(`\nType breakdown:`);
  for (const [k, v] of Object.entries(metadata.by_type).sort((a, b) => b[1] - a[1])) {
    const entry = Object.values(TYPE_MAP).find((e) => e.code === k);
    console.log(`  ${String(v).padStart(5)}  ${k.padEnd(6)} ${entry?.fr || k}`);
  }
  if (dropped.length) {
    console.log(`\nDropped ${dropped.length} record(s).`);
  }
  console.log(`\nWrote ${out.length} facilities across ${metadata.wilayas_covered} wilayas to ${DATA} (v2).`);
}

// Importable for the id-stability tests; only the direct invocation builds.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
