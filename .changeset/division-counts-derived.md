---
"geoalgeria": patch
---

`data/wilayas.csv` said wilaya 33 has 3 dairas; it has 4. Every daira and commune count is now derived from the records instead of typed.

**The defect.** A count like `dairas_count` is a summary of rows that live somewhere else: `data/dairas.json` for dairas, the three commune splits for communes. Nothing derived them. They were typed into each carrier and patched by hand afterwards, so the carriers could disagree, and they did: `data/wilayas.csv` read `dairas_count` 3 for **wilaya 33 Illizi** while `data/wilayas.json` read 4. A consumer reading the CSV got a different Algeria from one reading the JSON, and across the releases that restated the daira lists the two files were out for as many as 20 wilayas at once.

**4 is right.** Illizi holds four daira records, Illizi, Debdeb, In Amenas and Bordj Omar Driss, one per commune, and the commune table names each of them. Decree n° 26-253 of 15 July 2026 leaves wilaya 33 under decree n° 91-306 of 24 August 1991 `(sans changement)`, so nothing in the 2026 reform reduced it; the 2019 reform moved only Djanet and Bordj El Haouas, which sit in wilaya 56 as its single Djanet daira. The four seats are corroborated independently of this dataset by the wilaya-33 daira rosters of `@geoalgeria/sports`, which names all four, and `@geoalgeria/jeunesse`. The CSV's 3 was the only figure that disagreed with any of them.

**One source of truth.** `scripts/sync-division-counts.mjs` counts the records and writes every count: the per-wilaya `dairas_count` and `communes_count` in `data/wilayas.json` and `data/wilayas.csv`, `metadata.total_dairas` and `metadata.total_communes`, and the `data/sql/full.sql` header. `--check` exits non-zero when a carrier drifts. `test/division-counts.test.mjs` counts the records itself, rather than importing that script, and fails when any carrier's per-wilaya count differs from them, when any stated total in the data or the docs differs, or when the script still has something to write.

**The one figure still held by hand**, because the records cannot produce it: the ten wilayas the 2026 reform took territory from state what they held *before* it in `communes_count`/`dairas_count` and what they hold *now* in `post_reform_communes`/`post_reform_dairas`. Only the second pair is derived. Which ten they are is itself derived from the cohort's own `mother_wilaya_code`, so a later reform cannot leave the rule behind.

No other carrier of the wilaya table states a daira count: `data/csv/wilayas.csv`, `data/geojson/wilayas.geojson`, `data/algeria.json`, the `wilayas` table of `data/sql/full.sql` and the `ecommerce/` and `delivery/` shapes carry none. The stated totals were already 551 everywhere and are unchanged.
