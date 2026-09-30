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
├── dairas.json                  ← 556 dairas
├── communes_w1_w23.json         ← communes for wilayas 1–23
├── communes_w24_w48.json        ← communes for wilayas 24–48
├── communes_w49_w69.json        ← communes for wilayas 49–69
├── name-history.json            ← former names, so an older spelling still finds the record
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
  "latitude": 36.7525,
  "longitude": 3.04197,
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
| `latitude` | number | Capital city latitude |
| `longitude` | number | Capital city longitude |
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
| `id` | integer | Sequential ID (1–564) |
| `wilaya_code` | integer | Parent wilaya code |
| `name_fr` | string | French name |
| `commune_count` | integer | Number of communes in this daira |

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
- **556 dairas**
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
package's MIT licence; the other is the 62 OpenStreetMap-derived commune centres below) and
simplified with mapshaper (`dp 2%`, `keep-shapes`), coordinates rounded to 3 decimals.

Display-grade, not survey-grade: the median gap between kept vertices is 3.4 km, so the
outline can depart from the true border by much more than the ~150 m the coordinate rounding
implies. Full provenance in `geojson/wilaya-boundaries.metadata.json`.

## Commune centres

A commune's `latitude`/`longitude` is its chef-lieu, not the polygon centroid of its
territory, so it is a point in the built-up centre of the commune.

56 of them were corrected on 2026-09-27 from the `admin_centre` node of the commune's
OpenStreetMap `admin_level=8` relation, after a sweep of all 1,541 against the wilaya
polygons found 68 outside their own wilaya. Alger Centre had been in the sea east of the
port and Bethioua inside the Arzew industrial complex. Method, per-row evidence (relation
id, node id, Overpass `timestamp_osm_base`) and the 13 hits that turned out to be boundary
simplification rather than bad points: `research/_commune-centres/` in the repository.

Six more were replaced in version 2.1.0 with the centroid of the commune's own
`admin_level=8` relation, after they had shared a placeholder point with a neighbour:
Belarbi (2242), El Hamdania (2616), Ouled Bouachra (2627), Deux Bassins (2653),
Makhda (2915) and El Euch (3427). Si Mahdjoub (2644) and El Achir (3407) shared a
placeholder with two of those but were left as they were, so they are still on their
pre-2.1.0 values and carry no OpenStreetMap provenance.

**Licence.** Those 62 points are **ODbL 1.0, © OpenStreetMap contributors**, and so is every
copy of them in `algeria.json`, `communes_w*.json`, `csv/communes.csv`,
`geojson/communes.geojson` and `sql/full.sql`. Reusing them means attributing OpenStreetMap
contributors and keeping derived databases under a compatible licence. The other 1,479
commune points carry no recorded source and are covered by the package's MIT licence; no
ODbL claim is made over them. Per-part terms are in the package `LICENSE` and `NOTICE`, and
the per-source breakdown is in `geojson/communes.metadata.json`.

## Sources

- Journal Officiel No. 25, April 5, 2026 (Law 26-06) for wilayas 59–69 and for the commune lists of wilayas 3, 5, 7, 12, 13, 14, 17, 26, 28 and 32
- Journal Officiel No. 40, June 3, 2026 (Presidential decree 26-206) for the names and chef-lieux of wilayas 59–69
- Journal Officiel No. 22, March 25, 2021 (Presidential decree 21-117) for the names and chef-lieux of wilayas 49–58
- Journal Officiel No. 14, April 3, 1984 (Decree 84-79) for the names and chef-lieux of wilayas 1–48
- Journal Officiel No. 78, December 18, 2019 (Law 19-12) for wilayas 49–58
- Ministry of Interior (interieur.gov.dz)
- APS (Algérie Presse Service)
- Echorouk Online, Awras, Djelfa Info, Aures News, El Moudjahid, France 24 Arabic
- Algérie Poste for postal codes
- OpenStreetMap `admin_level=4` relations (ODbL 1.0) for `geojson/wilaya-boundaries.geojson`
- OpenStreetMap `admin_level=8` relation `admin_centre` nodes (ODbL 1.0) for the 56 commune centres corrected on 2026-09-27
- OpenStreetMap `admin_level=8` relation centroids (ODbL 1.0) for the 8 commune centres replaced in version 2.1.0
