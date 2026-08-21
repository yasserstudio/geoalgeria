#!/usr/bin/env node
// Cascade the canonical ONS commune-code crosswalk into packages that publish a
// derived `commune_code` foreign key. This is an offline, deterministic rebuild:
// it changes only the join field and its JSON/CSV/GeoJSON mirrors.
//
// Usage:
//   node scripts/sync-package-commune-codes.mjs          # report pending edits
//   node scripts/sync-package-commune-codes.mjs --check  # fail if not in sync
//   node scripts/sync-package-commune-codes.mjs --write

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { toCSV, toGeoJSON } from "../packages/schema/index.js";
import { colsFor } from "./lib/v2-transforms.mjs";
import {
  canonicalCodeForCurrentCommune,
  canonicalCommuneForCode,
  latinNameKey,
  normalizeProviderCommune,
} from "./lib/commune-index.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE && CHECK) throw new Error("Choose either --write or --check");

const PACKAGE_FILES = new Map([
  ["agriculture", "agriculture.json"],
  ["cliniques", "cliniques.json"],
  ["culture", "culture.json"],
  ["djezzy", "boutiques.json"],
  ["ecoles", "ecoles.json"],
  ["ferroviaire", "stations.json"],
  ["gares-routieres", "stations.json"],
  ["industrie-pharmaceutique", "industrie-pharmaceutique.json"],
  ["mosquees", "mosquees.json"],
  ["ooredoo", "stores.json"],
  ["pharmacies", "pharmacies.json"],
  ["protection-civile", "protection-civile.json"],
  ["sante", "sante.json"],
]);

function replaceCommuneFields(record, communeCode, sourceCommuneCode = null) {
  const next = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === "source_commune_code") continue;
    if (key === "commune_code") {
      next.commune_code = communeCode;
      if (sourceCommuneCode) next.source_commune_code = sourceCommuneCode;
    } else {
      next[key] = value;
    }
  }
  return next;
}

function replaceWilayaCode(record, wilayaCode) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, key === "wilaya_code" ? wilayaCode : value]),
  );
}

function render(dataDir, file, rows) {
  const base = file.replace(/\.json$/, "");
  return [
    [join(dataDir, file), `${JSON.stringify(rows, null, 2)}\n`],
    [join(dataDir, "csv", `${base}.csv`), toCSV(rows, colsFor(rows))],
    [join(dataDir, "geojson", `${base}.geojson`), `${JSON.stringify(toGeoJSON(rows), null, 2)}\n`],
  ];
}

function renderMetadata(dataDir, rows) {
  const path = join(dataDir, "metadata.json");
  const metadata = JSON.parse(readFileSync(path, "utf8"));
  metadata.wilayas_covered = new Set(rows.map((record) => record.wilaya_code)).size;
  return [path, `${JSON.stringify(metadata, null, 2)}\n`];
}

function writeAtomic(path, content) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

let changedRecords = 0;
const outputs = [];

for (const [pkg, file] of PACKAGE_FILES) {
  const dataDir = join(ROOT, "packages", pkg, "data");
  const path = join(dataDir, file);
  const rows = JSON.parse(readFileSync(path, "utf8"));
  let changed = 0;
  const normalized = rows.map((record) => {
    if (record.commune_code == null) return record;
    let canonical = canonicalCodeForCurrentCommune(
      record.wilaya_code,
      record.commune,
      record.commune_ar,
    );
    let wilayaCode = record.wilaya_code;
    if (!canonical) {
      const byCode = canonicalCommuneForCode(record.commune_code);
      if (byCode && latinNameKey(byCode.name_fr) === latinNameKey(record.commune)) {
        canonical = String(byCode.code_commune).padStart(4, "0");
        wilayaCode = String(byCode.wilaya_code).padStart(2, "0");
      }
    }
    if (!canonical) {
      throw new Error(`${pkg}/${file} id=${record.id}: cannot resolve ${record.wilaya_code}|${record.commune}`);
    }
    if (record.commune_code === canonical && record.wilaya_code === wilayaCode) return record;
    changed++;
    return replaceCommuneFields(replaceWilayaCode(record, wilayaCode), canonical);
  });
  changedRecords += changed;
  outputs.push(...render(dataDir, file, normalized));
  outputs.push(renderMetadata(dataDir, normalized));
  console.log(`${pkg}/${file}: ${changed} record(s) ${WRITE ? "patched" : "pending"}`);
}

const posteDir = join(ROOT, "packages", "poste", "data");
const posteFile = "postoffices.json";
const offices = JSON.parse(readFileSync(join(posteDir, posteFile), "utf8"));
let posteChanged = 0;
const normalizedOffices = offices.map((record) => {
  const raw = record.source_commune_code ?? record.commune_code;
  const normalized = normalizeProviderCommune({
    wilayaCode: record.wilaya_code,
    commune: record.commune,
    communeAr: record.commune_ar,
    sourceCode: raw,
  });
  const next = replaceCommuneFields(
    record,
    normalized.commune_code,
    normalized.source_commune_code,
  );
  if (JSON.stringify(next) !== JSON.stringify(record)) posteChanged++;
  return next;
});
changedRecords += posteChanged;
const posteOutputs = render(posteDir, posteFile, normalizedOffices);
outputs.push(...posteOutputs);
const mirrorDir = join(ROOT, "packages", "dataset", "data", "poste");
outputs.push(...render(mirrorDir, posteFile, normalizedOffices));
const atms = JSON.parse(readFileSync(join(posteDir, "atms.json"), "utf8"));
outputs.push(renderMetadata(posteDir, [...normalizedOffices, ...atms]));
outputs.push(renderMetadata(mirrorDir, [...normalizedOffices, ...atms]));
console.log(`poste/${posteFile}: ${posteChanged} record(s) ${WRITE ? "patched" : "pending"}`);

const changedOutputs = outputs.filter(([path, content]) => readFileSync(path, "utf8") !== content);
if (WRITE) for (const [path, content] of changedOutputs) writeAtomic(path, content);

console.log(
  `${changedRecords} record(s), ${changedOutputs.length} generated file(s) ` +
    `${WRITE ? "updated" : "need an update"}`,
);
if (CHECK && (changedRecords || changedOutputs.length)) process.exit(1);
