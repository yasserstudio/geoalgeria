---
"geoalgeria": minor
---

Add `wilaya_code_58` and `wilaya_code_48` to all 1,541 communes. They give the wilaya each commune was in on the 58-wilaya map (Law 19-12 to Law 26-06) and on the 48-wilaya map (Law 84-09 as it stood on the eve of Law 19-12, with Ordonnance 97-14's 24 communes moved into Alger in 1997). Statistics published on an older map now join the current records directly. A commune of wilayas 1 to 48 that no reform moved keeps its code on all three maps. The fields appear in `communes_w*.json`, `algeria.json`, `geojson/communes.geojson`, the commune outlines, `csv/communes.csv` and the `communes` table of `sql/full.sql`. In the CSV and SQL they are two trailing columns, so every existing column keeps its position. `ecommerce/` does not carry them.

Also add `data/wilaya-lineage.json`, read by `require("geoalgeria").wilayaLineage`. It has one row per current wilaya, giving its two earlier codes and the article of each text that sets them: Law 84-09, Ordonnance 97-14, Law 19-12, décret 21-117, Law 26-06 and décret 26-206. It also lists the 1997 transfers to Alger and one recorded exception. Law 19-12 lists El Borma (3021) under Touggourt (55), but the ONS code keeps it in Ouargla (30), and the dataset keeps it in 30 on every map. The TypeScript types cover the new fields and the `WilayaLineage` shape.
