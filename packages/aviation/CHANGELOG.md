# Changelog

## 2.9.0

### Minor Changes

- 7c1a6a8: Every route now ships `sources`, its citation list: an ordered, never-empty array
  of plain urls, no url twice, whose first entry is the row's own `source`. The
  single-citation field keeps its meaning and its value, and a reader gains the
  rest of the provenance instead of losing it.

  One row can rest on several documents, which is why the list exists. Air
  Algérie's own statement of 24 October 2026 is the best evidence that Conakry,
  Brazzaville, Lagos, Shanghai and Tripoli at Mitiga are coming, and when, and it
  carries no flight number, no day name and no airport for Tripoli. It joins all
  ten of those legs as an extra url, while each row's `source` stays the report
  that covers the fields it ships. The statement alone moves nothing: a statement
  that a line opens is an announcement, and a leg leaves `plannedRoutes()` only on
  a dated report that the aircraft flew.

  JSON and the GeoJSON `properties` carry the list as it is; the CSV, a flat table,
  carries the urls space-separated in one column next to `source`, the same
  encoding the `days` column uses. The decision is recorded in
  `docs/adr/0002-per-row-citation-list-for-aviation-routes.md`.

  **All ten of those legs now have that report**, and with the two Nigeria middle
  sectors that never cited the statement, twelve rows left `plannedRoutes()` over
  three passes. They are the only rows this release moves.

  Two had it on 26 October. **Algiers to Conakry** is operating: two Guinean
  outlets of 26 October 2026
  have the inaugural aircraft on the tarmac at Ahmed Sékou Touré in the night of
  Sunday 25 to Monday 26 October. **Algiers to Shanghai** is operating: APS, Algeria's
  press agency, and a second report of 26 October carry the inaugural rotation's
  departure from Houari Boumediene that day. Each promoted row cites the report of
  the operation first and keeps the announcements behind it. The announced returns
  from Conakry and Shanghai, Brazzaville, the Nigeria sectors, Tripoli and the
  Kuwait-Amman rotation were all still `planned` on 26 October, each because no
  dated report of its first flight existed yet, never because anything said a line
  was cancelled.

  A third leg had it on 28 October. **Algiers to Tripoli** is operating: the
  inaugural `AH 4006` left Houari Boumediene at 09:00 on Wednesday 28 October 2026
  for Mitiga, where its arrival was reported the same day, and the row gains the
  flight number, the first any source has given for it.

  **Six more legs followed on 30 October**, and they arrive on a kind of evidence
  this dataset had never accepted: a flight's own history on a flight tracker,
  showing a dated leg landed. The owner's rule of 30 October 2026 accepts that as a
  report that the leg flew, and nothing more, so a tracker's schedules, route maps
  and booking inventory still count for nothing, and nor does a cancelled rotation
  or a row with no status.

  It closes the gap no publisher was ever going to close. **Four returns** are now
  operating, Shanghai to Algiers (`AH 3083`), Conakry to Algiers (`AH 5359`),
  Mitiga to Algiers (`AH 4007`) and Brazzaville to Algiers (`AH 5391`), and so is
  the Algiers to Brazzaville outbound (`AH 5390`). **Both Nigeria triangles are
  complete**: all four remaining sectors flew in the 27 to 30 October window under
  `AH 5354`, the number both rotations use, so `alg-los`, `los-alg`, `abv-los` and
  `los-abv` join the two Abuja legs that were already operating. Each row cites its
  own history first and keeps every report it already rested on behind it.

  Five rows gain or correct a field no publisher supplied. The **Conakry and
  Brazzaville returns** get operating days, Mondays, Wednesdays and Fridays and
  Tuesdays, Thursdays and Sundays respectively, each read off observed nights and
  each a day later than its outbound, which is why reading a return's day off its
  outbound was never allowed. The **two Nigeria middle sectors** move from the day
  their filing gives the whole rotation to their own local departure day, Abuja to
  Lagos from Monday to Tuesday and Lagos to Abuja from Thursday to Friday, and both
  gain the rotation's flight number. The **Tripoli return** gets the first flight
  number any source has given it.

  Because a tracker's free history covers only seven days, every observation behind
  these rows, its date, its landing time and the aircraft's registration, is
  written out in `research/_flight-routes/verification-2026-10-30.md` rather than
  left to a link that will stop showing it.

  What is still `planned` is eight rows: Seoul, Moscow, N'Djamena and the
  Kuwait-Amman rotation. None of them has an observed operation, and none of them
  is cancelled. The Moscow legs keep their rows and gain one citation: on 26
  October the Russian ambassador to Algeria said he hopes direct flights resume
  early in 2027, a postponement rather than a withdrawal.

  The Kuwait rotation also gains the flight number and the two departure days the
  AeroRoutes NW26 filing of 29 June 2026 states for it, `AH 4064` on all three legs
  of one weekly Algiers-Kuwait-Amman-Algiers rotation. It stays `planned`: a filed
  schedule is not an operation, and the tracker has no data at all for either of
  the rotation's numbers, which is a silence and not a contradiction.

  So the counts move by nine: 169 nonstop legs and 8 planned ones, 177 rows as
  before, no row added or removed. `metadata.routes_as_of` stays at 2026-10-09,
  because this release re-read the announced lines and not the winter schedule
  the network turns over to on 25 October.

### Patch Changes

- f1a05b8: These packages now work in a bundled app: esbuild and Vite can follow the data path.

  Before this release, `import { stations } from "@geoalgeria/ferroviaire"` (and the same for every package here) built fine and then threw `ENOENT ... /data/stations.json` on the first call. The JSON was read at run time from a path joined off `import.meta.url`; esbuild and Vite inline the module without relocating that read, so it went looking for the data next to the generated bundle. Node and Next.js with Turbopack were never affected, which is why this took until now to surface.

  Each package now reaches its data through a generated `loaders.cjs`: one `require` of a literal path per data file, inside a function. A bundler can trace a literal path, and the `require` stays lazy, so importing the package still parses nothing until you call a loader. Every call still answers with a fresh copy, as it always did, so a caller that sorts what it gets cannot reorder another caller's records.

  Nothing is different for you: same exports, same arguments, same return values, same TypeScript types, and not one record of data changed. Verified by packing each real tarball and running it three ways, under plain Node, an esbuild bundle and a Vite 8 SSR bundle (rolldown), with the three required to agree. Those are the three that are checked, and the only ones claimed.

  Turbopack is the one bundler that cannot be checked that way, because it needs a `next build`. It already served these packages before the fix, and the fix gives it a graph it has not seen before (an ESM index importing a CommonJS loader whose JSON arrives by literal `require`), so the proof for it is the geoalgeria.com preview build released in the same batch, which loads `@geoalgeria/gares-routieres` through its index on a live page.

## 2.8.1

### Patch Changes

- 91055e8: No published name uses an en dash as a separator any more.

  476 name values carried one, and each now reads with a spaced hyphen: `Université
de Blida 1 - Saad Dahlab`, `Dar El Baroud - musée de site de Ténès`, `Aéroport de
Constantine - Mohamed Boudiaf`. It is the same substitution the em dash already
  took, for the same reason: the character is a typographic habit of the page the
  name was read from, not a fact about the place, and someone keying or searching
  the name has no way to type it. Nothing else about any name changes, and no claim
  is made about a house separator.

  Where they were: 315 in `@geoalgeria/culture`, 106 in
  `@geoalgeria/enseignement-superieur`, 29 in `@geoalgeria/aviation` (14 airport
  names and 15 route endpoints, which the route GeoJSON resolves `from_name` and
  `to_name` from), 23 in `@geoalgeria/sante`, 2 in `@geoalgeria/cliniques` and 1 in
  `@geoalgeria/ferroviaire`. Ids, coordinates, codes, counts and every `name_ar`
  that did not carry one are unchanged.

  A name cannot open or close on a separator either, there being nothing on the
  other side of it: the Relizane psychiatric hospital in `@geoalgeria/sante`, whose
  upstream name ends on the dash, now ends on its own last word. A hyphen glued to
  the word beside it is part of that word and stays.

  A dash between two digits is a range rather than a separator, so it is left
  exactly as it stands: three `@geoalgeria/sports` facilities name an eponym's
  years, `Stade Mohammed Dahbi Chraa (1933 – 2020)`, and that package is not
  touched here.

  Neither dash can come back. The shared writer folds every name it emits, the
  fetchers that read raw OpenStreetMap names fold them as they clean them, and the
  gate `pnpm validate` runs over every published record now reports both
  characters, `@geoalgeria/livraison` included, which was outside it.

## 2.8.0

### Minor Changes

- f83c2fc: Air Algérie's route network grows to 157 nonstop legs, 29 of them now cited to the airport that publishes the service. Lyon, Metz-Nancy-Lorraine, Montpellier, Nantes, Strasbourg, Manchester, London Stansted and Rotterdam each carry their own page or press release as the source, replacing a Wikipedia article or a press piece about something else, and 20 more legs are planned.

  Rome Fiumicino is back. It had been excluded as flown by ITA Airways on the strength of a booking probe that returned no Air Algérie flight, and that was a false negative: a trade filing lists the route for the whole summer 2026 window, before the exclusion was even written, and no source anywhere announces a Rome launch. `alg-fco` and `fco-alg` ship as operating.

  Beirut is recorded as suspended in both directions, and Dubai's suspension is re-cited, both to APS's notice of 6 March 2026 naming Air Algérie's own suspension per city and in both directions. A suspension dims an arc and never deletes it, so all four rows stay in `routes()`.

  Fourteen legs reach the `verified` tier, most of them the return direction of a long-haul pair that only had its outbound: Beijing both ways, Guangzhou and Kuala Lumpur inbound, Douala, Libreville and Luanda both ways, Montreal outbound. Budapest's days are re-dated from a newer schedule filing: Algiers to Budapest moves to Thursday, and the leg home loses a day it was never published with.

  N'Djamena joins `plannedRoutes()` for its 28 October 2026 launch. `metadata.routes_as_of` is 2026-10-09; the full per-pair record is `research/_flight-routes/verification-2026-10-09.md`.

## 2.7.0

### Minor Changes

- 4024be3: Tripoli returns after ten years, Doha and Abuja are operating, and the triangles now carry their middle legs.

  A verification pass dated 2 October 2026 works through Air Algérie's winter 2026-2027 programme. The package now carries **129 operating legs and 19 planned ones across 73 endpoints**, up from 126 and 16 across 72. `metadata.routes_as_of` moves to `2026-10-02`; treat the network as a dated snapshot, not an evergreen fact.

  **New planned route: Tripoli, the first Libyan service since 2016.** Reservations are open and the first flight is Wednesday 28 October 2026, twice weekly on Wednesdays and Fridays, so `alg-mji` and `mji-alg` enter `plannedRoutes()` with the return leg citing the report that states its own direction. The airport is **Mitiga (`MJI`)**, which is what every report naming one names; Tripoli International (`TIP`) is a different field and is not carried. `MJI` joins the endpoint table with its French, English and Arabic names from Wikidata, coordinate-cross-checked at 1.0 km.

  **Doha is an operating route.** Hamad International welcomed the first Air Algérie arrival on 30 September 2026, so `alg-doh` and `doh-alg` leave `plannedRoutes()` for `routes()` as `active`, three weekly on Sundays, Tuesdays and Fridays. The announced step-up to daily service on 25 October 2026 is a later snapshot's fact.

  **Abuja's return leg was never planned, it was flying.** `abv-alg` shipped in `plannedRoutes()` on winter sale inventory, which reads as "announced, not yet operating". The route's own launch report dates the inaugural Nigeria flight to 6 April 2025 and gives that direction's Friday schedule, so the leg moves to `routes()` as `active`. The winter programme restructures it through Lagos from 29 October, which changes the routing and not whether the leg operates.

  **Triangles now ship their middle legs.** `kwi-amm` (Kuwait to Amman), `abv-los` and `los-abv` (between Abuja and Lagos) are added as planned legs. Until now only the Algeria-touching legs of a rotation shipped, which drew a rotation with a hole in it: an aircraft left Algiers, reappeared at a third airport, and the leg that carried it there was missing. The scope line is amended in `research/_flight-routes/collection-rules.md` section 33. International-only and Air Algérie-only are unchanged, and a foreign-to-foreign leg still enters only through a rotation already in the dataset, never through a sweep.

  **Moscow gains its return leg and a schedule, and stays planned.** `svo-alg` is added and `alg-svo` gains `days: ["mon", "wed", "fri"]` from a reported 2 October resumption at three weekly flights. Both stay planned deliberately: the report is written in the French conditional, a second report of the same date makes the resumption conditional on ticket sales opening, and nothing dated on or after the announced date reports a first flight. An announced date arriving is not an aircraft flying.

  **Frequencies filled in.** Conakry gains `["tue", "thu", "sun"]` and Brazzaville `["mon", "wed", "sat"]`, both on the Algiers departures only, because that is the direction the published programme states. Shanghai was re-verified and deliberately left as it was: only the source already cited carries its flight numbers and per-direction days.

  Every other announced route whose launch date is still ahead stays `planned`, however firm the announcement, and each flips only on a dated report that it flew. Full per-change evidence, including which sources could not be opened and what was deliberately left alone, is in `research/_flight-routes/verification-2026-10-02.md`.

## 2.6.0

### Minor Changes

- ecaaa2c: Batna flies to Orly, Berlin now operates, Kuwait and Amman are planned, Delhi is withdrawn and Dubai suspended.

  A verification pass dated 27 September 2026 reworks five parts of Air Algérie's international network. The package now carries **126 operating legs and 16 planned ones across 72 endpoints**, the same 142 rows as 2.5.2 with a different and better-sourced shape. `metadata.routes_as_of` moves to `2026-09-27`; treat the network as a dated snapshot, not an evergreen fact.

  **Batna's Paris service is at Orly, not Charles de Gaulle.** `blj-cdg` shipped as verified on a citation that named no airport, and the dispute had been open since July. Three independent flight-tracking aggregators place AH1120 and AH1121 at Paris-Orly and nothing current names CDG, so the pair is corrected to `blj-ory` and the missing `ory-blj` return leg ships on its own evidence, each direction citing its own route page. Consumers keying on the id `blj-cdg` will not find it any more, by design: it described the wrong airport.

  **Berlin is an operating route.** The inaugural Algiers-Berlin rotation flew on Monday 14 September 2026 and the weekly nonstop is confirmed into the winter programme, so `alg-ber` and `ber-alg` leave `plannedRoutes()` for `routes()` as `active`. The winter schedule moves the weekly slot to Sunday on 25 October 2026, which a later snapshot will carry.

  **New planned route: the Algiers-Kuwait-Amman-Algiers triangle**, one weekly Monday rotation from 26 October 2026, confirmed on the record by Algeria's ambassador to Kuwait. A triangle yields one-directional nonstops and only Algeria-touching legs are in scope, so it adds exactly two rows, `alg-kwi` and `amm-alg`, plus two new endpoints, `KWI` (Kuwait International) and `AMM` (Queen Alia International, Amman), each with its French, English and Arabic names. Nonstop `ALG-AMM` stays excluded: it is still flown by another carrier, and that exclusion was always about a leg rather than an endpoint.

  **Delhi is gone.** Air Algérie withdrew the traffic-rights authorization request for the India route, reported 12 September 2026, so `alg-del` and `del-alg` are removed rather than restyled: `plannedRoutes()` is a claim that a route is coming. `DEL` is no longer among the shipped endpoints.

  **Algiers-Dubai is suspended, not unclear.** A dated report states Air Algérie has not resumed the service, so `alg-dxb` carries `status: "suspended"` and that citation instead of reading as unchecked. The arc still ships: the network is described structurally, so a suspension dims a route and never deletes it. The wider Algeria-UAE picture is narrower than a blanket stop, Algeria closed its airspace to UAE-registered aircraft from 11 September 2026 with Emirati commercial flights to Algiers carved out until the end of 2026, and this record is about Air Algérie's own leg.

  Full per-change evidence, including which sources could not be opened and what was deliberately left alone, is in `research/_flight-routes/verification-2026-09-27.md`.

### Patch Changes

- 4deabd3: Replace em dashes in source names and citations with plain separators.

  - Every source `name` reads `Operator: descriptor`, where it used to carry a
    U+2014 em dash, in `data/metadata.json` and in the `dataset-metadata.json`
    descriptor built from it.
  - The schema.org/DCAT `citation` entries join a source name and its licence with
    a comma: `OpenStreetMap: schools & kindergartens in Algeria, ODbL 1.0 (© OpenStreetMap contributors)`.
  - Coverage notes, package `description`s, the `types/index.d.ts` documentation and
    the `index.js` headers carry a colon, comma or semicolon in place of the dash.

  No count, coordinate, licence or date changes. Consumers that match a source name
  or a citation string literally need to update the separator; anything keyed on
  `sources[].key` is unaffected. `pnpm validate` now fails on an em dash in
  published metadata, so it cannot come back through a generator.

## 2.5.2

### Patch Changes

- 68a06ac: Correct reviewed current-Wilaya assignments for the Annaba airport, Algérie Poste offices and ATMs, and Ministry of Youth and Sports establishments while preserving differing Source codes and keeping the flagship Poste mirror synchronized.

## 2.5.1

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.5.0

### Minor Changes

- d4debb5: Expand the Air Algérie network with newly confirmed and reported routes across Europe, Africa, Asia, and the Gulf.

## 2.4.0

### Minor Changes

- fae91ff: One new verified route: LYS to TLM (AH 1099), the return of the existing Tlemcen to Lyon leg, confirmed on Lyon airport's own Air Algerie page (which states the 2h10 flight time the schedule check reproduced exactly). Routes: 122 to 123, verified: 58 to 59. `routes_as_of` moves to 2026-07-29.

## 2.3.0

### Minor Changes

- 4ebbe0f: Route endpoints now carry names in three languages, and the route network carries a validity stamp.

  Migration: `name` on the 50 foreign endpoints changes language, from OurAirports English to the Wikidata French label (`name` was always the French display field; the foreign values were mislabelled English). A consumer that rendered `name` as English text should switch to the new `name_en`.

  - `route-endpoints.json`: every endpoint (both ends of every arc, foreign airports included) gains `name_en` and `name_ar`, matched on Wikidata by IATA code and cross-checked against the shipped coordinate (within 15 km, air bases sharing an IATA excluded). The foreign `name` field, which was OurAirports English pretending to be the French display field, now carries the Wikidata French label; the 13 Algerian origins keep the package's French house style.
  - `metadata.routes_as_of`: the date the route network was last checked against schedules. Routes churn seasonally, unlike every other GeoAlgeria dataset, so consumers should treat the network as a dated snapshot rather than an evergreen fact.

## 2.2.0

### Minor Changes

- a8c1952: Air Algérie's nonstop route network, as data you can install.

  `routes()` returns 122 directional legs; `plannedRoutes()` returns the announced-but-not-yet-flying ones; `routeEndpoints()` gives both ends of every arc, including the foreign airports `airports()` does not carry; `routesFrom(iata)` gives departures from one airport.

  > Corrected 2026-07-28: this entry originally said 70 legs. The 2.2.0 tarball
  > shipped 122; the changeset text was written mid-collection and the dataset
  > grew before release. The number above is what 2.2.0 actually contains.

  - **Directional, not pair-shaped.** `ALG->BUD` flies nonstop on Saturdays and `BUD->ALG` on Wednesdays, and there is never a same-day nonstop round trip, so they are two records and neither implies the other. A pair-shaped dataset would describe a route nobody can fly on a given day.
  - **Every route carries an `evidence` tier.** `verified` means the operator was confirmed as _operating_ the leg, with direction and a great-circle duration check. `listed` means a published source lists the carrier serving the pair, which claims _service_ rather than operation. Both carry a `source` URL you can open; there are no uncited routes.
  - **Codeshares are excluded, not marked.** A codeshare puts an airline's flight number on another airline's aircraft, so shipping one would make this file's central claim false. Screening the highest-risk pairs found five that had to go, including two (`ALG-JED`, `ALG-AMM`) with no Air Algérie leg at all, only Saudia and Royal Jordanian.
  - **`routes.json` is a relation file, not a `GeoRecord` collection.** A route links two places rather than being one, so it has no `lat`/`lng`/`geo_precision`; forcing it into that shape would mean picking one end and calling it the record's location. It is excluded from `record_count` and `entities[]` for the same reason, and carries its own `routes` count in the metadata. The GeoJSON draws each route as a **great-circle LineString**, since a straight line in lng/lat space is the wrong path on a globe.

  `@geoalgeria/aviation` now covers both halves of the domain: the airports, and what flies between them.

## 2.1.0

### Minor Changes

- e477d1a: Every airport now carries an IATA code, and the three airports ANAC's map omits are in.

  **Migration: `address` and `website` are now nullable.** They were `string` and every one of the 33 records carried a value; they are now `string | null` and 3 of 36 carry `null`. The three OurAirports records have no contact fields upstream. If you do `airport.website.startsWith("https")` or `airport.address.trim()`, guard it: `airport.website?.startsWith("https")`. TypeScript consumers under `strictNullChecks` will see this at compile time; plain JavaScript will see it at runtime. `phone` was already nullable and is unchanged. This ships as a minor because the bump rules key on the data, and this is new data rather than a schema redesign, but it is the one thing in this release that can break existing code.

  - **IATA codes on all 36 records.** `iata` was `null` on every record because ANAC publishes only ICAO. They are backfilled from [OurAirports](https://ourairports.com/data/) on an ICAO join. A matching code is not on its own evidence that two rows describe the same place, so every join is confirmed against ANAC's own coordinate and the build fails on anything more than 5 km away. The observed spread is 0.31 to 2.15 km, the far end being Ouargla (`DAUU`/`OGX`), whose OurAirports entry is named for the Ain Beida aerodrome rather than the city. `refs` now carries `iata` alongside `icao`, as an optional key: `refs` omits null values, so an airport without an IATA code ships `refs: { icao }`.
  - **New `airportByIata(code)`** accessor, alongside the existing `airportByIcao`. Every record now carries both natural keys, and IATA is what flight feeds, booking systems and timetables actually speak.
  - **Three new airports**, absent from ANAC's map and taken from OurAirports: Hassi R'Mel (`DAFH`/`HRM`), Mécheria (`DAAY`/`MZW`) and Laghouat (`DAUL`/`LOO`). 33 records to 36, 31 wilayas to 33.
  - **`source` is now `"anac" | "ourairports"`**, and `metadata` gains a `by_source` breakdown. The mixed provenance is legible per record, not only in `metadata.sources[]`.
  - **Each source now carries a `snapshot`** in `metadata.sources[]`: the URL actually fetched, the SHA-256 of its bytes, its size, and its `Last-Modified` where the upstream publishes one. Both upstreams are live documents and OurAirports regenerates continuously, so `retrieved` alone recorded when the build asked, not what it got. You can verify a shipped value's provenance yourself: download the `snapshot.url` and run `shasum -a 256`. It attests, it does not pin, so a changed upstream never fails the build.
  - **The OurAirports source is `evidence_type: "crowdsourced"`**, not `official`. OurAirports is volunteer-edited, so it is neither a government register nor a first-party operator feed. If you filter on evidence tier, the three supplementary airports and all 36 IATA codes are crowdsourced-tier; the other 33 records' names, coordinates and contacts remain official-tier ANAC data.

## 2.0.0

### Major Changes

- e84384a: Data v2 — one canonical record contract across every sector package (breaking schema overhaul).

  Every sector package now shares a single record shape defined by the new `@geoalgeria/schema` dependency, replacing the hand-written, drifted `types/index.d.ts` per package. Read [`packages/schema/MIGRATING.md`](https://github.com/yasserstudio/geoalgeria/blob/main/packages/schema/MIGRATING.md) before adopting `2.0.0`.

  - **Breaking record shape**: `wilaya_code` is a zero-padded **string** (`"16"`, not `16`); commune linkage is `commune_code` (string ONS code) + `commune`; coordinates are `lat`/`lng`; external ids collapse into `refs: { osm, wikidata, … }`; `id` is an opaque string unique within its file (no more global `{sector}:{WW}-{seq}` form). Every record ships in **JSON, CSV and GeoJSON**.
  - **Breaking `geo_precision`**: strictly `exact | approximate | null`, **null if and only if** the record has no coordinate; the old method vocabulary moved to a new `geo_method` field under the same null-iff rule. `exact` now requires ≥3 decimals and a point unique within its file — 409 records that could not carry that claim were downgraded to `approximate`.
  - **Honest metadata**: real per-source `retrieved` dates; licence URLs only where the source is genuinely open, `conditionsOfAccess` prose otherwise. A root `index.json` catalog and a `schema.org/Dataset` descriptor ship alongside the data.
  - **Data fixes**: the capital-coordinate 9-cycle swap repaired; 30+11 mislinked records relinked; emploi communes recovered; 972 previously-dropped tourisme values restored.

  Not part of this release: the core `geoalgeria` dataset and `@geoalgeria/telecom` predate this contract and stay on their current v1 versions until migrated.

## 1.0.0

### Added

- 33 civil airports sourced from ANAC (anac.dz) — official names, ICAO (OACI)
  codes, addresses, phone numbers, websites, and coordinates
- Wilaya linkage (`wilaya_code`) resolved against the geoalgeria 69-wilaya model
  (Law n° 26-06, Journal Officiel n° 25 of 5 April 2026)
- Export formats: JSON, CSV, GeoJSON
- npm package with typed helper accessors (`airports()`, `airportByIcao()`,
  `airportsByWilaya()`, `metadata()`)
