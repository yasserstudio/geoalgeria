#!/usr/bin/env node
// Emit the derived files (CSV mirrors, branches GeoJSON, canonical metadata.json)
// from the source JSON. The registry (banks.json, institutions.json) is hand-curated
// from the Banque d'Algérie agréé list in the canonical v2 GeoRecord shape;
// branches.json is produced by scripts/fetch.mjs from each bank's official locator.
// All three are already v2, so they pass straight through the shared writer (no map)
// — it owns the id sort, shared-point demotion, CSV/GeoJSON, and the derived metadata.
// Run after editing any source file (and after scripts/fetch.mjs refreshes branches).
//
// Usage: node scripts/build.mjs
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MIGRATIONS, writePackageV2, committedDates } from "../../../scripts/lib/v2-transforms.mjs";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const rd = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

const files = [
  { file: "banks.json", geojson: false, rows: rd("banks.json") },
  { file: "institutions.json", geojson: false, rows: rd("institutions.json") },
];
// Branches are optional (produced by fetch.mjs); fold in when present.
if (existsSync(join(DATA, "branches.json"))) files.push({ file: "branches.json", rows: rd("branches.json") });

const cfg = MIGRATIONS.banques;
const { updated, retrieved } = committedDates(DATA);
const { metadata } = writePackageV2({ pkg: "banques", dir: DATA, files, meta: cfg.meta, updated, retrieved });

console.log(
  `banques: ${metadata.banks} banks + ${metadata.institutions} institutions` +
    (metadata.branches ? ` + ${metadata.branches} branches (${metadata.banks_with_branches} bank[s])` : "") +
    " → v2",
);
