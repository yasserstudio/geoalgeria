---
"@geoalgeria/buses": patch
---

**Four stops now exact.** `osm-node-5380774823` (1er Mai), `osm-node-5387204314` (PARNET), `osm-node-5400974163` (Oukba) and `osm-node-9031893754` (an unnamed stop in Tiaret) are real OpenStreetMap nodes whose position the capture's six-decimal rounding cut short (36.7599996 became 36.76), so the decimals test read them as rounded placeholders. Each now ships the node's stored position, read from the OpenStreetMap API at a recorded version (`NODE_FULL_POSITION` in `scripts/fetch.mjs`), and moves less than 1 m. The three stops mapped as ways stay `approximate`. Precision: 1,600 exact, 3 approximate.
