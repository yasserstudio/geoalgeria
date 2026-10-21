---
"@geoalgeria/formation-professionnelle": patch
---

One establishment stops claiming `exact` on a coordinate takwin.dz rounded, and the coverage sentence is corrected.

`01392` (معهد بيئة الصحة والسلامة) carries 35.7167, 0.6333, which is 35°43'N 0°38'E: degrees and whole arcminutes with the seconds dropped, a **rounded placeholder** about 1.5 km across and not a campus point. A decimal-digit count cannot see it, because minutes divided by 60 leave a long tail. It now reads `geo_precision: "approximate"` on the same `geo_method: "takwin"`, because the point is still the portal's.

`geo_precision` goes from 1,363 `exact` / 558 `approximate` to 1,362 / 559 over the same 1,921 geocoded establishments. No coordinate moves and no record, field or id changes.

The READMEs in all three locales were also saying 1,920 geocoded with 12 ungeocoded and 1,375 published points, which the data has not matched for some time. They now read the figures the records carry: 1,921 geocoded, 11 ungeocoded, 1,362 published points taken as `exact`, 13 published points demoted by the coordinate's own resolution, 511 on a commune centroid and 35 on a wilaya's.

The generator demotes such a point on ingest from now on, so the next takwin.dz pull publishes the honest precision instead.
