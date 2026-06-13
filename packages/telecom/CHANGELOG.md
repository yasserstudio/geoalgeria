# Changelog

## 1.0.0

### Added

- Algeria mobile-network coverage — 1,505 5G cell-site locations across 18 wilayas, from the operators' own coverage maps.
- Djezzy (1,001 sites) and Mobilis (504 sites): coordinates, wilaya linkage, and commune (FR/AR for Mobilis), in JSON, CSV, and GeoJSON.
- Deterministic `id` (`{operator}-{coordinate-hash}`), stable across re-fetches; `wilaya_code` links to the GeoAlgeria divisions.
- Coverage is namespaced by technology (`coverage/5g/`) so future generations are additive.
- Bundled TypeScript types. JS API: `coverage()`, `coverageByOperator()`, `technologies()`, `metadata()`.
- Sources: Djezzy (djezzy5g.dz) and Mobilis (mobilis.dz/map/5g). Ooredoo is not yet included (its map gates data behind an authenticated API).
