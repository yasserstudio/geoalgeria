---
"@geoalgeria/ooredoo": patch
---

Two stores stop claiming `exact` on a coordinate the operator rounded.

The locator API publishes `16-059` (Khraissia) at 36.6833, 2.98333 and `44-003` (Arib) at 36.2833, 2.06667. Both are degrees and whole arcminutes with the seconds dropped, a **rounded placeholder**: a cell about 1.5 km across, not the store. A decimal-digit count cannot see it, because minutes divided by 60 leave a long tail, so both shipped as `geo_precision: "exact"`. Both now read `"approximate"`, keeping `geo_method: "operator_api"`, because the point is still the operator's, just not a per-store one.

Neither coordinate moves, and no record, field or id changes: `geo_precision` goes from 548 `exact` / 24 `approximate` to 546 / 26 over the same 572 stores. The README tables and the provenance note in all three locales read the new split.

The generator demotes such a point on ingest from now on, so the next locator pull publishes the honest precision instead of a claim the coordinate contradicts.
