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

## Rules 2 to 4 in detail (added 2026-10-01, private tracker #243)

Confirmed by the Owner, 2026-10-01. Building L0 to L2 showed that rules 2 to 4, read
literally, settle almost nothing once there are four Candidates rather than the prototype's
two, so the three points below state how they are read. They are implemented in
`scripts/review/votes.mjs`, unit tested in `test/review-votes.test.mjs`, and recorded here
rather than left in a code comment, because they decide what "two Votes for one Candidate"
counts.

1. **Candidates that agree with each other are one Answer**, and Votes are counted per
   Answer. An Answer is a set of Candidates whose every pair is within the agreement radius.
   The seat, the Wikidata point and the record median landing 400 m apart are the same
   Answer stated three times; counted as rival Candidates they take two Votes each, rule 4's
   "none for another" is never satisfied, and every commune goes to the queue, so a run over
   the 136 open centres settles zero. `CONTEXT.md` carries **Answer** as a term.
2. **Two Claims within the copy radius of each other cast one Vote between them.** Rule 3
   already stops each of them voting for the other's Candidate. Without this they still vote
   through a third Candidate in the same Answer, and two Claims that share a value read as
   two independent Claims. This is the same rule reaching the same case, and `CONTEXT.md`
   records it under **Copied claim**.
3. **The shipped point of an Answer that holds several Candidates** is the published point
   where the Answer holds it, then the OpenStreetMap seat, then the Wikidata point, then the
   record median, by how directly the source speaks about the commune's town. Keeping the
   published value is the no-op whenever it is one of the agreeing readings. That ordering is
   why all 68 fixes of the first run carry the seat's value and therefore its licence.

## Rule 8 in detail: the record median is frozen per run (added 2026-10-09, private tracker #267)

Rule 8 reads every input from a committed snapshot, and the L2 record median was taken as
satisfying it because the records it is a median of are themselves committed here. They
are, but they are not held still: they are the packages, and every release adds, removes or
moves some of them. Merging the sante twins (private tracker #216) moved two of run
2026-10-01b's medians by metres, changed no decision at all (the same 68 fixes at the same
points, the same 67 queued with the same reasons) and failed
`test/review-decisions.test.mjs`, whose answer at the time was to rewrite the landed ledger
so it matched the new evidence. A landed decision rewritten to match a later reading is the
opposite of what rule 8 is for.

So a run freezes the Claim it read, and the replay reads that file:

1. **A run lands three documents**, not two: `corrections-<run>.json`,
   `review-queue-<date>.json` and `record-medians-<run>.json`, the last holding, per commune
   the run reviewed, the record count, the number of packages behind it and the median.
   `node scripts/review/run.mjs --write` writes all three.
2. **A replay reads the frozen set** (`--records <file>`, which
   `test/review-decisions.test.mjs` passes), so the two documents stay byte-identical
   however the packages move afterwards, and a decision that does change still fails the
   test.
3. **What is frozen is the Claim, not the records behind it.** The engine only ever reads
   the median and the counts, so freezing those is 19 KB where the point clouds would be
   ten times that; the median algorithm keeps a worked example of its own in
   `test/review-record-medians.test.mjs`.
4. **A commune the frozen set does not hold is an error**, because the set under review is
   derived from the published centres and the seats: a code missing from the file means the
   run being replayed is not the run that was frozen, and that is a re-run, not a replay.
5. **A set frozen at another `MIN_EXACT_RECORDS` is refused** for the same reason.
6. **Every row is read on the way in.** A row at or over the threshold states a Claim the
   voting rules measure distances with, so one carrying no median, or a median that is not
   a `[lng, lat]`, is refused by the commune it belongs to instead of surfacing as a type
   error inside `votes.mjs`. Below the threshold a row states nothing and may carry either.

The frozen set of run 2026-10-01b was written from the packages as they stood on
2026-10-09, which still reproduced both of that run's documents byte for byte, so it is the
evidence the run decided on and not a new reading. Its `read` field stays the run's own
date, 2026-10-01, because that is the date both landed documents give the Claim it holds.
