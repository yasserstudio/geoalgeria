# Changelog

## 1.0.2

### Patch Changes

- 0ddf916: Docs: value-led READMEs, official source citation for the 69-wilaya reform (Law n° 26-06, Journal Officiel n° 25 of 5 April 2026), and fixed post-restructure links/badges. No data changes.

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versioning rules for datasets:

- **MAJOR**: breaking schema changes (renamed fields, removed fields)
- **MINOR**: new data added (new offices/ATMs, new fields, new formats)
- **PATCH**: corrections to existing data (typos, wrong coordinates, postal codes)

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
