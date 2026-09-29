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

Rebuild 14 sector packages on the 189 corrected commune centres, and join the commune by containment instead of by distance: 46 coordinates moved, 8,154 commune links re-derived, and not one published id changed.

`geoalgeria` corrects 189 commune centres in this same release. Every package here derives from those values, so none of it was right until it was rebuilt against them. Three separate things were wrong.

**46 coordinates were a repudiated commune centre.** These records have no point of their own: they borrow their commune's centre and say so in `geo_method`. The copy does not follow the original. Moved: `@geoalgeria/sante` 19, `@geoalgeria/formation-professionnelle` 15, `@geoalgeria/industrie-pharmaceutique` 8, `@geoalgeria/enseignement-superieur` 2 and `@geoalgeria/agriculture` 2. Precision is unchanged and still honest: these are commune-level placements, and they now name the commune's current centre.

**The join itself was wrong, not just its inputs.** `commune`, `commune_code` and `wilaya_code` were stamped by **unrestricted nearest commune centroid**, which makes every commune centre an attractor for everything around it, so moving 189 centres pushed 58 published records into a wilaya whose polygon does not contain them at all: mosque `31-0390`, at `[-0.414678, 35.547628]`, is inside OpenStreetMap's commune 3111 Oued Tlelat in wilaya 31 and read Zahana in wilaya 29. Distance to a hand-placed centre is a weaker claim than containment in a polygon, so `scripts/lib/build-utils.mjs` `resolveCommune()` now decides by containment: the wilaya whose shipped polygon holds the point fixes the candidate set, the commune whose OpenStreetMap `admin_level=8` outline holds it wins inside that set, distance only breaks what is left, and a point no wilaya polygon holds keeps the wilaya the record shipped in rather than being guessed at offshore.

**8,154 `commune` links moved, and 715 `wilaya_code` with them**, which is the join being fixed as well as its inputs: re-derived, records inside their own commune's OpenStreetMap outline go from **79.8% to 99.3%** across the nine geometry-joined packages, where 8,120 of the 8,154 links sit; of those 8,120, only 81 are still not inside the commune they now name, all of them in the four communes OpenStreetMap has no geometry for or at a reduced-outline seam. Per package: mosquees 5,011 links and 666 wilaya moves, ecoles 1,923 and 0, pharmacies 507 and 14, cliniques 295 and 0, ferroviaire 213 and 18, culture 126 and 14, ooredoo 52 and 3, djezzy 12 and 0, gares-routieres 9 and 0, enseignement-superieur 6 and 0. Not one of those 715 contradicts the wilaya polygon its point sits in, which `test/record-in-declared-wilaya.test.mjs` now holds every published record to. Several records agree with their own source address where the nearest centre never did: Djezzy's "Barika-centre, Barika, Batna" and SOGRAL's "Commune El Hadjeb Biskra".

**No published id was retired, renumbered or minted.** Ids are public join keys, so a coordinate correction is not the release that churns them, and it was verified per package before and after: 695, 196, 171, 128, 11,858, 1,913, 3,807, 20,759, 1,083, 572, 177, 1,932, 74 and 692, each the same set in the same order. Three packages would have churned and did not. `@geoalgeria/sante` replays, but its MSP capture re-pairs FR/AR posts once corrected commune names land and retires published ids, so its coordinates moved through `scripts/sync-commune-centroid-dependents.mjs` instead, as in the previous batch. `@geoalgeria/ooredoo` and `@geoalgeria/ferroviaire` had no carry-over at all: their ids are `{wilaya}-{seq}` assigned from the commune join, so the stores and stations that changed wilaya re-sequenced 43 and 18 published ids and retired `20-004`, `31-034` and eighteen station ids on the first replay. Both generators now pin each record back to the id it shipped under, keyed on the operator's own store id and on the station's Wikidata or OSM id; it is the pattern nine other packages here already used. A record that re-joins therefore keeps its id, which is why a mosque id can read `26-0114` while its `wilaya_code` reads `10`.

**Record counts, names, types, contacts and hours are untouched in every package.** Only `lat`/`lng`, `commune`, `commune_code` and `wilaya_code` changed, plus the `metadata.json` fields derived from them. Ten of the fourteen were rebuilt by re-running their own generator against its committed capture, offline (`sante` before `cliniques`, which reads sante's data to exclude the hospital tier); the four that cannot replay offline were patched by `scripts/sync-commune-centroid-dependents.mjs`, which reproduces the same reads of the flagship and nothing else.

`@geoalgeria/protection-civile` and `@geoalgeria/buses` are not in this release: neither has a stale borrowed centre and neither moved a commune link.

Refs yasserstudio/geoalgeria.com#170.
