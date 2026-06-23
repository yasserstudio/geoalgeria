# Changelog

## 2.0.0

Algeria's youth establishments — 2,334 from the official Ministère de la Jeunesse GIS, typed and geocoded.

### Added

- `name_ar` (Arabic name, backfilled from the legacy ministry map by type-checked
  nearest-neighbour geo-match, ~59% of records)
- New per-record fields: address, capacity, year of reception, operational status,
  PMR accessibility, and built / land area
- Sister package to `@geoalgeria/sports` — both from the same official Ministère de
  la Jeunesse et des Sports GIS (sig.mjs.gov.dz)

### Improved

- Rebuilt from the official Ministère de la Jeunesse et des Sports GIS — 2,334
  establishments (was 2,076), spanning 58 wilayas
- Primary names are now French, with stable type codes (`MJ`, `CSP`, `SPA`, `AJ`,
  `CJ`, `CLS`, `FJ`, `CC`, `BA`) and sequential integer ids

### Dropped

- Arabic as the primary `name` (now French — read `name_ar` for the Arabic name)
  and the legacy youthconnect source; old type codes and ids. Join `wilaya_code`
  against `geoalgeria` for French commune/wilaya names

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
