# Changelog

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

- Bundle TypeScript type definitions. `Agence`, `Pdv`, and `Metadata` interfaces plus typed loaders (`agences()`, `pdv()`, `all()`, `metadata()`) now ship with the package and resolve automatically via the `types` export condition. No runtime or data changes.

## 1.0.0

### Added

- The Mobilis sales network — 165 geocoded agencies + 12,180 approved points of sale across Algeria.
- 165 commercial agencies (_Agence Mobilis_): bilingual FR/AR name and address, with coordinates, in JSON, CSV, and GeoJSON.
- 12,180 approved points of sale (_points de vente agréés_): FR name, address, and commune, in JSON and CSV (the source carries no coordinates).
- Stable synthesized `id` (`{wilaya_code}-{seq}`); the Mobilis source id is kept as `code`; `wilaya_code` links to the GeoAlgeria divisions.
- JS API: `agences()`, `pdv()`, `all()`, `metadata()`.
- Source: Mobilis — ATM Mobilis (mobilis.dz/mapagence).
