#!/usr/bin/env node
// Validate the @geoalgeria/telecom coverage datasets for integrity and
// cross-format consistency. Package-local (mirrors the dataset package's own
// validator); can later fold into the repo-wide scripts/validate-packages.mjs.
//
// Checks:
//   - sites.json parses to a non-empty array; per-operator files sum to it
//   - combined count === metadata.coverage["5G"].total
//   - per-operator count === metadata.coverage["5G"].by_operator[op]
//   - CSV rows === site count; GeoJSON features === sites with coordinates
//   - zero duplicate id; technology always present; wilaya_code in [1,58]
//   - required fields present (id, operator, wilaya_code, lat, lng)

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const FIVEG = join(DATA, "coverage", "5g");
const errors = [];
const fail = (m) => {
  errors.push(m);
  console.error(`  FAIL: ${m}`);
};
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// RFC-4180-aware record count (a newline inside a quoted cell does not start a
// new record); a naive split("\n") would miscount any name/address with a newline.
function csvRecordCount(text) {
  let rows = 0,
    inQ = false,
    has = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQ = !inQ;
      has = true;
    } else if (!inQ && c === "\n") {
      if (has) rows++;
      has = false;
    } else if (c !== "\r") has = true;
  }
  if (has) rows++;
  return rows - 1; // minus header
}
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

const meta = readJson(join(DATA, "metadata.json"));
const summary = meta.coverage?.["5G"] || {};

const sites = readJson(join(FIVEG, "sites.json"));
if (!Array.isArray(sites) || sites.length === 0) fail("sites.json: expected a non-empty array");

// combined count vs metadata
if (summary.total !== sites.length)
  fail(`sites.json: count ${sites.length} ≠ metadata.coverage.5G.total ${summary.total}`);

// per-operator files — counts AND content (ids) must reconcile with sites.json
const operators = Object.keys(summary.by_operator || {});
const operatorIds = [];
for (const op of operators) {
  const f = join(FIVEG, `${op}.json`);
  if (!existsSync(f)) {
    fail(`missing per-operator file ${op}.json`);
    continue;
  }
  const arr = readJson(f);
  operatorIds.push(...arr.map((r) => r.id));
  if (arr.length !== summary.by_operator[op])
    fail(`${op}.json: count ${arr.length} ≠ metadata.by_operator.${op} ${summary.by_operator[op]}`);
  if (arr.some((r) => r.operator !== op)) fail(`${op}.json: contains rows from another operator`);
}
const siteIds = new Set(sites.map((s) => s.id));
const opIdSet = new Set(operatorIds);
if (operatorIds.length !== sites.length)
  fail(`per-operator files sum ${operatorIds.length} ≠ sites.json ${sites.length}`);
if (opIdSet.size !== siteIds.size || [...siteIds].some((i) => !opIdSet.has(i)))
  fail(`sites.json ids do not match the union of per-operator ids (content drift)`);

// CSV mirror
const csv = join(DATA, "csv", "coverage", "5g", "sites.csv");
if (!existsSync(csv)) fail("missing csv/coverage/5g/sites.csv");
else {
  const rows = csvRecordCount(readFileSync(csv, "utf8"));
  if (rows !== sites.length) fail(`CSV rows ${rows} ≠ sites ${sites.length}`);
}

// GeoJSON mirror === sites with coordinates
const geo = join(DATA, "geojson", "coverage", "5g", "sites.geojson");
const withCoord = sites.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng)).length;
if (!existsSync(geo)) fail("missing geojson/coverage/5g/sites.geojson");
else {
  const features = readJson(geo).features;
  if (!Array.isArray(features)) fail("sites.geojson: no FeatureCollection features array");
  else if (features.length !== withCoord)
    fail(`GeoJSON features ${features.length} ≠ sites with coordinates ${withCoord}`);
}

// per-record invariants
const ids = sites.map((s) => s.id);
const dups = ids.length - new Set(ids).size;
if (dups > 0) fail(`${dups} duplicate id(s)`);

let badWilaya = 0,
  badTech = 0,
  badCoord = 0,
  missing = 0;
for (const s of sites) {
  const w = Number(s.wilaya_code);
  if (!/^\d+$/.test(String(s.wilaya_code)) || w < 1 || w > 58) badWilaya++;
  if (s.technology !== "5G") badTech++;
  if (!inAlgeria(s.lat, s.lng)) badCoord++;
  for (const f of ["id", "operator", "wilaya_code", "lat", "lng"])
    if (s[f] === undefined || s[f] === null || s[f] === "") missing++;
}
if (badWilaya) fail(`${badWilaya} record(s) with wilaya_code outside [1,58]`);
if (badTech) fail(`${badTech} record(s) with technology ≠ "5G"`);
if (badCoord) fail(`${badCoord} record(s) with coordinates outside Algeria`);
if (missing) fail(`${missing} missing required field(s)`);

console.log(`[@geoalgeria/telecom]`);
console.log(
  `  OK: ${sites.length} 5G sites (${operators.map((o) => `${o} ${summary.by_operator[o]}`).join(", ")}), ${summary.wilayas_covered} wilayas`,
);
console.log("=".repeat(40));
if (errors.length) {
  console.error(`FAILED: ${errors.length} error(s)`);
  process.exit(1);
}
console.log("PASSED: telecom datasets valid");
