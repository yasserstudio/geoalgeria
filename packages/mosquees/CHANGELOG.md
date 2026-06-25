# @geoalgeria/mosquees

## 1.0.0

Algeria's mosques — 20,759 geocoded, a Wikidata + OpenStreetMap composite with Arabic & French names, typed and ready to map.

### Added

- 20,759 mosques across all 69 wilayas, compiled from Wikidata (CC0) and
  OpenStreetMap (ODbL) — near-complete national coverage against the ~18,449
  counted by the Ministère des Affaires Religieuses (MARW)
- Provenance on every record (`source`: wikidata / wikidata+osm / osm) with
  `wikidata` QID and `osm_id` cross-links: 13,200 Wikidata-only, 5,897 matched
  in both, 1,662 OpenStreetMap-only additions
- Bilingual naming — 15,138 Arabic names, 7,874 French names — plus denomination
  where known (sunni / ibadi / sufi)
- Commune/wilaya linkage (`wilaya_code`, `commune_code`, `commune`) attached by
  nearest-centroid join against the geoalgeria commune model — wilaya exact,
  commune best-effort
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
