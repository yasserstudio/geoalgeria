# Changelog

## 3.0.0

### Major Changes

- e84384a: Data v2 — one canonical record contract across every sector package (breaking schema overhaul).

  Every sector package now shares a single record shape defined by the new `@geoalgeria/schema` dependency, replacing the hand-written, drifted `types/index.d.ts` per package. Read [`packages/schema/MIGRATING.md`](https://github.com/yasserstudio/geoalgeria/blob/main/packages/schema/MIGRATING.md) before adopting `2.0.0`.

  - **Breaking record shape**: `wilaya_code` is a zero-padded **string** (`"16"`, not `16`); commune linkage is `commune_code` (string ONS code) + `commune`; coordinates are `lat`/`lng`; external ids collapse into `refs: { osm, wikidata, … }`; `id` is an opaque string unique within its file (no more global `{sector}:{WW}-{seq}` form). Every record ships in **JSON, CSV and GeoJSON**.
  - **Breaking `geo_precision`**: strictly `exact | approximate | null`, **null if and only if** the record has no coordinate; the old method vocabulary moved to a new `geo_method` field under the same null-iff rule. `exact` now requires ≥3 decimals and a point unique within its file — 409 records that could not carry that claim were downgraded to `approximate`.
  - **Honest metadata**: real per-source `retrieved` dates; licence URLs only where the source is genuinely open, `conditionsOfAccess` prose otherwise. A root `index.json` catalog and a `schema.org/Dataset` descriptor ship alongside the data.
  - **Data fixes**: the capital-coordinate 9-cycle swap repaired; 30+11 mislinked records relinked; emploi communes recovered; 972 previously-dropped tourisme values restored.

  Not part of this release: the core `geoalgeria` dataset and `@geoalgeria/telecom` predate this contract and stay on their current v1 versions until migrated.

## 2.0.0

Algeria's youth establishments — 2,334 from the official Ministry of Youth and Sports GIS, typed and geocoded.

### Added

- `name_ar` (Arabic name, backfilled from the legacy ministry map by type-checked
  nearest-neighbour geo-match, ~59% of records)
- New per-record fields: address, capacity, year of reception, operational status,
  PMR accessibility, and built / land area
- Sister package to `@geoalgeria/sports` — both from the same official Ministry of Youth and Sports GIS (sig.mjs.gov.dz)

### Improved

- Rebuilt from the official Ministry of Youth and Sports GIS — 2,334
  establishments (was 2,076), spanning 58 wilayas
- Primary names are now French, with stable type codes (`MJ`, `CSP`, `SPA`, `AJ`,
  `CJ`, `CLS`, `FJ`, `CC`, `BA`) and sequential integer ids

### Dropped

- Arabic as the primary `name` (now French — read `name_ar` for the Arabic name)
  and the legacy youthconnect source; old type codes and ids. Join `wilaya_code`
  against `geoalgeria` for French commune/wilaya names

## 1.0.0

### Added

- 2,076 youth & sports institutions sourced from the Ministry of Youth and Sports
  (youthconnect.mjeunesse.gov.dz) — official Arabic names, institution type,
  commune / daïra / wilaya, and GPS coordinates
- Nine institution types: maisons de jeunes, complexes sportifs de proximité,
  salles polyvalentes, auberges de jeunes, centres culturels, camps de jeunes,
  centres de loisirs scientifiques, clubs de jeunes, and piscines de proximité
- Wilaya linkage (`wilaya_code`) joining the geoalgeria wilaya model
- Export formats: JSON, CSV, GeoJSON
- npm package with typed helper accessors (`institutions()`, `institutionById()`,
  `institutionsByWilaya()`, `institutionsByType()`, `metadata()`)
