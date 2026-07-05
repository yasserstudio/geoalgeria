# @geoalgeria/pharmacies

## 1.0.0

Algeria's pharmacies — 3,790 officines from OpenStreetMap, geocoded, bilingual where named, wilaya/commune-linked.

### Added

- 3,790 pharmacies (`amenity=pharmacy`) across 67 wilayas from **OpenStreetMap**
  (ODbL), each geocoded, de-duplicated (same-name-within-40 m and coincident
  points), with FR/AR names routed by script where present.
- Contact tags where OSM has them: 2,459 named, 146 with phone, 255 with opening
  hours, 1,159 with address, 524 with a `dispensing` flag.
- Wilaya/commune linkage by nearest-centroid join against the geoalgeria base
  dataset (wilaya effectively exact, commune best-effort), stable `{wilaya}-{seq}`
  ids ordered by OSM id.
- Honest partial-coverage framing (~3.8k mapped vs an estimated ~11k officines
  nationally; no open official registry).
- JSON, CSV, GeoJSON, TypeScript types, and a `npm run fetch` rebuild script.
