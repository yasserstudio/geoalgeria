# Data Structure

## Quick Start

| I need... | Use this |
|-----------|----------|
| Everything in one file | `algeria.json` |
| Address dropdown for my app | `ecommerce/communes.json` |
| Seed my database | `sql/full.sql` or `ecommerce/communes.sql` |
| Plot on a map | `geojson/communes.geojson` |
| Draw wilaya outlines / choropleth | `geojson/wilaya-boundaries.geojson` |
| Import into Excel/Sheets | `csv/communes.csv` |

## Files

```
data/
├── algeria.json                 ← unified: wilayas + nested communes
├── wilayas.json                 ← 69 wilayas (flat)
├── wilayas.csv                  ← the same 69, with the reform and count columns
├── dairas.json                  ← 551 dairas
├── communes_w1_w23.json         ← communes for wilayas 1–23
├── communes_w24_w48.json        ← communes for wilayas 24–48
├── communes_w49_w69.json        ← communes for wilayas 49–69
├── name-history.json            ← former names, so an older spelling still finds the record
├── phone-code-provenance.json   ← why wilayas 59–69 carry the `phone_code` they carry
├── retired-ids.json             ← daira ids that no longer exist and are never reused
├── wilaya-capitals.metadata.json          ← the chef-lieu of each wilaya, with its decree
├── osm-links.metadata.json                ← coverage, tiers + Overpass snapshots behind osm_relation_id / wikidata
├── csv/
│   ├── wilayas.csv
│   └── communes.csv
├── geojson/
│   ├── wilayas.geojson          ← point features
│   ├── communes.geojson         ← point features
│   ├── communes.metadata.json             ← their provenance + licence split
│   ├── wilaya-boundaries.geojson          ← 69 wilaya polygons (OSM, ODbL)
│   └── wilaya-boundaries.metadata.json    ← its provenance + simplification
├── sql/
│   └── full.sql                 ← normalized (wilayas + communes tables with FK)
├── ecommerce/
│   ├── communes.json            ← flat, denormalized, one-table design
│   ├── communes.csv
│   └── communes.sql             ← single CREATE + INSERT, plug-and-play
└── delivery/
    ├── yalidine.json            ← delivery zones (community-maintained)
    ├── zr_express.json
    └── maystro.json
```

## Schemas

### Wilaya

```json
{
  "code": 16,
  "name_fr": "Alger",
  "name_ar": "الجزائر",
  "phone_code": "021",
  "postal_code": "16000",
  "latitude": 36.776335,
  "longitude": 3.058211,
  "created": "original",
  "capital_commune_code": 1601,
  "osm_relation_id": 157062,
  "wikidata": "Q141026"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | integer | Wilaya number (1–69) |
| `name_fr` | string | French name |
| `name_ar` | string | Arabic name |
| `phone_code` | string \| null | Telephone area code, `null` where no official text allocates one |
| `postal_code` | string | Main postal code |
| `latitude` | number | Latitude of the capital commune's centre, the same value as that commune's `latitude` |
| `longitude` | number | Longitude of the capital commune's centre, the same value as that commune's `longitude` |
| `created` | string | The year the wilaya became official: `"original"` (1–48, Law 84-09 of 1984), `"2019"` (49–58, Law 19-12), `"2026"` (59–69, Law n° 26-06, *JO* n° 25 of 5 April 2026) |
| `capital_commune_code` | integer | The `code_commune` of the wilaya's capital (chef-lieu); join it for the capital's names, postal code and coordinates |
| `osm_relation_id` | integer \| null | The id of this wilaya's OpenStreetMap `admin_level=4` administrative relation; null where the capture has none |
| `wikidata` | string \| null | The Wikidata item that relation carries (`Q` then digits); null where it carries no `wikidata` tag |

`capital_commune_code` comes from the decrees that fix the names and chefs-lieux
of the wilayas, never from the wilaya's own name: décret n° 84-79 of 3 April 1984
(*JO* n° 14, pp. 295–296) for 1–48, décret présidentiel n° 21-117 of 22 March 2021
(*JO* n° 22, pp. 7–8) for 49–58, and décret présidentiel n° 26-206 of 25 May 2026
(*JO* n° 40 of 3 June 2026, p. 5) for 59–69. Deriving it from the name resolves 65
of 69 and gets 4 wrong: wilaya 16's capital is `1601` (Alger Centre, there is no
commune called "Alger"), and wilayas 53, 54 and 57 spell their capital commune
`Ain Salah`, `Ain Guezzam` and `El-M'ghaier`. A commune promoted into wilayas
59–69 keeps its 2021 mother-wilaya prefix, so a capital code need not start with
its wilaya code: wilaya 59 (Aflou) reads `319`. Per-wilaya source, citation and
the one point where the decree and OpenStreetMap disagree:
[`wilaya-capitals.metadata.json`](wilaya-capitals.metadata.json).

A wilaya's `latitude`/`longitude` **is** the centre of its capital commune, the same
value and not a second reading of it, so there is one point to verify per capital
(the Owner's rule of 2026-10-01, rule 9 of
`docs/adr/0001-coordinate-review-by-independent-votes.md`).
Before that rule, 66 of the 69 wilaya points were a separate OpenStreetMap
`admin_level=4` `admin_centre`, up to 8.8 km from the commune they were the capital
of (wilaya 52, Beni-Abbes), and one of them, wilaya 55, sat outside its capital
commune altogether. Each now reads its commune's own coordinate, and the check is
containment in that commune's OpenStreetMap outline plus equality,
`test/wilaya-capital-commune.test.mjs`.

A wilaya point therefore carries whatever terms its capital commune's centre
carries. 6 of the 69 wilaya capital points are among the OpenStreetMap-derived
commune centres below, so
they are **ODbL 1.0, © OpenStreetMap contributors** wherever they appear: wilayas 7
(Biskra), 16 (Alger Centre), 25 (Constantine), 32 (El Bayadh), 52 (Beni-Abbes) and
61 (El Kantara). The other 63 wilaya capital points are the centres of communes with
no recorded source.

`created` is the year the creating law took effect, never the year a reform was
announced: wilayas 59–69 were announced on 2025-11-16 and are still `"2026"`.
`wilayas.json` carries the same value as a number, spelling the 1984 cohort
`1984` instead of `"original"`, and its `metadata.reforms[].year` matches the
`created` of the wilayas that reform added.

`phone_code` is `null` wherever no official text allocates a code, which today is
all eleven wilayas of the 2026 cohort (59–69). See
[Telephone area codes](#telephone-area-codes) below.

### Commune (full)

```json
{
  "name_fr": "Adrar",
  "name_ar": "أدرار",
  "wilaya_code": 1,
  "daira": "Adrar",
  "postal_code": "01000",
  "latitude": 27.87429,
  "longitude": -0.297222,
  "code_commune": 101,
  "osm_relation_id": 4171602,
  "wikidata": "Q251181"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name_fr` | string | French name |
| `name_ar` | string | Arabic name |
| `wilaya_code` | integer | Parent wilaya code (1–69) |
| `daira` | string | Parent daira name (French) |
| `postal_code` | string \| null | Commune postal code (null for 5 communes with no citable code) |
| `latitude` | number | Latitude (100% geocoded — no nulls) |
| `longitude` | number | Longitude (100% geocoded — no nulls) |
| `code_commune` | integer | Unique ONS 2021 administrative code (`WWCC`); communes promoted in 2026 retain their 2021 mother-wilaya prefix |
| `osm_relation_id` | integer \| null | The id of this commune's OpenStreetMap administrative relation, `admin_level=8` but for 3 relations mis-tagged upstream; null on the 1 commune OpenStreetMap holds no commune relation for |
| `wikidata` | string \| null | The Wikidata item that relation carries (`Q` then digits); null where it carries no `wikidata` tag, and on the 1 commune whose tag was proved to name a different place |

### Commune (e-commerce)

```json
{
  "id": 586,
  "commune_name_fr": "Aïn El Ibel",
  "commune_name_ar": "عين الإبل",
  "daira_name_fr": "Aïn El Ibel",
  "wilaya_code": 17,
  "wilaya_name_fr": "Djelfa",
  "wilaya_name_ar": "الجلفة",
  "postal_code": "17001"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Sequential ID (1–1541) |
| `commune_name_fr` | string | French name |
| `commune_name_ar` | string | Arabic name |
| `daira_name_fr` | string | Parent daira (French) |
| `wilaya_code` | integer | Wilaya number |
| `wilaya_name_fr` | string | Wilaya French name (denormalized) |
| `wilaya_name_ar` | string | Wilaya Arabic name (denormalized) |
| `postal_code` | string \| null | Postal code (null for the same 5 communes) |

### Daira

```json
{
  "id": 1,
  "wilaya_code": 1,
  "name_fr": "Adrar",
  "commune_count": 3
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Stable ID, 1 to 566 with 15 retired ids that are not reused, so the table is 551 rows |
| `wilaya_code` | integer | Parent wilaya code |
| `name_fr` | string | French name, the name of the daira's seat commune |
| `commune_count` | integer | Number of communes in this daira |

A commune names its daira by this `name_fr`, in every carrier that repeats the
linkage, so the two always join. A daira that stops existing leaves its id in
`retired-ids.json` with the reason, and a new daira takes a fresh id, so an id a
consumer holds never comes back meaning something else. A daira that is renamed,
or reseated on another of its communes, keeps its id: the id belongs to the body
of communes, not to the seat.

### Where the daira lists come from

Executive decree n° 26-253 of 15 July 2026 (*Journal Officiel* n° 52 of 21 July
2026) fixes the communes each chef de daïra administers in **wilayas 3, 5, 7,
12, 13, 14, 17, 26, 28, 32 and 59–69**: **142 dairas**, carried here exactly as
its annex prints them. It leaves the remaining 48 wilayas under decree n° 91-306
of 24 August 1991, and those lists as this dataset holds them come to **409**.

**551 is therefore this dataset's count, not a published national total**: no
post-reform text states one. The reading of the annex, and what it does and does
not settle, is in [`research/_dairas/`](../../../research/_dairas/).

### Counts are derived, never typed

`dairas_count` and `communes_count` are summaries of `dairas.json` and the three
commune splits, so they are generated from them by
[`scripts/sync-division-counts.mjs`](../../../scripts/sync-division-counts.mjs)
and never hand-edited. It writes the per-wilaya counts in `wilayas.json` and
`wilayas.csv`, the two totals in `wilayas.json`'s `metadata`, and the header of
`sql/full.sql`; `test/division-counts.test.mjs` fails when any of them differs
from the records.

`wilayas.csv` carries one figure the records cannot produce. The ten wilayas the
2026 reform took territory from state what they held **before** it in
`communes_count`/`dairas_count` and what they hold **now** in
`post_reform_communes`/`post_reform_dairas`; every other row states its current
figures in the first pair. The pre-reform pair is history, sourced in the
[changelog](../CHANGELOG.md), and is the only count left to hand.

## SQL Schema

### Normalized (`sql/full.sql`)

Two tables with a foreign key:

```sql
wilayas (code PK) → communes (wilaya_code FK)
```

### E-commerce (`ecommerce/communes.sql`)

Single denormalized table — no joins needed:

```sql
communes (id PK, commune_name_fr, commune_name_ar, daira_name_fr, wilaya_code, wilaya_name_fr, wilaya_name_ar, postal_code)
```

## Coverage

- **69 wilayas** — complete (original 48 + 2019 reform + 2026 reform)
- **551 dairas**
- **1,541 communes** (complete; the 13 name-twin communes of the reform wilayas were added 2026-07-29 from `research/_communes-reconcile/`)
- **Postal codes** — 100%
- **OpenStreetMap / Wikidata links** on 1,537 / 1,536 of the 1,541 communes and on all 69 wilayas
- **Formats** — JSON, CSV, GeoJSON, SQL

## Former names

`name-history.json` lists every name this dataset, or GeoAlgeria's own
published copy of it, used to carry, with the official text that replaced it:
2 wilayas and 178 communes as of the April 2026 corrections. The current name is
authoritative; a former name still finds its record and is never a label. `require("geoalgeria").findCommune(name)` matches both, so an
address stored before a correction still resolves.

```json
{
  "code_commune": 527,
  "wilaya_code": 5,
  "name_fr": "Lemsane",
  "name_ar": "لمسان",
  "former_names_fr": ["Lemcene"],
  "former_names_ar": [],
  "sources": ["JORA n° 25 (2026), law 26-06 art. 9, item 24, p. 4"]
}
```

## Telephone area codes

A `phone_code` for a wilaya of the 2026 cohort (59–69) comes from an official
text or it is not published at all: never from the wilaya it was split from, never
from an encyclopaedia or a directory. None of the eleven has one, so all eleven
are `null`, and `phone-code-provenance.json` carries the answer rather than
leaving the gap bare: the authorities searched, and for each text its title, URL,
own date, retrieval date, the article read and what was found there. Read the
finding there, not here, so there is one copy of it.
`require("geoalgeria").phoneCodeProvenance` reads it.

```json
{
  "code": 59,
  "name_fr": "Aflou",
  "name_ar": "آفلو",
  "phone_code": null,
  "reason": "no-official-allocation"
}
```

`reason` names an entry under `metadata.reasons`, which carries the statement and
the search log behind it. A later allocation becomes a `phone_code` with its own
`citations` there, and the same value in `algeria.json`, `csv/wilayas.csv`,
`geojson/wilayas.geojson` and `sql/full.sql`, which a test keeps in step. The
rules are `scripts/lib/phone-code-provenance.mjs`: a value has to cite a declared
official text and name the article it was read at, the source has to sit on the
gazette's, the regulator's or the operator's own domain, and a value equal to the
one carried by the wilaya it was split from has to declare that coincidence rather
than pass silently. Wilayas 1–58 are outside this ledger: their codes predate it
and no official citation has been established for them yet.

## Wilaya boundaries

`geojson/wilaya-boundaries.geojson` — 69 features (68 `Polygon`, 1 `MultiPolygon` for Alger),
`properties.code` joining to `wilayas.json`. Derived from OpenStreetMap `admin_level=4`
relations (**ODbL 1.0, © OpenStreetMap contributors**, one of the two carve-outs from this
package's MIT licence; the other is the 323 OpenStreetMap-derived commune centres below) and
simplified with mapshaper (`dp 2%`, `keep-shapes`), coordinates rounded to 3 decimals.

Display-grade, not survey-grade: the median gap between kept vertices is 3.4 km, so the
outline can depart from the true border by much more than the ~150 m the coordinate rounding
implies. Full provenance in `geojson/wilaya-boundaries.metadata.json`.

Two features depart from upstream OSM on purpose, because OSM added each 2019 and 2026 reform
wilaya as a new relation without shrinking the parent it was carved out of:

- **2026-08-09**: El Aricha (63) subtracted from Tlemcen (13), which still spanned its
  pre-reform extent.
- **2026-09-29**: the territory of three communes moved to the wilaya each one declares.
  El Alia (5513) and El-Hadjira (5507) are communes of Touggourt (55) and were drawn as
  Ouargla (30); Mansoura (4713) is a commune of Ghardaïa (47) and was drawn as El Meniaa (58).
  Touggourt goes from 9,775 to 18,831 km2 and Ouargla from 144,496 to 135,440; Ghardaïa from
  21,218 to 26,008 and El Meniaa from 63,353 to 58,563. Each pair's total is unchanged to
  within 0.05 km2, and so is the union of all 69. The moved parts come from the communes' own
  OpenStreetMap `admin_level=8` outlines.

Neither is a defect re-sourcing from OSM would fix: a live pull reproduces both.

## Commune centres

A commune's `latitude`/`longitude` is its chef-lieu, not the polygon centroid of its
territory, so it is a point in the built-up centre of the commune.

250 of them were corrected from the `admin_centre` node of the commune's OpenStreetMap
`admin_level=8` relation, in three passes. 56 on 2026-09-27, after a sweep of all 1,541
against the wilaya polygons found 68 outside their own wilaya: Alger Centre had been in
the sea east of the port and Bethioua inside the Arzew industrial complex. 189 more on
2026-09-29, after every one of the 1,541 was compared with its own relation's
`admin_centre` and then tested against that relation's unsimplified boundary, which found
215 centres outside their own commune (Sidi Slimane was 108.7 km out). A centre is decided
wrong when that relation's `admin_centre` node is inside the commune, inside the declared
wilaya and is this commune's seat, and either the stored point is outside the commune or it
is the seat mangled: Fenoughil held the seat's longitude with the minus dropped, 59.3 km
away and inside its own commune either way, where containment alone is blind. Method,
per-row evidence (relation id, node id, Overpass `timestamp_osm_base`, the containment
verdicts) and the 27 left undecided: `research/_commune-centres/` in the repository.

Four more on 2026-10-01, and on a different standard, because containment cannot see their
class: the wilaya capital communes Biskra (701), El Kantara (717), Constantine (2501) and
El Bayadh (3201) each sat 3 to 6 km from the seat of the town they are the chef-lieu of,
inside their own commune the whole time. A seat delta on its own is not a defect, which is
why 132 non-capital centres are still more than 3 km from their seat and are left alone; a
capital qualified only where two claims this repository did not take the value from both
put the town at the seat instead: the wilaya's own published point, from its
`admin_level=4` relation, and the geometric median of the `geo_precision: exact` records
other packages place inside this commune's own OpenStreetMap outline. Over all 69 capitals
that selects exactly these four.

A fifth capital moved in the same batch, and it is the same source. Beni-Abbes (5201) sat
5,754 m from its town centre, and the two-claim criterion could not nominate it, because
wilaya 52's own point was 6,735 m from the repudiated centre and 8,786 m from the town:
that point was itself about 8.8 km out, and now reads this commune's corrected centre like
every other wilaya point. The project owner raised it instead, reading the town
centre off Google Maps on 2026-10-01. **That reading is not what ships.** The rule from
that day is that a coordinate read off a proprietary map may only confirm an open source,
within 500 m, and the open coordinate is what is published, so the value here is the
commune's own `admin_centre` node and the reading is recorded beside it as the
confirmation, 268 m away. The exact-record median is 139 m from the published value,
against 5,628 m from the repudiated one. It is ODbL like the other four and is counted
below.

68 more took that same `admin_centre` node on 2026-10-01, through the coordinate review
engine (`docs/adr/0001-coordinate-review-by-independent-votes.md`): each of the 136 centres more than 3 km from its seat, or with no
seat, was weighed against the open sources that state where its town is, and the node was
written only where at least three of them agree within 2 km, or two including the median
of the exact records inside the commune's own outline, with nothing backing a different
answer and the value inside that outline. The 67 the engine did not settle are in
`research/_commune-centres/review-queue-2026-10-01.json` and keep the coordinates they
had.

5 more were replaced in version 2.1.0 with the centroid of the commune's own
`admin_level=8` relation, after they had shared a placeholder point with a neighbour:
Belarbi (2242), El Hamdania (2616), Ouled Bouachra (2627), Deux Bassins (2653) and
Makhda (2915). El Euch (3427) was a sixth until the coordinate review moved it 9.7 km off
that centroid onto its own node, so it is counted with the node corrections above. Si
Mahdjoub (2644) and El Achir (3407) shared a placeholder with two of those but were left
as they were, so they are still on their pre-2.1.0 values and carry no OpenStreetMap
provenance.

**Licence.** Those 323 points are **ODbL 1.0, © OpenStreetMap contributors**: 318 from the
commune's own `admin_centre` node, 56 corrected on 2026-09-27, 189 on 2026-09-29, 5 on
2026-10-01 and 68 on 2026-10-01 by the coordinate review, and 5 from the relation centroid,
replaced in version 2.1.0. So is every
copy of them in `algeria.json`, `communes_w*.json`, `csv/communes.csv`,
`geojson/communes.geojson` and `sql/full.sql`. Reusing them means attributing OpenStreetMap
contributors and keeping derived databases under a compatible licence. The other 1,218
commune points carry no recorded source and are covered by the package's MIT licence; no
ODbL claim is made over them. Per-part terms are in the package `LICENSE` and `NOTICE`, and
the per-source breakdown is in `geojson/communes.metadata.json`.

## OpenStreetMap and Wikidata links

Every commune and wilaya carries `osm_relation_id`, the OpenStreetMap administrative
relation that *is* this record upstream (`admin_level=8` for a commune, `admin_level=4`
for a wilaya, bar three communes whose relation is mis-tagged upstream and is listed as
such below), and `wikidata`, the Wikidata item that relation carries. They exist so a
consumer can join a GeoAlgeria record to an OSM boundary, to Wikidata or to anything
keyed on either, instead of matching on a name, which is the join this dataset tells
everyone else not to make.

| Records | With a relation | With a Wikidata item |
|---|---|---|
| 1,541 communes | 1,540 | 1,538 |
| 69 wilayas | 69 | 69 |

Both fields are `null` where the source has none, and neither is ever guessed:

- **The linkage is the audit's, not a name match.** Most ids are harvested from the same
  Overpass capture the commune-centre audit compares centres against
  (`research/_commune-centres/osm-2026-09-29/`, `timestamp_osm_base`
  **2026-09-29T12:54:47Z**), through the linkage it wrote to
  `research/_commune-centres/osm-seat-reference.json`. A commune relation is joined on
  its `ref:ONS` tag (1,477 of them), then on a pre-2019-reform ONS code resolved inside
  the mother wilaya's carved-out communes (54), then on six reviewed per-relation pins:
  1,537 communes in all. A wilaya relation is joined on its `ref` tag.
- **A second tier of 3 communes**: Souk Oufella (630), Bir Touta (1634) and Collo
  (2110). That capture's query asks Overpass for `boundary=administrative` **and**
  `admin_level=8`, so a commune relation tagged any other way is invisible to it however
  correct its code is, and these three are exactly that case: relation `4069543` carries
  no `boundary` tag, relation `540555` carries neither a `boundary` nor an `admin_level`
  tag, and relation `6407308` is `admin_level=11`. All three carry the commune's own
  `ref:ONS` code, which is what they are linked on. They are fetched by id into a second
  capture, [`research/_osm-links/relations.json`](../../../research/_osm-links/relations.json),
  and listed under `second_tier` in the sidecar with the tag defect that hid each one.
  The tagging is an OpenStreetMap defect owed upstream; it is not a reason to leave the
  records unlinked.
- **1 commune has no relation**: Dhayet Bendhahoua (4703). No relation carrying
  `ref:ONS` 4703 is a commune: the only one is the Dayet Ben Dahoua **daira**, relation
  `6823963` at `admin_level=6`, which is a different place and covers more than this
  commune. Both fields stay null rather than linking a daira to a commune.
- **1 commune has a relation and no item tag**: Ain-Defla (4401), whose relation
  (`21037899`) carries no `wikidata` tag. The field stays null rather than resolving the
  item from the name.
- **1 commune has its item refused**: Tefreg (3424). Its relation is tagged
  `Q3517130`, which Wikidata types as a *village* and describes as being inside Tafreg
  commune; the commune's own item is `Q7674990`. The second-source check below found it,
  and the Owner decided on 2026-10-02 to publish `null` and keep the relation: carrying
  the village item would answer a different place, and substituting `Q7674990` would mean
  resolving an item ourselves, which this dataset does not do. An OpenStreetMap edit is
  owed on the relation. The exclusion is keyed on the commune code **and** on that exact
  item in `scripts/add-osm-links.mjs`, so the day the tag changes the run fails and the
  line is removed rather than silently suppressing whatever replaced it. It is recorded
  under `wikidata_excluded` in the sidecar.
- **One record is linked without an ONS code on the relation.** Five of the six pins
  above are spelling gaps: the relation carries the documented pre-2019-reform ONS code
  and this dataset spells the name differently. The sixth is Ain-Defla (4401), whose
  relation `21037899` carries no ONS code at all; it is claimed on the relation's name
  (`Commune Ain Defla`) together with being the single wilaya 44 relation still
  unclaimed once every other w44 commune had joined on its own code, and with its
  `admin_centre` node inside wilaya 44. That is name plus elimination, so 4401 is the
  one record whose link does not rest on a code the relation carries. Every other
  record's does, and none is linked by a name alone.
- **No id is repeated.** One relation is one place, so a relation id or a Wikidata item
  on two records would be a linkage defect; the validator fails on it rather than
  publishing a join that answers twice. A wilaya links to its own `admin_level=4`
  relation, never to its capital commune's, even though the two share a point.
- **A second source checks the links.** `research/_osm-links/wikidata-link-reference.json`
  is a committed snapshot of Wikidata's own `P402` (OpenStreetMap relation id) and `P31`
  (instance of) for every published item, read from the Wikidata SPARQL endpoint rather
  than from OpenStreetMap. Where Wikidata states a relation id (636 of the 1,607 items)
  it must be the one published here, and every item must be a commune or a province of
  Algeria. The disagreements it finds are listed with their reasons in
  `test/osm-wikidata-second-source.test.mjs`; a new one fails that test.

**Carriers.** The two ids are on the JSON records only: `algeria.json` at both levels,
`communes_w*.json` and `wilayas.json`. `csv/`, `geojson/`, `sql/` and `ecommerce/` do
not carry them in this release. Coverage, the tiers, the join rule and the records above
are in [`osm-links.metadata.json`](osm-links.metadata.json), regenerated by
`node scripts/add-osm-links.mjs --write` and checked by `--check`.

**Licence.** The ids are read out of OpenStreetMap, so these values are **ODbL 1.0,
© OpenStreetMap contributors** wherever they appear, like the boundary polygons and the
OSM-derived commune centres. The Wikidata items are OpenStreetMap tag values here, not
a Wikidata query. Per-part terms: the package `LICENSE` and `NOTICE`.

## Sources

- Journal Officiel No. 25, April 5, 2026 (Law 26-06) for wilayas 59–69 and for the commune lists of wilayas 3, 5, 7, 12, 13, 14, 17, 26, 28 and 32
- Journal Officiel No. 40, June 3, 2026 (Presidential decree 26-206) for the names and chef-lieux of wilayas 59–69
- Journal Officiel No. 22, March 25, 2021 (Presidential decree 21-117) for the names and chef-lieux of wilayas 49–58
- Journal Officiel No. 14, April 3, 1984 (Decree 84-79) for the names and chef-lieux of wilayas 1–48
- Journal Officiel No. 52, July 21, 2026 (Executive decree 26-253) for the daira lists of wilayas 3, 5, 7, 12, 13, 14, 17, 26, 28, 32 and 59–69
- Journal Officiel No. 78, December 18, 2019 (Law 19-12) for wilayas 49–58
- Ministry of Interior (interieur.gov.dz)
- APS (Algérie Presse Service)
- Echorouk Online, Awras, Djelfa Info, Aures News, El Moudjahid, France 24 Arabic
- Algérie Poste for postal codes
- OpenStreetMap `admin_level=4` relations (ODbL 1.0) for `geojson/wilaya-boundaries.geojson`
- OpenStreetMap `admin_level=8` commune relations (ODbL 1.0) for the wilaya 30/55 and 47/58 membership correction of 2026-09-29
- OpenStreetMap `admin_level=8` relation `admin_centre` nodes (ODbL 1.0) for the 318 commune centres corrected in the four batches above
- OpenStreetMap `admin_level=8` relation centroids (ODbL 1.0) for the 5 commune centres replaced in version 2.1.0
- OpenStreetMap `admin_level=8` and `admin_level=4` relations (ODbL 1.0) for `osm_relation_id` and for the `wikidata` item each relation carries, Overpass `timestamp_osm_base` 2026-09-29T12:54:47Z
