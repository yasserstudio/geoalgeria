# 0001. Coordinate review by independent votes

- Status: Accepted (Owner, 2026-10-01)
- Context: batch 2026-11, tickets #236 and #209 on the private tracker

## Context

Commune centres have been corrected batch by batch: 189 in 2026-09-29, five wilaya
capitals in #236, and 137 more communes still sit more than 3 km from their OpenStreetMap
seat or have no seat to compare against. Each round was a hand-run script, so each round
re-learned the same lessons:

- one source is never enough. A single Google match let a wrong pick through, and the
  Owner's own pins, read from a Google Maps name search, landed in a neighbouring commune
  six times out of eight;
- a source that our point was copied from looks like agreement but proves nothing (seven
  published centres are Wikidata's coordinate to the metre);
- nearest-centre tests pass on wrong data; containment in the commune outline does not.

The checking has to become one engine with fixed rules, so a decision can be replayed,
audited and repeated on every release.

## Decision

1. **Layers.** Each layer states a Claim about where a place is, with its source, licence
   and snapshot date:
   - L0 sanity: inside Algeria, inside the declared wilaya and commune outline, not a
     rounded placeholder, not a borrowed commune centre (CI, every PR);
   - L1 open references: the OSM `admin_centre` seat and the Wikidata P625 coordinate;
   - L2 internal agreement: the geometric median of at least 10 `geo_precision: exact`
     records inside the commune's OSM outline;
   - L3 alarm: a Google agreement verdict. It lives in the private app repository, runs
     locally only, never in CI, and hands the engine a verdicts file with no coordinate in
     it. The engine works without it;
   - L4 the Owner, through the review page.
2. **Candidates.** The published point, the OSM seat, the Wikidata point and the record
   median. A Claim never votes for the Candidate it produced.
3. **Votes.** A Claim within 2 km of a Candidate is a Vote for it, unless it is a Copied
   claim (within 50 m of the point it would vote for).
4. **Consensus** is at least two independent Votes for one Candidate, none for another, and
   the Candidate inside the commune outline. **Strong consensus** is at least three Votes,
   or two with the record median among them.
5. **Authority.** Strong consensus fixes the point: the engine writes a correction ledger
   row with `decided_by: "consensus"` and its votes, and the fix ships in a data PR held
   until release day. A move over 25 km, plain consensus, or no consensus goes to the
   Review queue. A commune still undecided at release keeps its published point and is
   listed in `record-exceptions.json` with its reason; nothing is nulled and no new
   published field is added.
6. **Open coordinates only.** A shipped coordinate always comes from an open source (OSM,
   Wikidata, the record median) or from the Owner reading open imagery. An Owner reading
   made on Google Maps may only confirm an open Candidate within 500 m, and the open
   coordinate is the one that ships (Beni-Abbes 5201 is the first case).
7. **Ledger.** v1 writes `research/_commune-centres/corrections-<run date>.json` in the
   existing shape, so the licence count, the dependents cascade and the existing tests keep
   working. Sector records (v2) go through the same voting module into
   `quality/overrides/`.
8. **Reproducible inputs.** The engine reads committed snapshots only
   (`osm-seat-reference.json`, a new `wikidata-reference.json`); `--fetch` refreshes them in
   place, so a refresh is a reviewable diff and drift shows up there.
9. **A wilaya capital point equals its capital commune's centre**, asserted by a test, so
   there is one point to verify per capital.
10. **Owner verdicts** are collected on the review page (artifact database) and imported by
    a script into the ledger as Owner Votes under rule 6. The ledger, not the page, is the
    record.

Thresholds (2 km, 50 m, 10 records, 500 m, 25 km) live as named constants in one module,
each with the measurement that justifies it.

## Consequences

- P1, in batch 2026-11: the engine with L0 to L2 for commune centres and wilaya capitals,
  settling the 137 communes in one held PR, with tests that re-derive every decision.
- P2: the review-queue import and the page reading the queue. P3: sector records into
  `quality/overrides`. P4: a weekly drift watch and a list of OSM edits owed upstream.
- Google content never enters the published data or the public repository.
- There is no confidence score anywhere: a decision is a count of named Votes, which a
  reader can check.

## Implementation notes (2026-10-01, private tracker #243), FOR THE OWNER TO CONFIRM

Building L0 to L2 showed that rules 2 to 4, read literally, settle almost nothing once
there are four Candidates rather than the prototype's two, so the engine reads them in two
ways this ADR did not state. Both are in `scripts/review/votes.mjs`, both are unit tested,
and both are recorded here rather than left in a code comment, because they change what
"two Votes for one Candidate" counts:

1. **Candidates that agree with each other are one answer**, and Votes are counted per
   answer. The seat, the Wikidata point and the record median landing 400 m apart are the
   same answer stated three times. Counted as rival Candidates they take two Votes each,
   rule 4's "none for another" is never satisfied, and every commune goes to the queue: a
   run over the 136 open centres settles zero. An answer is a set of Candidates whose every
   pair is within the agreement radius.
2. **Two Claims within the copy radius of each other cast one Vote between them.** Rule 3
   already stops each of them voting for the other's Candidate. Without this they still
   vote through a third Candidate in the same answer, and two Claims that share a value
   read as two independent readings. This is the same rule reaching the same case, and
   `CONTEXT.md` records it under **Copied claim**.

A third point follows from (1) and is a decision, not a reading: when an answer holds
several Candidates, the one that ships is the published point if it is in the answer, then
the OpenStreetMap seat, then the Wikidata point, then the record median, by how directly
the source speaks about the commune's town. That ordering is why all 68 fixes of the first
run carry the seat's value and therefore its licence.
