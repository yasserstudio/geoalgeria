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
polygon** contains the point, and the shipped wilaya 55 polygon is about 50 km
short of the decree boundary (#171). So 79 records were moved out of El-Hadjira
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
artefact of the simplification. Failing those would be failing the outlines, which
are #171.

Every row also carries `rule`, the clause of `scripts/lib/commune-resolver.mjs`
that decides it today, and `pre_existing`, recomputed by running the same rule over
the same file at `origin/main`. So a row this batch created cannot hide among the
rows it inherited.

The dataset's own commune centres are not in this guard.
`test/commune-in-boundary.test.mjs` and
`test/commune-centre-in-commune.test.mjs` hold those rows against the same
polygons and against the commune outlines, each with its own exceptions.

## What it found

46 record files, 70,015 located records, **396 violations, every one of them
pre-existing and 0 created by this batch**. Two classes:

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
| `packages/sports/data/facilities.json` | 44 | 36 outside their wilaya polygon, 8 outside their commune outline |
| `packages/tourisme/data/historic.json` | 44 | 44 outside their wilaya polygon |
| `packages/protection-civile/data/protection-civile.json` | 33 | 33 outside their own commune outline |
| `packages/tourisme/data/thermal-springs.json` | 32 | 32 outside their wilaya polygon |
| `packages/tourisme/data/attractions.json` | 30 | 30 outside their wilaya polygon |
| `packages/jeunesse/data/institutions.json` | 22 | 22 outside their wilaya polygon |
| `packages/emploi/data/alem.json` | 20 | 20 outside their wilaya polygon |
| `packages/tourisme/data/lodging.json` | 17 | 17 outside their wilaya polygon |
| `packages/mosquees/data/mosquees.json` | 14 | 14 outside their own commune outline |
| `packages/ecoles/data/ecoles.json` | 13 | 13 outside their own commune outline |
| `packages/telecom/data/5g-djezzy.json` | 12 | 12 outside their wilaya polygon |
| `packages/pharmacies/data/pharmacies.json` | 7 | 7 outside their own commune outline |
| `packages/banques/data/branches.json` | 5 | 5 outside their wilaya polygon |
| `packages/poste/data/atms.json` | 5 | 5 outside their wilaya polygon |
| `packages/sante/data/sante.json` | 4 | 4 outside their own commune outline |
| `packages/tourisme/data/parks.json` | 4 | 4 outside their wilaya polygon |
| `packages/cliniques/data/cliniques.json` | 2 | 2 outside their own commune outline |
| `packages/culture/data/culture.json` | 2 | 2 outside their own commune outline |
| `packages/ferroviaire/data/stations.json` | 2 | 2 outside their own commune outline |
| `packages/ooredoo/data/stores.json` | 1 | 1 outside its own commune outline |
| `packages/telecom/data/5g-mobilis.json` | 1 | 1 outside its wilaya polygon |

The list is exact in both directions: a record that stops needing its entry fails
the guard rather than keeping it, so the 396 can only shrink.

## One count this batch deliberately raises

`scripts/validate-packages.mjs` also warns when a record's coordinate is outside the
display-grade polygon of the wilaya it declares. That count is **960 on `main`, 245
after the wilaya-first join, and 373 now**. The rise from 245 is the correction, not a
regression: 140 of the 373 are inside the OpenStreetMap outline of the commune they
name, so it is the shipped wilaya polygon that is wrong about them, not the record.
89 of those 140 are the #171 pairs (79 in wilaya 55 against the wilaya 30 polygon, 10
in wilaya 47 against the wilaya 58 polygon) and the rest are display-grade seams. They
stay warnings until #171 rebuilds those polygons from their member communes.

## Files

| File | Contents |
| --- | --- |
| `record-exceptions.json` | the 396 records, grouped by file, each with its kind, the clause of the join that decides it, whether it pre-exists `origin/main`, and the reason per group |

Regenerate with `node scripts/build-wilaya-containment-exceptions.mjs --write`.
