# @geoalgeria/ooredoo

## 1.0.0

Ooredoo Algérie's retail network — 572 stores from the operator's locator API, geocoded, typed, wilaya/commune-linked. Completes the telecom retail trio.

### Added

- 572 Ooredoo stores across 63 wilayas — 436 Espaces Services (ESO), 100 Espaces
  Ooredoo (EO) and 36 City Shops (CSO) — from the operator's public *Trouvez-nous*
  locator API, each with real coordinates (`geo_precision: "exact"`).
- Bilingual FR/AR type labels, wilaya/commune linkage by nearest-centroid join
  against the geoalgeria base dataset (reconciling the API's legacy 48-wilaya
  scheme to the current 69-wilaya scheme; the operator's declared wilaya is kept
  as `operator_wilaya`), and stable `{wilaya}-{seq}` ids.
- Completes the telecom retail trio with `@geoalgeria/mobilis` and `@geoalgeria/djezzy`.
- JSON, CSV, GeoJSON, TypeScript types, and a `npm run fetch` rebuild script
  (`--cache` for reproducible offline rebuilds).
