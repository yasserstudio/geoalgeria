# @geoalgeria/sante

## 1.0.0

Algeria's public health establishments — 695 from the Ministry of Health, bilingual, typed and mostly geocoded.

### Added

- 695 public health establishments across the 58 wilayas with health
  directorates, from the Ministry of Health (MoH) registry — 270 EPH
  (public hospitals), 292 EPSP (proximity health), 108 EHS (specialized),
  20 CHU (university hospitals) and 5 other hospitals
- Bilingual naming (563 records with both French and Arabic names), official
  `type` with French and Arabic labels, and `sector` (`public` for the whole
  MoH registry; private clinics will carry `private`)
- Commune/wilaya linkage (`wilaya`, `wilaya_ar`, `wilaya_code`, `commune`,
  `commune_code`) — wilaya from the MoH tag (exact), commune by matching the
  establishment locality to the geoalgeria commune set (best-effort)
- Coordinates on 600 of 695 records, with per-record `geo_precision`: 121 from
  an OpenStreetMap facility, 3 from Wikidata, 476 from the commune centroid;
  95 records whose locality did not resolve carry no coordinates
- Per-record provenance (`source`, `wikidata` QID, `osm_id`) and stable
  `{wilaya_code}-{type}-{seq}` ids
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
