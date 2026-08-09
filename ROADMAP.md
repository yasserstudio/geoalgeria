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
  shares one identical postal_code, the signature of a forward-fill bug in the
  original ingestion. The code is the pre-2026 ONS code and was never meant to
  collide. Needs a per-row re-derivation against an ONS table, and the same
  pass should settle the postal-code wilaya-prefix inconsistency (some new-
  wilaya communes carry new-prefix postals, some keep the parent's).
  _(logged 2026-07-29)_

- [ ] **4 communes disagree with the app file by tens of km** (Souama w15,
  Sidi Demed w67, M'fatha w67, Ouled Sidi Brahim w68): same name and wilaya,
  coordinates ~1 degree apart. Which side is right is unresolved; verify
  against Wikidata/OSM before touching either.
  _(logged 2026-07-29)_

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

## Releases

- [ ] **Umbrella release tag for the current state.** Per-package releases have
  kept up; the project-level tag has not. Manual, and worth doing at the next
  meaningful group of bumps rather than on its own.
  _(logged 2026-07-22)_

---

## Recently closed

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
