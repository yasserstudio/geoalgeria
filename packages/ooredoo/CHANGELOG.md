# @geoalgeria/ooredoo

## 2.0.1

### Patch Changes

- 7ff736d: Reconcile every store against Ooredoo's own declared wilaya, and correct the five
  whose API coordinate is wrong.

  The locator API ships each store with a declared wilaya and commune alongside the
  coordinate. This package derives `wilaya_code`/`commune` from the coordinate
  instead, because the API still files stores under the old 48-wilaya scheme, and
  keeps the operator's declaration in `operator_wilaya`. Joining the 572 shipped
  records back to the raw pull, 33 disagreed. 25 of those are the wilaya reform and
  are correct as shipped: a Timimoun store is tagged Adrar, Ouled Djellal is tagged
  Biskra, Bou Saada is tagged M'sila, and so on for every wilaya created in 2019 or
  by Decree 26-206.

  Of the remaining 8, five have a coordinate that contradicts both the declared
  wilaya and the store's own name and address, and are now pinned to their commune's
  point (`geo_precision: "approximate"`, `geo_method: "commune_centroid"`):

  - `31-001` (ESO000810, "CTE.SEFSSAFA") declared Batna / Sefiane. Its coordinate,
    lat 36.2477 / lng -0.634848, is in the Mediterranean about 50 km off the Oran
    coast. It is the longitude of the adjacent record ESO000811 ("ACHAACHA CENTRE",
    36.2477 / +0.63486) with the sign flipped, so the field is a copy of its
    neighbour rather than a measurement. Now Sefiane, Batna. This supersedes the pin
    to Sidi Ben Yebka (Oran) in the previous unpublished changeset, which followed
    the bad coordinate instead of the declaration.
  - `16-001` ("EO TIZI OUZOU 2", address "TIZI OUZOU") declared Tizi Ouzou. Its
    coordinate is central Algiers, 111 km away. Now Tizi Ouzou.
  - `16-052` ("EO BEJAIA", address "24, Ch des Cretes - BEJAIA") declared Bejaia. Its
    coordinate is Algiers airport, 0.4 km from "EO AEROPORT INTERNATIONAL". Now
    Bejaia.
  - `48-001` ("EO PLATEAU", address "ORAN") declared Oran. Its longitude sign is
    flipped: +0.6983 put it in Relizane, -0.6983 lands in Oran. Now Oran.
  - `67-002` ("EO BOUMERDES", address "BOUMERDES") declared Boumerdes. Its latitude
    is exactly one degree south of Boumerdes. Now Boumerdes.

  Ids are unchanged. The public `{wilaya}-{seq}` id is assigned before the
  correction runs and is never rewritten, so no deep link breaks; the consequence is
  that on those five records the id prefix is the wilaya the bad point fell in, not
  `wilaya_code`. The id was always meant to be opaque and this is now stated in the
  type declaration and the READMEs.

  The remaining 3 (`16-039`, `20-003`, `31-002`) are left exactly as shipped. Their
  coordinates are real points near a wilaya boundary, and the wilaya outlines put
  all three inside the wilaya Ooredoo declares while the nearest-centroid join filed
  them one wilaya over. That is a defect in how this package derives the wilaya, not
  a bad coordinate, and moving them by pinning a commune would throw away a good
  operator point. They are the 3 records the geo-in-boundary gate already reports as
  outside their declared wilaya.

  Metadata: `precision` moves from 552 exact / 20 approximate to 548 / 24, and the
  `coverage_note` now states how many records carry an operator coordinate, how many
  are commune pins and why, and that 3 records have a derived wilaya the outlines
  disagree with. Record count, bbox, wilaya coverage, dates and every other record
  are unchanged. The correction still lives in `COORD_FIX` in `scripts/fetch.mjs`,
  keyed by Ooredoo's own store id, so a live re-fetch cannot reimport a bad point and
  the build fails if any of those store ids disappears upstream.

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

Ooredoo Algérie's retail network — 572 stores from the operator's locator API, geocoded, typed, wilaya/commune-linked. Completes the telecom retail trio.

### Added

- 572 Ooredoo stores across 63 wilayas — 436 Espaces Services (ESO), 100 Espaces
  Ooredoo (EO) and 36 City Shops (CSO) — from the operator's public _Trouvez-nous_
  locator API, each with real coordinates (`geo_precision: "exact"`).
- Bilingual FR/AR type labels, wilaya/commune linkage by nearest-centroid join
  against the geoalgeria base dataset (reconciling the API's legacy 48-wilaya
  scheme to the current 69-wilaya scheme; the operator's declared wilaya is kept
  as `operator_wilaya`), and stable `{wilaya}-{seq}` ids.
- Completes the telecom retail trio with `@geoalgeria/mobilis` and `@geoalgeria/djezzy`.
- JSON, CSV, GeoJSON, TypeScript types, and a `npm run fetch` rebuild script
  (`--cache` for reproducible offline rebuilds).
