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
| OSM snapshot | 2026-09-01 |

Gaps by Operator (Lines / shape / stops / schedules): ETUSA 76/61/49/0,
ETUS-C Constantine 25/0/0/0, Aïn Defla 16/1/1/0, Tlemcen 10/0/0/0,
Sidi Bel Abbès 8/0/0/8, Tiaret 7/7/7/0, Skikda 6/0/0/0, Annaba 6/0/0/0,
Oum El Bouaghi 5/0/0/0, Béjaïa 5/0/0/5, ETUSTO 5/3/3/0, Sétif 5/3/3/0,
Laghouat 4/0/0/0, M'Sila 4/0/0/0, Mostaganem 1/1/1/0, ETO 1/0/0/0.

## Phases

### P1. Line quality checks (data repo, foundation)

A deterministic checker, `research/buses/qa/check-lines.mjs`, run in
`pnpm test` through `test/buses-qa.test.mjs`.

Per Direction, against its shape:

| Check | Rule (initial thresholds, tuned on ETUSA) |
| --- | --- |
| Stop near shape | every member Station ≤ 50 m from the shape polyline |
| Monotone order | projected distance along the shape never decreases by > 100 m between consecutive members |
| Termini | first / last member ≤ 300 m from the shape ends |
| Shape continuity | no gap > 200 m between consecutive shape segments |
| Stop count | matches the Operator's own figure where one exists (Béjaïa, M'Sila, Skikda site, Wikipedia `nb_arrets` for ETUSA) within ± 10 % |

Output: `research/buses/qa/report.json` + `REPORT.md` (per Line pass / fail
with reasons) and a summary score. Pure functions, no network; fixtures for
each rule written test-first.

**Done when** every Line with a shape has a verdict, the report is committed,
and the test fails on a deliberately broken fixture.

### P2. Publish accuracy in the package (schema, minor release)

Additive per-Line fields in `lines.json` (+ CSV, GeoJSON properties, types,
README en/fr/ar):

- `order_status`: `validated` | `failed` | `unvalidated` (from P1; replaces
  the blanket membership flag at Line level, membership flag kept for
  compatibility).
- `qa`: `{ checked_at, checks_passed, checks_total }`.
- `last_confirmed`: ISO date of the newest official Source that re-states the
  Line (Operator page/post, OSM edit touching its relation). `null` when only
  the original source exists.

Glossary: add **Order status** and **Last confirmed** to `CONTEXT.md`
(`/grill-with-docs` first). Changeset: `@geoalgeria/buses` minor (2.3.0).

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

### P4. Geocode published stop lists (data repo, desk)

Operators that publish ordered stop names but have no geometry:
**Skikda** (all 6 Lines, site 2026-09-27) and **M'Sila** (4 Lines).

Match each name to an existing Station or an OSM `highway=bus_stop` /
`public_transport=platform` node in the right commune (Arabic + French
normalisation, distance to the previous matched stop as a tie-break). Unmatched
names stay as names; nothing is placed by guess.

No shape is drawn from these points (that would be inferred geometry). The
Line gains ordered stops with `order_status: validated` from the Operator
source, which is stronger evidence than OSM member order.

**Done when** match rate is reported per Line, ambiguous matches are listed
for Owner review, and only exact or reviewed matches are promoted.

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
- Delivery: a prefilled public GitHub issue form on the data repo (zero cost,
  no backend, no PII stored by us), labelled `needs-triage` + `buses`, handled
  with `/triage`.
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
