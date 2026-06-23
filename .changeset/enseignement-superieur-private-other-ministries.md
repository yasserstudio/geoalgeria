---
"@geoalgeria/enseignement-superieur": minor
---

Add private and other-ministry institutions

- 177 higher-education institutions (was 110): +19 licensed private and +48 establishments under other ministries (Santé 25, Défense 16, Culture 4, Poste 2, Travail 1) that MESRS supervises pedagogically — sourced from the ministry's Arabic listing, which the English page omits
- New fields: `name_ar` (Arabic name — present for every new institution and backfilled for the public network via website join, 164/177 records), `sector` (`"public"` | `"private"`), `supervisory_ministry` (the supervising ministry for non-MESRS institutions, else `null`)
- New helper `institutionsBySector("public" | "private")`; `name` is now nullable (the private/other-ministry institutions are published in Arabic only, so they carry `name_ar` with `name: null`)
- Additive and backward-compatible: existing records unchanged; new institutions placed at their wilaya centroid (`geo_precision: "wilaya"`). TypeScript consumers reading `.name` on the new records should null-check (`name ?? name_ar`)
- Source: MESRS Arabic listing (mesrs.dz/reseau-universitaire-ar)
