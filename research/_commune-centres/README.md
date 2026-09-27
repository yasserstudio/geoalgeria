# Commune centres audited against OpenStreetMap (2026-09-27)

Provenance for the commune-coordinate corrections applied by
`scripts/fix-commune-centres.mjs`. Tracked, not scratch: the corrections file is
the input that script reads, so the data and its evidence are the same file.

## What prompted it

Two reports, both of a point that is a real Algerian coordinate and inside the
national bounding box, so no range check could see it:

- **Alger Centre (16, الجزائر الوسطى)** shipped at `[3.0909, 36.76846]`, in the
  sea east of the port of Algiers. The commune centre is on land around the
  Grande Poste.
- **Bethioua (31)** shipped at `[-0.2596, 35.805837]`, inside the Arzew LNG
  complex, 0.75 km east of the OSM town node (issue #167).

## The sweep

All 1,541 commune centres were tested against the 69 wilaya polygons this
repository ships (`packages/dataset/data/geojson/wilaya-boundaries.geojson`).
**68 sat outside their own wilaya polygon**, by 10 m to 188 km. That union of
polygons is also the only land outline the repository has, so a point outside
every one of them is the repository's own definition of "in the sea".

The wilaya polygons alone cannot say which of the 68 is wrong: they are
display-grade, simplified with mapshaper `dp 2% keep-shapes` to a median gap of
3.4 km between kept vertices, so a coastal commune can sit a few hundred metres
"outside" its own wilaya purely as a simplification artefact. So each of the 68
was decided against a second, unsimplified source: the commune's own OSM
`admin_level=8` relation, fetched with full geometry.

| Test | Verdict |
| --- | --- |
| stored point outside the commune's own OSM boundary, `admin_centre` node inside it and inside the declared wilaya | coordinate error, corrected |
| stored point inside its own commune per OSM | not a point error, listed for review |

That split is 55 errors and 13 for review. Bethioua is the 56th correction and
the one admitted on other evidence: its stored point is inside the commune, but
in the industrial complex rather than the town, its stored **latitude is
byte-identical** to the `admin_centre` node, and only the longitude is
displaced.

## Source and date

- OpenStreetMap `admin_level=8` commune relations, their `admin_centre` member
  node, and their full boundary geometry, via Overpass.
- Overpass `timestamp_osm_base` **2026-09-27T11:03:52Z** (mirrors drift; the
  timestamp is recorded per file rather than assumed).
- ODbL 1.0, (c) OpenStreetMap contributors. Coordinates only, as everywhere else
  this repository geocodes from OSM.
- Each correction records its relation id, `admin_centre` node id, the
  relation's `ref:ONS` and its OSM name, so any single row can be re-checked
  without re-running the sweep.

Joins are by `ref:ONS` to `code_commune`, which matched 64 of the 69 relations.
The five that did not are communes of the 2019-reform wilayas, whose OSM
relations still carry their pre-reform mother wilaya's ONS prefix (Ksabi 5209 is
OSM `0819`, M'rara 5703 is `3922`, Djamaa 5706 is `3928`, El-Hadjira 5507 is
`3014`, El Alia 5513 is `3020`); those five were resolved by name plus Arabic
name plus position and are pinned by relation id in the corrections file.

## No single mechanism

The wrong values are not one corrupted batch. Thirteen of the 56 sit within
3 km of *another* commune's centroid, which looks like the bad name-based join
diagnosed in `research/_communes-reconcile/README.md` (El Main and Tefreg, both
of wilaya 34, carry the same latitude 249 m apart). Others are simply far away
with no twin: Ksabi (52) was 217 km off, Tousnina (14) 121 km. Bethioua and
El-Hadjira keep their exact latitude and lose only longitude precision. So the
fix is per-row and sourced per row, not a re-derivation.

## Why it matters beyond the table

`scripts/lib/build-utils.mjs` `attachCommune()` and the same inlined pattern in
`packages/ecoles`, `mosquees`, `culture`, `pharmacies`, `sante`, `djezzy` and
`ooredoo` stamp `commune`/`commune_code` onto OSM features by **nearest commune
centroid**. A centroid 25 km from its town is an attractor that claims every
facility near a place it does not belong to. The same class of row produced 30
of this repository's known mislinks before they were repaired.

## Files

| File | Contents |
| --- | --- |
| `corrections-2026-09-27.json` | the 56 applied corrections, with `from`, `to` and the full OSM evidence per row |
| `review-2026-09-27.json` | the 13 hits that are not point errors, with the measured distance outside the simplified wilaya outline |

## Left for review

None of the 13 is a coordinate error, but three of them say something about the
**boundaries** rather than the points, because the commune's own OSM
`admin_centre` is outside the shipped wilaya outline too:

- **El Alia (5513)** and **El-Hadjira (5507)**, both declared in Touggourt (55),
  sit 53.2 km and 51.1 km outside the wilaya 55 polygon and inside wilaya 30.
  Their OSM relations carry Ouargla ONS prefixes (`3020`, `3014`) and their
  chef-lieu nodes are outside the 55 polygon as well, so the 55 outline, not the
  pair of points, is what needs checking. El Alia additionally carries
  `daira: "Ouargla"`, which is a linkage question of its own.
- **Mansoura (4713)**, Ghardaïa, sits 5.2 km outside the wilaya 47 polygon and
  inside wilaya 58.

The remaining ten are between 10 m and 479 m outside the simplified outline with
their point inside their own commune: coastal or border simplification, nothing
to fix. Three of those carry a second, weaker smell that is not resolved here:
**Tigzirt (1538)** and **Iflissen (1554)** share the latitude `36.89623` with
Mizrana (1562), which this pass corrected, and their points sit 0.58 km and
3.48 km from their chef-lieu nodes while still inside their own communes.

## What this pass did not look for

The sweep's question was containment, so it can only find a centre that leaves
its commune or its wilaya. Bethioua's class, a centre that is wrong by hundreds
of metres while staying inside the right commune, is invisible to it and was
caught by a human report. Answering that class for all 1,541 rows means
comparing every centre with its OSM `admin_centre` node, which is a separate
audit with a much larger expected diff.
