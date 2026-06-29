# Patrimoine — translation working set

Fills the bilingual gaps in the live pull (`../pull-2026-06-28.json`): the portal's
FR and AR catalogs are disjoint node sets, so 651 records were AR-only and 105 FR-only.

- `CONVENTIONS.md` — translation rules (exonyms, institutional templates, common nouns).
- `_bilingual-key.json` — the 194 pre-existing FR↔AR pairs, mined as a style key.
- `need_fr.json` (651) / `need_ar.json` (105) — the gap lists.
- `batch_*.json` — the gaps split for translation (prot1-3, lib1-2, small, arall).
- `out_*.json` — the translations, `{key, name_fr|name_ar}` (756 total).

Merged back by `key` (= `layer|nid_fr|nid_ar|lat,lng`) into the final dataset:
**`../patrimoine-bilingual-2026-06-28.json`** — 950 records, **100% bilingual**
(FR + AR + a display `name`, FR-preferred). Validated: 0 missing names, 0 unmatched keys.

Per-layer: protected 585 · library 259 · museum 48 · theatre 45 · moudjahid-museum 13.
