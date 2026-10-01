// The voting rules of docs/adr/0001-coordinate-review-by-independent-votes.md, as pure
// functions over Claims and Candidates.
//
// WHY ITS OWN MODULE. The rules are logic, not data, so they are unit tested on fixtures
// (test/review-votes.test.mjs) rather than only through a run over the snapshots. Nothing
// here reads a file, knows what a commune is, or knows which layer produced a Claim.
//
// THE SHAPES
//   Claim      {layer, source, licence, snapshot, point: [lng, lat] | null,
//               verdict: <candidate source> | null, detail?}
//              One source's statement of where a place is. A verdict Claim carries no
//              coordinate and names the Candidate it agrees with (ADR 0001 layer L3).
//   Candidate  {source, point: [lng, lat], ...}
//              A point the coordinate could be set to. `published` is always present and
//              is the value the data ships today.
//
// THE RULES, in the order they are applied
//   1. A Claim votes for a Candidate it did not produce, within AGREEMENT_KM, and only
//      when it is further than COPY_RADIUS_M from it (a Copied claim shares that value
//      rather than confirming it, so it is not independent).
//   2. Candidates that agree with each other, every pair within AGREEMENT_KM, are ONE
//      answer. This is the step that keeps the count honest once there are four
//      Candidates rather than the prototype's two: the seat, the Wikidata point and the
//      record median landing 400 m apart are the same answer stated three times, and the
//      Votes for them belong to that answer, not to three rivals that cancel out.
//   3. Two Claims within COPY_RADIUS_M of EACH OTHER are one reading stated twice, so
//      they cast one Vote for an answer between them, not two. Rule 1 already stops each
//      of them voting for the other's Candidate; this is the same rule reaching the case
//      where they both vote through a third Candidate in the same answer.
//   4. Consensus is an answer with at least CONSENSUS_VOTES distinct Votes while every
//      Candidate outside it has none, and whose winning Candidate is inside the commune
//      outline. Strong consensus is STRONG_CONSENSUS_VOTES Votes, or CONSENSUS_VOTES with
//      the record median among them.
//   5. Strong consensus for a Candidate other than `published` is a fix, unless it would
//      move the point further than MOVE_CAP_KM. Everything else is the Review queue.
//
// THERE IS NO SCORE ANYWHERE. A decision is a count of named Votes a reader can check.

import { metresBetween } from "../lib/seat-evidence.mjs";
import {
  AGREEMENT_KM,
  CONSENSUS_VOTES,
  COPY_RADIUS_M,
  MOVE_CAP_KM,
  STRONG_CONSENSUS_VOTES,
} from "./thresholds.mjs";

/**
 * Which Candidate's point ships when an answer holds several.
 *
 * `published` first, because an answer that contains the value we already ship is a
 * confirmation and the no-op is always the safer of two readings that agree. Then by how
 * directly the source speaks about this commune's town: the `admin_centre` node is
 * OpenStreetMap naming the chef-lieu, a Wikidata item's P625 is a coordinate for the
 * commune as a whole, and the record median is an aggregate of other facilities, which is
 * the centre of mapped activity rather than a statement about the town.
 */
export const CANDIDATE_PREFERENCE = ["published", "osm_seat", "wikidata", "record_median"];

/** Which Claim stands for an independence class when two of them are one reading: the
 *  most direct statement about this commune's town, by the same argument as above. */
export const CLAIM_PREFERENCE = ["osm_seat", "wikidata", "record_median", "google_verdict", "owner_reading"];

const rank = (source) => {
  const i = CANDIDATE_PREFERENCE.indexOf(source);
  if (i < 0) throw new Error(`unknown Candidate source ${JSON.stringify(source)}`);
  return i;
};

const claimRank = (source) => {
  const i = CLAIM_PREFERENCE.indexOf(source);
  if (i < 0) throw new Error(`unknown Claim source ${JSON.stringify(source)}`);
  return i;
};

const between = (a, b) => metresBetween(a[0], a[1], b[0], b[1]);

/** Why a Claim did not vote for a Candidate, or null when it did. */
function silence(claim, candidate) {
  if (claim.verdict != null) return claim.verdict === candidate.source ? null : "not_named";
  if (claim.source === candidate.source) return "self";
  const metres = between(claim.point, candidate.point);
  if (metres <= COPY_RADIUS_M) return "copied";
  if (metres > AGREEMENT_KM * 1000) return "too_far";
  return null;
}

/**
 * Candidates grouped into answers: maximal sets whose every pair agrees within
 * AGREEMENT_KM, taken in preference order so the grouping never depends on input order.
 * Every-pair (rather than nearest-neighbour) linkage is deliberate: it stops a chain of
 * Candidates 1.9 km apart from being read as one answer spanning 6 km.
 */
export function agreeingAnswers(candidates) {
  const left = [...candidates].sort((a, b) => rank(a.source) - rank(b.source));
  const answers = [];
  while (left.length) {
    const group = [left.shift()];
    for (let i = 0; i < left.length; ) {
      if (group.every((g) => between(g.point, left[i].point) <= AGREEMENT_KM * 1000)) group.push(left.splice(i, 1)[0]);
      else i++;
    }
    answers.push(group);
  }
  return answers;
}

/**
 * Decide one place.
 *
 * @param {object} input
 * @param {Array<object>} input.candidates  Candidates, `published` among them.
 * @param {Array<object>} input.claims  the Claims the layers stated.
 * @param {(point: number[]) => (boolean|null)} input.isInsideOutline  true, false, or
 *   null when there is no outline to ask.
 */
export function decide({ candidates, claims, isInsideOutline }) {
  const published = candidates.find((c) => c.source === "published");
  if (!published) throw new Error("the Candidate set must carry the published point");

  const votesFor = new Map(candidates.map((c) => [c.source, []]));
  const silenced = [];
  for (const claim of claims) {
    for (const candidate of candidates) {
      const why = silence(claim, candidate);
      const metres = claim.point ? Math.round(between(claim.point, candidate.point)) : null;
      if (why) {
        if (why !== "not_named")
          silenced.push({ source: claim.source, layer: claim.layer, candidate: candidate.source, distance_m: metres, copied: why === "copied", why });
        continue;
      }
      votesFor.get(candidate.source).push({
        source: claim.source,
        layer: claim.layer,
        snapshot: claim.snapshot,
        licence: claim.licence,
        candidate: candidate.source,
        distance_m: metres,
        copied: false,
      });
    }
  }

  const byClaimSource = new Map(claims.map((c) => [c.source, c]));
  const answers = agreeingAnswers(candidates).map((group) => {
    const raw = [];
    const seen = new Set();
    for (const c of group)
      for (const v of votesFor.get(c.source)) {
        if (seen.has(v.source)) continue;
        seen.add(v.source);
        raw.push(v);
      }
    raw.sort((a, b) => claimRank(a.source) - claimRank(b.source));
    // One reading stated twice is one Vote. A Claim with no coordinate (a verdict) is
    // always its own reading, because there is no point to compare.
    const votes = [];
    const notIndependent = [];
    for (const v of raw) {
      const point = byClaimSource.get(v.source).point;
      const twin = point && votes.find((w) => {
        const other = byClaimSource.get(w.source).point;
        return other && between(other, point) <= COPY_RADIUS_M;
      });
      if (twin) notIndependent.push({ source: v.source, same_reading_as: twin.source, distance_m: Math.round(between(byClaimSource.get(twin.source).point, point)) });
      else votes.push(v);
    }
    return { candidates: group, winner: group[0], votes, notIndependent };
  });

  const report = {
    candidates: candidates.map((c) => ({
      source: c.source,
      point: c.point,
      distance_from_published_m: Math.round(between(published.point, c.point)),
      votes: votesFor.get(c.source).length,
      inside_outline: isInsideOutline(c.point),
    })),
    answers: answers.map((a) => ({
      candidates: a.candidates.map((c) => c.source),
      votes: a.votes.map((v) => v.source),
      ...(a.notIndependent.length ? { not_independent: a.notIndependent } : {}),
    })),
    silenced,
  };
  const queued = (reason, over = {}) => ({ outcome: "queue", reason, tier: "none", winner: null, move_m: null, votes: [], ...report, ...over });

  if (candidates.length < 2) return queued("no_candidates");

  const backed = answers.filter((a) => a.votes.length > 0);
  const leading = answers.filter((a) => a.votes.length >= CONSENSUS_VOTES);
  if (leading.length !== 1) return queued(backed.length > 1 ? "split_votes" : "no_consensus");
  const [answer] = leading;
  if (backed.length > 1) return queued("split_votes");

  const tier =
    answer.votes.length >= STRONG_CONSENSUS_VOTES || answer.votes.some((v) => v.source === "record_median")
      ? "strong"
      : "plain";
  const winner = answer.winner;
  const insideWinner = isInsideOutline(winner.point);
  if (insideWinner === null) return queued("no_outline", { tier, winner, votes: answer.votes });
  if (insideWinner === false) return queued("outside_outline", { tier, winner, votes: answer.votes });
  if (tier !== "strong") return queued("plain_consensus", { tier, winner, votes: answer.votes });

  const move = Math.round(between(published.point, winner.point));
  const settled = { tier, winner, votes: answer.votes, move_m: move, reason: null, ...report };
  if (winner.source === "published") return { outcome: "confirmed", ...settled };
  if (move > MOVE_CAP_KM * 1000) return { outcome: "queue", ...settled, reason: "move_over_cap" };
  return { outcome: "fix", ...settled };
}
