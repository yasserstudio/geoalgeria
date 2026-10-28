---
"@geoalgeria/cliniques": minor
---

**Migration.** `22-00028` (Maternité Benatou Mira, Sidi Bel Abbes) is retired and reserved in `data/retired-ids.json`. It was the second OpenStreetMap element of a place `@geoalgeria/sante` already publishes: `22-ehs-03`, the EHS gynécologie-obstétrique of Sidi Bel Abbes, carries it now (sante's `way/219028752`, 17 m from this package's `way/223396517`, both named Maternité Benatou Mira). The place moved to another package, so there is no `migrations` entry; follow it to `22-ehs-03` in `@geoalgeria/sante`. 1,917 care facilities become 1,916.

**Double mappings of a sante hospital are excluded.** An element within 40 m of an element sante ships for a hospital-tier record, whose name shares a Loose name key with it, is the same place mapped twice and is no longer published here (`sante_double_mapping`). A proximity facility (polyclinique, salle de soins, centre de santé) is never treated so, because a hospital-tier record is never one: a same-name match there means sante pinned its hospital onto the facility. That is the case of `16-00319` Polyclinique Douera, which stays published: sante's `16-chu-03` (CHU Douera) points at OpenStreetMap `node/4218102291`, a node named Polyclinique Douera 5 m from this record, while OpenStreetMap maps the hospital itself as `way/40072354` "Hopital Douira" about 120 m away. The build reports it as a sante geocode conflict, owed a sante fix.

Source: OpenStreetMap (ODbL 1.0), the committed 2026-10-25 capture `sources/cliniques/osm.json`; no element was re-pulled.
