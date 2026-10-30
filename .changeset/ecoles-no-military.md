---
"@geoalgeria/ecoles": minor
---

Remove military establishments: 9 records leave the package, their ids retired.

**Migration.** Nine ids are retired and reserved forever in
`packages/ecoles/data/retired-ids.json`. They forward nowhere: the records are
removed, not merged, so a consumer holding one of these keys finds it gone by
design.

| Retired id | Record |
| --- | --- |
| `05-00282` | École des Cadets - Aberkane Mohammed (Batna) |
| `06-00248` | École des cadets de la nation (Béjaïa) |
| `08-00046` | مدرسة النحية العسكرية الثالثة (Béchar) |
| `09-00144` | École des Cadets de la nation (Blida) |
| `11-00007` | École des cadets (Tamanrasset) |
| `11-00010` | École des Cadets de la Nation (Tamanrasset) |
| `14-00230` | École des cadets de la Nation du Chahid Ammar Mohamed (Tiaret) |
| `16-00043` | Crèche militaire (Alger) |
| `19-00426` | École des cadets de la nation (Sétif) |

The project publishes no military location. The exclusion lives in the build
(`packages/ecoles/scripts/fetch.mjs`, `MILITARY_OSM_REFS`), keyed on the OSM
element exactly as the id carry-over is, so a later refresh drops these elements
again instead of handing them a fresh public id.

A school that only **mentions** a military place in its address, or carries a
person's name that reads like one, is not affected and stays published:
`04-00141` (address "مشتى العسكرية", Oum El Bouaghi) and `16-00667`
(École Askri Ahcène, Alger) are both kept.

Counts: 11,849 records (from 11,858), 8,204 named (from 8,213), 3,776 primaire,
267 préscolaire, 11,671 regular, 2,620 with an address. Coverage still reads
39.9% of the ministry's 29,702, and all 69 wilayas remain covered.
