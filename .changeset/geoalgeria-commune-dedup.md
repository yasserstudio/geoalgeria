---
"geoalgeria": patch
---

Fix commune data integrity and strict-`nodenext` TypeScript resolution.

- Data: removed 13 duplicate commune records that were each listed under two wilayas — a commune's real entry plus a copy mislabeled under an unrelated wilaya (e.g. Oran's "Aïn El Türk" also appearing under Bouira) — along with the 9 phantom dairas they created. Communes 1,541 → 1,528, dairas 564 → 555. Eight further `code_commune` collisions involving genuinely distinct communes remain and are flagged for an authoritative ONS-sourced reconciliation.
- Types: `types/index.d.ts` now compiles under strict `nodenext`. The public types live in a `declare namespace algeriaGeodata` that merges with the value, resolving the `export =` / TS2309 conflict; reach them as `geo.Wilaya` (e.g. `import geo = require("geoalgeria")`).
- Packaging: the `.` `exports` entry is now types-first.
