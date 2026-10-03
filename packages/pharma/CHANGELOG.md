# @geoalgeria/pharma

## 2.0.3

### Patch Changes

- e693ea4: Republish the transport and pharma umbrellas on a fresh version number after an aborted staged publish reserved the previous one.

  transport 2.0.4 and pharma 2.0.2 were staged on npm on 2026-09-27 and the staged uploads were dropped before approval; npm never reuses a version it has seen, so those numbers can no longer be published. This release carries exactly the same content: transport depends on aviation ^2.6.0, buses ^2.2.0, gares-routieres ^2.2.5 and ferroviaire ^2.0.3; pharma depends on industrie-pharmaceutique ^2.0.3 and pharmacies ^2.2.2.

## 2.0.2

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

- Updated dependencies [0df7cb4]
- Updated dependencies [4deabd3]
  - @geoalgeria/industrie-pharmaceutique@2.0.3
  - @geoalgeria/pharmacies@2.2.2

## 2.0.1

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.
- Updated dependencies [76dfd0d]
- Updated dependencies [76dfd0d]
  - @geoalgeria/industrie-pharmaceutique@2.0.2
  - @geoalgeria/pharmacies@2.2.1

## 2.0.0

### Major Changes

- e84384a: Data v2 — one canonical record contract across every sector package (breaking schema overhaul).

  Every sector package now shares a single record shape defined by the new `@geoalgeria/schema` dependency, replacing the hand-written, drifted `types/index.d.ts` per package. Read [`packages/schema/MIGRATING.md`](https://github.com/yasserstudio/geoalgeria/blob/main/packages/schema/MIGRATING.md) before adopting `2.0.0`.

  - **Breaking record shape**: `wilaya_code` is a zero-padded **string** (`"16"`, not `16`); commune linkage is `commune_code` (string ONS code) + `commune`; coordinates are `lat`/`lng`; external ids collapse into `refs: { osm, wikidata, … }`; `id` is an opaque string unique within its file (no more global `{sector}:{WW}-{seq}` form). Every record ships in **JSON, CSV and GeoJSON**.
  - **Breaking `geo_precision`**: strictly `exact | approximate | null`, **null if and only if** the record has no coordinate; the old method vocabulary moved to a new `geo_method` field under the same null-iff rule. `exact` now requires ≥3 decimals and a point unique within its file — 409 records that could not carry that claim were downgraded to `approximate`.
  - **Honest metadata**: real per-source `retrieved` dates; licence URLs only where the source is genuinely open, `conditionsOfAccess` prose otherwise. A root `index.json` catalog and a `schema.org/Dataset` descriptor ship alongside the data.
  - **Data fixes**: the capital-coordinate 9-cycle swap repaired; 30+11 mislinked records relinked; emploi communes recovered; 972 previously-dropped tourisme values restored.

  Not part of this release: the core `geoalgeria` dataset and `@geoalgeria/telecom` predate this contract and stay on their current v1 versions until migrated.

### Patch Changes

- Updated dependencies [e84384a]
  - @geoalgeria/industrie-pharmaceutique@2.0.0
  - @geoalgeria/pharmacies@2.0.0

## 1.0.0

Umbrella for Algeria's pharmaceutical sector — one install for the whole family.

### Added

- Re-exports `@geoalgeria/industrie-pharmaceutique` (approved medicine & medical-device
  manufacturers) and `@geoalgeria/pharmacies` (officines), namespaced as `industrie`
  and `pharmacies`.
- Designed to grow: further sector layers (e.g. medical laboratories) can join without
  a breaking change.
