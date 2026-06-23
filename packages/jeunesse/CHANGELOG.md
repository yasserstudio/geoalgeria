# Changelog

## 2.0.0

### Major Changes

- 7b93dcf: Rebuilt from the official Youth Ministry GIS

  - 2,334 youth establishments (was 2,076), spanning 58 wilayas — now sourced from the MJS SIG (sig.mjs.gov.dz), the same system behind the sports dataset
  - Names are now French (`name`); the Arabic name is backfilled into a new `name_ar` field by type-checked nearest-neighbour geo-match (~59% of records)
  - New fields: `name_ar`, `address`, `capacity`, `year`, `operational`, `pmr` (PMR accessibility), `surface_built_m2`, `surface_land_m2`
  - New stable type codes for the nine youth-establishment types (`MJ`, `CSP`, `SPA`, `AJ`, `CJ`, `CLS`, `FJ`, `CC`, `BA`); `id` is now a stable sequential integer
  - BREAKING: `name` and the commune/daira/wilaya_name fields are now French, not Arabic; type codes and ids changed. Join `wilaya_code` against `geoalgeria` for French divisions, or read `name_ar` for the Arabic name where available
  - Source: Ministère de la Jeunesse et des Sports — SIG (sig.mjs.gov.dz)

## 1.0.0

### Added

- 2,076 youth & sports institutions sourced from the Ministère de la Jeunesse
  (youthconnect.mjeunesse.gov.dz) — official Arabic names, institution type,
  commune / daïra / wilaya, and GPS coordinates
- Nine institution types: maisons de jeunes, complexes sportifs de proximité,
  salles polyvalentes, auberges de jeunes, centres culturels, camps de jeunes,
  centres de loisirs scientifiques, clubs de jeunes, and piscines de proximité
- Wilaya linkage (`wilaya_code`) joining the geoalgeria wilaya model
- Export formats: JSON, CSV, GeoJSON
- npm package with typed helper accessors (`institutions()`, `institutionById()`,
  `institutionsByWilaya()`, `institutionsByType()`, `metadata()`)
