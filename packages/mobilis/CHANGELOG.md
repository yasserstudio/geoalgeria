# Changelog

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
