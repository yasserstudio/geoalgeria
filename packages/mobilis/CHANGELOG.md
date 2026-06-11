# Changelog

## 1.0.0

### Added

- The Mobilis sales network — 165 geocoded agencies + 12,180 approved points of sale across Algeria.
- 165 commercial agencies (*Agence Mobilis*): bilingual FR/AR name and address, with coordinates, in JSON, CSV, and GeoJSON.
- 12,180 approved points of sale (*points de vente agréés*): FR name, address, and commune, in JSON and CSV (the source carries no coordinates).
- Stable synthesized `id` (`{wilaya_code}-{seq}`); the Mobilis source id is kept as `code`; `wilaya_code` links to the GeoAlgeria divisions.
- JS API: `agences()`, `pdv()`, `all()`, `metadata()`.
- Source: Mobilis — ATM Mobilis (mobilis.dz/mapagence).
