// Replays the four OpenStreetMap candidates the rounded-placeholder sweep left for
// review (private tracker #288, then #301), so each outcome is re-derived from the
// committed Claims rather than asserted as a sentence somebody wrote.
//
// WHY A REPLAY AND NOT A FIXTURE. ADR 0001 exists because every earlier round of
// coordinate fixing was a hand-run script whose reasoning survived only as prose. A
// decision file that nothing re-derives is that prose again. So this reads
// research/_arcminute-288/review-2026-10-27.json, hands its Candidates and Claims to
// scripts/review/votes.mjs, and fails if the engine no longer reaches the recorded
// outcome: a threshold moved, a rule changed, or the file edited away from its own
// evidence.
//
// AND THAT THE RECORDS DID NOT MOVE. The decision was `keep` on all four, so the
// published points and their geo_precision are part of the decision and are asserted
// against the shipped package.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { decide } from "../scripts/review/votes.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), "utf-8"));

const review = read("research", "_arcminute-288", "review-2026-10-27.json");

// The engine's source names are the commune-centre layers' (`osm_seat` is a chef-lieu
// admin_centre node). A sector record's reading is an object for the facility itself,
// which the file names `osm_object`; the mapping is the vocabulary gap ADR 0001 P3
// closes when the sector-record path is built.
const toEngine = (source) => (source === "osm_object" ? "osm_seat" : source);
const fromEngine = (source) => (source === "osm_seat" ? "osm_object" : source);

test("the review file is internally consistent", () => {
  assert.equal(review.records.length, 4);
  for (const r of review.records) {
    assert.ok(r.osm.id && r.osm.version && r.osm.timestamp, `${r.record_id}: the OSM object is not pinned`);
    assert.ok(r.evidence.length >= 2, `${r.record_id}: a decision carries its evidence`);
    for (const e of r.evidence) assert.match(e.url, /^https:\/\//, `${r.record_id}: evidence must be a public URL`);
    assert.ok(r.reason.length > 0, `${r.record_id}: a decision carries its reason`);
    // Every Claim stands on a Candidate the file also lists, so no Vote is cast at a
    // point the reader cannot see.
    const points = new Set(r.candidates.map((c) => JSON.stringify(c.point)));
    for (const c of r.claims) assert.ok(points.has(JSON.stringify(c.point)), `${r.record_id}: claim ${c.source} has no Candidate`);
  }
});

test("the engine still reaches every recorded outcome", () => {
  for (const r of review.records) {
    const result = decide({
      candidates: r.candidates.map((c) => ({ ...c, source: toEngine(c.source) })),
      claims: r.claims.map((c) => ({ ...c, source: toEngine(c.source) })),
      isInsideOutline: () => null, // commune_code is null on all four: no outline to ask
    });
    assert.equal(result.outcome, r.engine.outcome, `${r.record_id}: outcome`);
    assert.equal(result.reason, r.engine.reason, `${r.record_id}: reason`);
    assert.equal(result.tier, r.engine.tier, `${r.record_id}: tier`);
    assert.equal(result.winner ? fromEngine(result.winner.source) : null, r.engine.winner, `${r.record_id}: winner`);
    assert.deepEqual(
      result.answers.map((a) => ({ candidates: a.candidates.map(fromEngine), votes: a.votes.map(fromEngine) })),
      r.engine.answers,
      `${r.record_id}: answers`,
    );
    assert.deepEqual(
      Object.fromEntries(result.candidates.map((c) => [fromEngine(c.source), c.distance_from_published_m])),
      r.engine.distances_from_published_m,
      `${r.record_id}: distances`,
    );
    // Nothing the engine can settle on its own: a fix needs strong consensus for a
    // Candidate other than the published point (ADR 0001 rule 5).
    assert.equal(result.outcome, "queue", `${r.record_id}: an outcome the engine may apply unreviewed`);
    assert.equal(r.decision, "keep");
  }
});

test("all four still ship the point and the precision the review kept", () => {
  const files = new Map();
  for (const r of review.records) {
    if (!files.has(r.file)) files.set(r.file, read(...r.file.split("/")));
    const record = files.get(r.file).find((row) => row.id === r.record_id);
    assert.ok(record, `${r.record_id}: no longer in ${r.file}`);
    assert.deepEqual([record.lng, record.lat], r.published_point, `${r.record_id}: the published point moved`);
    assert.equal(record.geo_precision, "approximate", `${r.record_id}: precision`);
    assert.equal(record.wilaya_code, r.wilaya_code, `${r.record_id}: wilaya_code`);
  }
});
