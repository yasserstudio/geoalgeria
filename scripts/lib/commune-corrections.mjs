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
export const CORRECTION_FILES = [
  "corrections-2026-09-27.json",
  "corrections-2026-09-29.json",
  "corrections-2026-10-01.json",
  "corrections-2026-10-01b.json",
];

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
    docs.push({ file, generated: doc.generated, run: doc.run ?? doc.generated, timestamp_osm_base: doc.timestamp_osm_base, count: doc.count });
  }
  return { docs, corrections, count: corrections.length };
}

/**
 * Where a commune-centre ledger has moved a commune, as `Map<code_commune, [lat, lng]>`.
 *
 * WHY HERE. An older repair can be superseded by a later ledger, and then the script that
 * applies the older one must leave the coordinate alone instead of reading it as drift.
 * El Euch (3427) is the first case: the JORA repair of version 2.1.0 took it off a
 * placeholder onto its relation's centroid, and the coordinate review of 2026-10-01 then
 * moved it 9.7 km onto its own `admin_centre` node. Both scripts/fix-jo-corrections.mjs
 * and test/jo-corrections.test.mjs need that answer, and the axis flip it needs
 * (a ledger stores [lng, lat], the JORA table [lat, lng]) is exactly the kind of
 * hand-written swap this repository has already shipped undetected once, so it is written
 * once here rather than in both.
 */
export function supersededCommunePoints(codes = null) {
  const out = new Map();
  for (const row of loadCorrections().corrections) {
    if (codes && !codes.has(row.code_commune)) continue;
    out.set(row.code_commune, [row.to[1], row.to[0]]);
  }
  return out;
}

/** "2026-09-27 (56, OSM …Z), 2026-09-29 (174, OSM …Z)", for a script's own report. Two
 *  batches can share a date (2026-10-01 settled the wilaya capitals and then ran the
 *  coordinate review), so a file that carries a `run` is named by it. */
export function describeBatches(docs) {
  return docs.map((d) => `${d.run ?? d.generated} (${d.count}, OSM ${d.timestamp_osm_base})`).join(", ");
}
