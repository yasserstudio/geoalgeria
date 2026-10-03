// Every stated daira or commune count must equal the records it summarises.
//
// A count like `dairas_count` is not data, it is a summary of data/dairas.json,
// and nothing derived it: it was typed into each carrier and patched by hand
// afterwards. data/wilayas.csv fell behind data/wilayas.json that way, reading
// `dairas_count` 3 for wilaya 33 (Illizi) against four daira records, and the
// two files had drifted for as many as 20 wilayas at once over the releases that
// restated the daira lists. A consumer that reads the CSV got a different
// Algeria from one that reads the JSON.
//
// scripts/sync-division-counts.mjs now derives every count from the records and
// is the only thing that writes one. These tests are the gate, and they count
// the records themselves rather than importing that script, so a bug in the
// derivation cannot validate itself.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const readText = (...parts) => readFileSync(join(ROOT, ...parts), "utf8");
const readData = (...parts) => JSON.parse(readFileSync(join(DATA, ...parts), "utf8"));

const dairas = readData("dairas.json");
const communes = [
  "communes_w1_w23.json",
  "communes_w24_w48.json",
  "communes_w49_w69.json",
].flatMap((file) => readData(file));
const wilayasDoc = readData("wilayas.json");

/** @returns {Map<number, number>} wilaya code -> number of records */
function perWilaya(rows) {
  const counted = new Map();
  for (const row of rows) counted.set(row.wilaya_code, (counted.get(row.wilaya_code) ?? 0) + 1);
  return counted;
}
const dairasOf = perWilaya(dairas);
const communesOf = perWilaya(communes);

// code,name_ar,name_fr,name_en,created,mother_wilaya_code,law,communes_count,
// dairas_count,post_reform_communes,post_reform_dairas
const csvLines = readText("packages", "dataset", "data", "wilayas.csv").trimEnd().split(/\r?\n/);
const csvHeader = csvLines[0].split(",");
const csvRows = csvLines.slice(1).map((line) => {
  const fields = line.split(",");
  return Object.fromEntries(csvHeader.map((name, index) => [name, fields[index]]));
});
const number = (value) => (value === "" || value === undefined ? null : Number(value));
// The ten wilayas the 2026 reform took territory from state their pre-reform
// figures in communes_count/dairas_count and their current ones in the two
// post_reform columns; every other row states its current ones in the first pair.
const mothers = new Set(
  csvRows.filter((row) => row.created === "2026" && row.mother_wilaya_code).map((row) => Number(row.mother_wilaya_code)),
);
const currentFromCsv = (row) =>
  mothers.has(Number(row.code))
    ? { dairas: number(row.post_reform_dairas), communes: number(row.post_reform_communes) }
    : { dairas: number(row.dairas_count), communes: number(row.communes_count) };

test("every per-wilaya daira count equals the number of daira records", () => {
  assert.equal(wilayasDoc.wilayas.length, 69);
  assert.equal(csvRows.length, 69);
  for (const wilaya of wilayasDoc.wilayas) {
    const records = dairasOf.get(wilaya.code) ?? 0;
    assert.equal(wilaya.dairas_count, records, `wilayas.json wilaya ${wilaya.code} dairas_count`);
    const row = csvRows.find((entry) => Number(entry.code) === wilaya.code);
    assert.ok(row, `wilayas.csv has no wilaya ${wilaya.code}`);
    assert.equal(currentFromCsv(row).dairas, records, `wilayas.csv wilaya ${wilaya.code} daira count`);
  }
});

test("every per-wilaya commune count equals the number of commune records", () => {
  for (const wilaya of wilayasDoc.wilayas) {
    const records = communesOf.get(wilaya.code) ?? 0;
    assert.equal(wilaya.communes_count, records, `wilayas.json wilaya ${wilaya.code} communes_count`);
    const row = csvRows.find((entry) => Number(entry.code) === wilaya.code);
    assert.equal(currentFromCsv(row).communes, records, `wilayas.csv wilaya ${wilaya.code} commune count`);
  }
});

test("the CSV states a pre-reform figure exactly for the ten mothers of the 2026 cohort", () => {
  assert.deepEqual([...mothers].sort((a, b) => a - b), [3, 5, 7, 12, 13, 14, 17, 26, 28, 32]);
  for (const row of csvRows) {
    const code = Number(row.code);
    const stated = [row.post_reform_communes, row.post_reform_dairas].some(Boolean);
    assert.equal(stated, mothers.has(code), `wilayas.csv wilaya ${code} post_reform columns`);
    if (!stated) continue;
    // History, not a summary of the records: the only rule it owes them is that
    // a wilaya cannot have gained dairas or communes by losing territory.
    assert.ok(
      number(row.dairas_count) >= number(row.post_reform_dairas),
      `wilayas.csv wilaya ${code}: pre-reform dairas below post-reform`,
    );
    assert.ok(
      number(row.communes_count) >= number(row.post_reform_communes),
      `wilayas.csv wilaya ${code}: pre-reform communes below post-reform`,
    );
  }
});

test("every stated total equals the record count, in data and in the docs", () => {
  assert.equal(wilayasDoc.metadata.total_dairas, dairas.length, "wilayas.json metadata.total_dairas");
  assert.equal(wilayasDoc.metadata.total_communes, communes.length, "wilayas.json metadata.total_communes");
  assert.equal(
    wilayasDoc.wilayas.reduce((sum, wilaya) => sum + wilaya.dairas_count, 0),
    dairas.length,
    "the per-wilaya dairas_count column must sum to the daira table",
  );

  const total = dairas.length;
  assert.match(
    readText("packages", "dataset", "data", "sql", "full.sql").split("\n")[1],
    new RegExp(`\\b${total} dairas\\b`),
    "sql/full.sql header",
  );
  // The dataset package states the total in prose; the locale decides the word.
  const prose = new RegExp(`${total}\\s*(?:dairas|daïras|دائرة)`);
  for (const file of [
    ["packages", "dataset", "package.json"],
    ["packages", "dataset", "dataset-metadata.json"],
    ["packages", "dataset", "llms.txt"],
    ["packages", "dataset", "README.md"],
    ["packages", "dataset", "README.fr.md"],
    ["packages", "dataset", "README.ar.md"],
    ["packages", "dataset", "data", "README.md"],
  ]) {
    assert.match(readText(...file), prose, `${file.join("/")} does not state ${total} dairas`);
  }
  // The root READMEs carry it in the documented table-row shape, which is what
  // the RELEASING docs-parity gate greps for.
  for (const [file, label] of [
    ["README.md", "Dairas"],
    ["README.fr.md", "Daïras"],
    ["README.ar.md", "الدوائر"],
  ]) {
    assert.match(
      readText(file),
      new RegExp(`\\|\\s*\\*\\*${label}\\*\\*\\s*\\|\\s*${total}\\s*\\|`),
      `${file} table row for dairas`,
    );
  }
});

test("the counts are derived: the sync script has nothing left to write", () => {
  assert.doesNotThrow(() =>
    execFileSync(process.execPath, [join(ROOT, "scripts", "sync-division-counts.mjs"), "--check"], { stdio: "pipe" }),
  );
});
