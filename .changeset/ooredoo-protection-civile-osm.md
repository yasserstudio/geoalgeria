---
"@geoalgeria/ooredoo": patch
"@geoalgeria/protection-civile": patch
---

**ooredoo: one store now exact.** `46-006` (EO Aïn Témouchent) leaves the operator's two-decimal point for the Ooredoo shop OpenStreetMap maps on its own street, Boulevard du 1er Novembre (node 5347870919, 20 m away), `exact` / `osm_node`. Recorded in the new `quality/overrides/ooredoo.json`.

**protection-civile: two main units now exact.** `50-001` (Bordj Badji Mokhtar) and `51-001` (Ouled Djellal) each shared one DGPC point with their wilaya directorate (`50-003`, `51-003`). Each unit now ships its OpenStreetMap fire station (node 5647008622; way 307049829, on Rue de l'Indépendance, the unit's own address). The directorates keep the old point and stay `approximate` on purpose, since it was the unit's. Recorded in `quality/overrides/protection-civile.json`. Precision: 859 exact, 21 approximate.
