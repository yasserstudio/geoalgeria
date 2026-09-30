---
"geoalgeria": minor
---

`created` now reads 2026 for wilayas 59 to 69, the year they became official.

**Migration.** `created` is the year a wilaya became official, that is the year the law creating it took effect. The 11 wilayas of Law n° 26-06 (*Journal Officiel* n° 25 of 5 April 2026) shipped as `"2025"`, the year the reform was **announced** (2025-11-16), while every README, the JO citation and the app's own pages said April 2026. They now read `"2026"`. A consumer that compares the field to a literal must update it: `w.created === "2025"` becomes `w.created === "2026"`, and a numeric read of `wilayas.json` moves from `2025` to `2026`. The TypeScript union is now `"original" | "2019" | "2026"`, so the old literal stops type-checking instead of silently missing the 11 newest wilayas. Wilayas 1 to 48 (`"original"`, `1984` in `wilayas.json`) and 49 to 58 (`"2019"`) are unchanged: Law 19-12 took effect in 2019, so that cohort already followed this meaning.

All five carriers move together: `data/algeria.json`, `data/wilayas.json`, `data/wilayas.csv`, `data/csv/wilayas.csv` and `data/sql/full.sql`. `wilayas.json` also corrects `metadata.reforms[].year` for that reform from 2025 to 2026, so a reform's year again matches the `created` of the wilayas it added; its `announced: "2025-11-16"` keeps the 2025 fact where it belongs.

**The meaning is now written down**, because the value is only correct relative to it: the JSDoc on `Wilaya.created`, `WilayaDetailed.created` and `Reform.year`, the field table in `data/README.md`, and a **Creation year** entry in the repository's `CONTEXT.md` glossary. `llms.txt` and `dataset-metadata.json` stop calling it the "2025 territorial reform", which is where that drift came from, and the validator's accepted set replaces 2025 with 2026. A new guard, `test/wilaya-created-year.test.mjs`, pins the cohort by code range in all five carriers, asserts that no carrier still holds a 2025, and asserts that the documented meaning is present in the types, the schema doc and the glossary.

Refs yasserstudio/geoalgeria.com#198.
