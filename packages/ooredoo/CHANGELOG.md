# @geoalgeria/ooredoo

## 2.0.5

### Patch Changes

- 0df7cb4: Rebuild 13 sector packages on the corrected commune centres: 45 coordinates moved, 1,178 commune links re-derived.

  `geoalgeria` corrects 56 commune centres in this same release, by 0.75 km to 217 km. Every package here derives from those values, so none of it was right until they were rebuilt against them. Two separate things were stale.

  **45 coordinates were a repudiated commune centre.** These records have no point of their own: they borrow their commune's centre and say so in `geo_method`. The copy does not follow the original. `@geoalgeria/sante`'s _EPH El Harrach (Hassan Badi)_ shipped at the old El Harrach value, 51.5 km from the hospital and inside wilaya 35; the 23 Algiers institutions of `@geoalgeria/agriculture` sat on the Alger Centre point that was in the sea. Moved: sante 7, agriculture 23, formation-professionnelle 10 (including the CFPAs of Melbou, Mazagran, Marsa Ben M'Hidi and Chelghoum Laid), enseignement-superieur 3 (ENP, ENSA and EPAU, all at El Harrach) and industrie-pharmaceutique 2 (SAIDAL El Harrach, BIO OSTEO). Precision is unchanged and still honest: these are commune-level placements, they now name the commune's current centre.

  **1,178 `commune_code` links moved, and 270 `wilaya_code` with them.** `commune` and `commune_code` are stamped by nearest commune centroid, so a centre that moves 25 km stops being the nearest for everything around where it was and starts being it around where it is. Re-derived: mosquees 720, ecoles 266, pharmacies 105, cliniques 39, culture 29, ooredoo 13, djezzy 3 and protection-civile 3. Wilaya moved for 254 mosques, 10 cultural places and 6 pharmacies.

  **Record counts, names, types, contacts and ids are untouched in every package.** Only `lat`/`lng`, `commune`, `commune_code` and `wilaya_code` changed, plus the `metadata.json` fields derived from them (sante's bbox reaches 37.065 now that Chetaibi is on the coast). Ten of the thirteen were rebuilt by re-running their own generator against its committed capture, offline; the other three cannot replay offline and were patched by `scripts/sync-commune-centroid-dependents.mjs`, which reproduces the same reads of the flagship and nothing else.

  **This release is also the first rebuild since the JORA name corrections of 2.1.0**, which no dependent had picked up either. That accounts for a further 3,031 `commune` labels now matching the flagship spelling (`Ain Madhi` to `Aïn Madhi`, `Hassi R'mel` to `Hassi R'Mel`), 258 `commune_code` and 47 `wilaya_code` from the same earlier pass, and one vocational centre in Ouamri that is placed for the first time because its commune name now resolves.

  **A guard keeps the class out.** `pnpm validate` now checks every record that declares a commune-level placement against the flagship: 1,151 of them, and a coordinate that is not the current centre of the commune it names fails the build. It is a table of the bound `geo_method` values, not a guess, because three commune-flavoured methods in this repository are deliberately not a flagship centre (the Ooredoo 5G per-commune points, and the wilaya-mean placements of industrie-pharmaceutique and enseignement-superieur).

  Closes yasserstudio/geoalgeria.com#169.

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

## 2.0.4

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.0.3

### Patch Changes

- 586c0cc: Refresh the public OSM, ANEM, and mobile-operator sources through 2026-08-31,
  including updated records, opening hours, labels, and canonical Mobilis wilaya
  assignments.

## 2.0.2

### Patch Changes

- 64b10a1: Replace duplicated and missing `code_commune` values with the 1,541 unique codes from the official ONS 2021 Code Géographique National. Cascade the corrected foreign keys through every linked dataset, preserve Algérie Poste's differing provider-native values, enforce the SQL and repository-wide FK contracts, retain the 2021 mother-wilaya prefix for communes promoted in later reforms, and document the code contract.

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
