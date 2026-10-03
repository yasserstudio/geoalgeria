#!/usr/bin/env node
// Apply the reviewed Arabic commune-name repairs of
// scripts/lib/commune-name-ar-repairs.mjs to every flagship carrier that holds a
// commune `name_ar`, so no format is left saying something the others no longer
// say.
//
// WHY. 22 of the 1,541 names carried U+0640 ARABIC TATWEEL, the justification
// kashida, and one had lost the alef of its definite article. The Web app had been
// repairing them in its own copy of this table since the 2026-08-13 snippet audit;
// private tracker #239 retires that fork, which means the repairs live here now.
// The rationale and the source of each row are in the repairs module.
//
// IT INVENTS NOTHING. For every row the carrier's stored value must be either the
// recorded `from` or the `to`; anything else aborts the run rather than being
// overwritten, the same contract as scripts/fix-commune-centres.mjs. A row already
// at its `to` is a no-op, so the set is replayable and a carrier that missed an
// earlier run still fails.
//
// CARRIERS. Every file in packages/dataset that holds a commune `name_ar`:
// test/commune-name-ar.test.mjs reads the same eight through
// test/lib/commune-name-ar-carriers.mjs and fails while one of them disagrees, so
// a carrier this script forgets cannot ship.
//
// USAGE
//   node scripts/fix-commune-name-ar.mjs            # dry-run report
//   node scripts/fix-commune-name-ar.mjs --check    # exit 1 if a carrier drifts
//   node scripts/fix-commune-name-ar.mjs --write    # patch packages/dataset

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { NAME_AR_REPAIRS, repairsByCode, repairsByName } from "./lib/commune-name-ar-repairs.mjs";
import { splitSqlRow, sqlQuote, sqlUnquote } from "./lib/sql-rows.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");

const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE && CHECK) throw new Error("Choose either --write or --check");

/** code_commune -> repair, and "wilaya|name_fr" -> repair for the code-less carriers. */
const byCode = repairsByCode();
const byName = repairsByName();
if (byCode.size !== NAME_AR_REPAIRS.length) throw new Error("two repairs share a code_commune");
if (byName.size !== NAME_AR_REPAIRS.length) throw new Error("two repairs share a (wilaya, name_fr)");

const outputs = [];
const problems = [];
let changed = 0;

const queueJson = (path, value) => outputs.push([path, `${JSON.stringify(value, null, 2)}\n`]);
const queueText = (path, value) => outputs.push([path, value]);

function writeAtomic(path, content) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

/**
 * The repaired name for one row, or null when no repair applies.
 * `code` is null for a carrier that publishes no commune code; those rows are
 * addressed by (wilaya_code, name_fr), unique across all 1,541.
 */
function repaired(where, { code, wilaya_code: wilaya, name_fr: nameFr, name_ar: nameAr }) {
  const repair = code == null ? byName.get(`${Number(wilaya)}|${nameFr}`) : byCode.get(Number(code));
  if (!repair) return null;
  if (nameAr === repair.to) return repair.to;
  if (nameAr !== repair.from) {
    problems.push(
      `${where}: ${repair.name_fr} (${repair.code_commune}) holds ${JSON.stringify(nameAr)}, ` +
        `but the repair was recorded against ${JSON.stringify(repair.from)}`,
    );
    return null;
  }
  changed++;
  return repair.to;
}

/** Patch a JSON row in place, keyed by whichever of the two keys it carries. */
function patchRow(where, row, keys) {
  const next = repaired(where, {
    code: keys.code ? row[keys.code] : null,
    wilaya_code: row[keys.wilaya],
    name_fr: row[keys.nameFr],
    name_ar: row[keys.nameAr],
  });
  if (next !== null) row[keys.nameAr] = next;
}

const JSON_KEYS = { code: "code_commune", wilaya: "wilaya_code", nameFr: "name_fr", nameAr: "name_ar" };

// --- the three split commune files -----------------------------------------
for (const file of ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"]) {
  const path = join(DATA, file);
  const rows = JSON.parse(readFileSync(path, "utf8"));
  for (const row of rows) patchRow(file, row, JSON_KEYS);
  queueJson(path, rows);
}

// --- algeria.json -----------------------------------------------------------
const algeriaPath = join(DATA, "algeria.json");
const algeria = JSON.parse(readFileSync(algeriaPath, "utf8"));
for (const wilaya of algeria) {
  for (const commune of wilaya.communes) patchRow("algeria.json", commune, JSON_KEYS);
}
queueJson(algeriaPath, algeria);

// --- geojson/communes.geojson (no commune code) -----------------------------
const geoPath = join(DATA, "geojson", "communes.geojson");
const geo = JSON.parse(readFileSync(geoPath, "utf8"));
for (const feature of geo.features) {
  patchRow("geojson/communes.geojson", feature.properties, { ...JSON_KEYS, code: null });
}
queueJson(geoPath, geo);

// --- ecommerce/communes.json (no commune code, its own field names) ----------
const ecommercePath = join(DATA, "ecommerce", "communes.json");
const ecommerce = JSON.parse(readFileSync(ecommercePath, "utf8"));
for (const row of ecommerce) {
  patchRow("ecommerce/communes.json", row, {
    code: null,
    wilaya: "wilaya_code",
    nameFr: "commune_name_fr",
    nameAr: "commune_name_ar",
  });
}
queueJson(ecommercePath, ecommerce);

// --- CSV --------------------------------------------------------------------
/** Patch a CSV whose fields never contain a comma, keeping its line endings. */
function patchCsv(path, width, patch) {
  const original = readFileSync(path, "utf8");
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  const lines = original.trimEnd().split(/\r?\n/);
  const rows = lines.slice(1).map((line) => line.split(","));
  for (const [index, fields] of rows.entries()) {
    if (fields.length !== width) {
      throw new Error(`${basename(path)} row ${index + 2}: expected ${width} fields, found ${fields.length}`);
    }
    patch(fields);
  }
  queueText(path, `${[lines[0], ...rows.map((row) => row.join(","))].join(newline)}${newline}`);
}

// name_fr,name_ar,wilaya_code,daira,postal_code,latitude,longitude,code_commune
patchCsv(join(DATA, "csv", "communes.csv"), 8, (f) => {
  const next = repaired("csv/communes.csv", {
    code: Number(f[7]),
    wilaya_code: Number(f[2]),
    name_fr: f[0],
    name_ar: f[1],
  });
  if (next !== null) f[1] = next;
});

// id,commune_name_fr,commune_name_ar,daira_name_fr,wilaya_code,wilaya_name_fr,wilaya_name_ar,postal_code
patchCsv(join(DATA, "ecommerce", "communes.csv"), 8, (f) => {
  const next = repaired("ecommerce/communes.csv", {
    code: null,
    wilaya_code: Number(f[4]),
    name_fr: f[1],
    name_ar: f[2],
  });
  if (next !== null) f[2] = next;
});

// --- SQL --------------------------------------------------------------------
function patchSql(path, patch) {
  const original = readFileSync(path, "utf8");
  const out = original.split("\n").map((line) => {
    const match = /^(\s*\()(.*?)(\)[,;]?)$/.exec(line);
    if (!match) return line;
    const fields = splitSqlRow(match[2]);
    return patch(fields) ? `${match[1]}${fields.join(", ")}${match[3]}` : line;
  });
  queueText(path, out.join("\n"));
}

// communes: (id, 'name_fr', 'name_ar', wilaya_code, 'daira', 'postal', lat, lng, code_commune)
patchSql(join(DATA, "sql", "full.sql"), (f) => {
  if (f.length !== 9) return false;
  const next = repaired("sql/full.sql", {
    code: Number(f[8]),
    wilaya_code: Number(f[3]),
    name_fr: sqlUnquote(f[1]),
    name_ar: sqlUnquote(f[2]),
  });
  if (next === null) return false;
  f[2] = sqlQuote(next);
  return true;
});

// ecommerce: (id, 'commune_fr', 'commune_ar', 'daira', wilaya_code, 'wilaya_fr', 'wilaya_ar', 'postal')
patchSql(join(DATA, "ecommerce", "communes.sql"), (f) => {
  if (f.length !== 8) return false;
  const next = repaired("ecommerce/communes.sql", {
    code: null,
    wilaya_code: Number(f[4]),
    name_fr: sqlUnquote(f[1]),
    name_ar: sqlUnquote(f[2]),
  });
  if (next === null) return false;
  f[2] = sqlQuote(next);
  return true;
});

// ---------------------------------------------------------------------------
if (problems.length) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  console.error(`${problems.length} carrier value(s) are neither the recorded from nor the to; nothing written`);
  process.exit(1);
}

const drifted = outputs.filter(([path, content]) => readFileSync(path, "utf8") !== content);
console.log(
  `${NAME_AR_REPAIRS.length} repair(s), ${changed} field(s) to write across ` +
    `${drifted.length} of ${outputs.length} carrier(s)`,
);
for (const [path] of drifted) console.log(`  ${basename(dirname(path))}/${basename(path)}`);

if (CHECK) {
  if (drifted.length) {
    console.error("✗ a carrier does not carry the repaired names; run with --write");
    process.exit(1);
  }
  console.log("✓ every carrier carries the repaired names");
} else if (WRITE) {
  for (const [path, content] of outputs) writeAtomic(path, content);
  console.log(`✓ wrote ${outputs.length} carrier(s)`);
} else {
  console.log("dry run; pass --write to patch the carriers");
}
