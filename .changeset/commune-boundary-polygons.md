---
"geoalgeria": minor
---

Add `data/geojson/commune-boundaries.geojson`: a Polygon or MultiPolygon for all 1,541 communes, each carrying the same properties as `communes.geojson` plus `code_commune`, the commune's own code and the join key. Outlines come from the OpenStreetMap `admin_level=8` relations the repo already caches (pulled 2026-09-29, matched by `osm_relation_id`). Three communes with no cached outline (Souk Oufella 630, Collo 2110, Dhayet Bendhahoua 4703) take a geoBoundaries ADM3 polygon that passed five matching clauses, and Bir Touta (1634) takes the 27.6 km2 gap its neighbours leave in Algiers, which an independent geoBoundaries polygon matches at 0.996 shape overlap. No commune record or point changed.

Also add `data/geojson/wilaya-boundaries-detailed.geojson`: the 69 wilaya outlines dissolved from those commune outlines, so a wilaya border follows the communes at the same detail. The simplified `wilaya-boundaries.geojson` is unchanged.
