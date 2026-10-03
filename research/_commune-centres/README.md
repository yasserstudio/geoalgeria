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

### The cache is proved, and it is refreshed

Two things could weaken the guard without anything failing, because `pnpm validate`
neither re-pulls OpenStreetMap nor rebuilds the cache: a hand edit to the committed
geometry, and the cache going stale.

The edit is answered by `commune-boundaries.provenance.json`, the cache's content
digest held in its own file. `test/boundary-cache-provenance.test.mjs` recomputes it
on every run, so moving one ordinate of one ring now fails a test instead of quietly
moving a verdict. The digest is deliberately not a field inside the cache: a digest
cannot cover the document it sits in without first defining itself away, and a
payload and its proof in one file is one edit in one place. It is taken over a
canonical serialisation of the whole document, provenance fields included, rather
than over the file's bytes, so a re-indent is not a failure and a changed
`timestamp_osm_base` or `tolerance_deg` is. The reasoning is in
`scripts/lib/boundary-cache-provenance.mjs`.

Staleness is answered by `.github/workflows/refresh-commune-boundary-cache.yml`,
monthly and on demand. It makes one Overpass request, rebuilds the cache, and
compares verdicts rather than geometry: the rings always move, but a pull request is
only opened when a centre crossed its own boundary either way, or a commune's
geometry became or stopped being usable. `scripts/diff-boundary-verdicts.mjs` writes
that diff as the pull-request body. `generated` follows `timestamp_osm_base` rather
than the clock, so an unchanged OSM base rebuilds to the same bytes and the month
passes with no diff at all. The workflow never pushes to `main`: every row it finds
is a hand decision about one commune's coordinates.

## Files

| File | Contents |
| --- | --- |
| `audit-2026-09-29.json` | every compared row with both coordinates, the delta, how it matched and the containment verdicts |
| `audit-2026-09-29.md` | the counts and the full list above 300 m, sorted by delta, with a hint per row |
| `corrections-2026-09-29.json` | the 189 decided errors, applied in the 2026-10 batch |
| `../_wilaya-containment/record-exceptions.json` | the 245 pre-existing records outside their declared wilaya, which the corrected join does not derive |
| `commune-boundaries.json` | the reduced commune outlines the standing guard holds the data to |
| `commune-boundaries.provenance.json` | that file's content digest, held outside it so a hand edit to a ring fails a test |
| `containment-exceptions.json` | the guard's exceptions, with a reason each |
| `osm-seat-reference.json` | the seat per commune, which the seat-distance report measures against |
| `seat-distance-2026-09-29.md` | the seat delta as a report, over 1 km by delta; no test reads it |
| `osm-2026-09-29/admin-relations.json` | the reduced, committed Overpass capture |
| `osm-2026-09-29/containment.json` | one containment verdict per commune from the geometry pull |
| `osm-2026-09-29/overpass-query.overpassql` | the query, verbatim |

The two raw Overpass responses are 55 MB of way-member lists and full boundary
geometry, so they are gitignored working inputs; the reduced captures beside them
are the reviewable record.
