# Changelog

## 1.0.0

### Added

- 33 civil airports sourced from ANAC (anac.dz) — official names, ICAO (OACI)
  codes, addresses, phone numbers, websites, and coordinates
- Wilaya linkage (`wilaya_code`) resolved against the geoalgeria 69-wilaya model
  (Law n° 26-06, Journal Officiel n° 25 of 5 April 2026)
- Export formats: JSON, CSV, GeoJSON
- npm package with typed helper accessors (`airports()`, `airportByIcao()`,
  `airportsByWilaya()`, `metadata()`)
