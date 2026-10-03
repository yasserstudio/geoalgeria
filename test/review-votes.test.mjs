// The voting rules of docs/adr/0001-coordinate-review-by-independent-votes.md, each on
// a fixture built to turn on exactly one of them.
//
// WHY FIXTURES AND NOT THE REAL DATA. test/review-decisions.test.mjs re-derives every
// decision of the committed run from the committed snapshots, which proves the engine
// reproduces that run but says nothing about the rule a commune does not happen to
// exercise. The rules themselves are unit tested here: the self-vote rule, the agreement
// radius, the copy radius (including a fixture where a Copied claim would otherwise have
// tipped the vote), the two consensus tiers, a split vote, containment and the move cap.
import { test } from "node:test";
import assert from "node:assert/strict";

import { CANDIDATE_PREFERENCE, decide } from "../scripts/review/votes.mjs";
import {
  AGREEMENT_KM,
  COPY_RADIUS_M,
  CONSENSUS_VOTES,
  MIN_EXACT_RECORDS,
  MOVE_CAP_KM,
  OWNER_CONFIRMATION_KM,
  STRONG_CONSENSUS_VOTES,
} from "../scripts/review/thresholds.mjs";

// A degree of latitude is 111.1949 km on this repository's sphere (6371 km), so moving
// north by km/111.1949 is an exact distance in the engine's own metric.
const DEG_KM = (Math.PI / 180) * 6371;
const AT = (km) => [3, 36 + km / DEG_KM];
const PUBLISHED = AT(0);

const inside = () => true;

/** A Claim, defaulting the fields a rule under test does not care about. */
const claim = (source, point, over = {}) => ({
  layer: "L1",
  source,
  licence: "test",
  snapshot: "2026-10-01",
  point,
  verdict: null,
  ...over,
});

/** The Candidate set, published first, from `{source: point}`. */
const candidates = (points) =>
  [{ source: "published", point: PUBLISHED }, ...Object.entries(points).map(([source, point]) => ({ source, point }))];

test("the threshold module states the ADR's numbers", () => {
  assert.equal(AGREEMENT_KM, 2);
  assert.equal(COPY_RADIUS_M, 50);
  assert.equal(MIN_EXACT_RECORDS, 10);
  assert.equal(OWNER_CONFIRMATION_KM, 0.5);
  assert.equal(MOVE_CAP_KM, 25);
  assert.equal(CONSENSUS_VOTES, 2);
  assert.equal(STRONG_CONSENSUS_VOTES, 3);
});

test("the published point is the first preference, so a Candidate that agrees with it never moves the data", () => {
  assert.equal(CANDIDATE_PREFERENCE[0], "published");
  assert.deepEqual(CANDIDATE_PREFERENCE, ["published", "osm_seat", "wikidata", "record_median"]);
});

test("a Claim never votes for the Candidate it produced, so one source alone decides nothing", () => {
  const seat = AT(10);
  const result = decide({
    candidates: candidates({ osm_seat: seat }),
    claims: [claim("osm_seat", seat)],
    isInsideOutline: inside,
  });
  assert.equal(result.outcome, "queue");
  assert.equal(result.reason, "no_consensus");
  assert.equal(result.votes.length, 0);
  assert.equal(result.candidates.find((c) => c.source === "osm_seat").votes, 0);
  assert.equal(result.silenced.find((s) => s.candidate === "osm_seat").why, "self");
});

test("a Claim votes inside the agreement radius and not outside it", () => {
  const seat = AT(10);
  const near = decide({
    candidates: candidates({ osm_seat: seat }),
    claims: [claim("wikidata", AT(10 + (AGREEMENT_KM - 0.01)))],
    isInsideOutline: inside,
  });
  assert.equal(near.candidates.find((c) => c.source === "osm_seat").votes, 1);

  const far = decide({
    candidates: candidates({ osm_seat: seat }),
    claims: [claim("wikidata", AT(10 + (AGREEMENT_KM + 0.01)))],
    isInsideOutline: inside,
  });
  assert.equal(far.candidates.find((c) => c.source === "osm_seat").votes, 0);
  assert.equal(far.silenced.find((s) => s.candidate === "osm_seat").why, "too_far");
});

test("three independent Claims that agree, far from the published point, are a Strong consensus fix", () => {
  const seat = AT(10);
  const result = decide({
    candidates: candidates({ osm_seat: seat, wikidata: AT(10.3), record_median: AT(10.6) }),
    claims: [claim("osm_seat", seat), claim("wikidata", AT(10.3)), claim("record_median", AT(10.6), { layer: "L2" })],
    isInsideOutline: inside,
  });
  assert.equal(result.outcome, "fix");
  assert.equal(result.tier, "strong");
  assert.equal(result.winner.source, "osm_seat");
  assert.deepEqual(
    result.votes.map((v) => v.source).sort(),
    ["osm_seat", "record_median", "wikidata"],
    "all three Claims vote for the answer, each for a Candidate it did not produce",
  );
  for (const vote of result.votes) assert.equal(vote.copied, false);
});

test("two Votes with the record median among them are a Strong consensus; the same two without it are not", () => {
  const seat = AT(10);
  const withMedian = decide({
    candidates: candidates({ osm_seat: seat, record_median: AT(10.4) }),
    claims: [claim("osm_seat", seat), claim("record_median", AT(10.4), { layer: "L2" })],
    isInsideOutline: inside,
  });
  assert.equal(withMedian.outcome, "fix");
  assert.equal(withMedian.tier, "strong");
  assert.equal(withMedian.votes.length, 2);

  const withoutMedian = decide({
    candidates: candidates({ osm_seat: seat, wikidata: AT(10.4) }),
    claims: [claim("osm_seat", seat), claim("wikidata", AT(10.4))],
    isInsideOutline: inside,
  });
  assert.equal(withoutMedian.tier, "plain");
  assert.equal(withoutMedian.outcome, "queue");
  assert.equal(withoutMedian.reason, "plain_consensus");
});

test("a Copied claim casts no Vote, even where it would have tipped the vote", () => {
  // The seat and the Wikidata point are the same value to the metre (Wikidata imports
  // OpenStreetMap and the reverse happens too), and the record median agrees with both
  // from 400 m away. Counting Wikidata would read as three independent Votes and fix the
  // data; it is one reading stated twice, so the answer keeps two Votes, and because the
  // median is one of them it is still Strong. The copy rule is what makes the count
  // honest rather than what changes the outcome here.
  const seat = AT(10);
  const copied = AT(10 + COPY_RADIUS_M / 2 / 1000);
  const withCopy = decide({
    candidates: candidates({ osm_seat: seat, wikidata: copied, record_median: AT(10.4) }),
    claims: [claim("osm_seat", seat), claim("wikidata", copied), claim("record_median", AT(10.4), { layer: "L2" })],
    isInsideOutline: inside,
  });
  assert.equal(withCopy.votes.length, 2);
  assert.deepEqual(withCopy.votes.map((v) => v.source).sort(), ["osm_seat", "record_median"]);
  assert.ok(
    withCopy.silenced.some((s) => s.source === "wikidata" && s.candidate === "osm_seat" && s.copied === true),
    "the Wikidata Claim is recorded as a Copied claim against the seat",
  );

  // The tipping fixture: drop the record median, and the two remaining Claims are the
  // copy pair. Without the copy rule that is a two-Vote consensus; with it there is one
  // Vote and nothing is decided.
  const pairOnly = decide({
    candidates: candidates({ osm_seat: seat, wikidata: copied }),
    claims: [claim("osm_seat", seat), claim("wikidata", copied)],
    isInsideOutline: inside,
  });
  assert.equal(pairOnly.outcome, "queue");
  assert.equal(pairOnly.reason, "no_consensus");
  assert.equal(pairOnly.votes.length, 0);

  // And the rule is the radius, not the pair: 60 m apart, the same two Claims vote.
  const justOutside = AT(10 + 0.06);
  const notCopied = decide({
    candidates: candidates({ osm_seat: seat, wikidata: justOutside }),
    claims: [claim("osm_seat", seat), claim("wikidata", justOutside)],
    isInsideOutline: inside,
  });
  assert.equal(notCopied.votes.length, 2);
  assert.equal(notCopied.tier, "plain");
});

test("a Vote for a Candidate outside the winning answer blocks consensus", () => {
  // The seat and Wikidata agree at 10 km; the record median sits 40 km away with the
  // published point inside its agreement radius, so the published Candidate takes a Vote
  // too and there are two answers with Votes.
  const seat = AT(10);
  const result = decide({
    candidates: candidates({ osm_seat: seat, wikidata: AT(10.5), record_median: AT(1.5) }),
    claims: [claim("osm_seat", seat), claim("wikidata", AT(10.5)), claim("record_median", AT(1.5), { layer: "L2" })],
    isInsideOutline: inside,
  });
  assert.equal(result.candidates.find((c) => c.source === "published").votes, 1);
  assert.equal(result.outcome, "queue");
  assert.equal(result.reason, "split_votes");
});

test("a winning Candidate outside the commune outline decides nothing", () => {
  const seat = AT(10);
  const result = decide({
    candidates: candidates({ osm_seat: seat, wikidata: AT(10.3), record_median: AT(10.6) }),
    claims: [claim("osm_seat", seat), claim("wikidata", AT(10.3)), claim("record_median", AT(10.6), { layer: "L2" })],
    isInsideOutline: (point) => point[1] !== seat[1],
  });
  assert.equal(result.outcome, "queue");
  assert.equal(result.reason, "outside_outline");
});

test("a commune with no usable outline cannot have its Candidate confirmed, so it is queued", () => {
  const seat = AT(10);
  const result = decide({
    candidates: candidates({ osm_seat: seat, wikidata: AT(10.3), record_median: AT(10.6) }),
    claims: [claim("osm_seat", seat), claim("wikidata", AT(10.3)), claim("record_median", AT(10.6), { layer: "L2" })],
    isInsideOutline: () => null,
  });
  assert.equal(result.outcome, "queue");
  assert.equal(result.reason, "no_outline");
});

test("a Strong consensus that would move the point further than the cap is queued, not applied", () => {
  const far = AT(MOVE_CAP_KM + 1);
  const result = decide({
    candidates: candidates({ osm_seat: far, wikidata: AT(MOVE_CAP_KM + 1.3), record_median: AT(MOVE_CAP_KM + 1.6) }),
    claims: [
      claim("osm_seat", far),
      claim("wikidata", AT(MOVE_CAP_KM + 1.3)),
      claim("record_median", AT(MOVE_CAP_KM + 1.6), { layer: "L2" }),
    ],
    isInsideOutline: inside,
  });
  assert.equal(result.tier, "strong");
  assert.equal(result.outcome, "queue");
  assert.equal(result.reason, "move_over_cap");
  assert.ok(result.move_m > MOVE_CAP_KM * 1000);

  // One kilometre under the cap, the same shape is a fix.
  const near = AT(MOVE_CAP_KM - 1);
  const under = decide({
    candidates: candidates({ osm_seat: near, wikidata: AT(MOVE_CAP_KM - 0.8), record_median: AT(MOVE_CAP_KM - 0.6) }),
    claims: [
      claim("osm_seat", near),
      claim("wikidata", AT(MOVE_CAP_KM - 0.8)),
      claim("record_median", AT(MOVE_CAP_KM - 0.6), { layer: "L2" }),
    ],
    isInsideOutline: inside,
  });
  assert.equal(under.outcome, "fix");
});

test("a Strong consensus for the published point confirms it and writes nothing", () => {
  const result = decide({
    candidates: candidates({ osm_seat: AT(10), wikidata: AT(0.4), record_median: AT(0.7) }),
    claims: [claim("osm_seat", AT(10)), claim("wikidata", AT(0.4)), claim("record_median", AT(0.7), { layer: "L2" })],
    isInsideOutline: inside,
  });
  assert.equal(result.outcome, "confirmed");
  assert.equal(result.tier, "strong");
  assert.equal(result.winner.source, "published");
  assert.equal(result.move_m, 0);
});

test("a verdict Claim carries no coordinate and votes for the Candidate it names", () => {
  const seat = AT(10);
  const result = decide({
    candidates: candidates({ osm_seat: seat, wikidata: AT(10.3) }),
    claims: [
      claim("osm_seat", seat),
      claim("wikidata", AT(10.3)),
      { layer: "L3", source: "google_verdict", licence: "not published", snapshot: "2026-10-01", point: null, verdict: "osm_seat" },
    ],
    isInsideOutline: inside,
  });
  assert.equal(result.outcome, "fix");
  assert.equal(result.tier, "strong");
  assert.deepEqual(result.votes.map((v) => v.source).sort(), ["google_verdict", "osm_seat", "wikidata"]);
  assert.equal(result.votes.find((v) => v.source === "google_verdict").distance_m, null);
});

test("a verdict for the published point is a Vote against a move", () => {
  const seat = AT(10);
  const result = decide({
    candidates: candidates({ osm_seat: seat, wikidata: AT(10.3) }),
    claims: [
      claim("osm_seat", seat),
      claim("wikidata", AT(10.3)),
      { layer: "L3", source: "google_verdict", licence: "not published", snapshot: "2026-10-01", point: null, verdict: "published" },
    ],
    isInsideOutline: inside,
  });
  assert.equal(result.candidates.find((c) => c.source === "published").votes, 1);
  assert.equal(result.outcome, "queue");
  assert.equal(result.reason, "split_votes");
});

test("a commune with nothing but its published point is queued with no Candidates to weigh", () => {
  const result = decide({ candidates: candidates({}), claims: [], isInsideOutline: inside });
  assert.equal(result.outcome, "queue");
  assert.equal(result.reason, "no_candidates");
  assert.equal(result.tier, "none");
});
