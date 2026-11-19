# Buses accuracy plan (2026-11-19)

Branch `feat/buses-accuracy`. Planning document: the durable backlog is the
private tracker (`yasserstudio/geoalgeria.com`); each phase below becomes one
ticket via `/to-spec` → `/to-tickets`.

## Constraints

- **Desk-only.** The Owner is outside Algeria: no field GPS traces, no rides,
  no photos taken for this plan. Geometry comes only from OpenStreetMap
  (ODbL) and from Stations we already hold.
- **No partnerships, no data agreements.** Self-serve sources only: official
  Operator pages and public posts, JO / wilaya documents, OSM, Owner- or
  rider-supplied material.
- **Operator apps are not sources.** The 2026-11-19 static audit (ETUSA MOB,
  Deeper Tech ETUS apps, Tlemcen, Médéa) found backends that are private,
  credentialed, locked or dead (`mtepay.xyz` NXDOMAIN). Never call live GPS,
  vehicle or token endpoints (SOURCE.md, #173).
- **Operator graphics stay validation-only.** OSM forbids copying geometry
  from them; they may confirm which streets a Line uses, never draw it.

## Baseline (package 2.2.0, `origin/main` 0814c5f0)

| Measure | Value |
| --- | --- |
| Lines / Operators | 184 / 16 |
| Lines with a shape | 76 (108 without) |
| Lines with stops | 62 (122 without) |
| Memberships | 2,685, all `osm_member_order_unvalidated` |
| Per-Line freshness | none (only source retrieval dates) |
| OSM snapshot | 2026-09-01 (refreshed 2026-11-19, P3) |

Gaps by Operator (Lines / shape / stops / schedules): ETUSA 76/61/49/0,
ETUS-C Constantine 25/0/0/0, Aïn Defla 16/1/1/0, Tlemcen 10/0/0/0,
Sidi Bel Abbès 8/0/0/8, Tiaret 7/7/7/0, Skikda 6/0/0/0, Annaba 6/0/0/0,
Oum El Bouaghi 5/0/0/0, Béjaïa 5/0/0/5, ETUSTO 5/3/3/0, Sétif 5/3/3/0,
Laghouat 4/0/0/0, M'Sila 4/0/0/0, Mostaganem 1/1/1/0, ETO 1/0/0/0.

## Phases

### P1. Line quality checks (data repo, foundation)

Built 2026-11-19 in three seams: `qa/check-direction.mjs` (pure rules),
`qa/build-report.mjs` (Direction → OSM relation → path + Stations) and
`qa/run-qa.mjs` (reads the gitignored OSM pull, writes the report). Tests:
`test/buses-qa*.test.mjs`; `buses-qa-shipped` guards the package against the
committed report in CI, where no OSM pull exists.

Per Direction, against its shape:

| Check | Rule (initial thresholds, tuned on ETUSA) |
| --- | --- |
| Stop near shape | every member Station ≤ 50 m from the shape polyline |
| Monotone order | projected distance along the shape never decreases by > 100 m between consecutive members |
| Termini | first / last member ≤ 300 m from the shape ends |
| Shape continuity | no gap > 200 m between consecutive shape segments |
| Stop count | advisory, not in the status (ADR 0003 status is geometric): stopping points (larger of platform / stop roles) vs the Operator's figure within ± 10 %. Only ETUSA's Wikipedia `nb_arrets` overlaps Lines with shapes; Béjaïa, M'Sila and Skikda figures wait for P4 |

Output: `research/buses/qa/report.json` + `REPORT.md` (per Line pass / fail
with reasons) and a summary score. Pure functions, no network; fixtures for
each rule written test-first.

**Done when** every Line with a shape has a verdict, the report is committed,
and the test fails on a deliberately broken fixture.

**First run (OSM pull 2026-09-01), 128 Directions:** 36 consistent,
69 inconsistent, 23 unvalidated (fewer than two Stations; their path is still
judged for continuity, and 17 of them fail it). Failures: continuity 68
(51 checked Directions + 17 unvalidated), termini 43, path order 20, near
path 12. Stop count within 10 %: 18 of 47. Verdicts barely move with the
thresholds (consistent 32–44 across ±50 % variants), so the failures are in
the OSM relations, not the cutoffs. When continuity fails, path order is read
along a broken path and is unreliable. Fixing these is OSM mapping work (P5)
or waits for mappers (P3).

How the order is read: each Station is placed at its first position within
50 m of the path that does not go back past the previous on-path Station, so
an out-and-back or terminal loop puts each Station on its own leg. A Station
far from the path fails near path only; it neither fails nor anchors the
order. A relation of one way is turned to start nearer the first Station.

### P2. Publish accuracy in the package (schema, minor release)

Settled in `/grill-with-docs` (2026-11-19, terms in `CONTEXT.md`):

- **Sequence status** widens the existing Direction / Membership
  `sequence_status`: `osm_member_order_unvalidated` (today),
  `osm_member_order_consistent` (passes P1), `osm_member_order_inconsistent`
  (fails P1, still shipped, flagged), `operator_sequence` (P4). No Line-level
  status field; it is derived from Directions.
- **Last confirmed**: per-Line `last_confirmed`, official Operator sources
  only (OSM edits never move it); defaults to the original source's date.
- Detailed QA numbers stay in `research/buses/qa/report.json`, not the
  package.
- Shipped statuses equal the report verdicts: `buses-qa-shipped` drops its
  P1 allowance for `unvalidated`, so an inconsistent Direction cannot ship
  unflagged.

Docs: CSV, GeoJSON properties, types, README en/fr/ar.
Changeset: `@geoalgeria/buses` minor (2.3.0).

**Done when** fields are typed, documented in three languages, validated by
`scripts/validate-packages.mjs`, and no existing field changes meaning.

### P3. OSM refresh (data repo)

Re-run `research/buses/collect-osm.mjs` (snapshot 2026-09-01). Diff against
the shipped set: new relations, changed geometry, deleted relations. Reuse the
existing reconcile path (`analyze-candidates.mjs`, `promote-selected-osm.mjs`)
and gate every promoted shape on P1.

This also closes **#308** for any Operator where a relation now exists.

**Done when** the diff report is committed, every new relation is matched to
one Line identity or listed as unmatched, and coverage tables are updated.

**First refresh (2026-11-19), `qa/OSM-DIFF.md`:** pull 2026-11-19 vs
2026-09-01, 218 vs 215 relations: 3 added, 0 removed, 100 changed, 115
unchanged. The changes are real way edits (220 of 4,339 shared ways redrawn;
one busy Algiers corridor carries many relations). Of the 128 shipped
Directions, 74 changed in OSM (54 geometry only, 20 with member changes).

- **P1 on the new pull:** no Direction verdict moves (36 / 69 / 23); path
  order 20 → 21 is Tiaret 26, already inconsistent.
- **Re-promoted (batch B):** the shipped subset now comes from the
  2026-11-19 pull: same 76 shapes and 128 Directions (49 shapes redrawn),
  Stations 1,603 → 1,599 (Sétif 101/104: three stops deleted upstream, one untagged),
  Memberships 2,685 → 2,682, 382 Stations gained `name_fr`. `qa/report.json`
  was regenerated on it with the same 36 / 69 / 23 tally.
- **New relations:** none matches a package Line. ETUS Tiaret 33 Reverse
  (Tiaret ships 26–32; two older 33 relations were already in the September
  pull) and two ETUSTO shuttles Aéroport d'Alger ↔ Tizi Ouzou (no `ref`, no
  ETUSTO Line with those termini). They are Line leads until an official
  source confirms them.
- **#308 stays open:** no Line without a shape gained an OSM geometry
  candidate. Unattributed relations exist in Annaba, Tlemcen, Béjaïa and on
  El Harrouch–Constantine, but none matches a listed Line's identity.
- **Matching rule** (`qa/line-identity.mjs`, tested): a relation a Line
  already lists is that Line's; otherwise Operator + line number (`02` = `2`,
  `L02` = `L2`), falling back to the bare number (`2` → `AD-2`) only when one
  Line of the Operator has it. Lettered variants (`106` vs `106B`) never match
  automatically; they go through the reviewed approval lists.

Collector hardening: a mirror whose `timestamp_osm_base` is more than 7 days
old is rejected (`overpass.kumi.systems` served 2026-05-31 data on
2026-11-19, which mixed with a current mirror's members and failed on deleted
ways). Run: `collect-osm.mjs` → `analyze-candidates.mjs` →
`qa/run-diff.mjs --previous <old osm/raw>`, plus `qa/run-qa.mjs --osm-dir`
on the new pull to compare verdicts before re-promoting.

### P4. Geocode published stop lists (data repo, desk)

Operators that publish ordered stop names but have no geometry:
**Skikda** (all 6 Lines, site 2026-09-27) and **M'Sila** (4 Lines).

Match each name to an existing Station or an OSM `highway=bus_stop` /
`public_transport=platform` node in the right commune (Arabic + French
normalisation, distance to the previous matched stop as a tie-break). Unmatched
names stay as names; nothing is placed by guess.

No shape is drawn from these points (that would be inferred geometry). Each
name is a **Listed stop**; resolved ones become Memberships with Sequence
status `operator_sequence`, which is stronger evidence than OSM member order.
Unresolved Listed stops are published by name, in order.

Settled (2026-11-19):

- A Line with no OSM relation gets an **operator-list Direction** (no
  `osm_relation_id`, `from`/`to` = first/last Listed stop).
- Listed stops ship as a new `listed-stops` collection (Line, Direction,
  position, name AR/FR, `station_id` or null); the Line `stops` text is
  untouched.
- Where an OSM Direction already exists, the Operator list is compared with
  it: agreement upgrades it to `operator_sequence`, disagreement leaves it and
  logs the mismatch in the QA report for Owner review. Never two Directions
  for one direction of travel.
- Release is minor (2.3.0); CHANGELOG tells exhaustive-switch users to add a
  default branch for the new `sequence_status` values.
- See ADR 0003.

**Done when** match rate is reported per Line, ambiguous matches are listed
for Owner review, and only exact or reviewed matches are promoted.

**Parked (2026-11-19, Owner):** the desk match (`listed-stops/REVIEW.md`)
placed 3 of 213 Listed stops exactly, 6 ambiguous, 204 without a candidate.
No package Station exists in wilayas 21 or 28, and Skikda's 11 named OSM stops
carry French names only, against Arabic lists. 2.3.0 ships no Listed stops and
no `operator_sequence`; the matcher stays as research until OSM coverage
(P5) or field data exists.

### P5. Owner OSM mapping, desk mode (optional, Owner time)

Without field traces, a route relation can still be drawn in OSM when **all**
of these hold: the Operator publishes the ordered stops (P4), the stops exist
in OSM, and the road between consecutive stops is unambiguous on imagery.
Priority order: Skikda, M'Sila, then Constantine only if ETUS-C publishes stop
lists. Data returns through P3 under ODbL like any other mapper's edit.

This is Owner work in OSM, never automated edits from this repo.

### P6. Rider reports and Line suggestions (app repo)

On geoalgeria.com `/bus` (private app repo, its own branch):

- **Report a problem** on each Line: wrong stop, wrong path, Line no longer
  runs, wrong termini, wrong hours. Prefilled with Line id and Operator.
- **Suggest a new Line**: Operator / city, Line number, termini, ordered stops
  if known, evidence link or photo (Operator post, timetable photo).
- Delivery: a form on geoalgeria.com, no account needed. A server route
  files it as an issue on the private tracker (`needs-triage` + `buses`),
  protected by Cloudflare Turnstile and a rate limit; nothing stored beyond
  the text the reporter sends. Anonymous: no contact field. Optional "follow
  on GitHub" link for reporters who want a reply.
- A suggestion becomes data only through the normal Source rules: it is a
  lead until an official source or a reviewed OSM relation confirms it. This
  is the contribution path #87 asks for (Oran pilot).

**Done when** both forms exist (en/fr/ar), the app links them from every Line
and the directory page, and the triage doc covers bus reports.

### P7. Freshness loop

- Add buses to `refresh-schedule.json` (quarterly OSM refresh, P3 + P1).
- Bump `last_confirmed` when an Operator post re-states a Line (Eid
  programmes, new-Line announcements); script takes the post URL + date.
- Ties into **#306** (freshness pass).

## Order and dependencies

```
P1 QA checks ──► P2 publish fields ──► release 2.3.0
   │
   ├──► P3 OSM refresh (gated by P1)
   └──► P4 geocode Skikda / M'Sila ──► P5 Owner OSM mapping (optional)
P6 app reports + suggestions (independent; app repo)
P7 freshness loop (after P2 + P3)
```

Suggested batches: **A** = P1 + P3 (automatic, no schema change),
**B** = P2 + P4 + release, **C** = P6, **D** = P7. P5 runs whenever the Owner
has time.

## Hill-climb eligibility

Only P4 qualifies under the global rule (an automatic pass/fail check exists
once P1 lands, and it is a tedious record-matching job). Run on Sonnet with a
stop goal (match rate, zero P1 failures) and a cost cap, after Owner approval.

## Related tracker issues

#308 (OSM shapes), #307 (expansion), #87 (open schema, contributions),
#173 (app audit, identity leads only), #306 (freshness).

## Out of scope

New Operators / cities (#307), intercity SOGRAL schedules, live vehicle
positions, any app or vendor endpoint.
