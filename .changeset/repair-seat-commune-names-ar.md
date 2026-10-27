---
"geoalgeria": patch
---

Repair the Arabic name of two wilaya seat communes, which disagreed with their own wilaya.

Commune 3401 Bordj Bou Arreridj carried `برج بوعريرج` while wilaya 34, the same place in `data/wilayas.json`, carries `برج بوعريريج`; commune 3301 Illizi carried `إيليزي` while wilaya 33 carries `إليزي`. `wilayas.json` is the decree-sourced table every package joins wilaya names on, so the seat commune is what moves. Applied through `scripts/lib/commune-name-ar-repairs.mjs` to all ten carriers, 2 values each, no other field and no count touched.

Found by `@geoalgeria/telecom`, which now publishes the registry's Arabic commune name for every 5G record that resolves to a canonical commune: 22 records were publishing `برج بوعريرج` and 3 `إيليزي`.

Worth recording because it cuts the other way: the ONS Code Geographique National 2021 capture this repository holds carries the unrepaired spelling for both (`برج بوعريرج`, and `ايليزى` for Illizi). These two repairs are therefore a deliberate correction of that table's orthography on the authority of `wilayas.json`, not a transcription fix. What is not defensible is the two sides of the repository naming the same place differently, which is what this closes; reversing the direction means repairing `wilayas.json` instead.

Other packages still carry the unrepaired spelling in their own records and will pick the repair up when they are next rebuilt, which this release does not do: `banques`, `culture`, `formation-professionnelle`, `mosquees`, `poste`, `protection-civile` and `sante`.
