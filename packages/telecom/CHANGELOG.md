# Changelog

## 1.0.0

### Added

- Algeria mobile-network coverage — 1,681 5G coverage points across 56 wilayas, from the operators' own coverage maps.
- Djezzy (1,001) and Mobilis (504) at cell-site level; Ooredoo (176) at covered-commune level. Coordinates, wilaya/commune linkage, in JSON, CSV, and GeoJSON.
- Deterministic `id` (`{operator}-{coordinate-hash}`), stable across re-fetches; `wilaya_code` links to the GeoAlgeria divisions.
- Coverage is namespaced by technology (`coverage/5g/`) so future generations are additive.
- Bundled TypeScript types. JS API: `coverage()`, `coverageByOperator()`, `technologies()`, `metadata()`.
- Sources: Djezzy (djezzy5g.dz), Mobilis (mobilis.dz/map/5g), Ooredoo (ooredoo.dz).
