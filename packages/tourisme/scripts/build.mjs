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
 * military and gendarmerie facilities (hotels, messes, clubs, housing, commands, bases,
 * barracks and brigades in use) leave the data and their ids retire; a record that only
 * MENTIONS a military place stays, and colonial-era military heritage stays as heritage.
 * Kept for that reason: `historic-4` (the former French army camp at Ténès),
 * `historic-707` (Bastion 18), `historic-252` (Caserne Bab Lakouas), `historic-818`
 * (الثكنة القديمة, the old barracks), `historic-1015` and `historic-1016` (two French
 * colonial watchtowers, ruins) and `attraction-906` (the Army Museum, a museum).
 * `lodging-1528` (قاعدة الحياة) stays too: a "base de vie" is a worker camp, not a
 * military base.
 *
 * Keyed on the upstream element rather than the published id on purpose: the id is this
 * package's own join key and a refreshed pull would mint a new one, so only the element
 * key keeps the place out of a rebuild.
 */
const EXCLUDED_OSM = {
  // 11 military hotels, an army rest centre, the national army club, one military
  // housing block and one military residential quarter, all still in service.
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
    "353023053", // lodging-1236  Centre de repos de l'armee nationale (Boumerdes)
    "354061670", // lodging-532   Cercle National de l'Armee (Alger)
  ]),
  // A naval command, a gendarmerie brigade and a named army base, none of them
  // historic, that the historic layer had picked up from upstream tagging.
  "historic.json": new Set([
    "4571831389", // historic-396  cite militaire chelghoum (Mila), military housing
    "155362197", // historic-251  Commandement des Forces Navales (Alger)
    "1329600495", // historic-267  Gendarmerie de Oued Athmania (Mila)
    "10136173319", // historic-385  قاعدة الشهيد هداد (Tindouf)
  ]),
  // Three gendarmerie nationale units upstream had tagged as an artwork and two
  // viewpoints.
  "attractions.json": new Set([
    "5321704521", // attraction-136   groupement gendarmerie nationale (Annaba)
    "4695836089", // attraction-1193  brigade de gendarmerie (El Oued)
    "4574486989", // attraction-1212  gendarmerie nationale (Touggourt)
  ]),
};

/**
 * Wikidata records that duplicate a place this package already ships from
 * OpenStreetMap, keyed by the Wikidata item, per layer file, with the record that
 * carries the place. Owner decision of 2026-10-29: the duplicate leaves and its id
 * retires with a forward to the OSM record, so an old key still finds the place.
 * The five national parks each came in twice, once as an OSM boundary (with a
 * measured point) and once as a Wikidata item (with a rounded point 0.7 to 7.7 km
 * from the boundary's centre).
 */
const MERGED_WIKIDATA = {
  "parks.json": {
    Q2664184: "park-2", // Belezma National Park -> Parc National de Belezma
    Q2664193: "park-7", // Gouraya National Park -> Parc national de Gouraya
    Q2671600: "park-3", // Chrea National Park -> Parc National de Chréa
    Q2580089: "park-6", // Djurdjura National Park -> Parc National du Djurdjura
    Q650992: "park-1", // El Kala National Park -> Parc National d'El Kala
  },
};

const cfg = MIGRATIONS.tourisme;
const oldMeta = read("metadata.json");
const retiredIds = readRetiredIds(DATA);
const retiredMigrations = readRetiredMigrations(DATA);

let dropped = 0;
const files = cfg.files.map(({ file }) => {
  const excluded = EXCLUDED_OSM[file];
  const merged = MERGED_WIKIDATA[file] ?? {};
  const all = read(file);
  const byId = new Map(all.map((row) => [row.id, row]));
  const rows = all.filter((row) => {
    const into = merged[row.refs?.wikidata ?? ""];
    // The twin gains the same Wikidata item below, so it must not merge into itself.
    if (into && into !== row.id) {
      const twin = byId.get(into);
      if (!twin?.refs?.osm) throw new Error(`tourisme: ${row.id} merges into ${into}, which is not an OSM record of ${file}`);
      // The twin carries what the duplicate brought and it lacked: its Wikidata
      // item and its French and Arabic names. Nothing the twin has is replaced.
      twin.refs = { ...twin.refs, wikidata: twin.refs.wikidata ?? row.refs.wikidata };
      for (const key of ["name_fr", "name_ar"]) twin[key] = twin[key] ?? row[key] ?? null;
      retiredIds.add(String(row.id));
      retiredMigrations[row.id] = {
        merged_into: into,
        osm: [String(twin.refs.osm)],
        note: `Merged into ${into}. Wikidata ${row.refs.wikidata} and OpenStreetMap element ${twin.refs.osm} are the same national park; the OpenStreetMap record carries the measured point.`,
      };
      dropped += 1;
      return false;
    }
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
