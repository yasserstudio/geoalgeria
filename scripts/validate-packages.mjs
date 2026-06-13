#!/usr/bin/env node
// Validate the scoped data packages (@geoalgeria/poste, /mobilis, /emploi) for
// integrity and cross-format consistency. The flagship `geoalgeria` dataset has
// its own Python validator (packages/dataset/scripts/validate.py); this is the
// Node counterpart for the scoped packages so every package is guarded on every
// commit and before every publish.
//
// Usage: node scripts/validate-packages.mjs [poste|mobilis|emploi]
//        (no arg = validate all)
//
// Checks, per dataset:
//   - JSON parses to a non-empty array
//   - record count === the matching field in metadata.json
//   - CSV row count (minus header) === record count
//   - GeoJSON feature count === records with valid coordinates
//   - zero duplicate `id`
//   - every `wilaya_code` is an integer in [1, 58]
//   - required identity fields present and non-empty on every record
// Plus a mirror-drift check: dataset/data/poste/*.json must equal packages/poste.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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
};

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
  if (meta[spec.metaKey] !== arr.length) {
    fail(
      `${label}: count ${arr.length} ≠ metadata.${spec.metaKey} ${meta[spec.metaKey]}`,
    );
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
    if (!/^\d+$/.test(String(r.wilaya_code)) || w < 1 || w > 58) badWilaya++;
    for (const f of spec.required) {
      if (r[f] === undefined || r[f] === null || r[f] === "") missingField++;
    }
  }
  if (badWilaya > 0) {
    fail(`${label}: ${badWilaya} record(s) with wilaya_code outside [1,58]`);
  }
  if (missingField > 0) {
    fail(
      `${label}: ${missingField} missing required field(s) (${spec.required.join(", ")})`,
    );
  }

  console.log(
    `  OK: ${label} — ${arr.length} records${spec.geojson ? `, ${withCoord} geocoded` : " (ungeocoded)"}`,
  );
}

// dataset/data/poste/*.json is a mirror of @geoalgeria/poste — guard against drift.
function validateMirror() {
  const norm = (p) => JSON.stringify(readJson(p));
  for (const file of ["postoffices.json", "atms.json"]) {
    const source = join(ROOT, "packages", "poste", "data", file);
    const mirror = join(ROOT, "packages", "dataset", "data", "poste", file);
    if (!existsSync(mirror)) {
      fail(`mirror: dataset/data/poste/${file} is missing`);
      continue;
    }
    if (norm(source) !== norm(mirror)) {
      fail(
        `mirror: dataset/data/poste/${file} drifted from @geoalgeria/poste — re-copy from packages/poste/data/${file}`,
      );
    } else {
      console.log(`  OK: mirror dataset/data/poste/${file} in sync`);
    }
  }
}

const only = process.argv[2];
const targets = only ? [only] : Object.keys(PACKAGES);
for (const pkg of targets) {
  if (!PACKAGES[pkg]) {
    fail(`unknown package "${pkg}" (expected: ${Object.keys(PACKAGES).join(", ")})`);
    continue;
  }
  console.log(`\n[@geoalgeria/${pkg}]`);
  for (const spec of PACKAGES[pkg]) validateDataset(pkg, spec);
}
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
