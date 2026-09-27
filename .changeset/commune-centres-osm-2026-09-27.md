---
"geoalgeria": patch
---

Alger Centre was in the sea and Bethioua inside the Arzew LNG complex: 56 commune centres corrected from OpenStreetMap.

Two reported defects turned out to be one class. **Alger Centre (16)** shipped at `[3.0909, 36.76846]`, in the water east of the port of Algiers, about 3 km from the Grande Poste; **Bethioua (31)** shipped at `[-0.2596, 35.805837]`, inside the Arzew industrial complex, 0.75 km east of the town. Both are real Algerian coordinates inside the national bounding box, which is why no range or bbox check ever saw them.

Sweeping **all 1,541 commune centres** against the 69 wilaya polygons this package already ships found **68 outside their own wilaya**, from 10 m to 188 km. The wilaya outlines are display-grade and simplified to a 3.4 km median vertex gap, so they cannot tell a bad point from a simplification artefact on their own. Each of the 68 was therefore decided against a second, unsimplified source: its own OpenStreetMap `admin_level=8` commune relation, fetched with full geometry. A stored point outside the commune's own OSM boundary, whose `admin_centre` node is inside that boundary and inside the declared wilaya, is a coordinate error.

That split **55 errors from 13 artefacts**, and Bethioua is the 56th correction, admitted on its own evidence: its stored latitude is byte-identical to the `admin_centre` node and only the longitude is displaced.

**56 commune centres move**, by 0.75 km to 217 km. The largest are Ksabi (52) 217 km, Tousnina (14) 121 km, Oultem (68) 88 km, Hannacha (26) 86 km, Boudria Beniyadjis (18) 74 km, Ain Diss (04) 72 km, Bir Dheheb (12) 69 km and El Harrach (16) 51 km. Five more were independently reported as offshore and are all in this set: Rais Hamidou (16), which was 15 km out in the bay, Melbou (06), Tichy (06), El Ancor (31) and Alger Centre itself. Every row carries its own source in `research/_commune-centres/corrections-2026-09-27.json`: the OSM relation id, the `admin_centre` node id, the relation's `ref:ONS` and the Overpass `timestamp_osm_base` of the pull, so any single value can be re-checked without re-running the sweep. New values are the node coordinate rounded to 6 decimals, the package's existing resolution.

This matters past the table. `attachCommune()` and the same inlined pattern across seven sector packages stamp `commune` and `commune_code` onto OpenStreetMap features by **nearest commune centroid**, so a centre 25 km from its town is an attractor that claims facilities near a place it does not belong to. The same class of row produced 30 of this project's known mislinks before they were repaired.

All five representations change together, `communes_w*.json`, `algeria.json`, `geojson/communes.geojson`, `csv/communes.csv` and `sql/full.sql`, and a new guard keeps the class out: no commune centre may sit more than **500 m** outside its own wilaya polygon, in any of those five files, with the three reviewed exceptions pinned by name and measured distance. 500 m is the loosest line that still fails an Alger Centre and the tightest that does not fail a legitimately coastal commune.

The 13 hits that were not point errors are listed in `research/_commune-centres/review-2026-09-27.json` rather than silently tolerated. Three of them say something about the boundaries instead: El Alia and El-Hadjira, both declared in Touggourt (55), sit 53 km and 51 km outside the wilaya 55 polygon with their chef-lieu nodes outside it too, and Mansoura (47) sits 5 km outside wilaya 47. Coordinates are unchanged for all 13.

Commune centres that are wrong while staying inside the right commune, Bethioua's own class, are not addressed by the sweep and need a separate audit against every commune's `admin_centre` node.
