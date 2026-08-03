---
"@geoalgeria/enseignement-superieur": patch
---

August 2026 re-verification against the MESRS listings (unchanged upstream since
June) and a campus-precision pass: 6 institutions move from centroid to exact
campus coordinates (Oran 1, Naama, Constantine 3, Skikda 20 Août 1955, ESSA
Tlemcen, ENSSEA Koléa) via Nominatim retries plus a new conservative OSM
campus matcher (`scripts/geocode-osm.mjs`, exact-name matches only). Campus
precision: 61 -> 67 of 177. Raw listings and the OSM campus pull are now
committed captures under `sources/enseignement-superieur/`, and every build
script replays offline with `--cache`. New reconciliation dossier
(`research/enseignement-superieur/SOURCE.md`) documents what the 177 records
are versus the ministry's "117 etablissements" aggregate.
