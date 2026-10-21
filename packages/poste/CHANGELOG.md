# Changelog

## 2.2.0

### Minor Changes

- e744d65: Three post offices are named after the places their own fields name.

  BaridiMap glued a dash to a word inside the Arabic name instead of separating two
  halves of it, so folding the dash would have published a separator that was never
  there:

  - `2298` read `عين –الزانة`, with the dash inside the commune name itself, and
    now reads `عين الزانة`, which is its own `commune_ar` and its Latin `AIN ZANA`.
  - `3935` read `برج –بو-عريريج - أخروف`, which split the wilaya name in two, and
    now reads `برج بوعريريج - أخروف`: `commune_ar` is `برج بوعريريج` and the Latin
    name `BORDJ BOU ARRERIDJ AKHROUF`, so the farm is the only real separator.
  - `725` read `سوق أهراس –درايعية أحمد-`, where the separator is real and the
    glued dash and the trailing hyphen are not, and now reads
    `سوق أهراس - درايعية أحمد`.

  The source word order is kept in all three, the Latin `name` was always correct
  and is unchanged, and so are ids, coordinates, codes, postal codes and counts.
  The `geoalgeria` postal mirror follows, byte-identical as always.

  Each correction is a reviewed entry in `quality/overrides/poste.json`, so it
  survives the next BaridiMap pull and declines to apply if the upstream name
  moves. That gives `postoffices.json` the four review fields `atms.json` already
  carries, `review_status`, `reviewed_at`, `reviewed_by` and `review_evidence`,
  declared optional on `PostOffice` as they are on `Atm`. **`csv/postoffices.csv`
  gains those four columns**, which is why this is a minor rather than a patch: the
  columns are appended, every existing column keeps its position, and no value
  changes. A consumer reading the CSV by header name is unaffected; one reading a
  fixed column count is not.

## 2.1.4

### Patch Changes

- e056b8d: Reform-stale wilaya corrections (yasserstudio/geoalgeria.com#209): records whose source still files them under the wilaya their commune belonged to before the 2026 reform (law 26-06, JO 25; presidential decree 26-206, JO 40) now carry the current wilaya, with the commune the correction was derived from. Each is a reviewed decision in `quality/overrides/poste.json`, so a regeneration reapplies it and stops if the source's own value has moved. No id changes.

## 2.1.3

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

## 2.1.2

### Patch Changes

- 68a06ac: Correct reviewed current-Wilaya assignments for the Annaba airport, Algérie Poste offices and ATMs, and Ministry of Youth and Sports establishments while preserving differing Source codes and keeping the flagship Poste mirror synchronized.

## 2.1.1

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.1.0

### Minor Changes

- 64b10a1: Replace duplicated and missing `code_commune` values with the 1,541 unique codes from the official ONS 2021 Code Géographique National. Cascade the corrected foreign keys through every linked dataset, preserve Algérie Poste's differing provider-native values, enforce the SQL and repository-wide FK contracts, retain the 2021 mother-wilaya prefix for communes promoted in later reforms, and document the code contract.

## 2.0.0

### Major Changes

- e84384a: Data v2 — one canonical record contract across every sector package (breaking schema overhaul).

  Every sector package now shares a single record shape defined by the new `@geoalgeria/schema` dependency, replacing the hand-written, drifted `types/index.d.ts` per package. Read [`packages/schema/MIGRATING.md`](https://github.com/yasserstudio/geoalgeria/blob/main/packages/schema/MIGRATING.md) before adopting `2.0.0`.

  - **Breaking record shape**: `wilaya_code` is a zero-padded **string** (`"16"`, not `16`); commune linkage is `commune_code` (string ONS code) + `commune`; coordinates are `lat`/`lng`; external ids collapse into `refs: { osm, wikidata, … }`; `id` is an opaque string unique within its file (no more global `{sector}:{WW}-{seq}` form). Every record ships in **JSON, CSV and GeoJSON**.
  - **Breaking `geo_precision`**: strictly `exact | approximate | null`, **null if and only if** the record has no coordinate; the old method vocabulary moved to a new `geo_method` field under the same null-iff rule. `exact` now requires ≥3 decimals and a point unique within its file — 409 records that could not carry that claim were downgraded to `approximate`.
  - **Honest metadata**: real per-source `retrieved` dates; licence URLs only where the source is genuinely open, `conditionsOfAccess` prose otherwise. A root `index.json` catalog and a `schema.org/Dataset` descriptor ship alongside the data.
  - **Data fixes**: the capital-coordinate 9-cycle swap repaired; 30+11 mislinked records relinked; emploi communes recovered; 972 previously-dropped tourisme values restored.

  Not part of this release: the core `geoalgeria` dataset and `@geoalgeria/telecom` predate this contract and stay on their current v1 versions until migrated.

## 1.1.0

### Minor Changes

- Bundle TypeScript type definitions. `PostOffice`, `Atm`, and `Metadata` interfaces plus typed loaders (`postOffices()`, `atms()`, `metadata()`) now ship with the package and resolve automatically via the `types` export condition. No runtime or data changes.

## 1.0.2

### Patch Changes

- Docs: value-led READMEs, official source citation for the 69-wilaya reform (Law n° 26-06, Journal Officiel n° 25 of 5 April 2026), and fixed post-restructure links/badges. No data changes.

## 1.0.1

### Changed

- Corrected `repository`/`bugs` links to the package's real home,
  `github.com/yasserstudio/geoalgeria` (the data monorepo). No data changes.

## 1.0.0

### Added

- 3,908 post offices sourced from Algérie Poste (baridimap.poste.dz) — real
  postal codes, bilingual (FR/AR) names, coordinates, commune/wilaya linkage
- 2,026 ATMs (DAB) with the same linkage
- Export formats: JSON, CSV, GeoJSON
- npm package with helper accessors
