# @geoalgeria/industrie-pharmaceutique

## 2.0.1

### Patch Changes

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

## 1.0.0

Algeria's approved pharmaceutical manufacturers — 171 medicine and medical-device makers from the Ministry of Pharmaceutical Industry, bilingual, typed by nature and geocoded.

### Added

- 171 approved pharmaceutical manufacturers from the **Ministry of Pharmaceutical
  Industry (MIP)** fabrication register (`agrément de fabrication`, updated
  28/06/2026): 120 medicine makers (PP), 48 medical-device makers (DM) and 3 mixed
  producers, across 25 wilayas.
- Bilingual FR/AR nature labels, `role`/`nature` dimensions, wilaya/commune linkage
  against the geoalgeria base dataset, and coordinates at commune (126) or wilaya (45)
  centroid — `geo_precision`-labelled.
- Locations resolved from the MIP register's 2023 edition (which carried a wilaya
  column), place tokens in operator names, and a per-company research pass for makers
  absent from the 2023 edition — never guessed; makers with no locatable site are
  omitted rather than placed speculatively.
- JSON, CSV, GeoJSON and TypeScript types.
