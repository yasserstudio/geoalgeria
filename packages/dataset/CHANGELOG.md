# Changelog

## 1.1.2

### Patch Changes

- c511d83: Fix commune data integrity and strict-`nodenext` TypeScript resolution.

  - Data: removed 13 duplicate commune records that were each listed under two wilayas — a commune's real entry plus a copy mislabeled under an unrelated wilaya (e.g. Oran's "Aïn El Türk" also appearing under Bouira) — along with the 9 phantom dairas they created. Communes 1,541 → 1,528, dairas 564 → 555. Eight further `code_commune` collisions involving genuinely distinct communes remain and are flagged for an authoritative ONS-sourced reconciliation.
  - Types: `types/index.d.ts` now compiles under strict `nodenext`. The public types live in a `declare namespace algeriaGeodata` that merges with the value, resolving the `export =` / TS2309 conflict; reach them as `geo.Wilaya` (e.g. `import geo = require("geoalgeria")`).
  - Packaging: the `.` `exports` entry is now types-first.

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
