---
"geoalgeria": minor
---

Commune postal codes now match in every format, and 135 communes gain one.

The CSV, GeoJSON and SQL exports, and the three e-commerce files, had kept the codes they shipped before the 2026-08-07 repair of the main tables, so 187 communes read a different postal code depending on which file you installed. All eight carriers now say what `data/algeria.json` says, and a test fails on any disagreement.

135 communes that carried no code at all now have one, and nothing that already had a code changed. Algérie Poste's capture was reconciled with the current 69 wilayas after that repair, which is what lets those communes' offices be found: 108 of the 135 are communes of the reform wilayas 59 to 69, and 27 are not. Larbaa (Batna) is the one commune left with no citable code, so postal coverage is 1,540 of 1,541.

A postal code is the code of the commune's principal Algérie Poste office, so its two-digit prefix is that office's wilaya at the time the code was issued and does not necessarily equal `wilaya_code`: Aflou is `03001` in wilaya 59. That holds for 108 of the 1,540 coded communes, all of them in wilayas 59 to 69. It is now documented in `types/index.d.ts` and the READMEs, beside the same caveat on `code_commune`, so a consumer does not validate a code against the wrong wilaya.
