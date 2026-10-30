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
// AND THAT THE RECORDS DID NOT MOVE. All four are QUEUED by the run, not decided by
// it: under ADR 0001 rule 5 a queued row keeps its published point until the Owner
// rules on it, so the shipped points and their geo_precision are asserted here to be
// exactly what they were. "Queued" is the whole claim the run file makes; nothing in
// it closes anything.
//
// THE OWNER CLOSED ALL FOUR ON 2026-10-28, rejecting the re-place and keeping the
// published point. That ruling is a ledger row and not an edit to the frozen run (ADR
// 0001 rule 10: the ledger, not the page, is the record), so the last test below ties
// each record of the run to its row in quality/overrides/tourisme.json and the two
// cannot drift apart. A `keep` row changes no published field, which is why the points
// asserted above are still the points the run queued.
//
// THEN THREE OF THE FOUR WERE SUPERSEDED ON 2026-10-30. The 2026-10-29 park merge
// retired park-25, park-29 and park-31 into park-2, park-6 and park-1, the
// OpenStreetMap twins of the same national parks, and the Owner ruled that the parks
// ship as accurate locations: the measured OpenStreetMap point, not the arcminute
// placeholder the 28 Oct ruling kept. So those three ids have no ledger row any more
// (quality/overrides/tourisme.json says why), and this file follows the forward instead
// of the id: packages/tourisme/data/retired-ids.json names the survivor, and the two
// tests below assert that the survivor exists and ships `exact`/`osm`. A retired id is
// therefore still checked, in the one direction that is now true of it, rather than
// skipped. historic-91, the fourth, is live and keeps every original assertion.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { decide } from "../scripts/review/votes.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), "utf-8"));

const review = read("research", "_arcminute-288", "review-2026-10-27.json");

// The ids the 2026-10-29 park merge retired into a survivor, read from the package's own
// retirement ledger rather than listed here, so a later merge cannot leave this file
// asserting a forward the data no longer states.
const MIGRATIONS = read("packages", "tourisme", "data", "retired-ids.json").migrations ?? {};
const supersededBy = (recordId) => MIGRATIONS[recordId]?.merged_into ?? null;

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
    assert.equal(r.decision, "queued", `${r.record_id}: a queued row is the Owner's call, not a decision`);
    assert.equal(r.action_taken, "none", `${r.record_id}: this run must take no action`);
  }
});

test("each queued record still ships what it was queued with, or its survivor ships a measured point", () => {
  const files = new Map();
  let live = 0;
  let superseded = 0;
  for (const r of review.records) {
    if (!files.has(r.file)) files.set(r.file, read(...r.file.split("/")));
    const rows = files.get(r.file);
    const into = supersededBy(r.record_id);
    if (into) {
      // The 2026-10-30 ruling: the id is gone and the survivor carries the measured
      // point, which is the opposite of the arcminute placeholder the run queued. Assert
      // that, so the supersession is a checked fact and not an absence.
      assert.equal(rows.find((row) => row.id === r.record_id), undefined, `${r.record_id}: retired into ${into} but still published`);
      const survivor = rows.find((row) => row.id === into);
      assert.ok(survivor, `${r.record_id}: retired into ${into}, which is not in ${r.file}`);
      assert.equal(survivor.geo_precision, "exact", `${into}: the survivor of ${r.record_id} ships an exact point`);
      assert.equal(survivor.geo_method, "osm", `${into}: the survivor of ${r.record_id} ships the OpenStreetMap point`);
      assert.equal(survivor.refs?.osm, r.osm.id, `${into}: the survivor must be the OSM object the run read`);
      superseded++;
      continue;
    }
    const record = rows.find((row) => row.id === r.record_id);
    assert.ok(record, `${r.record_id}: no longer in ${r.file} and not retired into a survivor`);
    assert.deepEqual([record.lng, record.lat], r.published_point, `${r.record_id}: the published point moved`);
    assert.equal(record.geo_precision, "approximate", `${r.record_id}: precision`);
    assert.equal(record.wilaya_code, r.wilaya_code, `${r.record_id}: wilaya_code`);
    live++;
  }
  assert.equal(live + superseded, review.records.length);
  assert.equal(superseded, 3, "the 2026-10-29 park merge superseded exactly three of the four");
});

test("the Owner's 2026-10-28 rejection closes every candidate the park merge did not supersede", () => {
  const ledger = read("quality", "overrides", "tourisme.json");
  let closed = 0;
  for (const r of review.records) {
    const row = ledger.decisions.find(
      (d) => d.record_id === r.record_id && d.file === r.file.split("/").pop(),
    );
    if (supersededBy(r.record_id)) {
      // A decision on a retired id stops any rebuild (applyReviewedOverrides refuses an
      // unknown record), so the supersession has to have taken the row with it.
      assert.equal(row, undefined, `${r.record_id}: superseded on 2026-10-30, so its ledger row must be gone`);
      assert.match(
        ledger.note ?? "",
        new RegExp(`\\b${r.record_id}\\b`),
        `${r.record_id}: the ledger must say why its decision was removed`,
      );
      continue;
    }
    assert.ok(row, `${r.record_id}: no ledger row closes this candidate`);
    closed++;
    assert.equal(row.publish_action, "keep", `${r.record_id}: the published point is kept`);
    assert.equal(row.status, "verified", `${r.record_id}: status`);
    assert.equal(row.reviewer, "owner", `${r.record_id}: the Owner is the reviewer`);
    assert.equal(row.reviewed_at, "2026-10-28", `${r.record_id}: reviewed_at`);
    // The row states the point it keeps, so a later upstream move makes it stale
    // instead of silently covering a different coordinate.
    assert.equal(row.expect.lng, r.published_point[0], `${r.record_id}: expect.lng`);
    assert.equal(row.expect.lat, r.published_point[1], `${r.record_id}: expect.lat`);
    assert.equal(row.expect.wilaya_code, r.wilaya_code, `${r.record_id}: expect.wilaya_code`);
    assert.equal(row.expect.geo_precision, "approximate", `${r.record_id}: expect.geo_precision`);
    // And it carries the object and the distance the ruling was made on, rather than
    // only pointing at the file that holds them.
    assert.match(row.notes, new RegExp(`\\b${r.osm.id}\\b`), `${r.record_id}: notes must name the OSM object`);
    const km = (r.engine.distances_from_published_m.osm_object / 1000).toFixed(3);
    assert.match(row.notes, new RegExp(`${km} km`), `${r.record_id}: notes must carry the measured distance`);
    assert.ok(
      row.evidence.some((e) => e.url === r.osm.url),
      `${r.record_id}: the row must cite the OSM object the run read`,
    );
  }
  assert.equal(closed, 1, "historic-91 is the one candidate the 28 Oct ruling still closes");
});
