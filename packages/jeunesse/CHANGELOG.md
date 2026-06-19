# Changelog

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
