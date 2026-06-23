# Changelog

## 1.1.0

### Minor Changes

- 8ddc502: Add private and other-ministry institutions

  - 177 higher-education institutions (was 110): +19 licensed private and +48 establishments under other ministries (Santé 25, Défense 16, Culture 4, Poste 2, Travail 1) that MESRS supervises pedagogically — sourced from the ministry's Arabic listing, which the English page omits
  - New fields: `name_ar` (Arabic name — present for every new institution and backfilled for the public network via website join, 164/177 records), `sector` (`"public"` | `"private"`), `supervisory_ministry` (the supervising ministry for non-MESRS institutions, else `null`)
  - New helper `institutionsBySector("public" | "private")`; `name` is now nullable (the private/other-ministry institutions are published in Arabic only, so they carry `name_ar` with `name: null`)
  - Additive and backward-compatible: existing records unchanged; new institutions placed at their wilaya centroid (`geo_precision: "wilaya"`). TypeScript consumers reading `.name` on the new records should null-check (`name ?? name_ar`)
  - Source: MESRS Arabic listing (mesrs.dz/reseau-universitaire-ar)

## 1.0.0

### Added

- Algeria's higher-education network — 110 institutions from the Ministère de
  l'Enseignement Supérieur (MESRS), with official websites, type, wilaya/commune
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
