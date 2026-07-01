# @geoalgeria/gares-routieres

## 1.0.0

Algeria's intercity bus stations — 74 SOGRAL gares routières, geocoded and typed.

### Added

- 74 intercity bus stations across 51 wilayas from **SOGRAL** (EPE SOGRAL Spa),
  the state operator of Algeria's gares routières, via its live registry
  (`live.sogral.com/api/live/agencies`)
- Official name, gare name, postal address, coordinates (74/74 geocoded),
  and total/built surface areas per station
- `wilaya_code`/`commune`/`commune_code` attached by nearest-centroid join
  against the geoalgeria commune model — which also reconciles SOGRAL's legacy
  48-wilaya codes to the 58/69 model (e.g. Touggourt, Djanet)
- 3 broken upstream coordinates fixed: Touggourt & Djanet from OpenStreetMap,
  Guelma from its commune centroid (`geo_precision: "approx"`)
- `sogral_id` + `sogral_code` cross-links kept for provenance
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
