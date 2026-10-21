---
"@geoalgeria/mosquees": patch
---

Two mosques stop claiming `exact` on a coordinate the number itself disproves.

`10-0439` (mosquée de Bouira) and `68-0238` (مسجد صلاح الدين الأيوبي 35/4) carry a Wikidata point written in degrees and whole arcminutes with the seconds dropped, a **rounded placeholder**: 36.36666, 3.88333 is 36°22'N 3°53'E, a cell about 1.5 km across rather than a mosque. A decimal-digit count cannot see it, because minutes divided by 60 leave a long tail. Both now read `geo_precision: "approximate"`.

Neither coordinate moves, and no record, field or id changes: `geo_precision` goes from 16,227 `exact` / 4,532 `approximate` to 16,225 / 4,534 over the same 20,759 mosques.

The writer now applies this rule to every package on every emit, beside the shared-point rule it already applied, so a point on the whole-arcminute grid cannot be published as `exact` again.
