# Changelog

## 1.1.0

Algeria's higher-education network — 177 from the MESRS, now with private & other-ministry institutions.

### Added

- 19 licensed private institutions and 48 establishments under other ministries
  (Santé 25, Défense 16, Culture 4, Poste 2, Travail 1) that MESRS supervises
  pedagogically — sourced from the ministry's Arabic listing, which the English
  page omits (110 → 177 institutions)
- New fields: `name_ar` (Arabic name; also backfilled for the public network via
  website join — 164/177 records), `sector` (`public` / `private`), and
  `supervisory_ministry`
- New helper `institutionsBySector("public" | "private")`

### Improved

- `name` is now nullable, so the Arabic-only private/other-ministry institutions
  ship with `name_ar` (use `name ?? name_ar` for a display label)

## 1.0.0

### Added

- Algeria's higher-education network — 110 institutions from the Ministry of Higher Education (MESRS), with official websites, type, wilaya/commune
  linkage and coordinates
- Four institution types: 58 universities, 35 grandes écoles, 12 écoles normales
  supérieures, and 5 centres universitaires, across 51 wilayas
- Every institution carries its official `.dz` website, as listed by the ministry
- Wilaya and commune reconciled to the geoalgeria flagship (69-wilaya scheme);
  coordinates are OpenStreetMap-derived and labelled per record with
  `geo_precision` (`campus` / `commune` / `wilaya`)
- Export formats: JSON, CSV, GeoJSON
- npm package with typed helper accessors (`institutions()`, `institutionById()`,
  `institutionsByWilaya()`, `institutionsByType()`, `metadata()`)
