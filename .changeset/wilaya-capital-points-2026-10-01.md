---
"geoalgeria": patch
---

A wilaya's coordinates are the centre of its capital commune, so 66 of the 69 wilaya points move.

**One point per capital, not two.** A wilaya used to publish a point of its own, an OpenStreetMap `admin_level=4` relation `admin_centre`, while the commune the decrees name as its chef-lieu published another. Two values for one town centre is one too many: a consumer asking where the seat of a wilaya is got a different answer from the wilaya row and from the commune row. `latitude`/`longitude` on a wilaya is now the capital commune's own coordinate, digit for digit, which is rule 9 of `docs/adr/0001-coordinate-review-by-independent-votes.md`.

**What moves.** 66 of the 69, in all five files that carry a wilaya point: `data/algeria.json`, `data/csv/wilayas.csv`, `data/sql/full.sql`, `data/geojson/wilayas.geojson` and `algeria.geojson`. 52 of the moves are under 1 km. The 14 at or over 1 km:

| Wilaya | Capital | Moves |
|---|---|---|
| 52 Béni Abbès | Beni-Abbes (5201) | 8.8 km |
| 16 Alger | Alger Centre (1601) | 5.5 km |
| 33 Illizi | Illizi (3301) | 2.4 km |
| 40 Khenchela | Khenchela (4001) | 2.3 km |
| 24 Guelma | Guelma (2401) | 2.1 km |
| 15 Tizi Ouzou | Tizi-Ouzou (1501) | 1.8 km |
| 25 Constantine | Constantine (2501) | 1.7 km |
| 1 Adrar | Adrar (101) | 1.6 km |
| 18 Jijel | Jijel (1801) | 1.5 km |
| 66 Messaad | Messaad (1717) | 1.4 km |
| 22 Sidi Bel Abbès | Sidi Bel-Abbes (2201) | 1.4 km |
| 31 Oran | Oran (3101) | 1.3 km |
| 27 Mostaganem | Mostaganem (2701) | 1.1 km |
| 21 Skikda | Skikda (2101) | 1.0 km |

Wilaya 55 (Touggourt) is the smallest move that matters most: its old point was 843 m away and **outside** its own capital commune, in Nezla.

**No commune, boundary or id changed**, and nothing in the repository derives from a wilaya point: the `wilaya_centroid` records in `@geoalgeria/agriculture` and `@geoalgeria/industrie-pharmaceutique` sit on commune centres and polygon centroids. A consumer that pinned a wilaya pair, or that draws wilaya markers, sees them land on the chef-lieu town centre.

**Licence.** A wilaya point now carries whatever terms its capital commune's centre carries, so 6 of the 69 are OpenStreetMap-derived and **ODbL 1.0, © OpenStreetMap contributors**: wilayas 7 (Biskra), 16 (Alger Centre), 25 (Constantine), 32 (El Bayadh), 52 (Beni-Abbes) and 61 (El Kantara). `LICENSE`, `NOTICE`, `dataset-metadata.json`, `llms.txt` and `data/README.md` state that, and `test/osm-derived-centre-count.test.mjs` derives the 6 and the other 63 from the correction ledgers and the data, so the prose cannot drift from it. `NOTICE` previously claimed none of the 69 was OpenStreetMap-derived.

Applied by `scripts/fix-wilaya-capital-points.mjs --write`, which has a `--check` mode; `test/wilaya-capital-commune.test.mjs` asserts the equality per carrier and point-in-polygon containment in the capital commune's own OpenStreetMap outline, replacing a nearest-centre check that passed on wilaya 52's 8.8 km error.

Refs yasserstudio/geoalgeria.com#228.
