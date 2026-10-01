// Every number the coordinate review engine decides on, in one place, each with the
// measurement that justifies it.
//
// WHY ONE MODULE. docs/adr/0001-coordinate-review-by-independent-votes.md: a decision
// has to be replayable and auditable, so the numbers behind it cannot be scattered over
// the layers that use them, and none of them may be tuned to make a run come out at a
// nicer count. Every figure below was measured on 2026-10-01 against the committed
// snapshots with this engine's own helpers; the commands are in
// research/_commune-centres/README.md, "Measuring the thresholds".

/**
 * Agreement radius for a commune centre: a Claim this far from a Candidate is a Vote
 * for it, and two Candidates this close together are one answer rather than two.
 *
 * MEASURED over the 1,240 communes that have both an OpenStreetMap seat and at least
 * MIN_EXACT_RECORDS exact records inside their own outline, which is the largest pair of
 * independent readings this repository holds: seat to record median is 378 m at the
 * median, 785 m at p75, 1,856 m at p90 and 3,235 m at p95, and 90.6% of them are within
 * 2 km. So 2 km is where two honest readings of the same town stop agreeing: below it
 * they are the same answer at different precision, above it one of them is about a
 * different place.
 */
export const AGREEMENT_KM = 2;

/**
 * Copy radius. A Claim this close to the point it would vote for shares a value with
 * that point rather than confirming it, so it is not independent and casts no Vote.
 *
 * MEASURED on the same pair: the seat and the record median are within 50 m of each
 * other for 34 of those 1,240 communes (2.7%), and the 5th percentile of that distance
 * is 69 m. Two independent readings essentially never agree this closely. Agreement
 * under 50 m is instead the signature of one value reaching two files: 222 of the 1,536
 * published commune centres with a Wikidata item are that item's coordinate to the metre (7
 * of the 136 this run reviewed, which is the figure ADR 0001 quotes), and 20
 * Wikidata coordinates are their commune's OpenStreetMap seat node to the metre. 50 m is
 * the width of a town square, two orders of magnitude under AGREEMENT_KM, so the rule
 * drops copies and keeps every real agreement.
 */
export const COPY_RADIUS_M = 50;

/**
 * How many `geo_precision: exact` records a commune's outline must hold before their
 * geometric median is a Claim about where that commune's town is.
 *
 * MEASURED: 1,240 of the 1,537 communes with a usable outline hold at least 10. The
 * threshold is about the median being an aggregate of several independent surveys rather
 * than about measured accuracy, which is roughly flat across the bands (the median lands
 * within AGREEMENT_KM of the seat 88.8% of the time at 5 to 9 records and 90.6% at 10 or
 * more). What does change with the count is how many sources are behind it: the number of
 * distinct packages supplying the points is 3 at the median for 1 to 4 records, 4 for
 * 5 to 9, 6 for 10 to 19 and 11 above that, and at 1 to 4 records one package supplies
 * every point for 8.3% of communes. Below 10, "internal agreement" is one package's view
 * of the commune, which is not the thing this layer claims to state.
 */
export const MIN_EXACT_RECORDS = 10;

/**
 * How near an open Candidate an Owner reading taken off a proprietary map has to land
 * before it may confirm that Candidate. The open coordinate is still the one that ships
 * (ADR 0001 rule 6).
 *
 * MEASURED on the first such case, Beni-Abbes (5201) in
 * research/_commune-centres/corrections-2026-10-01.json: the Owner's reading agrees with
 * the commune's own admin_centre node to 268 m, the width of that town's centre. 500 m
 * holds a small Algerian town centre and is a quarter of AGREEMENT_KM, so a confirmation
 * is a tighter claim than a Vote.
 *
 * Read by the review-page import (ADR 0001, P2), not by the L0 to L2 run.
 */
export const OWNER_CONFIRMATION_KM = 0.5;

/**
 * The move the engine will not make on its own, however many Votes back it.
 *
 * MEASURED: 25 km is the distance scripts/sync-commune-centroid-dependents.mjs already
 * names as the point where a moved centre stops being the nearest centroid for
 * everything around its old position, so it re-stamps other packages' wilaya and commune
 * joins instead of only recentring the records that borrow it. Of the 250 corrections
 * applied so far, 76 moved further than this, and each of those was a containment defect
 * a human had read first. Of the 136 communes this run looks at, 5 sit further than 25 km
 * from their seat, so the cap is a narrow exception and not the rule.
 */
export const MOVE_CAP_KM = 25;

/** Votes needed for Consensus, and for Strong consensus (ADR 0001 rule 4). */
export const CONSENSUS_VOTES = 2;
export const STRONG_CONSENSUS_VOTES = 3;
