# Changelog

## 1.1.1

### Patch Changes

- Docs: value-led READMEs, official source citation for the 69-wilaya reform (Law n° 26-06, Journal Officiel n° 25 of 5 April 2026), and fixed post-restructure links/badges. No data changes.

## [1.1.0] - 2026-06-08

### Changed

- Replaced synthetic commune postal codes with **real Algérie Poste codes** for
  ~1,440 communes (sourced from baridimap.poste.dz). Previously only ~88 matched
  reality; every commune now maps to a real Algérie Poste office code.
- Normalized wilaya 65 to **"Aïn Oussera"** (wilaya, daira, and commune) to match
  Algérie Poste and common usage.

### Added

- `data/poste/` — **3,908 post offices** and **2,026 ATMs** (real postal codes,
  bilingual names, coordinates, commune/wilaya linkage) from Algérie Poste, in
  JSON, CSV, and GeoJSON.
- `postOffices`, `atms`, and `getPostOfficesByCommune()` JS API, with `PostOffice`
  and `Atm` TypeScript types.

## [1.0.0] - 2025-05-05

### Added

- 69 wilayas (original 48 + 2019 reform wilayas 49–58 + 2025 reform wilayas 59–69)
- 1,541 communes with bilingual names (FR/AR), postal codes, daira assignments
- 1,541 commune coordinates (98.7% coverage)
- 564 dairas as first-class entities
- Multiple export formats: JSON, CSV, GeoJSON, SQL
- E-commerce optimized flat dataset
- TypeScript type definitions
- npm package with helper functions
- Validation script + GitHub Actions CI
- Contributing guide with issue/PR templates
