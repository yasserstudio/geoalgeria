#!/usr/bin/env node
// Validate the scoped data packages (@geoalgeria/poste, /mobilis, /emploi,
// /telecom, /aviation, /banques, /livraison, /jeunesse, /sports,
// /enseignement-superieur, /tourisme, /formation-professionnelle, /djezzy,
// /mosquees, /sante, /culture, /agriculture, /ecoles, /gares-routieres,
// /ferroviaire, /buses)
// for integrity and cross-format consistency. The flagship
// `geoalgeria` dataset has its own Python validator
// (packages/dataset/scripts/validate.py); this is the single Node gate for every
// scoped package so they're all guarded on every commit and before every publish.
//
// poste/mobilis/emploi share a flat `data/<name>.json` shape (table-driven
// below). telecom has a different shape — coverage namespaced by technology
// (coverage/<tech>/) and split into per-operator files — so it gets its own
// validator (validateTelecom) that shares the same error accumulator + helpers.
//
// Usage: node scripts/validate-packages.mjs [poste|mobilis|emploi|telecom|aviation|banques|livraison|jeunesse|sports|enseignement-superieur|tourisme|formation-professionnelle|djezzy|mosquees|sante|culture|agriculture|ecoles|gares-routieres|ferroviaire|buses]
//        (no arg = validate all)
//
// Checks, per dataset:
//   - JSON parses to a non-empty array
//   - record count === the matching field in metadata.json
//   - CSV row count (minus header) === record count
//   - GeoJSON feature count === records with valid coordinates
//   - zero duplicate `id`
//   - every `wilaya_code` is an integer in [1, 69]
//   - required identity fields present and non-empty on every record
// Plus a mirror-drift check: dataset/data/poste/*.json must equal packages/poste.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
// v2 contract enforcement (dormant until a package declares schema_version "2.0.0").
import {
  validateRecords as validateV2Records,
  validateMetadata as validateV2Metadata,
  WILAYA_CODES,
} from "../packages/schema/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (msg) => {
  errors.push(msg);
  console.error(`  FAIL: ${msg}`);
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf-8"));
// A coordinate is "present" iff it is a finite number (or numeric string).
// Note `Number("") === 0`, so empty strings must be rejected explicitly —
// otherwise blank coords would count as geocoded and the GeoJSON-count check
// (features === records-with-coords) would silently diverge.
const toNum = (v) => (v === "" || v == null ? NaN : Number(v));
const hasCoord = (r) => Number.isFinite(toNum(r.lat)) && Number.isFinite(toNum(r.lng));

// data/<dataset>.json + its metadata key, csv mirror, optional geojson mirror.
// geojson:null means the dataset is intentionally ungeocoded (e.g. Mobilis PDV).
const PACKAGES = {
  poste: [
    {
      json: "postoffices.json",
      metaKey: "postoffices",
      csv: "csv/postoffices.csv",
      geojson: "geojson/postoffices.geojson",
      required: ["id", "name", "wilaya_code"],
    },
    {
      json: "atms.json",
      metaKey: "atms",
      csv: "csv/atms.csv",
      geojson: "geojson/atms.geojson",
      required: ["id", "name", "wilaya_code"],
    },
  ],
  mobilis: [
    {
      json: "agences.json",
      metaKey: "agences",
      csv: "csv/agences.csv",
      geojson: "geojson/agences.geojson",
      required: ["id", "name", "wilaya_code"],
    },
    {
      json: "pdv.json",
      metaKey: "pdv",
      csv: "csv/pdv.csv",
      geojson: null, // ungeocoded by design (metadata.pdv_geocoded === 0)
      required: ["id", "name", "wilaya_code"],
    },
  ],
  djezzy: [
    {
      json: "boutiques.json",
      metaKey: "boutiques",
      csv: "csv/boutiques.csv",
      geojson: "geojson/boutiques.geojson",
      required: ["id", "name", "wilaya_code"],
    },
  ],
  ooredoo: [
    {
      json: "stores.json",
      metaKey: "ooredoo",
      csv: "csv/stores.csv",
      geojson: "geojson/stores.geojson",
      required: ["id", "name", "type", "wilaya_code", "lat", "lng"],
    },
  ],
  emploi: [
    {
      json: "awem.json",
      metaKey: "awem",
      csv: "csv/awem.csv",
      geojson: "geojson/awem.geojson",
      required: ["id", "name", "wilaya_code"],
    },
    {
      json: "alem.json",
      metaKey: "alem",
      csv: "csv/alem.csv",
      geojson: "geojson/alem.geojson",
      required: ["id", "name", "wilaya_code"],
    },
  ],
  aviation: [
    {
      json: "airports.json",
      metaKey: "airports",
      csv: "csv/airports.csv",
      geojson: "geojson/airports.geojson",
      required: ["id", "name", "icao", "wilaya_code"],
    },
  ],
  mosquees: [
    {
      json: "mosquees.json",
      metaKey: "mosquees",
      csv: "csv/mosquees.csv",
      geojson: "geojson/mosquees.geojson",
      // name is intentionally nullable (many OSM mosques are unnamed), so the
      // required set guards identity + geocoding rather than name.
      required: ["id", "source", "wilaya_code", "lat", "lng"],
    },
  ],
  jeunesse: [
    {
      json: "institutions.json",
      metaKey: "institutions",
      csv: "csv/institutions.csv",
      geojson: "geojson/institutions.geojson",
      required: ["id", "type_code", "wilaya_code", "lat", "lng"],
    },
  ],
  ecoles: [
    {
      json: "ecoles.json",
      metaKey: "ecoles",
      csv: "csv/ecoles.csv",
      geojson: "geojson/ecoles.geojson",
      // name is intentionally nullable (many OSM schools are unnamed) and sector
      // is often unknown, so the required set guards identity + cycle + kind + geocoding.
      required: ["id", "source", "cycle", "kind", "wilaya_code", "lat", "lng"],
    },
  ],
  sante: [
    {
      json: "sante.json",
      metaKey: "sante",
      csv: "csv/sante.csv",
      geojson: "geojson/sante.geojson",
      // lat/lng are intentionally nullable (the MSP carries no coordinates;
      // some localities don't resolve), so the required set guards identity +
      // type + wilaya, not geocoding.
      required: ["id", "name", "type", "wilaya", "wilaya_code", "msp_id"],
    },
  ],
  sports: [
    {
      json: "facilities.json",
      metaKey: "facilities",
      csv: "csv/facilities.csv",
      geojson: "geojson/facilities.geojson",
      required: ["id", "type_code", "wilaya_code", "lat", "lng"],
    },
  ],
  "enseignement-superieur": [
    {
      json: "institutions.json",
      metaKey: "institutions",
      csv: "csv/institutions.csv",
      geojson: "geojson/institutions.geojson",
      required: ["id", "type", "wilaya_code", "lat", "lng"],
    },
  ],
  banques: [
    {
      json: "banks.json",
      metaKey: "banks",
      csv: "csv/banks.csv",
      geojson: null, // registry of institutions, not geocoded points (HQ wilaya only)
      required: ["id", "acronym", "name_fr", "wilaya_code"],
    },
    {
      json: "institutions.json",
      metaKey: "institutions",
      csv: "csv/institutions.csv",
      geojson: null,
      required: ["id", "acronym", "name_fr", "wilaya_code"],
    },
    {
      json: "branches.json",
      metaKey: "branches",
      csv: "csv/branches.csv",
      geojson: "geojson/branches.geojson",
      required: ["id", "bank_id", "name", "wilaya_code"],
    },
  ],
  tourisme: [
    {
      json: "lodging.json",
      metaKey: "lodging",
      csv: "csv/lodging.csv",
      geojson: "geojson/lodging.geojson",
      required: ["id", "name", "type", "wilaya_code"],
    },
    {
      json: "attractions.json",
      metaKey: "attractions",
      csv: "csv/attractions.csv",
      geojson: "geojson/attractions.geojson",
      required: ["id", "name", "type", "wilaya_code"],
    },
    {
      json: "historic.json",
      metaKey: "historic",
      csv: "csv/historic.csv",
      geojson: "geojson/historic.geojson",
      required: ["id", "name", "type", "wilaya_code"],
    },
    {
      json: "thermal-springs.json",
      metaKey: "thermal_springs",
      csv: "csv/thermal-springs.csv",
      geojson: "geojson/thermal-springs.geojson",
      required: ["id", "name", "type", "wilaya_code"],
    },
    {
      json: "parks.json",
      metaKey: "parks",
      csv: "csv/parks.csv",
      geojson: "geojson/parks.geojson",
      required: ["id", "name", "category", "wilaya_code"],
    },
  ],
  "formation-professionnelle": [
    {
      json: "establishments.json",
      metaKey: "establishments",
      csv: "csv/establishments.csv",
      geojson: "geojson/establishments.geojson",
      required: ["id", "name", "type", "wilaya_code"],
    },
  ],
  culture: [
    {
      json: "culture.json",
      metaKey: "culture",
      csv: "csv/culture.csv",
      geojson: "geojson/culture.geojson",
      required: ["id", "name", "type", "wilaya_code", "lat", "lng"],
    },
  ],
  agriculture: [
    {
      json: "agriculture.json",
      metaKey: "agriculture",
      csv: "csv/agriculture.csv",
      geojson: "geojson/agriculture.geojson",
      required: ["id", "name", "type", "wilaya_code", "lat", "lng"],
    },
  ],
  "industrie-pharmaceutique": [
    {
      json: "industrie-pharmaceutique.json",
      metaKey: "industrie-pharmaceutique",
      csv: "csv/industrie-pharmaceutique.csv",
      geojson: "geojson/industrie-pharmaceutique.geojson",
      required: ["id", "name", "role", "nature", "wilaya_code", "lat", "lng"],
    },
  ],
  pharmacies: [
    {
      json: "pharmacies.json",
      metaKey: "pharmacies",
      csv: "csv/pharmacies.csv",
      geojson: "geojson/pharmacies.geojson",
      // name is intentionally nullable (many OSM pharmacies are unnamed), so the
      // required set guards identity + geocoding rather than name.
      required: ["id", "source", "wilaya_code", "lat", "lng"],
    },
  ],
  "gares-routieres": [
    {
      json: "stations.json",
      metaKey: "stations",
      csv: "csv/stations.csv",
      geojson: "geojson/stations.geojson",
      required: ["id", "name", "wilaya_code", "lat", "lng"],
    },
  ],
  ferroviaire: [
    {
      json: "stations.json",
      metaKey: "stations",
      csv: "csv/stations.csv",
      geojson: "geojson/stations.geojson",
      required: ["id", "type", "wilaya_code", "lat", "lng"],
    },
  ],
  buses: [
    {
      json: "lines.json",
      metaKey: "lines",
      csv: "csv/lines.csv",
      // Line-level only (no per-stop geometry yet) — every record is ungeocoded,
      // so there is nothing to mirror. A 0-feature FeatureCollection is
      // indistinguishable from a failed download in QGIS/Mapbox, so ship none.
      geojson: null,
      required: ["id", "name", "operator", "wilaya_code"],
    },
  ],
};

// Cross-file id uniqueness. `id` is unique within its file (v2 decision 10), which is
// only enough where a consumer reads one file at a time. A package whose index.js
// merges several data files into ONE collection publishes a joint namespace: a
// duplicate id across those files silently collapses records in any id-keyed lookup
// built from the merged array. Enforce joint uniqueness across exactly those sets.
//
// Derived from each package's export surface, not from "is it multi-file":
//   banques.all()      = banks + institutions        (branches is a separate collection)
//   emploi.agencies()  = awem + alem
//   mobilis.all()      = agences + pdv
//   tourisme.all()     = the five layer files (tagged with `layer`, ids untouched)
// Excluded on purpose: poste (postOffices/atms never merge), livraison (carriers/
// stopdesks/coverage are different entity kinds), telecom (the per-operator files are a
// partition of sites.json — identical ids are the design, and validateTelecom asserts it).
const MERGED_ID_NAMESPACES = {
  banques: ["banks.json", "institutions.json"],
  emploi: ["awem.json", "alem.json"],
  mobilis: ["agences.json", "pdv.json"],
  tourisme: ["lodging.json", "attractions.json", "historic.json", "thermal-springs.json", "parks.json"],
};

function validateMergedIds(pkgs) {
  for (const pkg of pkgs) {
    const files = MERGED_ID_NAMESPACES[pkg];
    if (!files) continue;
    const owner = new Map(); // id -> file that claimed it first
    const collisions = new Map(); // "a.json x b.json" -> count
    let total = 0;
    for (const file of files) {
      let arr;
      try {
        arr = readJson(join(ROOT, "packages", pkg, "data", file));
      } catch (e) {
        fail(`${pkg}/${file}: cannot read for the merged-id check — ${e.message}`);
        continue;
      }
      total += arr.length;
      for (const r of arr) {
        const id = String(r.id);
        const first = owner.get(id);
        if (first === undefined) owner.set(id, file);
        else {
          const k = `${first} x ${file}`;
          collisions.set(k, (collisions.get(k) || 0) + 1);
        }
      }
    }
    const dups = total - owner.size;
    if (dups > 0) {
      fail(
        `${pkg}: ${dups} id(s) collide across the files merged by index.js (${files.join(" + ")}) — ` +
          [...collisions].map(([k, n]) => `${k}: ${n}`).join(", "),
      );
    } else {
      console.log(`  OK: ${pkg} — ${owner.size} ids unique across ${files.length} merged files`);
    }
  }
}

// Count CSV data records (excluding the header), honouring RFC-4180 quoted
// fields: newlines inside double-quoted values do not start a new record, and
// blank lines (including trailing ones) are ignored. A naive split("\n") would
// over-count any address/name field that contains an embedded newline.
function csvRowCount(path) {
  const text = readFileSync(path, "utf-8");
  let rows = 0;
  let inQuotes = false;
  let lineHasContent = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      lineHasContent = true;
    } else if (!inQuotes && c === "\n") {
      if (lineHasContent) rows++;
      lineHasContent = false;
    } else if (c !== "\r") {
      lineHasContent = true;
    }
  }
  if (lineHasContent) rows++;
  return rows - 1; // minus header
}

function validateDataset(pkg, spec) {
  const dataDir = join(ROOT, "packages", pkg, "data");
  const jsonPath = join(dataDir, spec.json);
  const label = `${pkg}/${spec.json}`;

  let arr;
  try {
    arr = readJson(jsonPath);
  } catch (e) {
    return fail(`${label}: invalid JSON — ${e.message}`);
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    return fail(`${label}: expected a non-empty array`);
  }

  // count vs metadata
  let meta = {};
  try {
    meta = readJson(join(dataDir, "metadata.json"));
  } catch (e) {
    fail(`${pkg}/metadata.json: cannot read — ${e.message}`);
  }
  // v2 packages carry canonical metadata: multi-file packages track per-file counts in
  // entities[], single-file packages use record_count. v1 uses the package-named key.
  const isV2 = meta.schema_version === "2.0.0";
  let expected, expectedKey;
  if (isV2) {
    const entity = (meta.entities || []).find((e) => e.file === spec.json);
    if (entity) { expected = entity.count; expectedKey = `entities[${spec.json}]`; }
    else { expected = meta.record_count; expectedKey = "record_count"; }
  } else {
    expected = meta[spec.metaKey];
    expectedKey = spec.metaKey;
  }
  if (expected !== arr.length) {
    fail(`${label}: count ${arr.length} ≠ metadata.${expectedKey} ${expected}`);
  }

  // v2 contract: enforce the canonical GeoRecord + metadata shape via @geoalgeria/schema.
  if (isV2) {
    const { errors: v2errs, warnings: v2warn } = validateV2Records(arr, {
      requireName: spec.required.includes("name"),
    });
    for (const m of v2errs) fail(`${label} [v2]: ${m}`);
    const metaRes = validateV2Metadata(meta);
    for (const m of metaRes.errors) fail(`${pkg}/metadata.json [v2]: ${m}`);
    const warnCount = v2warn.length + metaRes.warnings.length;
    if (warnCount) console.log(`  ⚠ ${label} [v2]: ${warnCount} warning(s)`);
  }

  // csv mirror
  const csvPath = join(dataDir, spec.csv);
  if (!existsSync(csvPath)) {
    fail(`${label}: missing CSV mirror ${spec.csv}`);
  } else {
    const rows = csvRowCount(csvPath);
    if (rows !== arr.length) {
      fail(`${label}: CSV rows ${rows} ≠ JSON records ${arr.length}`);
    }
  }

  // geojson mirror === records with coordinates
  const withCoord = arr.filter(hasCoord).length;
  if (spec.geojson) {
    const gPath = join(dataDir, spec.geojson);
    if (!existsSync(gPath)) {
      fail(`${label}: missing GeoJSON mirror ${spec.geojson}`);
    } else {
      const features = readJson(gPath).features;
      if (!Array.isArray(features)) {
        fail(`${label}: ${spec.geojson} has no FeatureCollection "features" array`);
      } else if (features.length !== withCoord) {
        fail(
          `${label}: GeoJSON features ${features.length} ≠ records with coordinates ${withCoord}`,
        );
      }
    }
  }

  // Legacy per-record checks (v1 only). v2 packages are covered by validateV2Records
  // above, whose multilingual-name rule (name|name_fr|name_ar) would otherwise conflict
  // with the v1 required-"name" check below and false-fail Arabic-only-named records.
  if (!isV2) {
    // duplicate ids
    const ids = arr.map((r) => r.id);
    const dups = ids.length - new Set(ids).size;
    if (dups > 0) fail(`${label}: ${dups} duplicate id(s)`);

    // wilaya_code range + required fields (sample-reported, not per-row spam)
    let badWilaya = 0;
    let missingField = 0;
    for (const r of arr) {
      const w = Number(r.wilaya_code);
      // require a plain integer string/number (rejects booleans, "16.0", arrays
      // that Number() would otherwise coerce to an in-range integer)
      if (!/^\d+$/.test(String(r.wilaya_code)) || w < 1 || w > 69) badWilaya++;
      for (const f of spec.required) {
        if (r[f] === undefined || r[f] === null || r[f] === "") missingField++;
      }
    }
    if (badWilaya > 0) {
      fail(`${label}: ${badWilaya} record(s) with wilaya_code outside [1,69]`);
    }
    if (missingField > 0) {
      fail(
        `${label}: ${missingField} missing required field(s) (${spec.required.join(", ")})`,
      );
    }
  }

  console.log(
    `  OK: ${label} — ${arr.length} records${spec.geojson ? `, ${withCoord} geocoded` : " (ungeocoded)"}`,
  );
}

// dataset/data/poste is a mirror of @geoalgeria/poste — guard against drift.
//
// The whole tree, not just the JSON. poste/scripts/fetch.mjs emits all seven
// files (json + csv/ + geojson/ + metadata.json) to both destinations from one
// run, so anything less than a full-tree compare is not a mirror check. It used
// to compare `*.json` alone, and the v2 migration regenerated packages/poste
// without re-running that emit: the JSON went v2 while the mirror's csv/,
// geojson/ and metadata.json stayed on the v1 columns, ids and row order from
// 86c918d. `geoalgeria` therefore published v2 JSON beside v1 CSV/GeoJSON of
// the same records, and CI stayed green throughout.
//
// Compares bytes, and walks both sides so an extra or missing file is caught
// too — a re-copy that forgets a file must not read as "in sync".
function walkFiles(dir, base = dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, base, out);
    else out.push(p.slice(base.length + 1));
  }
  return out.sort();
}

function validateMirror() {
  const sourceDir = join(ROOT, "packages", "poste", "data");
  const mirrorDir = join(ROOT, "packages", "dataset", "data", "poste");
  if (!existsSync(mirrorDir)) {
    fail("mirror: dataset/data/poste is missing entirely");
    return;
  }
  const sourceFiles = walkFiles(sourceDir);
  const mirrorFiles = new Set(walkFiles(mirrorDir));

  for (const file of sourceFiles) {
    mirrorFiles.delete(file);
    const mirror = join(mirrorDir, file);
    if (!existsSync(mirror)) {
      fail(`mirror: dataset/data/poste/${file} is missing`);
      continue;
    }
    if (!readFileSync(join(sourceDir, file)).equals(readFileSync(mirror))) {
      fail(
        `mirror: dataset/data/poste/${file} drifted from @geoalgeria/poste — re-copy from packages/poste/data/${file}`,
      );
    }
  }
  // Anything left is in the mirror but not in the source.
  for (const extra of mirrorFiles)
    fail(`mirror: dataset/data/poste/${extra} has no counterpart in packages/poste/data`);

  if (!errors.some((e) => e.startsWith("mirror:")))
    console.log(`  OK: mirror dataset/data/poste in sync (${sourceFiles.length} files, byte-identical)`);
}

// npm's `files` patterns are literal: "data/**/*.json" does NOT match ".geojson".
// A package that generates CSV/GeoJSON mirrors but forgets the matching glob
// therefore publishes JSON only — and nothing catches it, because the mirrors are
// committed and every check above passes on the working tree, not on the tarball.
// (banques, livraison and buses each shipped that way.) Assert the two stay in sync.
const DERIVED = [
  [".csv", "data/**/*.csv"],
  [".geojson", "data/**/*.geojson"],
  [".sql", "data/**/*.sql"], // core dataset only (v2 decision #7)
];

/** Extensions of every file committed under a package's data/ directory. */
function derivedExtensions(dir) {
  const found = new Set();
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(d, e.name));
      else found.add(e.name.slice(e.name.lastIndexOf(".")));
    }
  };
  walk(dir);
  return found;
}

function validatePackageFiles(pkgs) {
  for (const pkg of pkgs) {
    const dataDir = join(ROOT, "packages", pkg, "data");
    if (!existsSync(dataDir)) continue;
    let files;
    try {
      files = readJson(join(ROOT, "packages", pkg, "package.json")).files || [];
    } catch (e) {
      fail(`${pkg}/package.json: cannot read — ${e.message}`);
      continue;
    }
    const exts = derivedExtensions(dataDir);
    const missing = DERIVED.filter(([ext, glob]) => exts.has(ext) && !files.includes(glob));
    if (missing.length) {
      fail(
        `${pkg}/package.json: data/ ships ${missing.map(([e]) => e).join(" + ")} but files[] omits ${missing
          .map(([, g]) => `"${g}"`)
          .join(" + ")} — npm would publish neither`,
      );
    } else {
      console.log(`  OK: ${pkg} files[] covers its derived data`);
    }
  }
}

// types/index.d.ts ↔ shipped JSON.
//
// Every data package publishes `types/` in files[], so its .d.ts IS the public
// API for TypeScript consumers — and nothing ever checked it against the data.
// The v2 migration renamed and added fields in 22 packages and updated five
// declarations, so the rest kept describing v1: `metadata().airports` typed
// `number` and `undefined` at runtime, `id: number` against `"00001"` strings,
// `wilaya_name`/`type_code`/`osm_id` fields that no record carries, and no
// `geo_method` anywhere. All of it type-checks; all of it is wrong.
//
// A .d.ts is not executable, so this checks the two things that can be checked
// mechanically — which names are declared, and whether a declaration admits null:
//   - every key in the JSON is declared            (undeclared field)
//   - every key the .d.ts declares itself occurs   (declared-but-absent)
//   - every non-optional key is on EVERY record    (required but sometimes missing)
//   - every key that is ever null admits null      (`lat: number` over null coords)
//   - a string-literal union covers every value    (`type: "a"|"b"` over a "c")
// Keys inherited through `extends` from a shared base are exempt from the second
// rule: a shared contract describes the family, not one dataset. Local `type`
// aliases are expanded before the null test, so `geo_precision: GeoPrecision`
// counts as nullable exactly when that alias includes null.
//
// Excluded: telecom (the last v1 holdout — no schema_version, its own nested
// coverage/<tech>/ shape and validateTelecom above), and the core `geoalgeria`
// dataset (administrative divisions, not GeoRecords; validate.py owns it).
const TYPED = {
  agriculture: { "agriculture.json": "AgricultureInstitution" },
  aviation: { "airports.json": "Airport" },
  banques: { "banks.json": "Institution", "institutions.json": "Institution", "branches.json": "Branch" },
  buses: { "lines.json": "BusLine" },
  culture: { "culture.json": "CulturalSite" },
  djezzy: { "boutiques.json": "Boutique" },
  ecoles: { "ecoles.json": "Ecole" },
  emploi: { "awem.json": "Awem", "alem.json": "Alem" },
  "enseignement-superieur": { "institutions.json": "Institution" },
  ferroviaire: { "stations.json": "Station" },
  "formation-professionnelle": { "establishments.json": "Establishment" },
  "gares-routieres": { "stations.json": "Station" },
  "industrie-pharmaceutique": { "industrie-pharmaceutique.json": "PharmaManufacturer" },
  jeunesse: { "institutions.json": "Institution" },
  livraison: { "carriers.json": "Carrier", "stopdesks.json": "StopDesk", "coverage.json": "CarrierCoverage" },
  mobilis: { "agences.json": "Agence", "pdv.json": "Pdv" },
  mosquees: { "mosquees.json": "Mosquee" },
  ooredoo: { "stores.json": "OoredooStore" },
  pharmacies: { "pharmacies.json": "Pharmacy" },
  poste: { "postoffices.json": "PostOffice", "atms.json": "Atm" },
  sante: { "sante.json": "HealthEstablishment" },
  sports: { "facilities.json": "Facility" },
  tourisme: {
    "lodging.json": "Lodging",
    "attractions.json": "Attraction",
    "historic.json": "Historic",
    "thermal-springs.json": "ThermalSpring",
    "parks.json": "Park",
  },
};
const TYPES_EXEMPT = new Set(["telecom", "dataset"]);

/** name → { ext: string[], props: Map<name, {optional}> } for every interface in a .d.ts. */
function parseInterfaces(src) {
  const out = new Map();
  const re = /\binterface\s+([A-Za-z0-9_]+)\s*(?:extends\s+([^{]+?))?\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    const ext = (m[2] || "").split(",").map((s) => s.trim()).filter(Boolean);
    let depth = 1;
    let i = re.lastIndex;
    for (; i < src.length && depth > 0; i++) depth += src[i] === "{" ? 1 : src[i] === "}" ? -1 : 0;
    const body = src.slice(re.lastIndex, i - 1);
    // Members at brace depth 0 only, so an inline nested object (refs: { osm: string })
    // contributes `refs` and not `osm`.
    const props = new Map();
    let d = 0;
    for (const line of body.split("\n")) {
      const pm = d === 0 && line.match(/^\s*(?:readonly\s+)?["']?([A-Za-z_][A-Za-z0-9_]*)["']?(\?)?\s*:(.*)$/);
      if (pm) props.set(pm[1], { optional: !!pm[2], type: pm[3] });
      for (const c of line) d += c === "{" ? 1 : c === "}" ? -1 : 0;
    }
    out.set(name, { ext, props });
  }
  return out;
}

/** Flatten an interface's own + inherited members, or report the first unresolved parent. */
function flatten(name, ifaces, seen = new Set()) {
  const it = ifaces.get(name);
  if (!it || seen.has(name)) return { missing: name };
  seen.add(name);
  const props = new Map();
  for (const parent of it.ext) {
    const inh = flatten(parent, ifaces, seen);
    if (inh.missing) return { missing: inh.missing };
    for (const [k, v] of inh.props) props.set(k, { ...v, inherited: true });
  }
  for (const [k, v] of it.props) props.set(k, { ...v, inherited: false });
  return { props };
}

/** Keys seen on at least one record, keys seen on every record, keys ever null. */
function keySets(rows) {
  const ever = new Set();
  const nullable = new Set();
  const always = new Set(Object.keys(rows[0] || {}));
  for (const r of rows) {
    for (const [k, v] of Object.entries(r)) {
      ever.add(k);
      if (v === null) nullable.add(k);
    }
    for (const k of [...always]) if (!Object.prototype.hasOwnProperty.call(r, k)) always.delete(k);
  }
  return { ever, always, nullable };
}

/** `export type X = …;` aliases, so a field typed by alias can be tested for null. */
function typeAliases(src) {
  const out = new Map();
  for (const m of src.matchAll(/^\s*(?:export\s+)?type\s+([A-Za-z0-9_]+)\s*=\s*([\s\S]*?);\s*$/gm))
    out.set(m[1], m[2]);
  return out;
}

/** A declared type with local aliases substituted in and comments stripped. */
function expandType(type, aliases) {
  let t = String(type).replace(/;.*$/, "");
  for (let i = 0; i < 5; i++) {
    const next = t.replace(/\b[A-Za-z0-9_]+\b/g, (w) => (aliases.has(w) ? `(${aliases.get(w)})` : w));
    if (next === t) break;
    t = next;
  }
  return t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").trim();
}

/** The literal set of a type that is nothing but string literals (plus null/undefined), else null. */
function literalUnion(expanded) {
  const lits = [...expanded.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  if (!lits.length) return null;
  const rest = expanded.replace(/"[^"]*"/g, "").replace(/null|undefined/g, "").replace(/[|()\s]/g, "");
  return rest ? null : lits;
}

function validateTypes(pkgs) {
  for (const pkg of pkgs) {
    if (TYPES_EXEMPT.has(pkg)) continue;
    const typesPath = join(ROOT, "packages", pkg, "types", "index.d.ts");
    const dataDir = join(ROOT, "packages", pkg, "data");
    if (!existsSync(dataDir) || !existsSync(typesPath)) continue;
    const files = TYPED[pkg];
    if (!files) {
      fail(`${pkg}: ships data/ + types/index.d.ts but has no entry in TYPED — add its record interfaces`);
      continue;
    }

    let src = readFileSync(typesPath, "utf-8");
    // A declaration that inherits from the shared contract needs it parsed too.
    if (/^import\s[^\n]*@geoalgeria\/schema/m.test(src))
      src += "\n" + readFileSync(join(ROOT, "packages", "schema", "types", "index.d.ts"), "utf-8");
    const ifaces = parseInterfaces(src);
    const aliases = typeAliases(src);

    let problems = 0;
    const check = (file, iname, rows) => {
      const { props, missing } = flatten(iname, ifaces);
      if (missing) {
        problems++;
        return fail(`${pkg}/types: ${file} maps to interface ${iname}, but ${missing} is not declared there`);
      }
      const { ever, always, nullable } = keySets(rows);
      const undeclared = [...ever].filter((k) => !props.has(k));
      const absent = [...props].filter(([k, v]) => !v.inherited && !ever.has(k)).map(([k]) => k);
      const notAlways = [...props].filter(([k, v]) => !v.optional && ever.has(k) && !always.has(k)).map(([k]) => k);
      const notNullable = [];
      const badEnum = [];
      for (const [k, v] of props) {
        const t = expandType(v.type || "", aliases);
        if (nullable.has(k) && !/\bnull\b/.test(t)) notNullable.push(k);
        const lits = literalUnion(t);
        if (!lits) continue;
        const unknown = [...new Set(rows.map((r) => r[k]).filter((x) => typeof x === "string"))]
          .filter((x) => !lits.includes(x));
        if (unknown.length) badEnum.push(`${k} (${unknown.map((x) => JSON.stringify(x)).join(", ")})`);
      }
      if (undeclared.length) {
        problems++;
        fail(`${pkg}/${file}: ${undeclared.length} field(s) ship but ${iname} does not declare them — ${undeclared.join(", ")}`);
      }
      if (absent.length) {
        problems++;
        fail(`${pkg}/${file}: ${iname} declares ${absent.length} field(s) that no record carries — ${absent.join(", ")}`);
      }
      if (notAlways.length) {
        problems++;
        fail(`${pkg}/${file}: ${iname} declares ${notAlways.join(", ")} as required, but some records omit it — mark optional`);
      }
      if (notNullable.length) {
        problems++;
        fail(`${pkg}/${file}: ${iname} declares ${notNullable.join(", ")} as non-nullable, but records carry null — add "| null"`);
      }
      if (badEnum.length) {
        problems++;
        fail(`${pkg}/${file}: ${iname} declares a string-literal union that the data escapes — ${badEnum.join("; ")}`);
      }
    };

    for (const [file, iname] of Object.entries(files)) {
      let rows;
      try {
        rows = readJson(join(dataDir, file));
      } catch (e) {
        problems++;
        fail(`${pkg}/${file}: cannot read for the types check — ${e.message}`);
        continue;
      }
      check(file, iname, rows);
    }
    try {
      check("metadata.json", "Metadata", [readJson(join(dataDir, "metadata.json"))]);
    } catch (e) {
      problems++;
      fail(`${pkg}/metadata.json: cannot read for the types check — ${e.message}`);
    }
    if (!problems)
      console.log(`  OK: ${pkg} types match the shipped data (${Object.keys(files).length + 1} files)`);
  }
}

// telecom has a bespoke shape (coverage namespaced by technology, split into
// per-operator files, nested metadata) that doesn't fit the flat PACKAGES table,
// so it gets a dedicated validator — sharing the same fail()/errors/readJson/
// csvRowCount/hasCoord helpers and the single pass/fail summary below.
function validateTelecom() {
  const dataDir = join(ROOT, "packages", "telecom", "data");
  const fivegDir = join(dataDir, "coverage", "5g");
  // 5G is real (operator-published); bounds-check that coordinates land in Algeria.
  const inAlgeria = (lat, lng) =>
    Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

  let meta;
  try {
    meta = readJson(join(dataDir, "metadata.json"));
  } catch (e) {
    return fail(`telecom/metadata.json: cannot read — ${e.message}`);
  }
  const summary = meta.coverage?.["5G"] || {};

  let sites;
  try {
    sites = readJson(join(fivegDir, "sites.json"));
  } catch (e) {
    return fail(`telecom/sites.json: invalid JSON — ${e.message}`);
  }
  if (!Array.isArray(sites) || sites.length === 0) {
    return fail("telecom/sites.json: expected a non-empty array");
  }

  // combined count vs metadata
  if (summary.total !== sites.length) {
    fail(`telecom/sites.json: count ${sites.length} ≠ metadata.coverage.5G.total ${summary.total}`);
  }

  // per-operator files — counts AND content (ids) must reconcile with sites.json
  const operators = Object.keys(summary.by_operator || {});
  const operatorIds = [];
  for (const op of operators) {
    const f = join(fivegDir, `${op}.json`);
    if (!existsSync(f)) {
      fail(`telecom: missing per-operator file ${op}.json`);
      continue;
    }
    const arr = readJson(f);
    operatorIds.push(...arr.map((r) => r.id));
    if (arr.length !== summary.by_operator[op]) {
      fail(`telecom/${op}.json: count ${arr.length} ≠ metadata.by_operator.${op} ${summary.by_operator[op]}`);
    }
    if (arr.some((r) => r.operator !== op)) {
      fail(`telecom/${op}.json: contains rows from another operator`);
    }
  }
  const siteIds = new Set(sites.map((s) => s.id));
  const opIdSet = new Set(operatorIds);
  if (operatorIds.length !== sites.length) {
    fail(`telecom: per-operator files sum ${operatorIds.length} ≠ sites.json ${sites.length}`);
  }
  if (opIdSet.size !== siteIds.size || [...siteIds].some((i) => !opIdSet.has(i))) {
    fail(`telecom: sites.json ids do not match the union of per-operator ids (content drift)`);
  }

  // csv mirror
  const csvPath = join(dataDir, "csv", "coverage", "5g", "sites.csv");
  if (!existsSync(csvPath)) {
    fail("telecom: missing csv/coverage/5g/sites.csv");
  } else {
    const rows = csvRowCount(csvPath);
    if (rows !== sites.length) fail(`telecom: CSV rows ${rows} ≠ sites ${sites.length}`);
  }

  // geojson mirror === sites with coordinates (shared hasCoord rejects blank
  // coords, matching validateDataset — telecom stores numbers, but stay consistent)
  const geoPath = join(dataDir, "geojson", "coverage", "5g", "sites.geojson");
  const withCoord = sites.filter(hasCoord).length;
  if (!existsSync(geoPath)) {
    fail("telecom: missing geojson/coverage/5g/sites.geojson");
  } else {
    const features = readJson(geoPath).features;
    if (!Array.isArray(features)) {
      fail("telecom/sites.geojson: no FeatureCollection features array");
    } else if (features.length !== withCoord) {
      fail(`telecom: GeoJSON features ${features.length} ≠ sites with coordinates ${withCoord}`);
    }
  }

  // per-record invariants
  const dups = sites.length - siteIds.size;
  if (dups > 0) fail(`telecom: ${dups} duplicate id(s)`);

  let badWilaya = 0;
  let badTech = 0;
  let badCoord = 0;
  let missing = 0;
  for (const s of sites) {
    const w = Number(s.wilaya_code);
    if (!/^\d+$/.test(String(s.wilaya_code)) || w < 1 || w > 69) badWilaya++;
    if (s.technology !== "5G") badTech++;
    if (!inAlgeria(s.lat, s.lng)) badCoord++;
    for (const f of ["id", "operator", "wilaya_code", "lat", "lng"]) {
      if (s[f] === undefined || s[f] === null || s[f] === "") missing++;
    }
  }
  if (badWilaya) fail(`telecom: ${badWilaya} record(s) with wilaya_code outside [1,69]`);
  if (badTech) fail(`telecom: ${badTech} record(s) with technology ≠ "5G"`);
  if (badCoord) fail(`telecom: ${badCoord} record(s) with coordinates outside Algeria`);
  if (missing) fail(`telecom: ${missing} missing required field(s)`);

  console.log(
    `  OK: ${sites.length} 5G sites (${operators.map((o) => `${o} ${summary.by_operator[o]}`).join(", ")}), ${summary.wilayas_covered} wilayas`,
  );
}

// livraison has three datasets of different shapes: only `stopdesks` is geocoded and
// carries wilaya_code; `carriers` (registry) and `coverage` (per-carrier presence) have
// no wilaya_code, so they can't use the wilaya_code-enforcing table validator. Dedicated
// validator, sharing the same fail()/readJson/csvRowCount/hasCoord helpers.
function validateLivraison() {
  const dataDir = join(ROOT, "packages", "livraison", "data");
  const inAlgeria = (lat, lng) =>
    Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

  let meta;
  try {
    meta = readJson(join(dataDir, "metadata.json"));
  } catch (e) {
    return fail(`livraison/metadata.json: cannot read — ${e.message}`);
  }
  // v2 contract: stopdesks.json is the package's only true GeoRecord file (carriers/
  // coverage have no wilaya_code, so they stay outside the strict contract). Dormant
  // until metadata.schema_version flips to "2.0.0" — mirrors validateDataset's isV2 gate.
  const isV2 = meta.schema_version === "2.0.0";

  // carriers (registry — no coordinates, no wilaya_code)
  let carriers = [];
  try {
    carriers = readJson(join(dataDir, "carriers.json"));
  } catch (e) {
    fail(`livraison/carriers.json: invalid JSON — ${e.message}`);
  }
  if (!Array.isArray(carriers) || !carriers.length) fail("livraison/carriers.json: expected a non-empty array");
  if (meta.carriers !== carriers.length) {
    fail(`livraison/carriers.json: count ${carriers.length} ≠ metadata.carriers ${meta.carriers}`);
  }
  const carrierIds = new Set(carriers.map((c) => c.id));
  if (carrierIds.size !== carriers.length) fail("livraison/carriers.json: duplicate carrier id(s)");
  if (carriers.some((c) => !c.id || !c.name)) fail("livraison/carriers.json: record(s) missing id/name");
  const carriersCsv = join(dataDir, "csv", "carriers.csv");
  if (!existsSync(carriersCsv)) fail("livraison: missing csv/carriers.csv");
  else if (csvRowCount(carriersCsv) !== carriers.length) fail(`livraison: carriers CSV rows ≠ JSON ${carriers.length}`);

  // stopdesks (geocoded points, wilaya_code required)
  let desks = [];
  try {
    desks = readJson(join(dataDir, "stopdesks.json"));
  } catch (e) {
    fail(`livraison/stopdesks.json: invalid JSON — ${e.message}`);
  }
  if (!Array.isArray(desks) || !desks.length) fail("livraison/stopdesks.json: expected a non-empty array");
  if (meta.stopdesks !== desks.length) {
    fail(`livraison/stopdesks.json: count ${desks.length} ≠ metadata.stopdesks ${meta.stopdesks}`);
  }
  const deskIds = new Set(desks.map((s) => s.id));
  if (deskIds.size !== desks.length) fail(`livraison/stopdesks.json: ${desks.length - deskIds.size} duplicate id(s)`);

  if (isV2) {
    const { errors: v2errs, warnings: v2warn } = validateV2Records(desks, { requireName: true });
    for (const m of v2errs) fail(`livraison/stopdesks.json [v2]: ${m}`);
    const metaRes = validateV2Metadata(meta);
    for (const m of metaRes.errors) fail(`livraison/metadata.json [v2]: ${m}`);
    const warnCount = v2warn.length + metaRes.warnings.length;
    if (warnCount) console.log(`  ⚠ livraison/stopdesks.json [v2]: ${warnCount} warning(s)`);
  }
  let badWilaya = 0, badCoord = 0, missing = 0, badOp = 0;
  for (const s of desks) {
    if (!isV2) {
      const w = Number(s.wilaya_code);
      if (!/^\d+$/.test(String(s.wilaya_code)) || w < 1 || w > 69) badWilaya++;
      if (!inAlgeria(s.lat, s.lng)) badCoord++;
      for (const f of ["id", "operator", "name", "wilaya_code"]) {
        if (s[f] === undefined || s[f] === null || s[f] === "") missing++;
      }
    }
    if (!carrierIds.has(s.operator)) badOp++;
  }
  if (badWilaya) fail(`livraison: ${badWilaya} stop-desk(s) with wilaya_code outside [1,69]`);
  if (badCoord) fail(`livraison: ${badCoord} stop-desk(s) with coordinates outside Algeria`);
  if (missing) fail(`livraison: ${missing} missing required stop-desk field(s)`);
  if (badOp) fail(`livraison: ${badOp} stop-desk(s) with an operator absent from carriers.json`);
  const deskCsv = join(dataDir, "csv", "stopdesks.csv");
  if (!existsSync(deskCsv)) fail("livraison: missing csv/stopdesks.csv");
  else if (csvRowCount(deskCsv) !== desks.length) fail(`livraison: stopdesks CSV rows ≠ JSON ${desks.length}`);
  const geo = join(dataDir, "geojson", "stopdesks.geojson");
  const withCoord = desks.filter(hasCoord).length;
  if (!existsSync(geo)) fail("livraison: missing geojson/stopdesks.geojson");
  else {
    const features = readJson(geo).features;
    if (!Array.isArray(features)) fail("livraison/stopdesks.geojson: no FeatureCollection features array");
    else if (features.length !== withCoord) fail(`livraison: GeoJSON features ${features.length} ≠ stop-desks with coordinates ${withCoord}`);
  }

  // coverage (per-carrier presence — reconciles against stopdesks + carriers)
  let cov = [];
  try {
    cov = readJson(join(dataDir, "coverage.json"));
  } catch (e) {
    fail(`livraison/coverage.json: invalid JSON — ${e.message}`);
  }
  if (!Array.isArray(cov) || !cov.length) fail("livraison/coverage.json: expected a non-empty array");
  if (meta.coverage !== cov.length) {
    fail(`livraison/coverage.json: count ${cov.length} ≠ metadata.coverage ${meta.coverage}`);
  }
  const covIds = new Set(cov.map((c) => c.operator));
  if (covIds.size !== cov.length) fail("livraison/coverage.json: duplicate operator id(s)");
  let covSum = 0, covBadWilaya = 0;
  for (const c of cov) {
    if (!carrierIds.has(c.operator)) fail(`livraison/coverage.json: operator "${c.operator}" not in carriers.json`);
    if (!Number.isInteger(c.stopdesks)) fail(`livraison/coverage.json: operator "${c.operator}" has a non-integer stopdesks count`);
    covSum += Number(c.stopdesks);
    // coverage.wilayas is derived from stopdesks.wilaya_code, so it must carry the
    // same key type — zero-padded strings — or the two files won't join.
    if (!Array.isArray(c.wilayas) || c.wilayas.some((w) => !WILAYA_CODES.includes(w))) covBadWilaya++;
  }
  if (covBadWilaya) fail(`livraison: ${covBadWilaya} coverage row(s) whose wilayas[] are not zero-padded codes "01".."69"`);
  if (covSum !== desks.length) fail(`livraison: coverage stop-desk sum ${covSum} ≠ stopdesks ${desks.length}`);
  const covCsv = join(dataDir, "csv", "coverage.csv");
  if (!existsSync(covCsv)) fail("livraison: missing csv/coverage.csv");
  else if (csvRowCount(covCsv) !== cov.length) fail(`livraison: coverage CSV rows ≠ JSON ${cov.length}`);

  console.log(
    `  OK: ${carriers.length} carriers, ${desks.length} stop-desks (${withCoord} geocoded, ${meta.wilayas_covered} wilayas), ${cov.length} coverage rows`,
  );
}

// Flat (table-driven) packages plus the bespoke telecom + livraison validators, in run order.
const FLAT = Object.keys(PACKAGES);
const ALL = [...FLAT, "telecom", "livraison"];

const only = process.argv[2];
const targets = only ? [only] : ALL;
for (const pkg of targets) {
  if (pkg === "telecom") {
    console.log(`\n[@geoalgeria/telecom]`);
    validateTelecom();
    continue;
  }
  if (pkg === "livraison") {
    console.log(`\n[@geoalgeria/livraison]`);
    validateLivraison();
    continue;
  }
  if (!PACKAGES[pkg]) {
    fail(`unknown package "${pkg}" (expected: ${ALL.join(", ")})`);
    continue;
  }
  console.log(`\n[@geoalgeria/${pkg}]`);
  for (const spec of PACKAGES[pkg]) validateDataset(pkg, spec);
}
console.log(`\n[cross-file id uniqueness (merged export surfaces)]`);
validateMergedIds(only ? [only] : Object.keys(MERGED_ID_NAMESPACES));

console.log(`\n[package files[] ↔ derived data]`);
validatePackageFiles(
  only ? [only] : readdirSync(join(ROOT, "packages")).sort(),
);

console.log(`\n[types/index.d.ts ↔ shipped data]`);
validateTypes(only ? [only] : readdirSync(join(ROOT, "packages")).sort());

// the mirror is poste-specific — only run it when validating poste (or all)
if (!only || only === "poste") {
  console.log(`\n[mirror: dataset ↔ poste]`);
  validateMirror();
}

console.log("\n" + "=".repeat(40));
if (errors.length) {
  console.error(`FAILED: ${errors.length} error(s)`);
  process.exit(1);
}
console.log("PASSED: all scoped packages valid");
