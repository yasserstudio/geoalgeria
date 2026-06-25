# @geoalgeria/djezzy

## 1.0.0

Algeria's Djezzy boutiques — 128 geocoded stores from djezzy.dz, typed and ready to map.

### Added

- 128 Djezzy (Optimum Telecom Algérie) boutiques across 63 wilayas, sourced from
  the Djezzy store locator (djezzy.dz/nos-boutiques)
- Per-boutique store code, category (A/B/C), address, opening hours, opening code,
  and GPS coordinates — every boutique geocoded
- Commune/wilaya linkage (`wilaya_code`, `commune_code`, `commune`) attached by
  nearest-centroid join against the geoalgeria commune model — wilaya exact,
  commune best-effort
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
