---
"geoalgeria": patch
---

Align the per-file licence descriptor of `data/geojson/communes.geojson` with the package terms. It still carried the SPDX expression `MIT AND ODbL-1.0`, the manifest value from before the package moved to `SEE LICENSE IN LICENSE`, which reads as the ODbL over all 1,541 commune centres while the file's own note says no such claim is made over 1,290 of them. `data/geojson/communes.metadata.json` now states the terms the `LICENSE` grants, verbatim, and records why a per-row split carries no SPDX expression. The other carve-out, `data/geojson/wilaya-boundaries.geojson`, is wholly ODbL and keeps its `ODbL-1.0` expression. No data, count or grant changed.

`data/osm-links.metadata.json` now states its terms, `ODbL-1.0`, with the note saying why that part alone is wholly ODbL, and `data/wilaya-capitals.metadata.json` notes why its `MIT` is the compilation's terms; both descriptors arrived in this release and are now covered by the same rule.
