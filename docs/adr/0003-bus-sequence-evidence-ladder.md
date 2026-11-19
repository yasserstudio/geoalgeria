# 0003. Evidence ladder for bus stop order

- Status: Accepted (Owner, 2026-11-19)
- Context: buses accuracy plan, `research/buses/ACCURACY-PLAN.md`
- Note (2026-11-19): 2.3.0 ships rungs 1–3 only. P4 is parked, so
  `operator_sequence` stays reserved and is not in the published type until
  an Operator list is matched.

## Context

Every Membership in `@geoalgeria/buses` 2.2.0 (2,685) is
`osm_member_order_unvalidated`: OpenStreetMap member order is kept but nothing
says whether it is right. The accuracy plan adds geometric checks (Stations
near the drawn path, in order along it) and Operator-published ordered stop
lists (Skikda, M'Sila). A single "validated" flag would merge two different
strengths of evidence, because an OSM order can agree with an OSM path and
still be the wrong passenger order.

## Decision

`sequence_status` stays on Direction and Membership and becomes a ladder:

1. `osm_member_order_unvalidated` (unchanged meaning)
2. `osm_member_order_consistent`: passes the geometric checks
3. `osm_member_order_inconsistent`: fails them
4. `operator_sequence`: order taken from the Operator's own published list

Only `operator_sequence` claims passenger stop order. Inconsistent Directions
are published, flagged, rather than withheld. No Line-level status is stored.
A Direction may come from an Operator list instead of an OSM relation; a Line
never has two Directions for one direction of travel. `last_confirmed` moves
only on official Operator sources, never on OSM edits.

## Alternatives rejected

- **One `validated` boolean**: hides the difference between geometric
  consistency and Operator confirmation.
- **Withhold failing Directions**: hides problems from users and loses data
  that is mostly right; the flag plus the QA report is the honest signal.
- **Line-level `order_status`**: a Line's two Directions can disagree; a
  stored Line value either hides that or duplicates it.
- **OSM edits bump `last_confirmed`**: a mapper editing a relation does not
  show the bus still runs.

## Consequences

- Adding enum values is released as a minor version; consumers with
  exhaustive switches must add a default branch (CHANGELOG note).
- Detailed check numbers live in `research/buses/qa/report.json`, not in the
  package, so re-running checks does not churn published data beyond status
  changes.
