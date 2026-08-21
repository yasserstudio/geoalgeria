#!/usr/bin/env node
// Move Tabelbala from Béchar (08) to its official current parent Béni Abbès
// (52) across every flagship carrier while preserving public row/SQL ids.
//
// Usage:
//   node scripts/fix-tabelbala-parent.mjs
//   node scripts/fix-tabelbala-parent.mjs --check
//   node scripts/fix-tabelbala-parent.mjs --write
//   node scripts/fix-tabelbala-parent.mjs --write --target /path/algeria.json

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE && CHECK) throw new Error("Choose either --write or --check");

const targets = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--target") targets.push(process.argv[++i]);
}

const outputs = [];
function queueJson(path, value) {
  outputs.push([path, `${JSON.stringify(value, null, 2)}\n`]);
}
function queueText(path, value) {
  outputs.push([path, value]);
}
function writeAtomic(path, content) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}
function insertCommune(rows, commune) {
  const index = rows.findIndex(
    (row) =>
      Number(row.wilaya_code) > 52 ||
      (Number(row.wilaya_code) === 52 && String(row.name_fr) > "Tabelbala"),
  );
  rows.splice(index < 0 ? rows.length : index, 0, commune);
}
function moveNested(doc, label) {
  const bechar = doc.find((wilaya) => Number(wilaya.code) === 8);
  const beniAbbes = doc.find((wilaya) => Number(wilaya.code) === 52);
  if (!bechar || !beniAbbes) throw new Error(`${label}: missing wilaya 08 or 52`);
  const matches = [...bechar.communes, ...beniAbbes.communes].filter(
    (commune) => commune.name_fr === "Tabelbala",
  );
  if (matches.length !== 1) throw new Error(`${label}: expected one Tabelbala commune; found ${matches.length}`);
  bechar.communes = bechar.communes.filter((commune) => commune.name_fr !== "Tabelbala");
  beniAbbes.communes = beniAbbes.communes.filter((commune) => commune.name_fr !== "Tabelbala");
  insertCommune(beniAbbes.communes, { ...matches[0], wilaya_code: 52 });
}

const splitPaths = [
  join(DATA, "communes_w1_w23.json"),
  join(DATA, "communes_w24_w48.json"),
  join(DATA, "communes_w49_w69.json"),
];
const split = splitPaths.map((path) => JSON.parse(readFileSync(path, "utf8")));
const matches = split.flat().filter((commune) => commune.name_fr === "Tabelbala");
if (matches.length !== 1) throw new Error(`split commune files: expected one Tabelbala; found ${matches.length}`);
for (const rows of split) {
  const kept = rows.filter((commune) => commune.name_fr !== "Tabelbala");
  rows.splice(0, rows.length, ...kept);
}
insertCommune(split[2], { ...matches[0], wilaya_code: 52 });
split.forEach((rows, index) => queueJson(splitPaths[index], rows));

const unifiedPath = join(DATA, "algeria.json");
const unified = JSON.parse(readFileSync(unifiedPath, "utf8"));
moveNested(unified, "algeria.json");
queueJson(unifiedPath, unified);

for (const target of targets) {
  const doc = JSON.parse(readFileSync(target, "utf8"));
  moveNested(doc, basename(target));
  queueJson(target, doc);
}

const wilayasPath = join(DATA, "wilayas.json");
const wilayasDoc = JSON.parse(readFileSync(wilayasPath, "utf8"));
for (const wilaya of wilayasDoc.wilayas) {
  if (wilaya.code === 8) Object.assign(wilaya, { communes_count: 11, dairas_count: 6 });
  if (wilaya.code === 52) Object.assign(wilaya, { communes_count: 10, dairas_count: 6 });
}
queueJson(wilayasPath, wilayasDoc);

const dairasPath = join(DATA, "dairas.json");
const dairas = JSON.parse(readFileSync(dairasPath, "utf8"));
const tabelbalaDairas = dairas.filter((daira) => daira.name_fr === "Tabelbala");
if (tabelbalaDairas.length !== 1 || tabelbalaDairas[0].id !== 86) {
  throw new Error("dairas.json: Tabelbala must retain stable id 86");
}
tabelbalaDairas[0].wilaya_code = 52;
queueJson(dairasPath, dairas);

const ecommercePath = join(DATA, "ecommerce", "communes.json");
const ecommerce = JSON.parse(readFileSync(ecommercePath, "utf8"));
const ecommerceRow = ecommerce.find((row) => row.id === 230 && row.commune_name_fr === "Tabelbala");
if (!ecommerceRow) throw new Error("ecommerce/communes.json: stable Tabelbala id 230 is missing");
Object.assign(ecommerceRow, {
  wilaya_code: 52,
  wilaya_name_fr: "Béni Abbès",
  wilaya_name_ar: "بني عباس",
});
queueJson(ecommercePath, ecommerce);

const geoPath = join(DATA, "geojson", "communes.geojson");
const geo = JSON.parse(readFileSync(geoPath, "utf8"));
const feature = geo.features.find((item) => item.properties?.name_fr === "Tabelbala");
if (!feature) throw new Error("geojson/communes.geojson: Tabelbala is missing");
feature.properties.wilaya_code = 52;
queueJson(geoPath, geo);

function patchCsv(path, identify, patch) {
  const original = readFileSync(path, "utf8");
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  const lines = original.trimEnd().split(/\r?\n/);
  const rows = lines.slice(1).map((line) => line.split(","));
  const found = rows.filter(identify);
  if (found.length !== 1) throw new Error(`${path}: expected one Tabelbala row; found ${found.length}`);
  patch(found[0]);
  queueText(path, `${[lines[0], ...rows.map((row) => row.join(","))].join(newline)}${newline}`);
}

patchCsv(
  join(DATA, "csv", "communes.csv"),
  (fields) => fields[0] === "Tabelbala",
  (fields) => { fields[2] = "52"; },
);
patchCsv(
  join(DATA, "ecommerce", "communes.csv"),
  (fields) => fields[0] === "230" && fields[1] === "Tabelbala",
  (fields) => {
    fields[4] = "52";
    fields[5] = "Béni Abbès";
    fields[6] = "بني عباس";
  },
);

function patchSql(path, pattern, replacement) {
  const original = readFileSync(path, "utf8");
  const match = pattern.exec(original);
  if (!match || pattern.test(original.slice(match.index + match[0].length))) {
    throw new Error(`${path}: expected one stable Tabelbala SQL row`);
  }
  queueText(path, original.replace(pattern, replacement));
}
patchSql(
  join(DATA, "sql", "full.sql"),
  /^(\s*\(230, 'Tabelbala', 'تبلبالة', )(?:8|52)(, 'Tabelbala'.*)$/m,
  (_match, prefix, suffix) => `${prefix}52${suffix}`,
);
patchSql(
  join(DATA, "ecommerce", "communes.sql"),
  /^(\s*\(230, 'Tabelbala', 'تبلبالة', 'Tabelbala', )(?:8|52), '(?:Béchar|Béni Abbès)', '(?:بشار|بني عباس)'(.*)$/m,
  (_match, prefix, suffix) => `${prefix}52, 'Béni Abbès', 'بني عباس'${suffix}`,
);

let changed = 0;
for (const [path, content] of outputs) {
  if (readFileSync(path, "utf8") === content) continue;
  changed++;
  console.log(`${WRITE ? "patched" : "would patch"} ${path.replace(`${ROOT}/`, "")}`);
  if (WRITE) writeAtomic(path, content);
}
console.log(`${changed} carrier(s) ${WRITE ? "updated" : "need an update"}`);
if (CHECK && changed) process.exit(1);
