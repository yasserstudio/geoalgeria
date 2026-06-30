# @geoalgeria/agriculture

## 1.0.0

Algeria's agriculture-sector institutions — 196 from the Ministry of Agriculture, across 7 networks, bilingual, typed and geocoded.

### Added

- 196 agriculture-sector institutions from the Ministry of Agriculture, Rural
  Development and Fisheries (MADR) institutional directory, across 7 networks:
  58 agricultural-services directorates (DSA), 48 forest conservations, 16
  technical & research institutes (INRAA, INRF, ITGC, ITDAS…), 11 training
  centres (ITMAS/CFATSF/CFVA), 49 chambers of agriculture (+ the national
  chamber), 4 public offices (OAIC, ONIL, ONILEV, ONTA) and 10 public groups
  (GVAPRO, AGROLOG, GIPLAIT…)
- Bilingual `type` with French and Arabic labels, Latin `abbreviation` for the
  named institutes/offices/groups, and `sector` (`public` for the whole MADR
  directory)
- Wilaya/commune linkage (`wilaya`, `wilaya_ar`, `wilaya_code`, `commune`,
  `commune_code`) — wilaya from the directory (normalized to official codes),
  commune by matching the address to the geoalgeria commune set (best-effort)
- Coordinates on all 196 records, with per-record `geo_precision`: 89 from the
  matched commune centroid, 107 from the wilaya chief-town centroid (the MADR
  directory carries no coordinates)
- Contact fields (`address`, `phone`, `fax`) and per-record provenance
  (`source`, `wikidata`, `osm_id`) with stable `{wilaya_code}-{type}-{seq}` ids
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors

### Notes

- DSA covers all 58 wilayas; forest conservations (48) and chambers of
  agriculture (49) use the pre-2019 48-wilaya administrative division, so the
  southern wilayas fold into their parents there
- Coordinates are best-effort (commune/wilaya centroid). Upgrading the named
  institutes to precise OpenStreetMap/Wikidata points is planned
