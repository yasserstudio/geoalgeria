# Changelog

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
