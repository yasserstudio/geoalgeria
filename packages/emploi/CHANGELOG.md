# Changelog

## 1.0.0

### Added

- 58 AWEM (wilaya employment agencies) and 273 ALEM (local employment agencies)
  sourced from ANEM (anem.dz) — address, phone, fax, email, manager, communes
  served, and coordinates
- Stable synthesized `id` (`{wilaya_code}-{seq}`) and `wilaya_code` linkage to
  the GeoAlgeria divisions
- Export formats: JSON, CSV, GeoJSON
- npm package with helper accessors (`awem`, `alem`, `agencies`, `metadata`)
