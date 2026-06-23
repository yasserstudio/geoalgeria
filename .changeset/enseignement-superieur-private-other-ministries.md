---
"@geoalgeria/enseignement-superieur": minor
---

Expand to the full higher-education registry — 179 institutions (was 110).

- Add the 19 licensed **private** institutions and the 50 establishments under **other ministries** (Défense, Santé, Culture, Poste, Travail) that MESRS supervises pedagogically — sourced from the ministry's Arabic listing, which the English page omits.
- New fields: `name_ar` (Arabic name — present for every new institution and backfilled for ~88% of the public network via website join), `sector` (`"public"` | `"private"`), `supervisory_ministry` (the supervising ministry for non-MESRS institutions, else `null`).
- New helper `institutionsBySector("public" | "private")`.
- `name` is now nullable: the private/other-ministry institutions are published in Arabic only, so they carry `name_ar` with `name: null`.

Additive and backward-compatible: existing fields and records are unchanged; the new institutions are placed at their wilaya centroid (`geo_precision: "wilaya"`), as the source publishes no address for them. Note for TypeScript consumers: `name` is now `string | null`, so code reading `.name` on the new records should null-check (use `name ?? name_ar`).
