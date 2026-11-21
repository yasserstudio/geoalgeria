#!/usr/bin/env node
// Publish `wilaya_code_58` and `wilaya_code_48` on every commune record (#359).
//
// WHY. Statistics published before Law 26-06 count 58 wilayas, and those before
// Law 19-12 count 48. A consumer joining them to today's 69 wilayas had to rebuild
// both reforms by hand; each commune now names the wilaya it belonged to on each map.
//
// SOURCE OF TRUTH. packages/dataset/data/wilaya-lineage.json, one row per current
// wilaya with its two codes and the texts behind them (Law 84-09, Ordonnance 97-14,
// Law 19-12, Law 26-06, and the decrees naming the new wilayas). A commune takes the
// codes of its current wilaya: no text that created a wilaya splits a commune, so the wilaya is
// the whole answer. The one place the dataset departs from a text, El Borma (3021),
// is recorded in the same file under `exceptions` and pinned by
// test/wilaya-lineage.test.mjs. The communes each text lists are in
// research/_wilaya-lineage/, and that test holds the data to them.
//
// CARRIERS. data/communes_w*.json, data/algeria.json (nested communes) and
// data/geojson/communes.geojson get the two keys after `wilaya_code`;
// data/csv/communes.csv and the communes table of data/sql/full.sql get two
// trailing columns, so every existing column keeps its position.
// The commune outlines (geojson/commune-boundaries*.geojson) copy the two keys
// from communes.geojson through scripts/build-commune-boundaries.mjs.
// data/ecommerce/* does not carry them: it is a flat delivery view keyed on the
// current wilaya, and data/README.md says so.
//
// USAGE
//   node scripts/add-wilaya-lineage.mjs            # dry-run report
//   node scripts/add-wilaya-lineage.mjs --write    # patch packages/dataset
//   node scripts/add-wilaya-lineage.mjs --check    # fail if any carrier is stale

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");

const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");

const FIELDS = ["wilaya_code_58", "wilaya_code_48"];

const lineage = JSON.parse(readFileSync(join(DATA, "wilaya-lineage.json"), "utf-8"));
const byCode = new Map(lineage.wilayas.map((w) => [w.code, w]));

function codesOf(wilayaCode, label) {
  const row = byCode.get(Number(wilayaCode));
  if (!row) throw new Error(`${label}: wilaya ${wilayaCode} has no lineage row`);
  return [row.wilaya_code_58, row.wilaya_code_48];
}

/** The record with the two codes placed right after `wilaya_code`, stale ones dropped. */
function withCodes(record, label) {
  const [w58, w48] = codesOf(record.wilaya_code, label);
  const out = {};
  for (const [key, value] of Object.entries(record)) {
    if (FIELDS.includes(key)) continue;
    out[key] = value;
    if (key === "wilaya_code") Object.assign(out, { wilaya_code_58: w58, wilaya_code_48: w48 });
  }
  return out;
}

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const outputs = [];

for (const file of ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"]) {
  const rows = JSON.parse(readFileSync(join(DATA, file), "utf-8"));
  outputs.push([join(DATA, file), json(rows.map((c) => withCodes(c, `${file} ${c.code_commune}`)))]);
}

{
  const all = JSON.parse(readFileSync(join(DATA, "algeria.json"), "utf-8"));
  for (const wilaya of all) {
    if (wilaya.communes) wilaya.communes = wilaya.communes.map((c) => withCodes(c, `algeria.json ${c.code_commune}`));
  }
  outputs.push([join(DATA, "algeria.json"), json(all)]);
}

{
  const path = join(DATA, "geojson", "communes.geojson");
  const geo = JSON.parse(readFileSync(path, "utf-8"));
  for (const feature of geo.features) {
    feature.properties = withCodes(feature.properties, `communes.geojson ${feature.properties.name_fr}`);
  }
  outputs.push([path, json(geo)]);
}

{
  // name_fr,name_ar,wilaya_code,daira,postal_code,latitude,longitude,code_commune[,58,48]
  const path = join(DATA, "csv", "communes.csv");
  const text = readFileSync(path, "utf-8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(eol);
  const trailing = lines.at(-1) === "" ? lines.pop() : null;
  const BASE = 8;
  const head = lines[0].split(",").slice(0, BASE);
  if (head[2] !== "wilaya_code" || head[7] !== "code_commune") {
    throw new Error(`communes.csv: unexpected header ${lines[0]}`);
  }
  const out = [[...head, ...FIELDS].join(",")];
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(",");
    if (fields.length !== BASE && fields.length !== BASE + FIELDS.length) {
      throw new Error(`communes.csv:${i + 1}: expected ${BASE} or ${BASE + FIELDS.length} fields`);
    }
    const base = fields.slice(0, BASE);
    out.push([...base, ...codesOf(base[2], `communes.csv:${i + 1}`)].join(","));
  }
  if (trailing !== null) out.push(trailing);
  outputs.push([path, out.join(eol)]);
}

{
  // communes: (id, 'name_fr', 'name_ar', wilaya, 'daira', 'postal'|NULL, lat, lng, code[, 58, 48])
  const path = join(DATA, "sql", "full.sql");
  let sql = readFileSync(path, "utf-8");
  const COLUMN = /\n {2}code_commune INTEGER NOT NULL UNIQUE,\n(?: {2}wilaya_code_58 INTEGER NOT NULL,\n {2}wilaya_code_48 INTEGER NOT NULL,\n)?/;
  if (!COLUMN.test(sql)) throw new Error("full.sql: communes table has no code_commune column");
  sql = sql.replace(
    COLUMN,
    "\n  code_commune INTEGER NOT NULL UNIQUE,\n  wilaya_code_58 INTEGER NOT NULL,\n  wilaya_code_48 INTEGER NOT NULL,\n",
  );
  const INSERT = /^INSERT INTO communes \(id, name_fr, name_ar, wilaya_code, daira, postal_code, latitude, longitude, code_commune(?:, wilaya_code_58, wilaya_code_48)?\) VALUES$/m;
  if (!INSERT.test(sql)) throw new Error("full.sql: no INSERT INTO communes header");
  sql = sql.replace(
    INSERT,
    "INSERT INTO communes (id, name_fr, name_ar, wilaya_code, daira, postal_code, latitude, longitude, code_commune, wilaya_code_58, wilaya_code_48) VALUES",
  );
  // Anchored at the end of the row: names carry SQL-escaped apostrophes (M''fatha).
  const ROW =
    /^( {2}\(\d+, '(?:[^']|'')*', '(?:[^']|'')*', )(\d+)(, '(?:[^']|'')*', (?:'\d+'|NULL), (?:-?[\d.]+|NULL), (?:-?[\d.]+|NULL), \d+)(?:, \d+, \d+)?(\)[,;])$/;
  const lines = sql.split("\n");
  const start = lines.findIndex((l) => l.startsWith("INSERT INTO communes ("));
  let rows = 0;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(ROW);
    if (!m) throw new Error(`full.sql:${i + 1}: not a commune row: ${lines[i]}`);
    const [w58, w48] = codesOf(m[2], `full.sql:${i + 1}`);
    lines[i] = `${m[1]}${m[2]}${m[3]}, ${w58}, ${w48}${m[4]}`;
    rows++;
    if (m[4].endsWith(";")) break;
  }
  if (rows !== 1541) throw new Error(`full.sql: ${rows} commune rows, expected 1541`);
  outputs.push([path, lines.join("\n")]);
}

const stale = outputs.filter(([path, content]) => readFileSync(path, "utf-8") !== content);
for (const [path] of stale) console.log(`${WRITE ? "wrote" : "stale"}: ${relative(ROOT, path)}`);
if (!stale.length) console.log("wilaya lineage: every carrier is current");
if (WRITE) for (const [path, content] of stale) writeFileSync(path, content);
if (CHECK && stale.length) process.exit(1);
