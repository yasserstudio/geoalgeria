---
"geoalgeria": minor
---

Every wilaya now carries its capital (chef-lieu) as a commune code.

**New field.** `capital_commune_code` is the `code_commune` of the wilaya's capital, so it joins the commune record: the capital's names, postal code and coordinates are read from there instead of being duplicated on the wilaya. It is required on all 69 wilayas and is present in all five carriers, `data/algeria.json`, `data/wilayas.json`, `data/wilayas.csv`, `data/csv/wilayas.csv` and `data/sql/full.sql` (a new `capital_commune_code INTEGER` column on the `wilayas` table). TypeScript gains it on `Wilaya` and `WilayaDetailed`.

```js
const dz = require("geoalgeria");
const alger = dz.getWilaya(16);
dz.communes.find((c) => c.code_commune === alger.capital_commune_code);
// → { name_fr: "Alger Centre", name_ar: "الجزائر الوسطى", postal_code: "16000", … }
```

**Sourced, never derived from the name.** The values come from the decrees that fix the names and chefs-lieux of the wilayas: décret n° 84-79 of 3 April 1984 (*JO* n° 14, pp. 295-296) for wilayas 1 to 48, décret présidentiel n° 21-117 of 22 March 2021 (*JO* n° 22, pp. 7-8) for 49 to 58, and décret présidentiel n° 26-206 of 25 May 2026 (*JO* n° 40 of 3 June 2026, p. 5) for 59 to 69. Deriving a capital from the wilaya's own name resolves 65 of 69 and gets 4 wrong: wilaya 16 has no commune called "Alger" (its capital is `1601`, Alger Centre), and wilayas 53, 54 and 57 spell their capital commune `Ain Salah`, `Ain Guezzam` and `El-M'ghaier`. A commune promoted into wilayas 59 to 69 keeps its 2021 mother-wilaya ONS prefix, so a capital code need not start with its wilaya code: wilaya 59 (Aflou) reads `319`.

**Every wilaya point is now its capital commune's centre.** That is the other half of this field and it ships as its own changeset, `wilaya-capital-points`: `latitude`/`longitude` on a wilaya is read from the commune `capital_commune_code` names, so 66 of the 69 points move, wilaya 16's by 5.5 km and wilaya 52's by 8.8 km.

**Provenance per wilaya** is a new file, `data/wilaya-capitals.metadata.json`: one row per wilaya with the capital commune, the chef-lieu spelling the decree prints, the source key, and the article, item and page it is on, plus the three decrees and the OpenStreetMap cross-check they were checked against. It records the wilaya 16 disagreement above and how it was resolved.

The dataset validator now requires the field, checks that every capital is a commune of that same wilaya and that no two wilayas share one. `test/wilaya-capital-commune.test.mjs` adds the same checks across the five carriers, asserts that every wilaya point equals its capital commune's centre and sits inside that commune's own OpenStreetMap outline, with no exemptions, and asserts that the sidecar and the data agree. The meaning is written down in the JSDoc, the field table in `data/README.md`, the three package READMEs and a **Capital** entry in the repository's `CONTEXT.md` glossary.

Refs yasserstudio/geoalgeria.com#228.
