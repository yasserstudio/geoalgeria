---
"@geoalgeria/tourisme": patch
---

Ten sites stop claiming `exact` on a coordinate the number itself disproves.

A **rounded placeholder** is a coordinate a source rounded instead of measuring. One kind is easy to spot (35, 8 locates a degree square), and the other hides inside it: degrees and whole arcminutes with the seconds dropped, which survives a decimal-digit count because minutes divided by 60 leave a long tail. 36.6166667, 6.8833333 is 36°37'N 6°53'E, a cell about 1.5 km across, and it cannot be a per-site point.

Ten tourisme sites carried such a value as `geo_precision: "exact"`: the caves `attraction-846` and `attraction-848`, the sites `historic-91`, `historic-144`, `historic-487`, `historic-746` and `historic-837`, and the national parks `park-25`, `park-29` and `park-31`. All ten now read `"approximate"`. The three parks are areas in any case, so a single point for them was never a facility point.

Not one coordinate moves, and no record, field or id changes: `geo_precision` goes from 4,315 `exact` / 33 `approximate` to 4,305 / 43 over the same 4,348 geocoded sites. The claim is what was wrong, and the honest claim is the correction.

The writer now applies this rule to every package on every emit, beside the shared-point rule it already applied, so a point on the whole-arcminute grid cannot be published as `exact` again.
