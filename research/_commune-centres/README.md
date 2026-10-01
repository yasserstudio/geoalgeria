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

That audit is the section below.

# The 1,541-row seat audit (2026-09-29)

Private tracker #170. Every commune centre compared with the `admin_centre`
(chef-lieu) node of its own OSM `admin_level=8` relation, which is the class the
containment sweep could not see. The expected diff was indeed much larger.

- Overpass `timestamp_osm_base` **2026-09-29T12:54:47Z**, one endpoint
  (`overpass-api.de`) for the whole run, because mirrors are independently
  replicated and drift by hours.
- ODbL 1.0, (c) OpenStreetMap contributors.
- Reproduced by `node scripts/audit-commune-centres.mjs --fetch --geometry --write`.

## Coverage

1,537 of the 1,541 communes matched an `admin_level=8` relation, and every one of
those relations carries an `admin_centre` node. The four with no relation at all
in this pull are Souk Oufella (630), Bir Touta (1634), Collo (2110) and Dhayet
Bendhahoua (4703); no relation was left without a commune.

The join is `ref:ONS` to `code_commune` for 1,477 rows. 54 more are relations
that still carry a **pre-2019-reform** ONS code, resolved inside the set of
communes whose current wilaya declares that code's wilaya as its
`mother_wilaya_code` in `packages/dataset/data/wilayas.json`, and only where
exactly one of them answers to the OSM name. The 2026 reform needs none of that:
wilayas 59 to 69 kept their mother wilaya's commune codes, so Aflou's communes
still read `03xx` on both sides. Six relations are pinned by id in
`scripts/audit-commune-centres.mjs` with what was checked, all six a
transliteration gap rather than an ambiguity (In Ghar / Inghar, Megarine /
Magarine, and four like them).

## What it found

Every count in this section is the state **before** the corrections below were
applied, which is what the audit measured. The post-correction bands are in
`seat-distance-2026-09-29.md` (over 300 m: 668, over 1 km: 307, median 218 m).

| Band | Communes |
| --- | --- |
| over 300 m | 857 |
| over 1 km | 496 |
| over 5 km | 238 |
| largest | 108.7 km (Sidi Slimane, 3221) |

The median delta over all 1,537 rows is **402 m**. That is the headline: this is
not a short list of defects, and a delta on its own is not a defect at all, since
our value and the OSM node are two hand-placed claims about the same seat.

So the audit ran the 2026-09-27 test over every row instead of over 68: a second
Overpass pull (`out geom`) fetched each matched relation's unsimplified boundary
and both points were tested against it. **215 stored centres are outside their
own commune**, which no containment rule here could have found because the wilaya
outlines are simplified and a wilaya is enormous. 188 of those also have their
relation's `admin_centre` node inside the commune, inside the declared wilaya, and
carrying the commune's own name, which is the 2026-09-27 standard met in full.

Several are a recognisable class. Wilaya 1 (Adrar) has four: Fenoughil, Ouled
Ahmed Timmi and Tamest hold a **positive** longitude where the chef-lieu is west
of Greenwich, and Tit holds Timekten's longitude to four decimals. Others keep
their latitude exactly and lose the longitude, or the reverse, which is the
bad name-based join already diagnosed in `research/_communes-reconcile/README.md`.

### Two rules the first pass got wrong, and a review caught

The first pass of this audit decided 174, not 188, and missed one row entirely.
Both causes were the audit reading its own evidence too narrowly, and both are now
`scripts/lib/seat-evidence.mjs`, unit-tested in `test/seat-evidence.test.mjs`.

**Name agreement was strict key equality** on the seat node's folded FR or AR name,
and the evidence gate depended on it. The capture harvests `wikidata` on the
relation AND on its `admin_centre` node and read neither, so eleven rows stayed
exceptions while OpenStreetMap stated outright that the node is that commune's
seat: Hanif/Ahnif (1006), Serguine/Serghine (1439), Illilten/Souk El Had (1533),
Beni-Zikki/Aït Ziki (1546), Beni Ourtilane (1922), Emjez Edchich (2120), El
Hachem/Hachem (2907), El Gueitena/El Gueitna (2938), Nesmot/Nesmoth (2945),
Tassala Lematai/Tessala (4316) and Inghar/In Ghar (5302). Three more differ by the
definite article alone: Rahia (426) against OSM's "El Rahia", 57.5 km out, and
Matemore (2914) and Herenfa (215) against `مطمور` and `هرانفة`. Agreement is now
the folded name, the article-free folded name, or one shared wikidata item, which
over the 1,537 compared rows reads: name 1,365, wikidata 54, article 14, none 104.
Inghar's correction alone takes 14 mosques back out of In Salah.

**Containment is blind to a mangled ordinate** inside a commune large enough to
hold both values. Fenoughil (115) shipped `[0.3, 27.602777]` for a seat at
`[-0.30211, 27.606097]`, 59.3 km away, with `ours_in_own_commune: true` either way,
so it was not among the 215 and no rule here could ever have failed it. A stored
value whose sign-flipped or lat/lon swapped form lands within a kilometre of the
seat is not two claims disagreeing; it is our value, mangled, and a named defect.
Over all 1,537 rows the detector finds exactly two, Fenoughil and Ouled Ahmed Timmi
(121), which the first pass had already corrected on containment. It runs in the
audit and as a standing guard over all five carriers, with no exceptions list: a
row that trips it is a correction waiting to be written.

## All 189 were applied

`corrections-2026-09-29.json` carries those 189 rows in the exact shape
`scripts/fix-commune-centres.mjs` reads, with the evidence per row, and they were
applied in the 2026-10 batch. The script now reads every corrections file in date
order (`scripts/lib/commune-corrections.mjs`), so the 2026-09-27 batch is replayed
alongside this one on every run instead of being retired; a row already at its `to`
is a no-op and a carrier that missed an older batch still fails.

Moving them took fourteen dependent packages with it. `sante`, `agriculture`,
`industrie-pharmaceutique` and `djezzy` cannot replay a generator offline and went
through `scripts/sync-commune-centroid-dependents.mjs`; `ecoles`, `cliniques`,
`pharmacies`, `mosquees`, `culture` and `ooredoo` were rebuilt with ordered
`--cache` runs (`sante` before `cliniques`, per `RELEASING.md`), and
`enseignement-superieur`, `formation-professionnelle`, `gares-routieres`,
`ferroviaire` and `buses` by their own generators, which the validator's
borrowed-centre check and the corrected join nominated.

The join itself was the second thing a review caught, and it took two passes to get
right. Every one of those packages stamped `wilaya_code` and `commune` by **unrestricted
nearest commune centroid**, so moving 245 centres carried 58 published records into a
wilaya whose polygon does not contain them: mosque `31-0390`, at
`[-0.414678, 35.547628]`, is inside OSM commune 3111 Oued Tlelat in wilaya 31 and read
Zahana in wilaya 29.

The first replacement pinned the candidate communes to the wilaya whose **shipped
polygon** contains the point. That is wrong wherever a shipped polygon is, and the
shipped wilaya 55 polygon is about 50 km short of the decree boundary (#171), so it
moved 79 records out of El-Hadjira (5507) and El Alia (5513) into N'goussa (3003) in
wilaya 30: mosque `55-0051` at `[5.513943, 32.615544]` is inside OSM's El-Hadjira
relation 6542937 and read N'goussa, 56.1 km from the centre it was given. A
record-in-declared-wilaya guard could not see it either, because it asked only about the
same wrong polygon.

The rule is now `scripts/lib/commune-resolver.mjs`, and the commune outline decides
first and globally:

1. a coordinate with fewer than three decimals is too coarse to re-join at all, so the
   published commune stands (`kept_low_precision`);
2. a commune OSM ships no relation for cannot be contradicted by geometry, so the
   published commune stands (`kept_no_outline`): Souk Oufella, Bir Touta, Collo and
   Dhayet Bendhahoua, whose territory is still inside the commune they were split out
   of;
3. any commune whose OSM outline contains the point wins outright, searched over the
   whole country, and its **wilaya comes from the commune registry**, never from a
   wilaya polygon (`commune_outline`);
4. only where no outline holds the point does distance decide, among the communes of
   the wilaya whose shipped polygon does plus any outline-less commune within 10 km
   (`wilaya_nearest`);
5. a point no wilaya polygon holds keeps its published commune (`kept_outside_wilaya_polygons`).

A record moves commune only where containment supports the move or the point has left
its old commune's outline, and the per-rule tally is
`research/_commune-centres/linkage-2026-09-29.json`, regenerated by
`node scripts/report-commune-linkage.mjs --write`. Across the 70,015 located records of
all 46 record files, records inside the OSM outline of the commune they name go from
**82.4% to 99.6%**. `test/record-in-declared-wilaya.test.mjs` holds every one of those
files to the commune outline first and the wilaya polygon only where there is no outline
to ask (`research/_wilaya-containment/README.md`).

Not one published id changed: 0 retired, 0 minted and the same sequence in all
fourteen, verified per package before and after. Three of them would have churned ids
and did not. `sante`'s MSP capture re-pairs FR/AR posts once corrected commune
names land and retires published ids, so its coordinates moved offline instead
(the same decision as 2026-09-27). `ooredoo` had no carry-over at all: its ids are
`{wilaya}-{seq}` from the nearest-centroid join, and the two stores that changed
wilaya re-sequenced 43 ids and retired `20-004` and `31-034` on the first replay,
so the generator now pins each store back to the id it shipped under, keyed on
Ooredoo's own store id. `ferroviaire` was the same gap and got the same fix: its
`{wilaya}-{seq}` ids re-sequenced on the 18 stations the corrected join moved,
retiring and minting 18 public join keys, so its generator now pins each station back
to the id it shipped under, keyed on its Wikidata or OSM id. A published id is never
retired or renumbered unless the place itself is gone (Owner rule, 2026-09-29); a
record that re-joins keeps its id, which is why a mosque id can read `26-0114` while
its `wilaya_code` reads `10`.

## The standing guard

`test/commune-centre-in-commune.test.mjs` fails when any commune centre, in any of
the seven files that carry one, is **outside its own commune**. It reads two files
and fetches nothing:

| File | Contents |
| --- | --- |
| `commune-boundaries.json` | one entry per commune: the OSM `admin_level=8` outer and inner rings, its bbox, the relation id, and the centre's distance to the reduced boundary |
| `containment-exceptions.json` | the 27 centres still outside their own commune and the 4 communes with no usable OSM geometry, each with the reason it is there |

The rule used to be distance, not containment: until 2026-09-29 the guard failed
any centre more than 1 km from its recorded seat, with **496** pinned exceptions.
The Owner replaced it the same day (private tracker #170), and the reason is the
table above: the median disagreement is 402 m and a delta is two hand-placed claims
about one town, so a rule needing 496 exceptions was measuring the disagreement
rather than an error. Containment is a fact about one claim on its own. The seat
delta survives as a report, `seat-distance-2026-09-29.md`, which no test reads.

The exceptions are therefore defects, not a tolerance. 26 of the 27 are centres
outside their own commune whose relation's `admin_centre` node is not this commune's
seat on any of the three reads `seat-evidence.mjs` makes, so it is no evidence of
where the seat is; the 27th (Beni Zid, 2111) has its `admin_centre` outside the
commune too, which makes the boundary or the linkage the suspect. It was 41 until the
wikidata and article reads landed. The list is exact in both directions: a commune
that stops needing its entry fails the guard rather than keeping it.

A second standing guard rides the same carriers with no exceptions list at all: no
commune centre may be its own OSM seat with a dropped minus or its two ordinates
swapped. That is Fenoughil's class, which containment cannot see.

The polygons are simplified, and that is proved rather than asserted.
`scripts/build-commune-boundary-cache.mjs` reduces the 52 MB `out geom` pull with
Douglas-Peucker at **0.0005 degrees** (~55 m, about 30 times finer than the shipped
wilaya outlines) at 5 decimals, and refuses to write unless all 1,541 verdicts are
identical to the verdict from the unsimplified rings. Six centres sit within that
tolerance of their boundary (Bitam 26 m, Tigzirt 5 m, Assi-Youcef 33 m, Staoueli
31 m, Khraissia 52 m, Djaafra 44 m); each is inside, and a future centre that lands
that close is decided by `osm-2026-09-29/containment.json`, computed from the full
geometry, not by the cache.

Bethioua is the guard's honest limit, and the test states it: its repudiated value
was inside the Arzew LNG complex, inside its own commune, so containment cannot see
that class either. It was caught by a human report (issue #167) and nothing has
replaced that.

Seven rows carry a separate smell no distance or containment rule can express: the
OSM seat itself falls outside the wilaya we declare the commune in, which makes the
linkage or the shipped outline the suspect. Three of them (El Alia, El-Hadjira,
Mansoura) are the same rows the 2026-09-27 pass left for review; the other four are
coastal (Tigzirt, El Marsa, Hadjret Ennous, Bologhine Ibnou Ziri), where the
simplified outline cuts inside the shoreline. All seven are listed under
`seat_in_declared_wilaya` in `audit-2026-09-29.json`; the wilaya outlines are #171,
not this audit.

The `osm_relation_id` and `wikidata` harvested here (1,536 of 1,537 communes, 69
of 69 wilayas) stay in `research/`. Publishing them as package fields is #181.

## Files

| File | Contents |
| --- | --- |
| `audit-2026-09-29.json` | every compared row with both coordinates, the delta, how it matched and the containment verdicts |
| `audit-2026-09-29.md` | the counts and the full list above 300 m, sorted by delta, with a hint per row |
| `corrections-2026-09-29.json` | the 189 decided errors, applied in the 2026-10 batch |
| `../_wilaya-containment/record-exceptions.json` | the 245 pre-existing records outside their declared wilaya, which the corrected join does not derive |
| `commune-boundaries.json` | the reduced commune outlines the standing guard holds the data to |
| `containment-exceptions.json` | the guard's exceptions, with a reason each |
| `osm-seat-reference.json` | the seat per commune, which the seat-distance report measures against |
| `seat-distance-2026-09-29.md` | the seat delta as a report, over 1 km by delta; no test reads it |
| `osm-2026-09-29/admin-relations.json` | the reduced, committed Overpass capture |
| `osm-2026-09-29/containment.json` | one containment verdict per commune from the geometry pull |
| `osm-2026-09-29/overpass-query.overpassql` | the query, verbatim |

The two raw Overpass responses are 55 MB of way-member lists and full boundary
geometry, so they are gitignored working inputs; the reduced captures beside them
are the reviewable record.

# The five wilaya capital centres (2026-10-01)

Private tracker #236. Found while reviewing #228 (the wilaya capital field, data
PR #242) and pre-existing on `main`. Five **wilaya capital (chef-lieu) communes**
sat 3 to 6 km from the seat of the town they are the chef-lieu of:

| Code | Commune | Wilaya | was | now | moved | decided by |
| --- | --- | --- | --- | --- | --- | --- |
| 701 | Biskra | 7 | `5.751048, 34.8` | `5.729074, 34.850882` | 6,003 m | OSM node [299682811](https://www.openstreetmap.org/node/299682811) |
| 717 | El Kantara | 61 | `5.666831, 35.192365` | `5.709284, 35.223115` | 5,154 m | OSM node [427910708](https://www.openstreetmap.org/node/427910708) |
| 2501 | Constantine | 25 | `6.642433, 36.365` | `6.608428, 36.364164` | 3,046 m | OSM node [27564946](https://www.openstreetmap.org/node/27564946) |
| 3201 | El Bayadh | 32 | `1.020278, 33.721667` | `1.018245, 33.684319` | 4,157 m | OSM node [452440133](https://www.openstreetmap.org/node/452440133) |
| 5201 | Beni-Abbes | 52 | `-2.17, 30.08` | `-2.169031, 30.131743` | 5,754 m | OSM node [1573488063](https://www.openstreetmap.org/node/1573488063), confirmed by the Owner |

All five published values are the commune's own OpenStreetMap `admin_centre` node,
so all five are **ODbL 1.0, (c) OpenStreetMap contributors** and all five count
toward the carve-out: 250 ledger rows, **256** OpenStreetMap-derived centres with
the 6 relation centroids of 2.1.0, and 1,285 that carry no recorded source.

The fifth row differs in how it was **nominated**, not in where its value comes
from, and that distinction is the Owner's rule of 2026-10-01:

> A coordinate a human reads off a proprietary map may only **confirm** an open
> source, within 500 m, and it is the open coordinate that ships.

So the Owner's Google Maps reading of Beni-Abbes is recorded in the row as
`owner_confirmation`, naming what it confirms, where it was read and how far it
sits from the published value (268 m). It is never `to`. No proprietary map is the
provenance of any coordinate this package publishes, and the ledger-shape test
fails any row that ships something other than its own `admin_centre` node.

## Why this needed a standard of its own

Neither guard this directory already has could see them.

- **Containment is blind**: all four stored centres were *inside* their own
  commune the whole time. That is Bethioua's class, which the standing guard's
  own section above names as its honest limit.
- **The seat delta is not a defect**, by the Owner's 2026-09-29 decision (#170).
  That audit measured a median disagreement with the `admin_centre` node of 402 m
  over all 1,537 compared rows, before its own corrections, and a delta says two
  hand-placed claims about one town disagree, not which one is wrong. The shipped
  bands are the report `seat-distance-2026-09-29.md`; **132 non-capital centres are
  still more than 3 km from their seat** and none of them is corrected here.

What makes a capital different is that a capital has **two further claims about
the same town** that a commune centre is not derived from:

1. **the wilaya's own published point**, which comes from the wilaya's
   `admin_level=4` relation, a different OpenStreetMap object from the commune's
   `admin_level=8` `admin_centre` node;
2. **the geometric median of the `geo_precision: exact` records** other packages
   place inside this commune's own OpenStreetMap outline: pharmacies, schools,
   mosques, post offices, bank branches. They are selected by point-in-polygon
   rather than by the `commune` they name, so the selection cannot depend on the
   centre under test.

A row qualifies only where it is a wilaya capital commune, its seat delta is over
3 km, and **both** of those put the town at the node rather than at the stored
centre:

| Commune | wilaya point to stored / to seat | exact-record median to stored / to seat (n) |
| --- | --- | --- |
| Biskra (701) | 5,799 / 371 m | 5,903 / 348 m (264) |
| El Kantara (717) | 4,789 / 731 m | 5,137 / 211 m (40) |
| Constantine (2501) | 4,150 / 1,746 m | 2,493 / 1,535 m (529) |
| El Bayadh (3201) | 4,602 / 487 m | 4,791 / 730 m (164) |

Over all 69 capitals that two-claim criterion selects exactly four, and
**Beni-Abbes is not one of them**. Its wilaya-point leg argues the wrong way: the
wilaya 52 point is 6,735 m from the repudiated centre and 8,786 m from the
corrected one, because that point is **itself** about 8.8 km from its capital's
town centre. So the criterion could not nominate it, and the test at the bottom of
`test/capital-centre-near-seat.test.mjs` asserts that exclusion rather than
tolerating it, so nothing here pretends the criterion settled the fifth row.

## Beni-Abbes (5201): the Owner nominated it, OpenStreetMap supplies the value

The criterion could not reach this row, so the Owner raised it, reading the town
centre off Google Maps on 2026-10-01 and supplying `30.1310763, -2.1663499`. Under
the rule above that reading is a confirmation, not a value: what ships is the
commune's own `admin_centre` node, [1573488063](https://www.openstreetmap.org/node/1573488063),
re-read live from `api.openstreetmap.org` the same day and stored in the row as
`osm.admin_centre_point` so every check re-runs offline.

| Check | Repudiated centre | Published value (the node) |
| --- | --- | --- |
| exact-record median, 40 records over 16 files | 5,628 m | **139 m** |
| the Owner's independent reading | 5,690 m | **268 m** |

268 m is inside the 500 m at which two hands stop reading the same place, so the
Owner's reading and OpenStreetMap's node are one claim about one town centre rather
than two places, and the reading corroborates the move instead of merely labelling
it: it is 5,690 m from the value being repudiated. The relation (6530989) also
still carries the pre-reform `ref:ONS` `0807`, which is why this row joined on that
code plus the name inside the mother wilaya.

## Wilaya 52's own capital point is also wrong, and is not fixed here

`wilayas.csv` puts wilaya 52 at `-2.1, 30.08`, which is 8,786 m from its capital's
town centre. It is a separate record with a separate owner: **data PR #242 (#228)**
edits every one of the five carriers that hold a wilaya point, adds
`capital_commune_code` to the wilaya 52 row itself, ships the capital-point tests,
and has already moved one such point (wilaya 16, from an `admin_centre` that fell
in Kouba onto Alger Centre's own centre) on exactly this reasoning. Correcting it
here would collide with that branch head-on, so it is reported instead.

Two consequences for #242, both checked against its branch rather than guessed:

- its capital-point check is **nearest commune centre**, and it still passes:
  after this move 5201 is 8.79 km from the wilaya 52 point and the next nearest
  centre, Igli (5205), is 26.89 km, so the nearest centre is still the capital.
- its prose "**0.0 to 6.7 km** out for the rest" was measuring wilaya 52, and
  becomes 0.0 to 8.8 km once this batch lands. That sentence needs updating when
  the two branches meet.

## Source

The values are the same `admin_centre` nodes as the 2026-09-29 pull
(`timestamp_osm_base` **2026-09-29T12:54:47Z**), and each of the four was
**re-read from the OpenStreetMap node API on 2026-10-01** before it was written,
so the number in the data was confirmed against the live node and not only
against a committed capture. ODbL 1.0, (c) OpenStreetMap contributors.

## The guard

`test/capital-centre-near-seat.test.mjs`, which fetches nothing. For each of the
five it holds all seven carriers to the ledger's value, tests the value against
the commune outline, and asserts every claim that applies to that row **in both
directions**: the corrected centre inside an absolute 2 km ceiling and the
repudiated one outside it. A test that only checked the new value would have passed
on the old one for three of the four, and "closer than before" is not a fact about
one claim. Which claims apply is read from the row itself, so Beni-Abbes is held to
the facility median and to the 500 m confirmation ceiling, and its failing
wilaya-point leg is asserted as a failure the ledger has to admit rather than
quietly left out. The ledger-shape test also refuses any row whose published value
is not its own `admin_centre` node, which is how the confirmation rule is enforced
rather than remembered.

Dependents: 47 borrowed coordinates in four packages. 15 in
`@geoalgeria/formation-professionnelle`, rebuilt by re-running its own generator
against its committed capture, offline; and, through
`scripts/sync-commune-centroid-dependents.mjs`, 14 in
`@geoalgeria/industrie-pharmaceutique`, 12 in `@geoalgeria/agriculture` and 6 in
`@geoalgeria/sante`. No record changed commune or wilaya, because every one of the
four moves stays inside its own commune outline and the join asks the outline
first.

Four of those 14 were a gap a review caught, not this batch's own work.
`@geoalgeria/industrie-pharmaceutique` was registered in that script for
`commune_centroid` only, so its `wilaya_centroid` rows, which carry
`commune: null` by design and therefore have no anchor to be compared against,
were invisible to the staleness check in `scripts/validate-packages.mjs` as well:
`07-dm-01`, `25-pp-06`, `25-pp-07` and `25-pp-14` were still sitting byte-exact on
the repudiated Biskra and Constantine centres, 6.0 and 3.0 km out, while
`@geoalgeria/agriculture` rows of the same `geo_method` had moved in both earlier
batches. The `repudiated` anchor is the only rule that reaches them and it is
exact: it moves a coordinate only where it is byte-equal to a value a corrections
file repudiates, and only to that row's replacement.

| File | Contents |
| --- | --- |
| `corrections-2026-10-01.json` | the 5 rows, each with its `decided_by`, the OSM relation and node, the node's own coordinate, and every independent claim measured against both the repudiated and the corrected value |

---

# The coordinate review, layers L0 to L2 (2026-10-01)

Private tracker #243. Decision record:
[`docs/adr/0001-coordinate-review-by-independent-votes.md`](../../docs/adr/0001-coordinate-review-by-independent-votes.md).
Terms (Claim, Candidate, Vote, Copied claim, Consensus, Review queue):
[`CONTEXT.md`](../../CONTEXT.md#coordinate-review).

Each of the three rounds above was a hand-run script, and each re-learned the same
lessons: one source is never enough, a source our value was copied from looks like
agreement and proves nothing, and nearest-centre tests pass on wrong data where
containment does not. This round is the engine instead: `scripts/review/`, layers as
modules behind one interface, thresholds as named constants in one module with the
measurement behind each, and a run that reads committed snapshots only, so
`test/review-decisions.test.mjs` re-derives every decision offline.

## The set, and what came out

The 137 communes the 2026-09-29 audit left more than 3 km from their OpenStreetMap
seat, or with no seat at all, minus Beni-Abbes (5201), which the capitals batch above
settled: **136 reviewed**.

| Outcome | Communes |
| --- | --- |
| Strong consensus fix, written to `corrections-2026-10-01b.json` | 68 |
| Confirmed at the point we already publish (Ouled Brahim, 2612) | 1 |
| Review queue, `review-queue-2026-10-01.json` | 67 |

Every one of the 68 was won by the OpenStreetMap `admin_centre` seat, so every
published value is ODbL and no second licence enters the package. The moves run from
3,058 m to 22,910 m.

The queue, by why the rules refused to decide it:

| Reason | Communes | What it means |
| --- | --- | --- |
| `plain_consensus` | 32 | two Votes, but not three and not with the record median among them |
| `no_consensus` | 23 | fewer than two independent Votes, usually because Wikidata carries the seat's own coordinate and the two are one reading |
| `split_votes` | 5 | a Candidate outside the leading answer also has a Vote |
| `move_over_cap` | 3 | Strong consensus for a move over 25 km, which the engine never makes on its own |
| `no_candidates` | 4 | no open source states anything: no relation, so no seat, no Wikidata item and no outline to take a median inside |

Tamridjet (646) is the case the prototype got wrong, and it is in the queue:
OpenStreetMap's seat and Wikidata back a point 4.7 km west, the median of the exact
records inside its outline backs the point we publish, 1.6 km away. Two Votes picked
the western answer under a plain 2-vote rule; here the median's Vote for the other
answer blocks it, which is what `split_votes` is for.

## What the rules changed about the prototype

Two readings of ADR 0001 had to be made explicit once there were four Candidates rather
than the prototype's two. Both are in `scripts/review/votes.mjs`, and because they change
what "two Votes for one Candidate" counts, both are written into the decision record, which
the Owner confirmed on 2026-10-01 (ADR 0001, "Rules 2 to 4 in detail"), and into
`CONTEXT.md` as the term **Answer**:

- **Candidates that agree are one answer.** The seat, the Wikidata point and the
  record median landing 400 m apart are the same answer stated three times. Counted as
  rivals they take two Votes each and cancel out, and every commune would queue.
- **Two Claims within the copy radius of each other cast one Vote between them.** They are
  Copied claims of one another, whichever way the copying went, which is the sense
  `CONTEXT.md` now records under that term. The per-Candidate rule already stops each of
  them voting for the other's Candidate; without this they still vote through a third
  Candidate in the same answer and the count reads as two independent Claims when it is
  one. The ledger names the silenced one under `not_independent` as a `copy_of` the one
  that stands. It bites often: 19 Wikidata items are within a metre of their commune's seat
  node and 325 within 50 m of it, and over this run the rule silences a Vote on 24 of the 67
  queued communes.

## The optional L3 layer, and why the ledger is not it

The Google agreement verdicts of ADR 0001 layer L3 live outside this repository, and
`--verdicts <path>` reads them. Run with that file, the same rules settle **89** rather
than 68 and queue 46 rather than 67, because a third Vote lifts most of the
`plain_consensus` rows. The committed ledger is deliberately the run **without** it: a
committed row has to re-derive from committed inputs, which is what
`test/review-decisions.test.mjs` asserts, and no Google content, verdict or
coordinate, enters this repository. `node scripts/review/run.mjs --write --verdicts …`
refuses to run for the same reason.

## Dependents

`scripts/fix-commune-centres.mjs --write` applied the 68 to all seven flagship
carriers. `scripts/fix-wilaya-capital-points.mjs` changed nothing: no wilaya capital
commune is among the 68, so the 69 wilaya points already were their capital commune's
centre. Through `scripts/sync-commune-centroid-dependents.mjs --write`, 11 borrowed
coordinates moved in `@geoalgeria/sante` and 2 in `@geoalgeria/agriculture`;
`@geoalgeria/formation-professionnelle` was rebuilt from its committed capture and 39
of its commune-derived points followed. No record changed commune or wilaya.

El Euch (3427) is the one row with a history to reconcile. Version 2.1.0 took it off a
shared placeholder onto its relation's centroid, and this run moved it 9.7 km further,
onto its own `admin_centre` node, on three independent Votes. Both repairs are real and
they are in order, so the earlier one is recorded as superseded rather than deleted:
`scripts/fix-jo-corrections.mjs` reads the correction ledgers and leaves a coordinate
alone where a later ledger has moved it, instead of reading it as drift. It also leaves
the relation-centroid carve-out at 5 communes rather than 6, which NOTICE, `data/README.md`,
`communes.metadata.json` and `test/osm-derived-centre-count.test.mjs` all say; that test
reads `data/README.md` now too, because the file states the split behind the total and
nothing was holding it to it.

## The licence count

The carve-out goes from 256 to **323** OpenStreetMap-derived commune centres: 318 from
an `admin_centre` node (56 on 2026-09-27, 189 on 2026-09-29, 5 on 2026-10-01 and these
68) and 5 from a relation centroid. The other 1,218 commune coordinates carry no
recorded source. `test/osm-derived-centre-count.test.mjs` now derives that from
`CORRECTION_FILES` rather than a hand-written list of ledgers, which is how this batch
could otherwise have landed applied and uncounted, and it reads each consensus row's
own licence from the Candidate that won it.

11 of the 27 entries in `containment-exceptions.json` were resolved by these fixes, so
that list is down to 16, rebuilt with
`node scripts/build-commune-boundary-cache.mjs --write`. 14 of the 16 are in the review
queue; the other 2 sit outside their own commune but within 3 km of their seat, so this
engine never looked at them.

## What release day still owes

ADR 0001 rule 5 says a commune still undecided at release "keeps its published point and is
listed in `record-exceptions.json` with its reason". That file,
`research/_wilaya-containment/record-exceptions.json`, is about records that fall outside
their declared wilaya, which is a different question from a commune centre, and its guard
(`test/record-in-declared-wilaya.test.mjs`) finds the same set as before this batch, so
nothing was added to it. 16 of the 67 undecided centres are listed in
`containment-exceptions.json` because they sit outside their own commune; the other 51 exist
only in `review-queue-2026-10-01.json`. If the Owner wants every undecided commune named in
a committed list at release, that list is the queue file, and saying so in rule 5 is the
amendment to make.

## Measuring the thresholds

Every number in `scripts/review/thresholds.mjs` is measured on the committed snapshots,
and the measurement is in the comment beside it. They were taken with the engine's own
helpers:

The run is replayed, not re-run: `rewind()` puts the corrected communes back at their
`from`, which is the state the measurements were taken on and the state
`test/review-decisions.test.mjs` asserts against.

```js
// seat to record median, over the communes that have both: the AGREEMENT_KM
// and COPY_RADIUS_M measurements
import { loadSnapshots } from "./scripts/review/snapshots.mjs";
import { geometricMedian } from "./scripts/review/layers/l2-record-median.mjs";
import { metresBetween } from "./scripts/lib/seat-evidence.mjs";
const s = loadSnapshots();
const d = [];
for (const c of s.communes) {
  const seat = s.seats.byCommune.get(c.code_commune)?.seat;
  const pts = s.records.byCommune.get(c.code_commune)?.points ?? [];
  if (!seat || pts.length < 10) continue;
  const m = geometricMedian(pts);
  d.push(metresBetween(m[0], m[1], seat[0], seat[1]));
}
d.sort((a, b) => a - b);
```

The Wikidata copy figures in `COPY_RADIUS_M` come from the same snapshot, by distance
rather than by equality, so the radius each one is measured at is stated with it:

```js
// 212 published centres within a metre of their commune's Wikidata coordinate, 531
// within 50 m; 19 of those coordinates within a metre of their commune's seat node,
// 325 within 50 m
const near = (a, b, m) => metresBetween(a[0], a[1], b[0], b[1]) <= m;
```

`research/_commune-centres/wikidata-reference.json` is the CC0 snapshot the review reads
for its L1 Wikidata Claim: 1,536 commune items, every one carrying P625, queried
2026-10-01. Refresh it in place with
`node scripts/review/wikidata-reference.mjs --fetch` and review the diff; the engine
itself never queries live.

| File | Contents |
| --- | --- |
| `corrections-2026-10-01b.json` | the 68 fixes, each with `decided_by: "consensus"`, the licence of the winning Candidate, every Candidate with its distance and Vote count, and every Vote with its source, snapshot date, distance and copy flag |
| `review-queue-2026-10-01.json` | the 67 undecided and the 1 confirmed, in the same shape plus the reason, for the Owner's review page |
| `wikidata-reference.json` | the CC0 Wikidata P625 snapshot, 1,536 communes, queried 2026-10-01 |
