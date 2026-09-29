# Records outside the wilaya they declare

Provenance for `record-exceptions.json`, the list
`test/record-in-declared-wilaya.test.mjs` holds every published record to.

## What prompted it

The 2026-09-29 seat audit moved 245 commune centres
(`research/_commune-centres/README.md`). Seven packages stamped `wilaya_code` and
`commune` by **unrestricted nearest commune centroid**, so a centre that moves
stops being the nearest for everything around where it was and starts being it
around where it is. That carried 58 published records into a wilaya whose polygon
does not contain them at all, and a review caught it before release: mosque
`31-0390`, at `[-0.414678, 35.547628]`, is inside OpenStreetMap's commune 3111
Oued Tlelat in wilaya 31, and the join had given it Zahana in wilaya 29.

The join was replaced by `scripts/lib/build-utils.mjs` `resolveCommune()`, which
decides the wilaya by containment before it measures any distance, and the seven
packages were re-derived with their published ids carried over. This guard is the
ratchet: without it the next centre move reintroduces the class silently.

## The rule

A record fails when its coordinate is inside a **different** wilaya's polygon than
the one it declares. A record inside **no** polygon does not fail: the 69 outlines
this repository ships are display-grade (mapshaper `dp 2% keep-shapes`, a 3.4 km
median vertex gap) and cut inside the real shoreline, so 205 coastal and border
records sit outside every one of them as an artefact of the simplification.
Failing those would be failing the outlines, which are #171.

The dataset's own commune centres are not in this guard.
`test/commune-in-boundary.test.mjs` and
`test/commune-centre-in-commune.test.mjs` hold those rows against the same
polygons and against the commune outlines, each with its own exceptions.

## What it found

46 record files, 71,556 located records, **0** violations in every package the
corrected join derives, and **245 pre-existing violations** in fifteen files it
does not. Those 245 are not this batch's doing and this batch corrects none of
them, because they are all one class: a package whose `wilaya_code` comes from the
**source's own text** (a ministry register column, an operator's branch list) while
its coordinate comes from a separate geocode. The two are independent claims, the
guard has caught them disagreeing, and only the source can say which is wrong.

| File | Records |
| --- | --- |
| `packages/tourisme/data/historic.json` | 44 |
| `packages/sports/data/facilities.json` | 36 |
| `packages/tourisme/data/thermal-springs.json` | 32 |
| `packages/tourisme/data/attractions.json` | 30 |
| `packages/jeunesse/data/institutions.json` | 22 |
| `packages/emploi/data/alem.json` | 20 |
| `packages/tourisme/data/lodging.json` | 17 |
| `packages/poste/data/postoffices.json` | 12 |
| `packages/telecom/data/5g-djezzy.json` | 12 |
| `packages/banques/data/branches.json` | 5 |
| `packages/poste/data/atms.json` | 5 |
| `packages/tourisme/data/parks.json` | 4 |
| `packages/protection-civile/data/protection-civile.json` | 3 |
| `packages/sante/data/sante.json` | 2 |
| `packages/telecom/data/5g-mobilis.json` | 1 |

The list is exact in both directions: a record that stops needing its entry fails
the guard rather than keeping it, so the 245 can only shrink.

## Files

| File | Contents |
| --- | --- |
| `record-exceptions.json` | the 245 records, grouped by file, with the reason per group |

Regenerate with `node scripts/build-wilaya-containment-exceptions.mjs --write`.
