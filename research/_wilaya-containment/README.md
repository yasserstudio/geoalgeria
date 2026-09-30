# Records their own geometry contradicts

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

## Why the rule is the commune outline, not the wilaya polygon

The first version of this guard asked only whether a record was inside the wilaya
polygon it declared, and that made it blind to the defect it was added for. The
first replacement join pinned the candidate communes to the wilaya whose **shipped
polygon** contains the point, and the shipped wilaya 55 polygon was about 50 km
short of the decree boundary (#171, which has since rebuilt it from its own member
communes and merges before this branch). So 79 records were moved out of El-Hadjira
(5507) and El Alia (5513) into N'goussa (3003) in wilaya 30, and every one of them
**passed**, because they are genuinely inside the wilaya 30 polygon. Mosque
`55-0051` at `[5.513943, 32.615544]` is inside OpenStreetMap's El-Hadjira relation
6542937 and read N'goussa, 56.1 km from the centre it was given.

A commune outline is unsimplified OpenStreetMap geometry, reduced once under a
containment check proved lossless on all 1,541 communes, and it does not depend on
the shipped wilaya polygons at all. It is the finer question and it is the one
asked first.

## The rule

| Order | Test | Kind when it fails |
| --- | --- | --- |
| 1 | the record names a commune OpenStreetMap ships an outline for: is the coordinate inside that outline? | `outside_own_commune_outline` |
| 2 | otherwise: is the coordinate inside a **different** wilaya's shipped polygon? | `outside_declared_wilaya_polygon` |

A record with no commune outline to check whose coordinate is inside **no** wilaya
polygon does not fail: the 69 outlines this repository ships are display-grade
(mapshaper `dp 2% keep-shapes`, a 3.4 km median vertex gap) and cut inside the real
shoreline, so coastal and border records sit outside every one of them as an
artefact of the simplification. Failing those would be failing the outlines. #171
rebuilt the four wilaya polygons whose error was a membership error rather than a
simplification artefact; what is left here is simplification.

Every row also carries `rule`, the clause of `scripts/lib/commune-resolver.mjs`
that decides it today, and `pre_existing`, recomputed by running the same rule over
the same file at `origin/main`. So a row this batch created cannot hide among the
rows it inherited.

The dataset's own commune centres are not in this guard.
`test/commune-in-boundary.test.mjs` and
`test/commune-centre-in-commune.test.mjs` hold those rows against the same
polygons and against the commune outlines, each with its own exceptions.

## What it found

46 record files, 70,015 located records, **360 violations, every one of them
pre-existing and 0 created by this batch**. It was 396 before #171 rebuilt the
wilaya 55 and 47 polygons from their member communes: 36 rows stopped being
violations, 28 of them declaring wilaya 55 and 8 declaring wilaya 47, all of them
`outside_declared_wilaya_polygon` rows in packages this branch does not touch, and
not one row was added. Two classes:

- **the source's own text**: a package whose `wilaya_code` and `commune` come from a
  ministry register column or an operator's branch list while its coordinate comes
  from a separate geocode. The two are independent claims, the guard has caught them
  disagreeing, and only the source can say which is wrong. That is every
  `outside_declared_wilaya_polygon` row plus the `poste`, `protection-civile`,
  `sports` and `sante` commune rows. Tracked as #209.
- **a row the join deliberately refuses to move**: its coordinate carries fewer than
  three decimals, so it is too rounded to join on, or its commune is one of the four
  OpenStreetMap ships no relation for (Souk Oufella 630, Bir Touta 1634, Collo 2110,
  Dhayet Bendhahoua 4703), or the point sits inside the reduced outline's own error at
  a commune seam. Keeping a published claim nothing can disprove is the intended
  behaviour; the row is listed rather than hidden.

| File | Records | Kinds |
| --- | --- | --- |
| `packages/poste/data/postoffices.json` | 82 | 82 outside their own commune outline |
| `packages/sports/data/facilities.json` | 34 | 26 outside their wilaya polygon, 8 outside their commune outline |
| `packages/tourisme/data/historic.json` | 42 | 42 outside their wilaya polygon |
| `packages/protection-civile/data/protection-civile.json` | 33 | 33 outside their own commune outline |
| `packages/tourisme/data/thermal-springs.json` | 27 | 27 outside their wilaya polygon |
| `packages/tourisme/data/attractions.json` | 23 | 23 outside their wilaya polygon |
| `packages/jeunesse/data/institutions.json` | 15 | 15 outside their wilaya polygon |
| `packages/emploi/data/alem.json` | 19 | 19 outside their wilaya polygon |
| `packages/tourisme/data/lodging.json` | 15 | 15 outside their wilaya polygon |
| `packages/mosquees/data/mosquees.json` | 14 | 14 outside their own commune outline |
| `packages/ecoles/data/ecoles.json` | 13 | 13 outside their own commune outline |
| `packages/telecom/data/5g-djezzy.json` | 12 | 12 outside their wilaya polygon |
| `packages/pharmacies/data/pharmacies.json` | 7 | 7 outside their own commune outline |
| `packages/banques/data/branches.json` | 5 | 5 outside their wilaya polygon |
| `packages/poste/data/atms.json` | 3 | 3 outside their wilaya polygon |
| `packages/sante/data/sante.json` | 4 | 4 outside their own commune outline |
| `packages/tourisme/data/parks.json` | 4 | 4 outside their wilaya polygon |
| `packages/cliniques/data/cliniques.json` | 2 | 2 outside their own commune outline |
| `packages/culture/data/culture.json` | 2 | 2 outside their own commune outline |
| `packages/ferroviaire/data/stations.json` | 2 | 2 outside their own commune outline |
| `packages/ooredoo/data/stores.json` | 1 | 1 outside its own commune outline |
| `packages/telecom/data/5g-mobilis.json` | 1 | 1 outside its wilaya polygon |

The list is exact in both directions: a record that stops needing its entry fails
the guard rather than keeping it, so the 360 can only shrink.

## One count this batch deliberately raises

`scripts/validate-packages.mjs` also warns when a record's coordinate is outside the
display-grade polygon of the wilaya it declares, and `quality/accuracy-review` counts
the same rows as `outside_declared_wilaya`. Measured by running each tree rather than
quoted:

| Reason | `origin/main` | before #171 | now |
| --- | --- | --- | --- |
| `outside_declared_wilaya` | 1,159 | 572 | **447** |
| `inside_adjacent_wilaya` | 960 | 373 | **248** |

An earlier revision of this file gave 960 and 373 as the `outside_declared_wilaya`
count. Those two numbers are real, but they are the `inside_adjacent_wilaya` row:
the reason code was mislabelled, not the measurement. Both rows are stated here so
the mistake cannot be made again from this file, and the third figure it quoted, for
the wilaya-first join, describes a tree that no longer exists and is dropped rather
than restated.

The drop from 572 to 447 is #171: 127 of the 572 were wilaya 55 and 47 rows this
repository drew in the wrong wilaya (108 in 55, 19 in 47), and rebuilding those four
polygons from their member communes ends every one of them without creating a single
new warning.

Of the 447 that remain, 118 are inside the OpenStreetMap outline of the commune they
name, so it is the shipped wilaya polygon that is wrong about them and not the
record; 322 name no commune an outline exists for, so nothing finer can be asked; and
7 still declare wilaya 55 or 47. All of them are display-grade seams on borders this
branch does not redraw.

## Files

| File | Contents |
| --- | --- |
| `record-exceptions.json` | the 360 records, grouped by file, each with its kind, the clause of the join that decides it, whether it pre-exists `origin/main`, and the reason per group |

Regenerate with `node scripts/build-wilaya-containment-exceptions.mjs --write`.
