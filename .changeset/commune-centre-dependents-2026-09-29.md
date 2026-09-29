---
"@geoalgeria/agriculture": patch
"@geoalgeria/cliniques": patch
"@geoalgeria/culture": patch
"@geoalgeria/djezzy": patch
"@geoalgeria/ecoles": patch
"@geoalgeria/enseignement-superieur": patch
"@geoalgeria/ferroviaire": patch
"@geoalgeria/formation-professionnelle": patch
"@geoalgeria/gares-routieres": patch
"@geoalgeria/industrie-pharmaceutique": patch
"@geoalgeria/mosquees": patch
"@geoalgeria/ooredoo": patch
"@geoalgeria/pharmacies": patch
"@geoalgeria/sante": patch
---

Rebuild 14 sector packages on the 189 corrected commune centres, and join the commune by containment in its OpenStreetMap outline instead of by distance: 46 coordinates moved, 8,036 commune links re-derived, 695 wilaya moves, and not one published id changed.

`geoalgeria` corrects 189 commune centres in this same release. Every package here derives from those values, so none of it was right until it was rebuilt against them. Three separate things were wrong.

**46 coordinates were a repudiated commune centre.** These records have no point of their own: they borrow their commune's centre and say so in `geo_method`. The copy does not follow the original. Moved: `@geoalgeria/sante` 19, `@geoalgeria/formation-professionnelle` 15, `@geoalgeria/industrie-pharmaceutique` 8, `@geoalgeria/enseignement-superieur` 2 and `@geoalgeria/agriculture` 2. Precision is unchanged and still honest: these are commune-level placements, and they now name the commune's current centre.

**The join itself was wrong, not just its inputs, and it took two passes to fix.** `commune`, `commune_code` and `wilaya_code` were stamped by **unrestricted nearest commune centroid**, which makes every commune centre an attractor for everything around it, so moving 189 centres pushed 58 published records into a wilaya whose polygon does not contain them at all: mosque `31-0390`, at `[-0.414678, 35.547628]`, is inside OpenStreetMap's commune 3111 Oued Tlelat in wilaya 31 and read Zahana in wilaya 29.

The first replacement pinned the candidate communes to the wilaya whose **shipped polygon** contains the point. That is wrong wherever a shipped polygon is, and the shipped wilaya 55 polygon is about 50 km short of the decree boundary (`yasserstudio/geoalgeria.com#171`): it moved 79 records out of El-Hadjira (5507) and El Alia (5513) into N'goussa (3003) in wilaya 30. Mosque `55-0051` at `[5.513943, 32.615544]` is inside OpenStreetMap's El-Hadjira relation 6542937 and read N'goussa, 56.1 km from the centre it was given; pharmacy `55-00012`, whose address says الحجيرة, and library `55-library-02`, whose name ends "El Alia", went the same way.

The rule is now `scripts/lib/commune-resolver.mjs`, the commune outline decides first and globally, and the wilaya comes from the commune registry rather than from a polygon this repository already knows is wrong:

1. a coordinate with fewer than three decimals is too coarse to re-join, so the published commune stands (`kept_low_precision`, 42 records). The patrimoine portal's whole-degree placeholders are why `19-bcp-08` at `[6, 36]` stays in wilaya 19 instead of being re-attributed to wilaya 43.
2. a commune OpenStreetMap ships no relation for cannot be contradicted by geometry, so the published commune stands (`kept_no_outline`, 186 records): Souk Oufella (630), Bir Touta (1634), Collo (2110) and Dhayet Bendhahoua (4703), whose territory is still inside the commune they were split out of, so containment says the neighbour and containment is wrong. School `16-01308` is 1.85 km from Bir Touta's centre and 6.14 km from Douira's.
3. any commune whose OpenStreetMap `admin_level=8` outline contains the point wins outright (`commune_outline`, 40,623 records), with an overlap resolved in favour of the commune the record already named.
4. only where no outline holds the point does distance decide, among the communes of the wilaya whose shipped polygon does, plus any outline-less commune within 10 km (`wilaya_nearest`, 34 records).
5. a point no wilaya polygon holds keeps its published commune (`kept_outside_wilaya_polygons`, 1 record). The national fallback that used to run there while reporting `published_wilaya_nearest` is deleted.

A record moves commune only where containment supports the move or the point has demonstrably left its old commune's outline.

**8,036 `commune` links moved and 695 `wilaya_code` with them**, and this time every package that relabels is named. Per package, links and wilaya moves: mosquees 4,931 and 624, ecoles 1,931 and 28, pharmacies 500 and 11, cliniques 295 and 1, ferroviaire 189 and 18, culture 123 and 10, ooredoo 51 and 3, djezzy 12 and 0, gares-routieres 4 and 0. Across those nine packages, records inside the OpenStreetMap outline of the commune they name go from **80.2% to 99.9%** (40,654 of the 40,695 rows whose commune has an outline); per package: djezzy and gares-routieres 100%, cliniques, ecoles and mosquees 99.9%, culture, ooredoo and pharmacies 99.8%, ferroviaire 99.7%. The 41 still outside are the rows clauses 1, 2 and 5 keep plus a handful inside the reduced outline's own error at a commune seam, and each is listed in `research/_wilaya-containment/record-exceptions.json`. `test/record-in-declared-wilaya.test.mjs` now holds every published record to its commune outline first and to the wilaya polygon only where there is no outline to ask; it finds 396 violations, all 396 pre-existing and **0 created by this release**. Several records agree with their own source address where the nearest centre never did: Djezzy's "Barika-centre, Barika, Batna" and SOGRAL's "Commune El Hadjeb Biskra".

One count rises on purpose. `scripts/validate-packages.mjs` warns when a point is outside the display-grade polygon of the wilaya it declares, and that is 960 on `main` and 373 here. 140 of the 373 are inside the OpenStreetMap outline of the commune they name, 89 of them the #171 pairs, so it is the shipped wilaya polygon that is wrong about them. They stay warnings until #171 rebuilds those polygons from their member communes.

**No published id was retired, renumbered or minted.** Ids are public join keys, so a coordinate correction is not the release that churns them, and it was verified per package before and after with a fresh recomputed diff: 196, 1,913, 1,083, 128, 11,858, 177, 692, 1,932, 74, 171, 20,759, 572, 3,807 and 695, each the same set in the same order. Three packages would have churned and did not. `@geoalgeria/sante` replays, but its MSP capture re-pairs FR/AR posts once corrected commune names land and retires published ids, so its coordinates moved through `scripts/sync-commune-centroid-dependents.mjs` instead, as in the previous batch. `@geoalgeria/ooredoo` and `@geoalgeria/ferroviaire` had no carry-over at all: their ids are `{wilaya}-{seq}` assigned from the commune join, so the stores and stations that changed wilaya re-sequenced 43 and 18 published ids and retired `20-004`, `31-034` and eighteen station ids on the first replay. Both generators now pin each record back to the id it shipped under, keyed on the operator's own store id and on the station's Wikidata or OSM id; it is the pattern nine other packages here already used. A record that re-joins therefore keeps its id, which is why a mosque id can read `26-0114` while its `wilaya_code` reads `10`.

**Record counts, names, types, contacts and hours are untouched in every package**, checked field by field against `main`: only `lat`/`lng`, `commune`, `commune_code` and `wilaya_code` changed, plus the `metadata.json` fields derived from them. Ten of the fourteen were rebuilt by re-running their own generator against its committed capture, offline (`sante` before `cliniques`, which reads sante's data to exclude the hospital tier); the four that cannot replay offline were patched by `scripts/sync-commune-centroid-dependents.mjs`, which reproduces the same reads of the flagship and nothing else.

`@geoalgeria/protection-civile` and `@geoalgeria/buses` are not in this release: neither has a stale borrowed centre and neither moved a commune link.

Refs yasserstudio/geoalgeria.com#170.
