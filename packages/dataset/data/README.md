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
├── dairas.json                  ← 555 dairas
├── communes_w1_w23.json         ← communes for wilayas 1–23
├── communes_w24_w48.json        ← communes for wilayas 24–48
├── communes_w49_w69.json        ← communes for wilayas 49–69
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
| `postal_code` | string | Commune postal code |
| `latitude` | number | Latitude (null for 20 communes pending verification) |
| `longitude` | number | Longitude (null for 20 communes pending verification) |
| `code_commune` | integer | Official administrative code (null for 20 communes) |

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
| `postal_code` | string | Postal code |

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
- **555 dairas**
- **1,528 communes** (deduplicated; reconciliation toward the official 1,541 in progress — see the changelog)
- **Postal codes** — 100%
- **Formats** — JSON, CSV, GeoJSON, SQL

## Wilaya boundaries

`geojson/wilaya-boundaries.geojson` — 69 features (68 `Polygon`, 1 `MultiPolygon` for Alger),
`properties.code` joining to `wilayas.json`. Derived from OpenStreetMap `admin_level=4`
relations (**ODbL 1.0, © OpenStreetMap contributors** — the rest of this package is MIT) and
simplified with mapshaper (`dp 2%`, `keep-shapes`), coordinates rounded to 3 decimals.

Display-grade, not survey-grade: the median gap between kept vertices is 3.4 km, so the
outline can depart from the true border by much more than the ~150 m the coordinate rounding
implies. Full provenance in `geojson/wilaya-boundaries.metadata.json`.

## Sources

- Journal Officiel No. 25, April 5, 2026 (Law 26-06) for wilayas 59–69
- Journal Officiel No. 78, December 18, 2019 (Law 19-12) for wilayas 49–58
- Ministry of Interior (interieur.gov.dz)
- APS (Algérie Presse Service)
- Echorouk Online, Awras, Djelfa Info, Aures News, El Moudjahid, France 24 Arabic
- Algérie Poste for postal codes
- OpenStreetMap `admin_level=4` relations (ODbL 1.0) for `geojson/wilaya-boundaries.geojson`
