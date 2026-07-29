# Changelog

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
