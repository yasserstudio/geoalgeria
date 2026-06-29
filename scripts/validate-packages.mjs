#!/usr/bin/env node
// Validate the scoped data packages (@geoalgeria/poste, /mobilis, /emploi,
// /telecom, /aviation, /banques, /livraison, /jeunesse, /sports,
// /enseignement-superieur, /tourisme, /formation-professionnelle, /djezzy,
// /mosquees, /sante, /culture)
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
// Usage: node scripts/validate-packages.mjs [poste|mobilis|emploi|telecom|aviation|banques|livraison|jeunesse|sports|enseignement-superieur|tourisme|formation-professionnelle|djezzy|mosquees|sante|culture]
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
  djezzy: [
    {
      json: "boutiques.json",
      metaKey: "boutiques",
      csv: "csv/boutiques.csv",
      geojson: "geojson/boutiques.geojson",
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
  let badWilaya = 0, badCoord = 0, missing = 0, badOp = 0;
  for (const s of desks) {
    const w = Number(s.wilaya_code);
    if (!/^\d+$/.test(String(s.wilaya_code)) || w < 1 || w > 69) badWilaya++;
    if (!inAlgeria(s.lat, s.lng)) badCoord++;
    for (const f of ["id", "operator", "name", "wilaya_code"]) {
      if (s[f] === undefined || s[f] === null || s[f] === "") missing++;
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
    if (!Array.isArray(c.wilayas) || c.wilayas.some((w) => !Number.isInteger(w) || w < 1 || w > 69)) covBadWilaya++;
  }
  if (covBadWilaya) fail(`livraison: ${covBadWilaya} coverage row(s) with wilaya codes outside [1,69]`);
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
