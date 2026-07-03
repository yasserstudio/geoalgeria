# @geoalgeria/ecoles

## 1.0.0

Algeria's schools — 11,833 geocoded from OpenStreetMap, classified by cycle, bilingual, typed and ready to map.

### Added

- 11,833 schools and kindergartens across all 69 wilayas, extracted from
  OpenStreetMap (ODbL) — the largest openly-geocoded school layer for Algeria,
  framed honestly against the ~28,000 establishments of the national network
  (primaire + moyen + secondaire)
- Cycle classification on every record (`cycle`: primaire / moyen / secondaire /
  prescolaire / autre) inferred from `isced:level` and the French/Arabic name —
  3,969 primaire, 2,378 moyen (CEM), 1,575 secondaire (lycée), 283 préscolaire;
  92% of named schools resolve to a specific cycle, with FR/AR labels
- Bilingual naming (`name`, `name_ar`, `name_fr`) — 8,643 named — and a `sector`
  flag (`public` / `private`) where the map carries an explicit signal
- Commune/wilaya linkage (`wilaya`, `wilaya_ar`, `wilaya_code`, `commune`,
  `commune_code`) attached by nearest-centroid join against the geoalgeria
  commune model — wilaya exact, commune best-effort
- Per-record provenance (`source: osm`, `osm_id`) and `geo_precision`
  (`osm_node` / `osm_centroid`)
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
