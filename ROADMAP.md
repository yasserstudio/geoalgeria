# Roadmap

Open work on the data side. The app has its own roadmap at
[`geoalgeria.com/docs/ROADMAP.md`](https://github.com/yasserstudio/geoalgeria.com/blob/main/docs/ROADMAP.md);
items here are the ones whose work lives in **this** repo, even when the symptom
shows up in the app.

Every item states what it costs and what is genuinely unknown, so nothing here
reads as further along than it is.

---

## Contract

- [x] **`@geoalgeria/telecom` migrated to the v2 contract** (2.0.0): the
  coverage points ARE GeoRecords (operator-published presence points, every one
  geocoded), so the flat contract fit once the layout flattened to
  `data/5g-<operator>.json` and the union file was dropped in favour of
  `entities[]`. _(logged 2026-07-28, resolved 2026-07-31)_

## Aviation

- [ ] **Scheduled flight duration per route.** Asked for on the route card and
  refused, correctly: there is no duration field, and **0 of 122** routes in
  `research/_flight-routes/route-dataset.json` carry one. The great-circle
  duration check used during verification was computed and discarded. Deriving a
  duration from distance would put a fabricated number beside sourced ones. Wants
  scheduled block times collected per route from a citable source.
  _(logged 2026-07-28)_

- [ ] **64 routes are `listed` rather than `verified`,** and 69 pairs are
  one-directional (an outbound leg with no recorded return; was 70 before the
  LYS -> TLM return verified on 2026-07-29). `listed` means a published table
  names the carrier serving the pair without confirming Air Algérie operates
  it. The screen + confirm pipeline exists now
  (`research/_flight-routes/screen_returns_soar.py`, hypotheses only, then
  citable confirmation); open-ended collection, better run as background.
  _(logged 2026-07-28, updated 2026-07-29)_

- [ ] **Disputed: `blj-cdg` may actually serve Orly.** The verified record
  cites aeroroutes' homepage (which names nothing by itself), and 2026-07-29
  live operations showed AH1120 landing at ORY and AH1121 flying ORY -> BLJ.
  parisaeroport.fr sits behind a bot-check that blocks automated fetches; a
  human browser session on its Batna flight search settles it in a minute. If
  Orly confirms: correct blj-cdg to blj-ory, add ory-blj, and replace the
  citation with the page that names the airport. Detail in
  `research/_flight-routes/verification-2026-07-29.md`.
  _(logged 2026-07-29)_

- [ ] **Screened positive, awaiting a citable source: IST -> ORN** (AH3025
  en-route during the 2026-07-29 screen; istairport.com timed out, aeroroutes
  has no article). One departures-board row upgrades it.
  _(logged 2026-07-29)_

- [ ] **Carriers beyond Air Algérie.** v1 is deliberately one operator, which the
  app's title and copy now have to caveat, since other carriers do fly nonstop
  from Algeria. Widening it is mostly a collection question: the app's route card
  already falls back to a bare code for any carrier with no mark on file.
  _(logged 2026-07-28)_

## Core dataset (geoalgeria)

- [ ] **`code_commune` duplicates are ingestion corruption, not a scheme.**
  34 duplicated code groups (79 rows); in 33 of them every colliding row also
  shared one identical postal_code, the signature of a forward-fill bug in the
  original ingestion. The code is the pre-2026 ONS code and was never meant to
  collide. Needs a per-row re-derivation against an ONS table. The POSTAL half
  of this item shipped 2026-08-07 (1.3.0, PR #168): codes are now derived from
  each commune's own Algérie Poste offices (`scripts/fix-commune-postal-codes.mjs`,
  rerunnable), zero duplicate postal codes remain, and the wilaya-prefix
  question resolved itself by policy: the operator keeps mother-wilaya
  prefixes for reform daughters, so we do too. `code_commune` itself is still
  the open half. _(logged 2026-07-29; postal half shipped 2026-08-07)_

- [ ] **4 communes disagree with the app file by tens of km** (Souama w15,
  Sidi Demed w67, M'fatha w67, Ouled Sidi Brahim w68): same name and wilaya,
  coordinates ~1 degree apart. Which side is right is unresolved; verify
  against Wikidata/OSM before touching either.
  _(logged 2026-07-29)_

- [ ] **39 records across packages sit geographically inside El Aricha (63)
  but still carry wilaya_code 13 or 22**, the boundary warnings the El Aricha
  fix surfaced (measured 2026-08-09, pre-fix): sports 16, jeunesse 9, poste 9,
  mosquees 3, formation-professionnelle 2, telecom 1. The packages whose
  wilaya is derived from coordinates self-correct at their next regeneration
  now that the boundary is fixed, `containingWilayaCode` resolves them to 63
  automatically. sports, jeunesse and poste instead take the wilaya their
  ministry source declares, and those sources still say the pre-reform
  wilaya, so a rebuild alone will not fix them; they need a deliberate
  reconciliation pass against El Aricha's new extent. Not fixed in this PR.
  _(logged 2026-08-09)_

## Generators

- [x] **Nearest-centroid fallback can cross a boundary** — fixed in the shared
  helper: `attachCommune` now resolves the containing wilaya by point-in-polygon
  against the 69 boundaries first and restricts the centroid search to it, so
  the join can never cross a wilaya boundary (commune-level containment stays
  best-effort; commune polygons don't exist). Data effects land at each
  package's next refresh — the 3 known ooredoo records (documented in their
  coverageNote) repair themselves on the next ooredoo fetch. Per-package local
  copies of `nearestCommune` (djezzy, ooredoo, culture, ecoles,
  enseignement-superieur) converge on the shared helper as those packages are
  touched. _(logged 2026-08-01, fixed 2026-08-03)_

- [ ] **Ferroviaire regeneration drifts from the committed dataset.** Discovered
  while testing the fix above: re-running `packages/ferroviaire/scripts/fetch.mjs`
  on today's committed research/ferroviaire raws produces 233 coordinate
  changes, 232 name changes and 18 id add/removes against the committed data —
  the OSM↔Wikidata merge no longer reproduces what shipped, and the per-wilaya
  sequential ids reshuffle (the id-churn class the v2 generator rework
  eliminated elsewhere). Until diagnosed, do NOT regenerate ferroviaire; the
  regeneration was reverted and only the helper fix shipped.
  _(logged 2026-08-03)_

- [ ] **`carryOverIds` does not persist retirements, so a retired id becomes
  reusable one survey later.** The reserve set is built from the committed file
  alone (`scripts/lib/v2-transforms.mjs:978`), so an id only stays protected
  while the record that held it is still in the data. Once a release that drops
  a record merges, that id is absent from the next run's `committed`, and the
  re-home loop preferentially fills the lowest free slot, so it actively hands
  the gap to an unrelated new record. Reproduced end to end on pharmacies: with
  the 2026-08 data committed, a synthetic new Ghardaïa pharmacy is assigned
  `47-00001`, the id that belonged to a different pharmacy removed in that same
  release. Latent gaps already sit in the committed data: `16-00454` in ecoles,
  and `30-005`, `30-010`, `58-003` in protection-civile. Note the widths, these
  are the real committed ids. Fix shape: persist retirements, either a
  per-package `retired-ids.json` or a `reserved` parameter seeded into the set
  at `v2-transforms.mjs:978`, plus a run N+1 case in
  `test/carry-over-ids.test.mjs`. The current shrink test only models run N, so
  it asserts the retired id is not reused within a single run and cannot catch
  this. The 2.1.0 pharmacies release retired ids `44-00029` and `47-00001`, so
  the next pharmacies re-survey WILL reuse them unless retirements are
  persisted first; this item now gates that re-survey.
  _(logged 2026-08-08)_

- [ ] **pharmacies is the last generator bypassing `writePackageV2`.**
  `packages/pharmacies/scripts/fetch.mjs` hand-rolls `buildMetadata` + `toCSV` +
  `toGeoJSON` and has no `writeCapture` source capture, so it skips
  `validateRecords`, `demoteSharedPoints`, the source-declared check, atomic
  writes and `colsFor`. Two defects traced to exactly that during the 2026-08
  re-survey: ids churned because nothing called `carryOverIds`, and
  `evidence_type` silently vanished from the OpenStreetMap source because
  `buildMetadata` passes `sources[]` through verbatim. Both were patched in
  place; the durable fix is to migrate the package onto the shared writer, after
  which the `evidence_type` pin becomes redundant but harmless. Its local
  `attachCommune` also predates the boundary guard in the entry above.
  _(logged 2026-08-08)_

- [ ] **The schema `build.js` citation template joins name and licence with an
  em dash character** (`packages/schema/src/build.js:247`), which regenerates
  into every package's `dataset-metadata.json` descriptor.
  Deferred out of the cliniques branch on purpose. A repo-wide 3-line sweep,
  worth doing at the next coordinated bump rather than alone.
  _(logged 2026-08-09)_

## Transport

- [ ] **`@geoalgeria/buses` re-extracted from OSM route relations (breaking,
  3.0.0).** The package today is 50 ETUSA lines scraped from Wikipedia with
  **no coordinates at all**: line-level attributes, `lat`/`lng` null on every
  record, `geocoded_pct` 0. Its coverage note says OSM `route=bus` coverage
  tagged ETUSA "is currently thin", and **that is now stale**. Measured against
  a live Overpass pull on 2026-08-09 (`timestamp_osm_base`
  2026-08-09T10:51:50Z):

  - **215 bus route relations in Algeria**, of which **100 are ETUSA** (network
    `إيتوزا` / `ETUSA`), plus Tiaret 28 (ETUS TIARET + the wilaya transport
    directorate), Setif 5, and smaller sets in Ain Defla, Jijel and elsewhere.
  - **All 100 ETUSA relations carry drawable geometry**, 1,250 km of route in
    total; 99 are named, 99 carry `from`/`to`, 48 carry `via`, 53 carry an
    official line `colour`, and **78 carry stop or platform members**.

  So the deferral reason recorded in the coverage note no longer holds, and the
  package can go from attribute-only to geometry-bearing with real stops. That
  is a breaking change (records gain geometry, the id scheme changes from
  Wikipedia line numbers to OSM relation ids), hence 3.0.0.

  **What the data still cannot support, and must not be claimed:** there are
  **zero** `interval`, `duration` and `frequency` tags across the 100 ETUSA
  relations, and only 25 carry `opening_hours`. So the package can answer which
  lines exist, where they run and where they stop, but never how long a trip
  takes. Journey planning needs timetables Algeria does not publish openly (no
  GTFS), and deriving a duration from route length would put a fabricated
  number beside sourced ones, the same call already made for flight durations
  in the Aviation section.

  Demand signal: a user on Reddit (2026-08-09) describing exactly this gap,
  planning a move to an unfamiliar area with no way to see what serves it.
  _(logged 2026-08-09)_

- [ ] **Intercity bus schedules are a licence problem, not a scraping
  problem.** ETUSA is Algiers **urban** transport only, so the OSM re-extraction
  above cannot answer the question a person moving to another wilaya actually
  asks. The intercity network belongs to **SOGRAL**, the state operator of the
  gares routieres, whose own app **MAHATATI** (`com.sogral.mobile`) already
  carries departures, times, fares, operator names and itineraries, and since
  May 2026 sells tickets through it with CIB / EDAHABIA payment.

  Do **not publish or repackage** it. SOGRAL's schedules carry no open licence,
  so republishing them as a package under MIT or ODbL would be a false licence
  claim, the same objection that ruled out Google Places for `cliniques`. The
  app now fronts a payment flow, which makes reverse-engineering its API a
  different risk class entirely. And a dataset built on a private app API rots
  silently when the API moves.

  A local, gitignored **research capture** now exists in `research/sogral/`.
  It preserves the public station directory and live aggregate counters, can
  build the station-to-destination matrix, submits the public anti-forgery form
  sequentially for one declared service date, and enriches only the observed
  route variants from the unauthenticated route-detail endpoint. It never
  enters the booking or payment flow. It is evidence for the SOGRAL/GTFS
  discussion and a development-only Atlas preview, not a product feed or an
  open dataset. The capture README records the source, observed endpoint
  schema, refresh limits and the distinction between departure time, SOGRAL's
  segment estimates and the page's separate Google driving estimate.

  At the next `gares-routieres` bump, three fixes from the research belong in
  the package: add a per-station `refs.mahatati_agency` (the MAHATATI agency
  id observed for each departure station, so downstream joins stop depending
  on name normalization); document that the existing `refs.sogral` is a
  **town-level** place id shared by twin stations (Annaba and Sidi Brahim,
  the three Constantine gares), so consumers must never treat it as a station
  key; and repair station `33-01 TINDOUF`, whose longitude lost its sign
  (+8.125 instead of about -8.15 at Tindouf's latitude 27.667), landing it in
  the empty Illizi desert and deriving the wrong wilaya/commune (33/3301
  instead of Tindouf's 37) from the flipped point. The public map draws it
  there today.

  The path is to **ask SOGRAL for a feed, ideally GTFS**. This repo already
  publishes their 74 gares routieres (`@geoalgeria/gares-routieres`, "Data (c)
  SOGRAL; redistributed for reference"), so the ask comes from a project
  already carrying their network with attribution, not from a stranger. GTFS is
  the framing most likely to land: publish once, every transit app can consume
  it, including MAHATATI's competitors and this atlas.

  **The web surface is `mahatati.sogral.com`** (`live.sogral.com` refused
  connections on both HTTPS and HTTP; treat it as dead). It is a public page
  with no login, backed by an undocumented but unauthenticated JSON API:

  - `api/live/summary` and `api/live/summary/{agencyId}`: live counters
    (planned / open / completed / cancelled departures, reservations).
  - `api/live/destinations/{agencyId}`: destinations served from a station.
  - `api/live/departures/infos/route/{agencyId}/{headOfLineId}/{routeId}`: the
    itinerary, each stop's commune and wilaya plus the **fare in DA**.

  The 2026-08-12 matrix carries 73 departure stations and 9,077 station/
  destination pairs. The completed local receipt checked all 9,077 pairs,
  found 3,990 with at least one departure (25,959 returned rows), and enriched
  all 1,268 unique observed route variants with zero unresolved failures. Those
  figures are a dated collector receipt, not a lasting service-coverage claim.
  The results table carries departure time, operator, zone, seats available and
  status; seat availability stays private and is never exposed by the Atlas.

  So extraction is technically trivial, and that changes nothing about the
  answer: the footer reads "Copyright (c) 2021 EPE SOGRAL Spa, tous droits
  reserves", there is no licence under which this repo could restate the data,
  and every record here has to carry one. What it does change is the ask. SOGRAL
  has already built the API; the request is now to document it and licence it,
  or emit GTFS from it, rather than to build anything. That is a much cheaper
  yes. Contact is on the page: contact@sogral.dz, 021.77.00.77.

  Legitimate without any permission, and worth doing: cross-check the 74
  stations in `@geoalgeria/gares-routieres` against the 73 their page lists, to
  catch renames, closures and new stations. That is reference use of a public
  page on exactly the basis this repo already redistributes their station list.
  _(logged 2026-08-09)_

## Releases

- [ ] **Umbrella release tag for the current state.** Per-package releases have
  kept up; the project-level tag has not. Manual, and worth doing at the next
  meaningful group of bumps rather than on its own.
  _(logged 2026-07-22; 2026-08-09 is that group: a new package (cliniques) plus
  the app's health batch; pending the user cutting the tag per RELEASING.md)_

---

## Recently closed

- **The health batch, 2026-08-09**: `@geoalgeria/cliniques` 1.0.0 published,
  its first release, 1,894 care facilities across 66 wilayas from
  OpenStreetMap, with a GitHub Release; the Trusted Publisher entry was
  created with stage-publish and the first publish was done by hand per
  RELEASING.md's bootstrap step. `@geoalgeria/pharmacies` 2.1.0 published,
  3,797 pharmacies, `carryOverIds` now keyed on OSM id, with a GitHub Release.
  The release workflow's GitHub Release titles are now clamped to 120
  characters (PR #177); the cliniques changeset title had failed the run at
  256+. And the one overlapping pair among the 69 wilaya boundaries was
  corrected: El Aricha (63) subtracted from Tlemcen (13), area conserved
  (9,098 = 6,083 + 3,015 km2), guarded going forward by
  `test/wilaya-boundaries-disjoint.test.mjs` (PR #172,
  `scripts/fix-wilaya-overlap.mjs`); the correction is documented in the
  boundary metadata's provenance notes, and the upstream OSM edit (relation
  1280702) is still owed. The app-side health batch (care surface + pharmacies
  redesign) shipped the same day on geoalgeria.com.

- **Telecom 2.1.0, the August Mobilis re-survey** (2026-08-02): Mobilis
  rebuilt its published 5G map (1,621 -> 1,919 sites; first points in Beni
  Abbes and In Guezzam), taking the package to 3,096 coverage points. The new
  feed ships 77 exact duplicate rows and 4 out-of-Algeria points; the fetcher
  now dedupes with its own logged counter, all three agent-browser call sites
  share one 180s timeout, per-source `retrieved` dates track each fetch run,
  and `writePackageV2` fails the build if a source would ship with no
  retrieval date. Truncation of the exactly-2,000-row response was ruled out
  (the operator map's own JS does one unpaginated fetch; Alger, at the start
  of the contiguous id block, grew). PRs #152/#153.

- **The core package now ships all 1,541 communes** (was 1,528). The 13
  name-twin communes of the reform wilayas were added from the sourced records
  in `research/_communes-reconcile/communes-13-records.json`, field-identical to
  the app repo's repaired `algeria.json` rows, into every representation the
  package ships (three split files, `algeria.json`, CSV, GeoJSON, both SQL
  dumps, the e-commerce mirror); `dairas.json` gained the one daira the set
  needed, Zmalet El Emir Abdelkader (w64), taking it to 556 rows. Closed
  2026-07-29. Still open, deliberately: the `code_commune` forward-fill
  corruption and the 4 coordinate disagreements (both below); Bougara's postal
  code 14018 keeps the pre-reform Tiaret (14) prefix and one aggregator claims
  14190 instead, so the w14-prefixed column stays unadjudicated; and Menaa
  ships matching the app, under wilaya 68 with daira Medjedel, on the strength
  of `wilayas.json`'s decree-derived commune list for Bou Saâda plus a point
  inside the w68 polygon, but the transfer itself is still unconfirmed against
  the decree text, as the dossier records.

- **Foreign airport names, in every language**: shipped in the pending 2.3.0.
  Every route endpoint carries `name_en` / `name_ar` from Wikidata (IATA-matched,
  coordinate-checked, air-base homonyms excluded), and the foreign `name` field
  now carries the Wikidata French label instead of OurAirports English. Pipeline:
  `research/_flight-routes/localize_endpoint_names.py`. Closed 2026-07-29.
- **Dated-snapshot framing**: shipped in the pending 2.3.0 as
  `metadata.routes_as_of`, stamped from the research dataset's `as_of` (set only
  by a real verification pass, currently 2026-07-27). Closed 2026-07-29.

- **`gares-routieres` geo precision**: verified, nothing to fix. The 2 records
  behind the note (33-03 Illizi, 65-01 Ain Oussara) were already downgraded to
  `geo_precision: "approximate"` by the 409-record sweep (`99f6f27`,
  2026-07-20); `geo_method: "exact"` was kept on purpose per that commit
  (method records how the point was obtained; only the precision claim was
  wrong). The note predated the sweep. Verified 2026-07-29.

- **Em-dash sweep of the package READMEs**: done. Grepping every
  `packages/*/README*.md` for the character returns nothing, so the sweep tracked
  since 2026-07-23 has already landed. Verified 2026-07-28.
