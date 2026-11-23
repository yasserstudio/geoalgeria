#!/usr/bin/env node
// Store what scripts/fetch-burned-area.py read as the two committed Source captures
// scripts/build-burned-area.mjs builds from.
//
// USAGE
//   node scripts/capture-burned-area.mjs <work dir> [--retrieved YYYY-MM-DD]

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { writeCapture } from "./lib/source-store.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { retrieved: { type: "string" } },
});
const [work] = positionals;
if (!work) {
  console.error("usage: node scripts/capture-burned-area.mjs <work dir> [--retrieved YYYY-MM-DD]");
  process.exit(1);
}
const retrieved = values.retrieved ?? new Date().toISOString().slice(0, 10);
const read = (name) => JSON.parse(readFileSync(join(work, name), "utf-8"));
const cells = read("cells.json");
const gwis = read("gwis.json");

writeCapture("geoalgeria", "burned-area-cells", cells, {
  url: "https://doi.org/10.5067/MODIS/MCD64A1.061",
  retrieved,
  records: Object.values(cells.months)
    .flatMap((tiles) => Object.values(tiles))
    .reduce((n, list) => n + list.length, 0),
  note: "NASA MODIS MCD64A1 v061: burned cells ([row, col, MCD12Q1 v061 land class, DOI 10.5067/MODIS/MCD12Q1.061]) per month and tile, cut to a box around Algeria.",
});
writeCapture("geoalgeria", "gwis-burned-area", gwis, {
  url: "https://gwis.jrc.ec.europa.eu/downloads/country.profile/MCD64A1_burned_area_full_dataset_2002_2025.zip",
  retrieved,
  records: gwis.rows.length,
  note: "EU JRC GWIS, CC BY 4.0, used as a check: Algeria's rows (region, month, land class), as published.",
});
