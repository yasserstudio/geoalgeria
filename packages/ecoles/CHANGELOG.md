# @geoalgeria/ecoles

## 1.0.0

Algeria's schools — 11,830 geocoded from OpenStreetMap, classified by cycle, bilingual, typed and ready to map.

### Added

- 11,830 schools and kindergartens across all 69 wilayas, extracted from
  OpenStreetMap (ODbL) — the largest openly-geocoded school layer for Algeria,
  framed honestly against the ~28,000 establishments of the national network
  (primaire + moyen + secondaire)
- Cycle classification on every record (`cycle`: primaire / moyen / secondaire /
  prescolaire / autre) inferred from `isced:level` and the French/Arabic name —
  4,020 primaire, 2,377 moyen (CEM), 1,574 secondaire (lycée), 268 préscolaire;
  93% of named schools resolve to a specific cycle, with FR/AR labels
- Establishment `kind` (regular / langues / coranique / conduite / formation /
  special) with FR/AR labels — orthogonal to cycle, so the special-purpose places
  OSM files under `amenity=school` (language institutes, Quranic & driving
  schools, training centres, special-needs schools) are a filterable category
  instead of being buried in `autre`: 11,640 regular + 190 special-purpose
- `isced_levels` (OSM `isced:level` normalized to a sorted list, e.g. `"1;2"`) on
  2,037 records, and a single-line `address` from OSM `addr:*` tags on 2,625
- Bilingual naming (`name`, `name_ar`, `name_fr`) — 8,640 named, strictly
  script-routed — and a `sector` flag (`public` / `private`) where the map signals it
- Commune/wilaya linkage (`wilaya`, `wilaya_ar`, `wilaya_code`, `commune`,
  `commune_code`) attached by nearest-centroid join against the geoalgeria
  commune model — wilaya exact, commune best-effort
- Per-record provenance (`source: osm`, `osm_id`) and `geo_precision`
  (`osm_node` / `osm_centroid`)
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
