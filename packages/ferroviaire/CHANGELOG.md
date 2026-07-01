# @geoalgeria/ferroviaire

## 1.0.0

Algeria's rail & urban transit — 692 stations & stops, a Wikidata + OpenStreetMap
composite with operators, lines, and Arabic & French names, typed and ready to map.

### Added

- 692 transit nodes across 50 wilayas: 427 rail + 190 tram + 41 metro + 24 aerial
  tramway + 10 gondola — compiled from Wikidata (CC0) and OpenStreetMap (ODbL)
- Provenance on every record (`source`: wikidata / wikidata+osm / osm) with
  `wikidata` QID and `osm_id` cross-links (127 Wikidata-only, 508 matched in both,
  57 OpenStreetMap-only additions; OSM matched within 150 m)
- Operator stamped by mode — **SNTF** (rail), **SETRAM** (tram, with per-city
  `network`), **SEMA** (Métro d'Alger) — plus `line` membership where known
- Bilingual naming (560 Arabic, 669 French names)
- `wilaya_code`/`commune`/`commune_code` by nearest-centroid join against the
  geoalgeria commune model
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
- Note: bus stations are out of scope — see `@geoalgeria/gares-routieres`. Metro
  node count exceeds SEMA's 19 operational stations (Wikidata includes entrances /
  extensions); SETRAM operates 172 tram stations across 7 networks.
