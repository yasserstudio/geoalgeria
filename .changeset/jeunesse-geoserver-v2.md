---
"@geoalgeria/jeunesse": major
---

Rebuilt from the official Youth Ministry GIS

- 2,334 youth establishments (was 2,076), spanning 58 wilayas — now sourced from the MJS SIG (sig.mjs.gov.dz), the same system behind the sports dataset
- Names are now French (`name`); the Arabic name is backfilled into a new `name_ar` field by type-checked nearest-neighbour geo-match (~59% of records)
- New fields: `name_ar`, `address`, `capacity`, `year`, `operational`, `pmr` (PMR accessibility), `surface_built_m2`, `surface_land_m2`
- New stable type codes for the nine youth-establishment types (`MJ`, `CSP`, `SPA`, `AJ`, `CJ`, `CLS`, `FJ`, `CC`, `BA`); `id` is now a stable sequential integer
- BREAKING: `name` and the commune/daira/wilaya_name fields are now French, not Arabic; type codes and ids changed. Join `wilaya_code` against `geoalgeria` for French divisions, or read `name_ar` for the Arabic name where available
- Source: Ministère de la Jeunesse et des Sports — SIG (sig.mjs.gov.dz)
