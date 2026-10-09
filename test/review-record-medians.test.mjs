// The frozen record-median set: the one input of the coordinate review that is not a
// committed snapshot of a third party but a reading of this repository's own records.
//
// WHY IT IS FROZEN. ADR 0001 rule 8 wants every input replayable, and the L2 Claim was
// derived from the working tree instead, so any package gaining or moving a record moved
// the medians a landed run had already decided on. Merging the sante twins (private
// tracker #216) moved two of run 2026-10-01b's medians by metres and broke
// test/review-decisions.test.mjs with no decision changed. A run now lands its median set
// beside its ledger, and the replay reads that.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { reviewCommuneCentres } from "../scripts/review/engine.mjs";
import { geometricMedian } from "../scripts/review/layers/l2-record-median.mjs";
import { loadRecordMedians, recordMediansFile } from "../scripts/review/record-medians.mjs";
import { rewind } from "../scripts/review/run.mjs";
import { loadSnapshots } from "../scripts/review/snapshots.mjs";

const write = (doc) => {
  const path = join(mkdtempSync(join(tmpdir(), "record-medians-")), "record-medians-test.json");
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);
  return path;
};

const DOC = {
  generated: "2026-10-01",
  run: "test",
  read: "2026-10-01",
  records_total: 53128,
  min_exact_records: 10,
  communes: [
    { code_commune: 122, records: 23, files: 11, median: [-0.432772, 28.002849] },
    { code_commune: 646, records: 4, files: 3, median: null },
  ],
};

test("the frozen set is read back as the engine's records input, dated by the file and not by today", () => {
  const records = loadRecordMedians(write(DOC));
  assert.equal(records.total, 53128);
  assert.equal(records.committed, "2026-10-01");
  assert.deepEqual(records.byCommune.get(122), { records: 23, files: 11, median: [-0.432772, 28.002849] });
  assert.deepEqual(records.byCommune.get(646), { records: 4, files: 3, median: null });
});

test("a commune the frozen set does not hold is an error, not a commune with no records", () => {
  const records = loadRecordMedians(write(DOC));
  assert.throws(
    () => records.byCommune.get(1234),
    /1234/,
    "reading past the frozen set would silently decide a commune on no median at all",
  );
});

test("a set frozen at another record threshold is refused, because the run cannot be replayed at this one", () => {
  assert.throws(() => loadRecordMedians(write({ ...DOC, min_exact_records: 4 })), /min_exact_records 4/);
});

// A row over the threshold IS a Claim, so the engine reads its point and measures
// distances with it. A null or malformed median there used to surface as a TypeError deep
// inside the voting rules (`claim.point[0]` in votes.mjs), which says nothing about which
// commune's row is wrong. The file is checked on the way in instead.
test("a commune over the record threshold with no median is refused, and the error names it", () => {
  const broken = { ...DOC, communes: [{ code_commune: 122, records: 23, files: 11, median: null }] };
  assert.throws(() => loadRecordMedians(write(broken)), /commune 122/);
});

test("a malformed median is refused wherever it sits, over the threshold or under it", () => {
  for (const median of [[3.1], [3.1, 36.7, 0], ["3.1", "36.7"], [3.1, 936.7], [181, 36.7], [Number.NaN, 36.7]]) {
    const over = { ...DOC, communes: [{ code_commune: 122, records: 23, files: 11, median }] };
    assert.throws(() => loadRecordMedians(write(over)), /commune 122/, `over the threshold: ${JSON.stringify(median)}`);
    const under = { ...DOC, communes: [{ code_commune: 122, records: 4, files: 3, median }] };
    assert.throws(() => loadRecordMedians(write(under)), /commune 122/, `under it: ${JSON.stringify(median)}`);
  }
});

test("a commune under the record threshold states no Claim, with a median or without one", () => {
  const rows = [
    { code_commune: 630, records: 0, files: 0, median: null },
    { code_commune: 532, records: 4, files: 4, median: [6.005791, 35.363195] },
  ];
  const records = loadRecordMedians(write({ ...DOC, communes: rows }));
  assert.equal(records.byCommune.get(630).median, null);
  assert.deepEqual(records.byCommune.get(532).median, [6.005791, 35.363195]);
});

// THE READ PATH, PROVEN. The one thing the freeze has to buy is that a replay no longer
// looks at the packages. A frozen median moved 500 m west comes back out of the engine as
// the record-median Candidate, which it could not do if the layer were still taking the
// median of today's records.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "research", "_commune-centres");
const RUN = "2026-10-01b";
const LEDGER = JSON.parse(readFileSync(join(DIR, `corrections-${RUN}.json`), "utf-8"));

test("the record-median Claim of a replay is the frozen one, not a median of the packages as they stand", () => {
  const frozen = JSON.parse(readFileSync(join(DIR, recordMediansFile(RUN)), "utf-8"));
  const bouda = frozen.communes.find((c) => c.code_commune === 122);
  const moved = [bouda.median[0] - 0.005, bouda.median[1]];
  const path = write({
    ...frozen,
    communes: frozen.communes.map((c) => (c.code_commune === 122 ? { ...c, median: moved } : c)),
  });

  const snapshots = rewind(loadSnapshots({ today: "2026-10-01", recordMediansPath: path }), [LEDGER]);
  const decision = reviewCommuneCentres(snapshots).decisions.find((d) => d.code_commune === 122);
  const candidate = decision.candidates.find((c) => c.source === "record_median");
  assert.deepEqual(candidate.point, moved);
  assert.notDeepEqual(candidate.point, bouda.median);
});

test("the frozen set of run 2026-10-01b is the input its ledger declares", () => {
  const frozen = JSON.parse(readFileSync(join(DIR, recordMediansFile(RUN)), "utf-8"));
  assert.equal(frozen.run, LEDGER.run);
  assert.equal(frozen.records_total, LEDGER.inputs["exact records"].records);
  assert.equal(frozen.read, LEDGER.inputs["exact records"].read);
  assert.equal(frozen.communes.length, 136, "one entry per commune the run reviewed");
  for (const row of LEDGER.corrections)
    assert.ok(
      frozen.communes.some((c) => c.code_commune === row.code_commune),
      `${row.name_fr} (${row.code_commune}) is corrected by this run and must be in its frozen set`,
    );
});

// The median itself is no longer re-derived by the replay, so it keeps a worked example of
// its own: five points on a cross, whose geometric median is the centre, plus one facility
// 135 km east. The median moves 6 m for it where the mean of the six would sit 22 km away,
// which is the whole reason this layer takes a median (l2-record-median.mjs).
test("the geometric median is the point that minimises total distance, not the mean", () => {
  const cross = [
    [3.0, 36.0],
    [3.0, 36.02],
    [3.0, 35.98],
    [2.98, 36.0],
    [3.02, 36.0],
  ];
  assert.deepEqual(geometricMedian(cross), [3, 36]);

  const withOutlier = [...cross, [4.5, 36.0]];
  const mean = withOutlier.reduce((s, p) => s + p[0], 0) / withOutlier.length;
  assert.equal(mean, 3.25);
  assert.ok(Math.abs(geometricMedian(withOutlier)[0] - 3) < 0.0001, "one far facility moves the median by metres");
});
