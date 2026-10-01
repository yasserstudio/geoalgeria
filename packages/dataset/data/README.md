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
├── dairas.json                  ← 551 dairas
├── communes_w1_w23.json         ← communes for wilayas 1–23
├── communes_w24_w48.json        ← communes for wilayas 24–48
├── communes_w49_w69.json        ← communes for wilayas 49–69
├── name-history.json            ← former names, so an older spelling still finds the record
├── retired-ids.json             ← daira ids that no longer exist and are never reused
├── wilaya-capitals.metadata.json          ← the chef-lieu of each wilaya, with its decree
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
  "capital_commune_code": 1601
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | integer | Wilaya number (1–69) |
| `name_fr` | string | French name |
| `name_ar` | string | Arabic name |
| `phone_code` | string | Telephone area code |
| `postal_code` | string | Main postal code |
| `latitude` | number | Latitude of the capital commune's centre, the same value as that commune's `latitude` |
| `longitude` | number | Longitude of the capital commune's centre, the same value as that commune's `longitude` |
| `created` | string | The year the wilaya became official: `"original"` (1–48, Law 84-09 of 1984), `"2019"` (49–58, Law 19-12), `"2026"` (59–69, Law n° 26-06, *JO* n° 25 of 5 April 2026) |
| `capital_commune_code` | integer | The `code_commune` of the wilaya's capital (chef-lieu); join it for the capital's names, postal code and coordinates |

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
(the Owner's rule of 2026-10-01).
Before that rule, 65 of the 69 wilaya points were a separate OpenStreetMap
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
  "code_commune": 101
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

## Wilaya boundaries

`geojson/wilaya-boundaries.geojson` — 69 features (68 `Polygon`, 1 `MultiPolygon` for Alger),
`properties.code` joining to `wilayas.json`. Derived from OpenStreetMap `admin_level=4`
relations (**ODbL 1.0, © OpenStreetMap contributors**, one of the two carve-outs from this
package's MIT licence; the other is the 256 OpenStreetMap-derived commune centres below) and
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

Six more were replaced in version 2.1.0 with the centroid of the commune's own
`admin_level=8` relation, after they had shared a placeholder point with a neighbour:
Belarbi (2242), El Hamdania (2616), Ouled Bouachra (2627), Deux Bassins (2653),
Makhda (2915) and El Euch (3427). Si Mahdjoub (2644) and El Achir (3407) shared a
placeholder with two of those but were left as they were, so they are still on their
pre-2.1.0 values and carry no OpenStreetMap provenance.

**Licence.** Those 256 points are **ODbL 1.0, © OpenStreetMap contributors**, and so is every
copy of them in `algeria.json`, `communes_w*.json`, `csv/communes.csv`,
`geojson/communes.geojson` and `sql/full.sql`. Reusing them means attributing OpenStreetMap
contributors and keeping derived databases under a compatible licence. The other 1,285
commune points carry no recorded source and are covered by the package's MIT licence; no
ODbL claim is made over them. Per-part terms are in the package `LICENSE` and `NOTICE`, and
the per-source breakdown is in `geojson/communes.metadata.json`.

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
- OpenStreetMap `admin_level=8` relation `admin_centre` nodes (ODbL 1.0) for the 250 commune centres corrected on 2026-09-27 (56), 2026-09-29 (189) and 2026-10-01 (5)
- OpenStreetMap `admin_level=8` relation centroids (ODbL 1.0) for the 6 commune centres replaced in version 2.1.0
