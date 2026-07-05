# @geoalgeria/industrie-pharmaceutique

## 1.0.0

Algeria's approved pharmaceutical manufacturers — 171 medicine and medical-device makers from the Ministry of Pharmaceutical Industry, bilingual, typed by nature and geocoded.

### Added

- 171 approved pharmaceutical manufacturers from the **Ministry of Pharmaceutical
  Industry (MIP)** fabrication register (`agrément de fabrication`, updated
  28/06/2026): 120 medicine makers (PP), 48 medical-device makers (DM) and 3 mixed
  producers, across 25 wilayas.
- Bilingual FR/AR nature labels, `role`/`nature` dimensions, wilaya/commune linkage
  against the geoalgeria base dataset, and coordinates at commune (126) or wilaya (45)
  centroid — `geo_precision`-labelled.
- Locations resolved from the MIP register's 2023 edition (which carried a wilaya
  column), place tokens in operator names, and a per-company research pass for makers
  absent from the 2023 edition — never guessed; makers with no locatable site are
  omitted rather than placed speculatively.
- JSON, CSV, GeoJSON and TypeScript types.
