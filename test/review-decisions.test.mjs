// Every decision the coordinate review engine shipped, re-derived offline.
//
// WHY A REWIND. Applying a fix moves the published centre onto the Candidate that won, so
// the commune stops being more than 3 km from its seat and drops out of the set under
// review: a plain re-run after the fact finds nothing. The ledger records each row's
// `from`, so the run is replayed by putting those communes back at it, which is also what
// `node scripts/review/run.mjs --rewind` does. Anything else the engine reads is a
// committed snapshot, so the two documents below have to come out byte-identical.
//
// WHAT THIS GUARDS. That the ledger and the queue are what the rules produce and not what
// a hand-run script once produced; that no row was decided by the optional L3 verdicts,
// which live outside this repository; and the three cases a run over this data has to get
// right: Tamridjet (646), where two Votes picked the wrong answer and the engine has to
// refuse it, the 25 km cap, and the self-vote rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadSnapshots, loadVerdicts } from "../scripts/review/snapshots.mjs";
import { reviewCommuneCentres } from "../scripts/review/engine.mjs";
import { buildDocuments, rewind } from "../scripts/review/run.mjs";
import { CANDIDATE_PREFERENCE } from "../scripts/review/votes.mjs";
import { MOVE_CAP_KM } from "../scripts/review/thresholds.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "research", "_commune-centres");
const json = (...p) => JSON.parse(readFileSync(join(...p), "utf-8"));

const RUN = "2026-10-01b";
const GENERATED = "2026-10-01";
const LEDGER = json(DIR, `corrections-${RUN}.json`);
const QUEUE = json(DIR, `review-queue-${GENERATED}.json`);

/** The run as it was made: committed snapshots, no verdicts file, communes rewound. */
function replay() {
  const snapshots = rewind(loadSnapshots({ today: GENERATED, verdictsPath: null }), [LEDGER]);
  const result = reviewCommuneCentres(snapshots);
  return { snapshots, result, documents: buildDocuments(result, snapshots, { run: RUN, generated: GENERATED }) };
}

const replayed = replay();

test("the correction ledger is exactly what the rules produce from the committed snapshots", () => {
  assert.deepEqual(replayed.documents.ledger, LEDGER);
});

test("the review queue is exactly what the rules produce from the committed snapshots", () => {
  assert.deepEqual(replayed.documents.queue, QUEUE);
});

test("the run settles what it claims to settle, and the counts add up", () => {
  const { counts } = replayed.result;
  assert.equal(counts.reviewed, QUEUE.reviewed);
  assert.equal(counts.fix + counts.confirmed + counts.queue, counts.reviewed);
  assert.equal(counts.fix, LEDGER.count);
  assert.equal(counts.queue, QUEUE.queue.length);
  assert.equal(counts.confirmed, QUEUE.confirmed.length);
});

test("every fix is a Strong consensus, inside the commune outline, under the move cap", () => {
  for (const row of LEDGER.corrections) {
    assert.equal(row.decided_by, "consensus", `${row.name_fr} (${row.code_commune})`);
    assert.equal(row.consensus.tier, "strong", `${row.name_fr} (${row.code_commune})`);
    assert.equal(row.consensus.inside_commune_outline, true, `${row.name_fr} (${row.code_commune})`);
    assert.ok(row.delta_m <= MOVE_CAP_KM * 1000, `${row.name_fr} (${row.code_commune}) moves ${row.delta_m} m`);
    assert.ok(
      row.consensus.votes.length >= 3 || row.consensus.votes.some((v) => v.source === "record_median"),
      `${row.name_fr} (${row.code_commune}): two Votes without the record median is not the Strong tier`,
    );
    assert.ok(CANDIDATE_PREFERENCE.includes(row.consensus.winning_candidate));
    assert.notEqual(row.consensus.winning_candidate, "published", "a fix never writes the value it already ships");
  }
});

test("no Claim voted for the Candidate it produced, in any shipped row", () => {
  for (const row of LEDGER.corrections)
    for (const vote of row.consensus.votes)
      assert.notEqual(vote.voted_for, vote.source, `${row.name_fr} (${row.code_commune}): ${vote.source} voted for itself`);
  for (const row of QUEUE.queue)
    for (const vote of row.votes)
      assert.notEqual(vote.voted_for, vote.source, `${row.name_fr} (${row.code_commune}): ${vote.source} voted for itself`);
});

test("no Copied claim cast a Vote", () => {
  for (const row of [...LEDGER.corrections.map((r) => r.consensus), ...QUEUE.queue])
    for (const vote of row.votes) assert.equal(vote.copied, false, `${row.winning_candidate ?? row.reason}: a Copied claim voted`);
});

test("no shipped row was decided by a reading taken off a proprietary map", () => {
  for (const row of LEDGER.corrections) {
    for (const vote of row.consensus.votes)
      assert.notEqual(vote.source, "google_verdict", `${row.name_fr} (${row.code_commune}) was decided by an L3 verdict`);
    assert.ok(
      ["ODbL 1.0, (c) OpenStreetMap contributors", "CC0 1.0 Universal (Wikidata statements)"].includes(row.licence) ||
        row.licence.startsWith("derived from this repository's own published records"),
      `${row.name_fr} (${row.code_commune}): licence ${JSON.stringify(row.licence)} is not an open one`,
    );
  }
  assert.equal(LEDGER.inputs["L3 verdicts"], null);
});

test("Tamridjet (646) is in the Review queue, because its two Votes point at different answers", () => {
  const row = QUEUE.queue.find((q) => q.code_commune === 646);
  assert.ok(row, "Tamridjet is not in the queue");
  assert.equal(row.reason, "split_votes");
  assert.ok(
    !LEDGER.corrections.some((c) => c.code_commune === 646),
    "Tamridjet must not be corrected: the OpenStreetMap seat and Wikidata back one answer, the record median backs the point we publish",
  );
  const answers = row.answers.filter((a) => a.votes.length > 0);
  assert.equal(answers.length, 2, "the split is two backed answers, which is what blocks consensus");
});

test("a Strong consensus for a move over the cap is queued and not applied", () => {
  const capped = QUEUE.queue.filter((q) => q.reason === "move_over_cap");
  assert.ok(capped.length > 0, "the cap is exercised by this run");
  for (const row of capped) {
    assert.equal(row.tier, "strong");
    const winner = row.candidates.find((c) => c.source !== "published" && c.votes > 0);
    assert.ok(winner.distance_from_published_m > MOVE_CAP_KM * 1000, `${row.name_fr}: ${winner.distance_from_published_m} m`);
    assert.ok(!LEDGER.corrections.some((c) => c.code_commune === row.code_commune));
  }
});

test("a queued commune keeps the point it publishes", () => {
  const communes = new Map(replayed.snapshots.communes.map((c) => [c.code_commune, c]));
  for (const row of [...QUEUE.queue, ...QUEUE.confirmed])
    assert.deepEqual(row.published, communes.get(row.code_commune).point, `${row.name_fr} (${row.code_commune})`);
});

test("the engine refuses an L3 verdicts file inside this repository", () => {
  assert.throws(() => loadVerdicts(join(ROOT, "research", "_commune-centres", "osm-seat-reference.json")), /never committed here/);
  assert.equal(loadVerdicts(null), null, "and runs without one");
});
