#!/usr/bin/env node
// Re-emit @geoalgeria/tourisme (the five layer files, their CSV/GeoJSON mirrors and
// the canonical metadata.json) from its own committed records.
//
// WHY A BUILD SCRIPT AT ALL. This package has never had a generator: the 2026-06-21
// OpenStreetMap/Wikidata/ASAL pull that produced it was not kept, so the committed
// records ARE the source. They are already v2, so they pass straight through the
// shared writer with no map; it owns the id sort, the published-name dash folding,
// the shared-point demotion, the CSV/GeoJSON mirrors and the derived metadata, and
// it applies quality/overrides/tourisme.json on every emit. A second run is a no-op.
//
// It is offline by construction (it reads `data/`, never the network), and it is the
// place a record exclusion has to live so that a future refresh keeps it out instead
// of re-publishing it.
//
// Usage: node scripts/build.mjs   (or `pnpm --filter @geoalgeria/tourisme build`)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  MIGRATIONS,
  committedDates,
  readRetiredIds,
  readRetiredMigrations,
  writePackageV2,
} from "../../../scripts/lib/v2-transforms.mjs";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const read = (file) => JSON.parse(readFileSync(join(DATA, file), "utf-8"));

/**
 * Military places this package does not publish, keyed by the OpenStreetMap element
 * each record was read from, per layer file.
 *
 * Owner decision of 2026-10-29: no military location anywhere in the project. Current
 * military facilities (hotels, messes, clubs, housing, bases, barracks in use) leave
 * the data and their ids retire; a record that only MENTIONS a military place stays,
 * and colonial-era military heritage stays as heritage (`historic-4`, the former French
 * army camp at Ténès, and `historic-707`, Bastion 18, are both kept for that reason).
 *
 * Keyed on the upstream element rather than the published id on purpose: the id is this
 * package's own join key and a refreshed pull would mint a new one, so only the element
 * key keeps the place out of a rebuild.
 */
const EXCLUDED_OSM = {
  // 13 military hotels, one military housing block and one military residential
  // quarter, all still in service.
  "lodging.json": new Set([
    "5548912955", // lodging-1028  السكن العسكري (Mascara)
    "5053631921", // lodging-1097  hotel militaire (Ouargla)
    "5287149225", // lodging-1113  حي عسكري (Oran)
    "385262966", // lodging-1154  Hotel Militaire (Oran)
    "297172601", // lodging-1155  Hotel Militaire d'Oran
    "5275908521", // lodging-1544  فندق عسكري / Hotel Militaire (Djanet)
    "358446102", // lodging-1561  Hotel militaire (Barika)
    "273531613", // lodging-251   Hotel Militaire 3e RM (Bechar)
    "6178091787", // lodging-286   Hotel Militaire Blida
    "43582543", // lodging-48    Hotel Militaire (Laghouat)
    "3235962", // lodging-605   Hotel Militaire (Alger)
    "254894521", // lodging-721   Hotel militaire (Djelfa)
    "3183735023", // lodging-973   Hotel militaire (Constantine)
  ]),
  // Current military housing, tagged as a historic castle upstream.
  "historic.json": new Set([
    "4571831389", // historic-396  cite militaire chelghoum (Mila)
  ]),
};

const cfg = MIGRATIONS.tourisme;
const oldMeta = read("metadata.json");
const retiredIds = readRetiredIds(DATA);
const retiredMigrations = readRetiredMigrations(DATA);

let dropped = 0;
const files = cfg.files.map(({ file }) => {
  const excluded = EXCLUDED_OSM[file];
  const rows = read(file).filter((row) => {
    if (!excluded?.has(String(row.refs?.osm ?? ""))) return true;
    // A published id is a join key: it is reserved for good and never reused, and
    // carries no forward because the place was removed, not merged (RELEASING.md,
    // "Retiring a published id").
    retiredIds.add(String(row.id));
    dropped += 1;
    return false;
  });
  return { file, rows };
});

const { updated, retrieved } = committedDates(DATA);
const { metadata } = writePackageV2({
  pkg: "tourisme",
  dir: DATA,
  files,
  meta: cfg.meta,
  updated,
  retrieved,
  oldMeta,
  retiredIds,
  retiredMigrations,
});

console.log(
  `tourisme: ${metadata.record_count} records` +
    (dropped ? `, ${dropped} excluded this run` : "") +
    `, ${retiredIds.size} id(s) retired -> v2`,
);
