---
"@geoalgeria/gares-routieres": patch
---

**Two stations now exact.** `24-01` Guelma, which SOGRAL ships with no coordinate, leaves the Guelma commune centroid for the intercity bus station OpenStreetMap maps on RN 21, the road its address names (way 460372288, 1.35 km away). `65-01` Aïn Oussara keeps SOGRAL's own point in substance: OpenStreetMap way 494669722, 65 m from it on the Cité Ahmed Zabana side its address names, gives it the precision SOGRAL's two-decimal value lacked. Both are entries in `COORD_FIX` in `scripts/fetch.mjs`. `33-03` Illizi stays `approximate`. Precision: 73 exact, 1 approximate.
