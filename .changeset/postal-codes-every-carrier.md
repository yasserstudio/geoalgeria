---
"geoalgeria": patch
---

Commune postal codes now match in every format. The CSV, GeoJSON and SQL exports, and the three e-commerce files, had kept the codes they shipped before the 2026-08-07 repair of the main tables, so 187 communes read a different postal code depending on which file you installed. All eight carriers now say what `data/algeria.json` says.

135 communes that carried no code at all now have one. Algérie Poste's capture links its offices to the current 69 wilayas since September, which resolves the communes of the reform wilayas 59 to 69 that the earlier run could not match. Larbaa (Batna) is the one commune left with no citable code.
