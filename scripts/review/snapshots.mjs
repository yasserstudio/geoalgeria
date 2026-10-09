// Loading the committed inputs the review engine decides on.
//
// COMMITTED ONLY. ADR 0001 rule 8: every input is a file in this repository, so a run can
// be replayed offline, the tests can re-derive a decision, and upstream drift shows up as
// a diff on a snapshot rather than as a different answer. The one exception is the L3
// verdicts file, which lives outside the repository on purpose and is read from a path.
//
// THE RECORD MEDIANS ARE A SNAPSHOT TOO. The L2 Claim is read from this repository's own
// packages, so it moves whenever a release adds, removes or moves one record, and a run
// that has already landed would stop replaying. A run therefore freezes what it read
// beside its ledger (scripts/review/record-medians.mjs): `recordMediansPath` replays from
// that file, and a fresh run sweeps the packages here.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { inCommuneOutline } from "../lib/commune-resolver.mjs";
import { RECORD_FILES, recordsOf } from "../../test/lib/wilaya-containment.mjs";
import { geometricMedian } from "./layers/l2-record-median.mjs";
import { loadRecordMedians } from "./record-medians.mjs";
import { loadWikidataReference } from "./wikidata-reference.mjs";

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const json = (...p) => JSON.parse(readFileSync(join(...p), "utf-8"));

/** The three split files are the flagship commune set; algeria.json carries the wilayas. */
export function loadCommunes(root = REPO_ROOT) {
  const data = join(root, "packages", "dataset", "data");
  return [
    ...json(data, "communes_w1_w23.json"),
    ...json(data, "communes_w24_w48.json"),
    ...json(data, "communes_w49_w69.json"),
  ].map((c) => ({
    code_commune: c.code_commune,
    wilaya_code: c.wilaya_code,
    name_fr: c.name_fr,
    name_ar: c.name_ar,
    point: [c.longitude, c.latitude],
  }));
}

/**
 * Every `geo_precision: exact` record of every package, bucketed into the commune
 * outlines it falls inside, and the median of each bucket.
 *
 * BY GEOMETRY, NOT BY ATTRIBUTION: a record is counted for the commune whose outline
 * contains it, whatever commune it names, so a mis-attributed record cannot pull a
 * median and a correctly placed one always counts. The bbox is a reject before the
 * point-in-polygon, which is what keeps a sweep of 53,120 records over 1,537 outlines
 * inside a second.
 *
 * ONE SHAPE WITH THE FROZEN SET: `{records, files, median}` is what L2 reads, whether it
 * came from this sweep or from a run's frozen file, so the layer never knows which. The
 * raw `points` ride along for the threshold measurements in
 * research/_commune-centres/README.md and are not part of the frozen set. The threshold
 * stays L2's: a median is taken wherever there is a point to take one from.
 */
export function bucketExactRecords(root, outlines) {
  const records = [];
  for (const file of RECORD_FILES(root))
    for (const r of recordsOf(root, file)) if (r.row.geo_precision === "exact") records.push({ lng: r.lng, lat: r.lat, file });

  const byCommune = new Map();
  for (const outline of outlines) {
    if (!outline.usable || !outline.bbox) continue;
    const [w, s, e, n] = outline.bbox;
    const points = [];
    const files = new Set();
    for (const r of records) {
      if (r.lng < w || r.lng > e || r.lat < s || r.lat > n) continue;
      if (!inCommuneOutline(r.lng, r.lat, outline)) continue;
      points.push([r.lng, r.lat]);
      files.add(r.file);
    }
    byCommune.set(outline.code_commune, {
      records: points.length,
      files: files.size,
      median: points.length ? geometricMedian(points) : null,
      points,
    });
  }
  return { total: records.length, byCommune };
}

/** The L3 verdicts file, or null. Never a path inside this repository. */
export function loadVerdicts(path, read = new Date().toISOString().slice(0, 10)) {
  if (!path) return null;
  if (!existsSync(path)) throw new Error(`verdicts file ${path} does not exist`);
  if (resolve(path).startsWith(resolve(REPO_ROOT) + "/"))
    throw new Error(`verdicts file ${path} is inside this repository; L3 content is never committed here`);
  const rows = JSON.parse(readFileSync(path, "utf-8"));
  if (!Array.isArray(rows)) throw new Error(`verdicts file ${path} is not an array of {code, name, verdict}`);
  return { meta: { read, path }, byCommune: new Map(rows.map((r) => [Number(r.code), { verdict: r.verdict, name: r.name }])) };
}

/**
 * Every input the engine reads.
 *
 * @param {object} options
 * @param {string} [options.root]  the repository root
 * @param {string|null} [options.verdictsPath]  an L3 verdicts file outside the repository
 * @param {string|null} [options.recordMediansPath]  a run's frozen record-median set, which
 *   replays that run's L2 Claim instead of reading the packages as they stand today
 * @param {string} [options.today]  the run date, which also dates a fresh sweep of the
 *   records; a frozen set carries the date it was read on.
 */
export function loadSnapshots({
  root = REPO_ROOT,
  verdictsPath = null,
  recordMediansPath = null,
  today = new Date().toISOString().slice(0, 10),
} = {}) {
  const dir = join(root, "research", "_commune-centres");
  const seats = json(dir, "osm-seat-reference.json");
  const boundaries = json(dir, "commune-boundaries.json");
  const wikidata = loadWikidataReference(join(dir, "wikidata-reference.json"));
  const communes = loadCommunes(root);

  return {
    today,
    communes,
    byCode: new Map(communes.map((c) => [c.code_commune, c])),
    seats: {
      meta: { generated: seats.generated, timestamp_osm_base: seats.timestamp_osm_base, licence: seats.licence },
      byCommune: new Map(seats.communes.map((c) => [c.code_commune, c])),
    },
    wikidata,
    boundaries: {
      meta: { generated: boundaries.generated, timestamp_osm_base: boundaries.timestamp_osm_base },
      byCommune: new Map(boundaries.communes.map((c) => [c.code_commune, c])),
      all: boundaries.communes,
    },
    records: recordMediansPath
      ? loadRecordMedians(recordMediansPath)
      : { committed: today, ...bucketExactRecords(root, boundaries.communes) },
    verdicts: loadVerdicts(verdictsPath, today),
  };
}
