#!/usr/bin/env node
// Derive CSV mirrors, GeoJSON, and metadata.json from the source JSON. The
// registry (banks.json, institutions.json) is hand-curated from the Banque
// d'Algérie agréé list; branches.json is produced by scripts/fetch.mjs from each
// bank's official locator. Run after editing any source file.
//
// Usage: node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const readJson = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

const csvCell = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (cols, rows) =>
  [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";

const REGISTRY_COLS = ["id", "acronym", "bank_code", "name_fr", "name_ar", "type",
  "ownership", "ownership_country", "parent_company", "swift_bic", "website",
  "hq_address", "hq_city", "wilaya_code", "year_established"];
const BRANCH_COLS = ["id", "bank_id", "name", "address", "phone", "wilaya_code", "lat", "lng"];

const banks = readJson("banks.json");
const institutions = readJson("institutions.json");
writeFileSync(join(DATA, "csv", "banks.csv"), toCsv(REGISTRY_COLS, banks));
writeFileSync(join(DATA, "csv", "institutions.csv"), toCsv(REGISTRY_COLS, institutions));

const metadata = {
  source: "Banque d'Algérie — liste des banques et établissements financiers agréés (Journal Officiel n° 9, 6 février 2026; situation au 4 janvier 2026); branch locations from each bank's official locator",
  origin: "https://www.bank-of-algeria.dz/banques-commerciales/",
  license: "Compiled from public regulatory listings and official institution sites/locators; redistributed for reference. See README.",
  banks: banks.length,
  institutions: institutions.length,
  total: banks.length + institutions.length,
  generated_at: "2026-06-15",
};

// Branches are optional (produced by fetch.mjs); fold in when present.
if (existsSync(join(DATA, "branches.json"))) {
  const branches = readJson("branches.json");
  const hasCoord = (r) => Number.isFinite(r.lat) && Number.isFinite(r.lng);
  writeFileSync(join(DATA, "csv", "branches.csv"), toCsv(BRANCH_COLS, branches));
  mkdirSync(join(DATA, "geojson"), { recursive: true });
  const fc = {
    type: "FeatureCollection",
    features: branches.filter(hasCoord).map((r) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [r.lng, r.lat] },
      properties: { id: r.id, bank_id: r.bank_id, name: r.name, address: r.address, phone: r.phone, wilaya_code: r.wilaya_code },
    })),
  };
  writeFileSync(join(DATA, "geojson", "branches.geojson"), JSON.stringify(fc) + "\n");
  metadata.branches = branches.length;
  metadata.branches_geocoded = branches.filter(hasCoord).length;
  metadata.banks_with_branches = new Set(branches.map((b) => b.bank_id)).size;
}

writeFileSync(join(DATA, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n");
console.log(
  `banques: ${banks.length} banks + ${institutions.length} institutions` +
    (metadata.branches ? ` + ${metadata.branches} branches (${metadata.banks_with_branches} bank[s])` : ""),
);
