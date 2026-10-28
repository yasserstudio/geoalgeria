---
"geoalgeria": patch
---

Repair the Arabic name of two wilaya seat communes, which disagreed with their own wilaya.

Commune 3401 Bordj Bou Arreridj carried `برج بوعريرج` while wilaya 34, the same place in `data/wilayas.json`, carries `برج بوعريريج`; commune 3301 Illizi carried `إيليزي` while wilaya 33 carries `إليزي`. `wilayas.json` is the decree-sourced table every package joins wilaya names on, so the seat commune is what moves. Applied through `scripts/lib/commune-name-ar-repairs.mjs` to all eleven carriers, 2 values each, no other field and no count touched. The eleventh is `data/wilaya-capitals.metadata.json`, which quotes its Capital commune's Arabic name beside the decree that fixed it and was absent from the carrier list, so the repair had not reached it; `test/commune-name-ar-discovery.test.mjs` now walks `packages/dataset/data` and joins every commune Arabic name it finds back to the registry, so the next unlisted carrier is found rather than reviewed for.

Found by `@geoalgeria/telecom`, which now publishes the registry's Arabic commune name for every 5G record that resolves to a canonical commune: 22 records were publishing `برج بوعريرج` and 3 `إيليزي`.

Worth recording because it cuts the other way: the ONS Code Geographique National 2021 capture this repository holds carries the unrepaired spelling for both (`برج بوعريرج`, and `ايليزى` for Illizi). These two repairs are therefore a deliberate correction of that table's orthography on the authority of `wilayas.json`, not a transcription fix. What is not defensible is the two sides of the repository naming the same place differently, which is what this closes; reversing the direction means repairing `wilayas.json` instead.

Seven other packages carry one of the two spellings, and none of them is a copy of this table, so a rebuild would not change any of them. In `banques`, `culture`, `mosquees`, `protection-civile` and `sante` it sits inside a facility's own `name`, `name_ar` or address, and in `formation-professionnelle` inside the source's own commune label on four rows that resolve to no commune code: all six take those strings from their own source, and this repair does not reach them. `poste` is the only one of the seven with a `commune_ar` field, and it already publishes both repaired spellings.
