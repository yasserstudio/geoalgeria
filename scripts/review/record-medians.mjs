// The record-median set of one run: the L2 Claim of every commune that run reviewed,
// frozen into a file that lands with the run's ledger.
//
// WHY THIS FILE EXISTS. ADR 0001 rule 8 reads every input from a committed snapshot, so a
// decision replays and upstream drift shows up as a diff. The L2 Claim was the exception:
// it is a reading of this repository's own records, taken live from the packages, so a
// later release that adds, removes or moves a single `geo_precision: exact` record moved
// the medians of a run that had already been decided and landed. Merging the sante twins
// (private tracker #216) did exactly that: two of run 2026-10-01b's medians moved by
// metres, not one decision changed, and test/review-decisions.test.mjs failed on the
// evidence bytes. Freezing the set makes a landed run replay forever, and the file is the
// run's own record of what it read rather than a hash of something that has since moved.
//
// WHAT IS FROZEN IS THE CLAIM, NOT THE POINT CLOUD. The engine never sees the individual
// records: it reads the median, the record count that puts it over MIN_EXACT_RECORDS and
// the number of packages behind it. Freezing those three is 6 KB where the 2,589 points
// inside the reviewed outlines would be ten times that, and the median algorithm keeps its
// own guard in test/review-record-medians.test.mjs.

import { readFileSync, renameSync, writeFileSync } from "node:fs";

import { MIN_EXACT_RECORDS } from "./thresholds.mjs";

/** The frozen file of a run, beside its ledger. */
export const recordMediansFile = (run) => `record-medians-${run}.json`;

/**
 * A commune the frozen set does not hold is a hard error rather than a commune with no
 * records: the set under review is derived from the published centres and the seats, so a
 * code missing here means the run being replayed is not the run that was frozen, and
 * answering "no median" would quietly decide that commune on one Claim fewer.
 */
class FrozenRecordMedians extends Map {
  get(code) {
    if (!super.has(code))
      throw new Error(
        `the frozen record-median set does not hold commune ${code}: the set under review has changed, so this run no longer replays. Re-run the review and land a new ledger rather than widening the set.`,
      );
    return super.get(code);
  }
}

/** A median is a [lng, lat] somewhere on the globe, or nothing at all. */
const isPoint = (p) =>
  Array.isArray(p) &&
  p.length === 2 &&
  p.every((n) => typeof n === "number" && Number.isFinite(n)) &&
  Math.abs(p[0]) <= 180 &&
  Math.abs(p[1]) <= 90;

/**
 * The frozen set of a run, in the shape loadSnapshots puts under `records`.
 *
 * THE ROWS ARE CHECKED ON THE WAY IN. A row at or over MIN_EXACT_RECORDS states a Claim,
 * so the voting rules read its point and measure distances with it: a missing or malformed
 * median there surfaced as a TypeError on `claim.point[0]` inside votes.mjs, naming
 * neither the commune nor the file. The rows are read once here instead, and a bad one
 * says which commune it is. Below the threshold a row states nothing, so it may carry a
 * median the engine will not read, or none.
 */
export function loadRecordMedians(path) {
  const doc = JSON.parse(readFileSync(path, "utf-8"));
  if (!Array.isArray(doc.communes)) throw new Error(`${path} is not a record-median set`);
  if (doc.min_exact_records !== MIN_EXACT_RECORDS)
    throw new Error(
      `${path} was frozen at min_exact_records ${doc.min_exact_records}, and the engine now uses ${MIN_EXACT_RECORDS}: the threshold moved, so the run has to be re-run rather than replayed`,
    );
  for (const row of doc.communes) {
    if (row.median !== null && !isPoint(row.median))
      throw new Error(`${path}, commune ${row.code_commune}: ${JSON.stringify(row.median)} is not a [lng, lat] median`);
    if (row.median === null && row.records >= MIN_EXACT_RECORDS)
      throw new Error(
        `${path}, commune ${row.code_commune}: ${row.records} records state a record median, and this row carries none`,
      );
  }
  return {
    committed: doc.read,
    total: doc.records_total,
    byCommune: new FrozenRecordMedians(
      doc.communes.map((c) => [c.code_commune, { records: c.records, files: c.files, median: c.median }]),
    ),
  };
}

/**
 * The frozen set of the communes a run reviewed, in commune-code order.
 *
 * Every reviewed commune is listed, the ones under MIN_EXACT_RECORDS and the ones with no
 * usable outline to bucket records into included with a null median, so the file says what
 * the run read about each of them rather than only where a Claim was stated.
 */
export function buildRecordMedians({ decisions }, snapshots, { run, generated }) {
  return {
    generated,
    run,
    note: `The L2 record-median Claim of run ${run}, frozen. The median of the geo_precision: exact records inside each reviewed commune's own OpenStreetMap outline is a reading of this repository's working tree, so it is landed with the run: a later release that moves one record must not move the evidence of a decision already taken (ADR 0001 rule 8, private tracker #267). Replay with \`node scripts/review/run.mjs --records research/_commune-centres/${recordMediansFile(run)}\`; rebuild only by re-running the review.`,
    read: snapshots.records.committed,
    records_total: snapshots.records.total,
    min_exact_records: MIN_EXACT_RECORDS,
    communes: decisions
      .map((d) => {
        const entry = snapshots.records.byCommune.get(d.code_commune) ?? { records: 0, files: 0, median: null };
        return { code_commune: d.code_commune, records: entry.records, files: entry.files, median: entry.median };
      })
      .sort((a, b) => a.code_commune - b.code_commune),
  };
}

/** Written the same way run.mjs writes its two documents. */
export function writeRecordMedians(path, doc) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}\n`);
  renameSync(tmp, path);
}
