# Changelog

## 1.0.1

### Patch Changes

- Metadata: complete the package description and keywords to name the Anderson, Noest and Maystro networks alongside Yalidine and Guepex (data unchanged).

## 1.0.0

### Added

- Algeria's COD / e-commerce delivery layer, as installable data: a 16-carrier registry,
  411 geocoded stop-desks across 61 wilayas, and per-carrier coverage, in JSON, CSV and GeoJSON
- Carrier registry — 16 Algerian COD / e-commerce delivery companies, each with
  website, service model (stop-desk / home / both), cash-on-delivery support, scope,
  how openly it publishes agency data, and public-API availability
- 411 geocoded stop-desk points across 61 wilayas, from the carriers that publish open
  agency data: the **Yalidine + Guepex** federated relay (merged and de-duplicated by
  shared stop-desk id; operators Yalidine, Guepex, EasyAndSpeed, WeCanServices, SpeedMail,
  Zimou Express) plus three independent networks — **Anderson** (89), **Noest** (94) and
  **Maystro** (38) — geocoded from the Google Maps link on each agency card
- Per-carrier coverage — wilaya/commune stop-desk presence for the 9 carriers with open data
- Wilaya linkage (`wilaya_code`) resolved against the geoalgeria 69-wilaya model
  (Law n° 26-06, Journal Officiel n° 25 of 5 April 2026)
- Export formats: JSON, CSV, GeoJSON
- npm package with typed helper accessors (`carriers()`, `stopdesks()`, `coverage()`,
  `carrierById()`, `stopdesksByWilaya()`, `stopdesksByCarrier()`, `coverageByCarrier()`,
  `metadata()`)
