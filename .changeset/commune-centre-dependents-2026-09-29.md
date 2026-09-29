---
"@geoalgeria/agriculture": patch
"@geoalgeria/cliniques": patch
"@geoalgeria/culture": patch
"@geoalgeria/djezzy": patch
"@geoalgeria/ecoles": patch
"@geoalgeria/enseignement-superieur": patch
"@geoalgeria/formation-professionnelle": patch
"@geoalgeria/industrie-pharmaceutique": patch
"@geoalgeria/mosquees": patch
"@geoalgeria/ooredoo": patch
"@geoalgeria/pharmacies": patch
"@geoalgeria/sante": patch
---

Rebuild 12 sector packages on the 174 corrected commune centres: 43 coordinates moved, 3,659 commune links re-derived, and not one published id changed.

`geoalgeria` corrects 174 commune centres in this same release. Every package here derives from those values, so none of it was right until it was rebuilt against them. Two separate things were stale.

**43 coordinates were a repudiated commune centre.** These records have no point of their own: they borrow their commune's centre and say so in `geo_method`. The copy does not follow the original. Moved: `@geoalgeria/sante` 18, `@geoalgeria/formation-professionnelle` 14, `@geoalgeria/industrie-pharmaceutique` 8, `@geoalgeria/enseignement-superieur` 2 and `@geoalgeria/agriculture` 1. Precision is unchanged and still honest: these are commune-level placements, and they now name the commune's current centre.

**3,659 `commune` links moved, and 210 `wilaya_code` with them.** `commune` and `commune_code` are stamped by nearest commune centroid, so a centre that moves stops being the nearest for everything around where it was and starts being it around where it is. 41 of the 174 moved more than 25 km and the median move is 15 km. Re-derived: mosquees 2,190 (202 crossing a wilaya), ecoles 982, pharmacies 250 (2 crossing), cliniques 151, culture 52 (4 crossing), ooredoo 24 (2 crossing), enseignement-superieur 6 and djezzy 4.

**No published id was retired, renumbered or minted.** Ids are public join keys, so a coordinate correction is not the release that churns them, and it was verified per package before and after: 695, 196, 171, 128, 11,858, 1,913, 3,807, 20,759, 1,083, 572, 177 and 1,932, each the same set in the same order. Two packages would have churned and did not. `@geoalgeria/sante` replays, but its MSP capture re-pairs FR/AR posts once corrected commune names land and retires published ids, so its coordinates moved through `scripts/sync-commune-centroid-dependents.mjs` instead, as in the previous batch. `@geoalgeria/ooredoo` had no carry-over at all: its ids are `{wilaya}-{seq}` assigned from the nearest-centroid join, so the two stores that changed wilaya re-sequenced 43 ids and retired `20-004` and `31-034` on the first replay. Its generator now pins each store back to the id it shipped under, keyed on Ooredoo's own store id, the one identifier that survives a re-pull; it is the pattern nine other packages here already used. A record that re-joins therefore keeps its id, which is why a mosque id can read `26-0114` while its `wilaya_code` reads `10`.

**Record counts, names, types, contacts and hours are untouched in every package.** Only `lat`/`lng`, `commune`, `commune_code` and `wilaya_code` changed, plus the `metadata.json` fields derived from them. Eight of the twelve were rebuilt by re-running their own generator against its committed capture, offline (`sante` before `cliniques`, which reads sante's data to exclude the hospital tier); the four that cannot replay offline were patched by `scripts/sync-commune-centroid-dependents.mjs`, which reproduces the same reads of the flagship and nothing else.

`@geoalgeria/protection-civile` is not in this release: the validator's borrowed-centre check found nothing stale in it, and none of its commune links moved.

Refs yasserstudio/geoalgeria.com#170.
