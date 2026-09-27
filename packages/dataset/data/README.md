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
├── csv/
│   ├── wilayas.csv
│   └── communes.csv
├── geojson/
│   ├── wilayas.geojson          ← point features
│   ├── communes.geojson         ← point features
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
  "created": "original"
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
| `created` | string | `"original"` (1–31), `"1984"` (32–48), `"2019"` (49–58), or `"2025"` (59–69) |

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
| `code_commune` | integer | Unique ONS 2021 administrative code (`WWCC`); communes promoted in 2025 retain their 2021 mother-wilaya prefix |

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

- **69 wilayas** — complete (original 48 + 2019 reform + 2025 reform)
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
relations (**ODbL 1.0, © OpenStreetMap contributors** — the rest of this package is MIT) and
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

## Sources

- Journal Officiel No. 25, April 5, 2026 (Law 26-06) for wilayas 59–69 and for the commune lists of wilayas 3, 5, 7, 12, 13, 14, 17, 26, 28 and 32
- Journal Officiel No. 40, June 3, 2026 (Presidential decree 26-206) for the names and chef-lieux of wilayas 59–69
- Journal Officiel No. 78, December 18, 2019 (Law 19-12) for wilayas 49–58
- Ministry of Interior (interieur.gov.dz)
- APS (Algérie Presse Service)
- Echorouk Online, Awras, Djelfa Info, Aures News, El Moudjahid, France 24 Arabic
- Algérie Poste for postal codes
- OpenStreetMap `admin_level=4` relations (ODbL 1.0) for `geojson/wilaya-boundaries.geojson`
- OpenStreetMap `admin_level=8` relation `admin_centre` nodes (ODbL 1.0) for the 56 commune centres corrected on 2026-09-27
