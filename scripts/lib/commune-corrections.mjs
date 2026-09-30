// The applied commune-centre corrections, in the order they were applied.
//
// WHY A LIST AND NOT ONE FILE. Each audit writes its own
// research/_commune-centres/corrections-<date>.json, and both
// scripts/fix-commune-centres.mjs and scripts/sync-commune-centroid-dependents.mjs
// have to see the whole applied history rather than the latest batch: the first
// replays every correction against every carrier (a row already at its `to` is a
// no-op, so replaying is safe and a carrier that missed an old batch still fails),
// and the second matches a dependent's stored coordinate against the `from` of any
// correction ever applied. Retiring an old file would turn both of those into a
// silent pass.
//
// Shared so the two scripts cannot disagree about which batches are applied.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIR = join(ROOT, "research", "_commune-centres");

/** Oldest first. A new audit appends its file here. */
export const CORRECTION_FILES = ["corrections-2026-09-27.json", "corrections-2026-09-29.json"];

/**
 * Every applied correction, oldest batch first, each row carrying the `batch`
 * (the file's `generated` date) and `timestamp_osm_base` it came from.
 */
export function loadCorrections() {
  const docs = [];
  const corrections = [];
  const seen = new Set();
  for (const file of CORRECTION_FILES) {
    const doc = JSON.parse(readFileSync(join(DIR, file), "utf-8"));
    if (doc.corrections.length !== doc.count) {
      throw new Error(`${file} says ${doc.count} rows, carries ${doc.corrections.length}`);
    }
    if (doc.applied === false) throw new Error(`${file} is marked applied: false; it must not be in CORRECTION_FILES`);
    for (const row of doc.corrections) {
      if (seen.has(row.code_commune)) {
        throw new Error(`${file}: ${row.name_fr} (${row.code_commune}) is corrected by an earlier batch too`);
      }
      seen.add(row.code_commune);
      corrections.push({ ...row, batch: doc.generated, timestamp_osm_base: doc.timestamp_osm_base });
    }
    docs.push({ file, generated: doc.generated, timestamp_osm_base: doc.timestamp_osm_base, count: doc.count });
  }
  return { docs, corrections, count: corrections.length };
}

/** "2026-09-27 (56, OSM …Z), 2026-09-29 (174, OSM …Z)", for a script's own report. */
export function describeBatches(docs) {
  return docs.map((d) => `${d.generated} (${d.count}, OSM ${d.timestamp_osm_base})`).join(", ");
}
