import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { readCapture } from "../scripts/lib/source-store.mjs";

const dataRoot = join(import.meta.dirname, "../packages/dataset/data");
const files = [
  "communes_w1_w23.json",
  "communes_w24_w48.json",
  "communes_w49_w69.json",
];
const communes = files.flatMap((file) =>
  JSON.parse(readFileSync(join(dataRoot, file), "utf8")),
);
const key = (wilayaCode, name) => `${Number(wilayaCode)}|${name}`;
const canonicalCodes = new Map(
  communes.map((record) => [key(record.wilaya_code, record.name_fr), record.code_commune]),
);

function commune(wilayaCode, name) {
  return communes.find(
    (record) => record.wilaya_code === wilayaCode && record.name_fr === name,
  );
}

test("all commune codes are sourced, non-null, and globally unique", () => {
  const official = readCapture("dataset", "ons-code-geo-2021");
  const officialCodes = new Set(official.map((record) => record.code_commune));
  const datasetCodes = communes.map((record) => record.code_commune);

  assert.equal(official.length, 1541);
  assert.equal(officialCodes.size, 1541);
  assert.equal(communes.length, 1541);
  assert.ok(datasetCodes.every(Number.isInteger));
  assert.equal(new Set(datasetCodes).size, 1541);
  assert.deepEqual(new Set(datasetCodes), officialCodes);
});

test("every commune still maps to its specific ONS source row", () => {
  assert.doesNotThrow(() =>
    execFileSync(process.execPath, [join(import.meta.dirname, "../scripts/fix-commune-ons-codes.mjs"), "--check"], {
      stdio: "pipe",
    }),
  );
});

test("every derived package commune link is synchronized to the canonical row", () => {
  assert.doesNotThrow(() =>
    execFileSync(process.execPath, [join(import.meta.dirname, "../scripts/sync-package-commune-codes.mjs"), "--check"], {
      stdio: "pipe",
    }),
  );
});

test("the SQL dump enforces the published commune-code contract", () => {
  const sql = readFileSync(join(dataRoot, "sql/full.sql"), "utf8");
  assert.match(sql, /code_commune INTEGER NOT NULL UNIQUE,/);
});

test("the four reported Algiers collision pairs use their distinct ONS codes", () => {
  assert.equal(commune(16, "Sehaoula")?.code_commune, 1657);
  assert.equal(commune(16, "Staoueli")?.code_commune, 1645);
  assert.equal(commune(16, "Baba Hassen")?.code_commune, 1655);
  assert.equal(commune(16, "Maalma")?.code_commune, 1647);
  assert.equal(commune(16, "Douira")?.code_commune, 1654);
  assert.equal(commune(16, "Rahmania")?.code_commune, 1648);
  assert.equal(commune(16, "Draria")?.code_commune, 1653);
  assert.equal(commune(16, "Souidania")?.code_commune, 1649);
});

test("every code-carrying export agrees with the canonical commune files", () => {
  const unified = JSON.parse(readFileSync(join(dataRoot, "algeria.json"), "utf8"));
  const unifiedRows = unified.flatMap((wilaya) => wilaya.communes);
  assert.equal(unifiedRows.length, 1541);
  for (const record of unifiedRows) {
    assert.equal(
      record.code_commune,
      canonicalCodes.get(key(record.wilaya_code, record.name_fr)),
      `algeria.json: ${record.wilaya_code}|${record.name_fr}`,
    );
  }

  const csvLines = readFileSync(join(dataRoot, "csv/communes.csv"), "utf8")
    .trimEnd()
    .split(/\r?\n/);
  assert.equal(csvLines.length, 1542);
  for (const [index, line] of csvLines.slice(1).entries()) {
    const fields = line.split(",");
    assert.equal(fields.length, 8, `communes.csv:${index + 2}`);
    assert.equal(
      Number(fields[7]),
      canonicalCodes.get(key(fields[2], fields[0])),
      `communes.csv:${index + 2}`,
    );
  }

  const sqlRows = readFileSync(join(dataRoot, "sql/full.sql"), "utf8")
    .split(/\r?\n/)
    .map((line) =>
      line.match(/^\s*\((\d+), '((?:''|[^'])*)', '(?:''|[^'])*', (\d+), .*, (\d+)\)(?:,|;)$/),
    )
    .filter(Boolean);
  assert.equal(sqlRows.length, 1541);
  for (const match of sqlRows) {
    const name = match[2].replace(/''/g, "'");
    assert.equal(
      Number(match[4]),
      canonicalCodes.get(key(match[3], name)),
      `full.sql commune id ${match[1]}`,
    );
  }
});

test("a 2021 ONS code survives a later wilaya assignment", () => {
  assert.equal(commune(59, "Hadj Mechri")?.code_commune, 315);
  assert.equal(commune(68, "Menaa")?.code_commune, 2839);
  assert.equal(commune(52, "Tabelbala")?.code_commune, 5206);
});
