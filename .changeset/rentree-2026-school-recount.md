---
"@geoalgeria/ecoles": minor
---

Fresh OpenStreetMap re-extract for the 2026 rentrée (2026-08-06 pull, `timestamp_osm_base` 2026-08-06T14:37:32Z): 11,830 to **11,855** schools, **8,635** named, all 69 wilayas. Id churn is minimal, 11,829 of 11,830 ids carry over, 26 added and 1 dropped (`16-00454` in Ben Aknoun, gone upstream or absorbed by de-dup), so existing joins on `id` keep working. Precision 2,843 exact / 9,012 approximate; de-dup removed 41 same-name-within-40m pairs plus 3 exact-coincident points. Cycle tallies barely move: primaire 4,019, moyen 2,378, secondaire 1,576, préscolaire 268, autre 3,614 (most of the growth lands in `autre`, the unnamed/uncycled bucket).

Coverage denominator is now the ministry's own number. `estimated_universe` moves from the round ~28,000 order-of-magnitude estimate to **29,702**, the aggregate the Ministry of National Education publishes on `education.gov.dz` ("Education in numbers", 2024-2025 school year). Same honest-denominator role, now an exact sourced figure: coverage reads **39.9%** instead of ~40% against a guess. `coverage_note` and the three READMEs cite the source.

Commune join now runs under the point-in-polygon wilaya-containment guard, so a nearest-centroid commune match can no longer land across a wilaya boundary.

No API or shape changes: record contract, file layout and loaders are exactly as before.
