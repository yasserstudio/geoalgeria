# @geoalgeria/transport

## 2.0.2

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.
- Updated dependencies [76dfd0d]
- Updated dependencies [76dfd0d]
- Updated dependencies [76dfd0d]
- Updated dependencies [76dfd0d]
  - @geoalgeria/aviation@2.5.1
  - @geoalgeria/buses@2.1.1
  - @geoalgeria/ferroviaire@2.0.2
  - @geoalgeria/gares-routieres@2.2.4

## 2.0.1

### Patch Changes

- 0308a2a: Reconcile ETUS Tiaret with its extracted official Line payload, publish all five official ETUSTO Lines (three with reusable OSM shapes), add five ETUS Béjaïa Lines with typed stop counts and transcribed service hours, add four ETUS M'Sila Lines from official route pages and diagrams, add eight ETUS Sidi Bel Abbès Lines with complete directional departure lists from supplied official HTML, and add five official ETUS Setif Lines with a verified reusable OSM shape for Line 101. Published Line provenance now identifies Operator sources first and uses OSM only where it supplies reusable geometry.
- Updated dependencies [05e17e5]
- Updated dependencies [0308a2a]
- Updated dependencies [b3746f5]
- Updated dependencies [186a9c5]
- Updated dependencies [23c4df9]
- Updated dependencies [354eac0]
- Updated dependencies [ccc9ebf]
- Updated dependencies [24518b5]
- Updated dependencies [14aa4bf]
- Updated dependencies [ce1509f]
- Updated dependencies [ef41100]
- Updated dependencies [bb24c0b]
  - @geoalgeria/buses@2.1.0
  - @geoalgeria/gares-routieres@2.2.3

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
  - @geoalgeria/aviation@2.0.0
  - @geoalgeria/gares-routieres@2.0.0
  - @geoalgeria/ferroviaire@2.0.0
  - @geoalgeria/buses@2.0.0

## 1.0.0

### Added

- Umbrella meta-package for Algeria's transport sector — install once to get
  `@geoalgeria/aviation`, `@geoalgeria/ferroviaire`, `@geoalgeria/gares-routieres`
  and `@geoalgeria/buses`, re-exported namespaced (`aviation`, `ferroviaire`,
  `garesRoutieres`, `buses`).
