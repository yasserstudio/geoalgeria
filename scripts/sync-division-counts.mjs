#!/usr/bin/env node
// Derive every stated daira and commune count from the records that define them,
// so no carrier can drift from the table it summarises.
//
// WHY. A per-wilaya count is a summary of rows that live somewhere else:
// `dairas_count` summarises data/dairas.json, `communes_count` summarises the
// three commune splits. Nothing derived them. They were typed into each carrier
// by hand and patched by hand afterwards, and `data/wilayas.csv` fell behind:
// wilaya 33 (Illizi) read `dairas_count` 3 against four daira records (Illizi,
// Debdeb, In Amenas, Bordj Omar Driss), the 4 that decree 26-253 leaves under
// decree 91-306 "sans changement", that the commune table names one by one, and
// that the independently sourced wilaya-33 daira rosters of @geoalgeria/sports
// name as well. data/wilayas.json read 4 and was right. Over 20 wilayas were
// out at one point or another, and the daira lists of 21 wilayas changed again
// in the same release, which is exactly the churn a hand-typed summary loses.
//
// The counts are therefore derived here and only here, and
// test/division-counts.test.mjs fails when any carrier disagrees with the
// records or when this script would still have something to write.
//
// THE ONE FIGURE THAT IS NOT DERIVABLE. data/wilayas.csv gives the ten mother
// wilayas of the 2026 cohort two pairs of columns: `communes_count`/`dairas_count`
// hold what they held *before* the reform took their territory, and
// `post_reform_communes`/`post_reform_dairas` hold what they hold now. Only the
// second pair is a summary of the records, so only the second pair is written
// here; the pre-reform pair is history, sourced in the CHANGELOG, and is left
// alone. Every other row states its current figures in the first pair.
//
// Usage:
//   node scripts/sync-division-counts.mjs            # dry-run report
//   node scripts/sync-division-counts.mjs --check    # exit 1 if a carrier drifts
//   node scripts/sync-division-counts.mjs --write

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE && CHECK) throw new Error("Choose either --write or --check");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const outputs = [];
const queueJson = (path, value) => outputs.push([path, `${JSON.stringify(value, null, 2)}\n`]);
const queueText = (path, value) => outputs.push([path, value]);

function writeAtomic(path, content) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

// --- what the records say ---------------------------------------------------
const dairas = readJson(join(DATA, "dairas.json"));
const communes = [
  "communes_w1_w23.json",
  "communes_w24_w48.json",
  "communes_w49_w69.json",
].flatMap((file) => readJson(join(DATA, file)));

/** @returns {Map<number, number>} wilaya code -> number of records */
function perWilaya(rows) {
  const counted = new Map();
  for (const row of rows) counted.set(row.wilaya_code, (counted.get(row.wilaya_code) ?? 0) + 1);
  return counted;
}
const dairasOf = perWilaya(dairas);
const communesOf = perWilaya(communes);

// --- wilayas.json -----------------------------------------------------------
const wilayasPath = join(DATA, "wilayas.json");
const wilayasDoc = readJson(wilayasPath);
for (const wilaya of wilayasDoc.wilayas) {
  wilaya.dairas_count = dairasOf.get(wilaya.code) ?? 0;
  wilaya.communes_count = communesOf.get(wilaya.code) ?? 0;
}
wilayasDoc.metadata.total_dairas = dairas.length;
wilayasDoc.metadata.total_communes = communes.length;
queueJson(wilayasPath, wilayasDoc);

// --- wilayas.csv ------------------------------------------------------------
// code,name_ar,name_fr,name_en,created,mother_wilaya_code,law,communes_count,
// dairas_count,post_reform_communes,post_reform_dairas
const COLUMN = { CODE: 0, CREATED: 4, MOTHER: 5, COMMUNES: 7, DAIRAS: 8, POST_COMMUNES: 9, POST_DAIRAS: 10 };
const csvPath = join(DATA, "wilayas.csv");
const csvText = readFileSync(csvPath, "utf8");
const csvNewline = csvText.includes("\r\n") ? "\r\n" : "\n";
const csvLines = csvText.trimEnd().split(/\r?\n/);
const csvRows = csvLines.slice(1).map((line) => line.split(","));
for (const [index, fields] of csvRows.entries()) {
  if (fields.length !== 11) {
    throw new Error(`${basename(csvPath)} row ${index + 2}: expected 11 fields, found ${fields.length}`);
  }
}

// A wilaya states a pre-reform figure exactly when the 2026 reform took part of
// it, which the cohort's own rows name. Deriving the set, rather than listing it,
// keeps the rule true if a later reform adds another mother.
const mothers = new Set(
  csvRows
    .filter((fields) => fields[COLUMN.CREATED] === "2026" && fields[COLUMN.MOTHER])
    .map((fields) => Number(fields[COLUMN.MOTHER])),
);
for (const fields of csvRows) {
  const code = Number(fields[COLUMN.CODE]);
  const stated = [fields[COLUMN.POST_COMMUNES], fields[COLUMN.POST_DAIRAS]].some(Boolean);
  if (mothers.has(code) !== stated) {
    throw new Error(
      `${basename(csvPath)} wilaya ${code}: ${
        stated ? "states post-reform figures but lost nothing to the 2026 reform" : "lost territory to the 2026 reform but states no post-reform figures"
      }`,
    );
  }
  const [communesColumn, dairasColumn] = mothers.has(code)
    ? [COLUMN.POST_COMMUNES, COLUMN.POST_DAIRAS]
    : [COLUMN.COMMUNES, COLUMN.DAIRAS];
  fields[communesColumn] = String(communesOf.get(code) ?? 0);
  fields[dairasColumn] = String(dairasOf.get(code) ?? 0);
}
queueText(csvPath, `${[csvLines[0], ...csvRows.map((row) => row.join(","))].join(csvNewline)}${csvNewline}`);

// --- sql/full.sql header ----------------------------------------------------
const sqlPath = join(DATA, "sql", "full.sql");
queueText(
  sqlPath,
  readFileSync(sqlPath, "utf8").replace(
    /^-- \d+ wilayas, \d+ communes, \d+ dairas/m,
    `-- ${wilayasDoc.wilayas.length} wilayas, ${communes.length} communes, ${dairas.length} dairas`,
  ),
);

// ---------------------------------------------------------------------------
let changed = 0;
for (const [path, content] of outputs) {
  if (readFileSync(path, "utf8") === content) continue;
  changed++;
  console.log(`${WRITE ? "patched" : "would patch"} ${path.replace(`${ROOT}/`, "")}`);
  if (WRITE) writeAtomic(path, content);
}
console.log(
  `${dairas.length} dairas, ${communes.length} communes; ${changed} carrier(s) ${WRITE ? "updated" : "need an update"}`,
);
if (CHECK && changed) process.exit(1);
