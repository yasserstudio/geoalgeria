---
"@geoalgeria/enseignement-superieur": patch
---

ESI's commune corrected to Oued Smar (user report): the campus point was right, the label was not. The nearest-centroid join had labelled the École nationale supérieure d'informatique with neighbouring Bab Ezzouar, whose commune centre is closer than Oued Smar's own; the school's published address is BP 68M, 16270 Oued Smar. A new curated seed (scripts/seeds/commune-labels.json) re-labels campus-precise records without moving the point, never across a wilaya boundary. Also fixes the build dates on --cache replays: a replay now reproduces the committed updated/retrieved dates instead of claiming a fresh retrieval that never happened.
