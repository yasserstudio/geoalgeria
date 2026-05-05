# GeoAlgeria

> The complete Algerian geodata package — 69 wilayas, 597 dairas, 1,657 communes. One `npm install` away.

Still copy-pasting wilaya lists from PDFs? Still using datasets stuck at 48 wilayas? GeoAlgeria is the first CI-validated, npm-installable Algerian geodata — updated for the 2025 reform. JSON, CSV, GeoJSON, SQL, TypeScript.

[![Validate Dataset](https://github.com/yasserstudio/geoalgeria/actions/workflows/validate.yml/badge.svg)](https://github.com/yasserstudio/geoalgeria/actions/workflows/validate.yml)
[![npm](https://img.shields.io/npm/v/geoalgeria)](https://www.npmjs.com/package/geoalgeria)
[![npm downloads](https://img.shields.io/npm/dm/geoalgeria)](https://www.npmjs.com/package/geoalgeria)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Quick Facts

Algeria has **69 wilayas** (provinces), **597 dairas** (districts), and **1,657 communes** (municipalities) as of 2025. This reflects two territorial reforms: Law 19-12 (2019, added wilayas 49–58) and Law 26-06 (2025, added wilayas 59–69). Source: Journal Officiel de la République Algérienne (JORA). GeoAlgeria is the only dataset that includes all post-reform divisions with postal codes, GPS coordinates, and bilingual names. Last validated: May 2025.

---

## Why GeoAlgeria?

Tired of datasets that still think Algeria has 48 wilayas? Same.

| Feature | geoalgeria | leblad | algeria-cities |
|---------|:-:|:-:|:-:|
| All 69 wilayas (2025 reform) | ✅ | ❌ (58) | ✅ |
| Dairas as first-class entities | ✅ | ❌ | ❌ |
| Postal codes per commune | ✅ | ✅ | ❌ |
| Coordinates per commune | ✅ | ❌ | ✅ |
| E-commerce ready (flat, denormalized) | ✅ | ❌ | ❌ |
| Delivery zone templates | ✅ | ❌ | ❌ |
| npm package + TypeScript | ✅ | ✅ | ❌ |
| SQL dump (MySQL/PG/SQLite) | ✅ | ❌ | ✅ |
| CI-validated on every commit | ✅ | ❌ | ❌ |
| GeoJSON export | ✅ | ❌ | ✅ |
| Arabic + French bilingual | ✅ | ✅ | ✅ |
| Last updated | 2025 | 2021 | 2023 |

Ready to try it? Jump to [Install](#install) or grab the [raw JSON](data/ecommerce/communes.json) directly.

Also referred to as: Algerian provinces (wilayas), districts (dairas), municipalities (communes), cities of Algeria, code postal Algérie, liste des communes d'Algérie JSON, Algeria GeoJSON, wilayas 2025, base de données wilayas Algérie, Algeria administrative divisions dataset.

---

## Who's This For?

- **E-commerce devs** — address forms, shipping zone config, postal code validation
- **Backend engineers** — seed your DB with one SQL file
- **Frontend devs** — cascading dropdowns (wilaya → daira → commune)
- **GIS / data analysts** — GeoJSON with 1,637 point features
- **Civic tech builders** — government apps, citizen portals
- **Students & researchers** — clean, structured, well-documented data

---

## Install

```bash
npm install geoalgeria
```

```javascript
const dz = require('geoalgeria');

dz.wilayas;                    // all 69 wilayas
dz.communes;                   // all 1,657 communes
dz.dairas;                     // all 597 dairas
dz.ecommerce;                  // flat dataset for address forms

dz.getWilaya(16);              // { name_fr: "Alger", name_ar: "الجزائر", ... }
dz.getCommunesByWilaya(16);    // 57 communes in Algiers
dz.getDairasByWilaya(16);      // dairas in Algiers
dz.findCommune('Oran');        // search by name (FR or AR)
dz.findByPostalCode('16000');  // lookup by postal code
```

TypeScript types included out of the box.

**Using this in production?** [Tell us about it](https://github.com/yasserstudio/geoalgeria/discussions) — we feature community projects in the README.

---

## Use Without npm

### CDN (no install needed)

```html
<script>
  fetch('https://cdn.jsdelivr.net/gh/yasserstudio/geoalgeria@main/data/ecommerce/communes.json')
    .then(r => r.json())
    .then(communes => { /* build your dropdown */ });
</script>
```

### E-commerce / address forms

Grab `data/ecommerce/communes.json` — flat, denormalized, no joins:

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

### Database seeding

Download `data/sql/full.sql` from this repo, then:

```bash
# PostgreSQL
psql -d mydb -f full.sql

# MySQL
mysql mydb < full.sql

# SQLite
sqlite3 mydb.sqlite < full.sql
```

### GIS / Mapping

Download `data/geojson/communes.geojson` from this repo — standard GeoJSON, works with Leaflet, Mapbox, QGIS, etc.

> **Note:** SQL, CSV, and GeoJSON files are available in the GitHub repo. The npm package ships JSON files only to keep the install lightweight.

---

## All Files

| File | Format | Records | Best for |
|------|--------|---------|----------|
| `data/algeria.json` | JSON | 69 wilayas + communes | Single-file usage |
| `data/wilayas.json` | JSON | 69 | Wilaya list only |
| `data/dairas.json` | JSON | 597 | Daira list with commune counts |
| `data/communes_w*.json` | JSON | 1,657 | Detailed commune data |
| `data/csv/wilayas.csv` | CSV | 69 | Spreadsheets, imports |
| `data/csv/communes.csv` | CSV | 1,657 | Spreadsheets, imports |
| `data/geojson/wilayas.geojson` | GeoJSON | 69 | Maps, GIS |
| `data/geojson/communes.geojson` | GeoJSON | 1,637 | Maps, GIS |
| `data/sql/full.sql` | SQL | 69 + 1,637 | Normalized database |
| `data/ecommerce/communes.json` | JSON | 1,657 | Address forms, dropdowns |
| `data/ecommerce/communes.csv` | CSV | 1,657 | Flat import |
| `data/ecommerce/communes.sql` | SQL | 1,657 | Single-table database |
| `data/delivery/*.json` | JSON | 69 per provider | Shipping zone calculation |

## Schema

See [`data/README.md`](data/README.md) for full field documentation.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). We welcome:

- Data corrections (with official sources)
- Missing commune coordinates (20 remaining)
- Delivery zone data from real carrier accounts (Yalidine, ZR Express, Maystro)
- New export formats (XML, YAML, PHP arrays, etc.)
- Translations and transliteration fixes

**First time contributing?** Look for issues labeled `good first issue` — many just need adding coordinates for a single commune.

---

## Versioning

This dataset uses [Semantic Versioning](https://semver.org/). See [CHANGELOG.md](CHANGELOG.md).

---

## Built With This Data

Using geoalgeria in your project? [Open a discussion](https://github.com/yasserstudio/geoalgeria/discussions) and we'll feature it here.

---

## Support

Every star helps the next Algerian developer find clean data instead of broken PDFs. **[Star this repo](https://github.com/yasserstudio/geoalgeria)** if it saved you time.

Found wrong data? [Open an issue](https://github.com/yasserstudio/geoalgeria/issues/new/choose) — we fix it within 48h, guaranteed.

---

## Preview

View all 69 wilayas on a map: [`algeria.geojson`](algeria.geojson) (GitHub renders this automatically)

---

## FAQ

**How many wilayas does Algeria have in 2025?**
69. The original 48, plus 10 added in 2019 (Law 19-12), plus 11 added in 2025 (Law 26-06).

**Where can I find a list of all Algerian communes in JSON?**
Right here — `data/ecommerce/communes.json` has all 1,657 communes in a flat, ready-to-use format.

**What are the new wilayas added in 2025?**
Wilayas 59-69: Aflou, Ain Oussera, Barika, Bir El Ater, Bou Saada, Chelghoum Laid, Kolea, Mila, Reggane, Sedrata, El Aricha.

**How can I get Algeria postal codes in JSON format?**
Install `geoalgeria` via npm or download `data/ecommerce/communes.json` directly — it includes all 1,657 postal codes mapped to commune names in French and Arabic.

**What is the best Algeria geodata package for developers?**
GeoAlgeria is the most complete option as of 2025 — it is the only npm package with all 69 wilayas, postal codes, coordinates, dairas, and delivery zone templates in one install. CI-validated on every commit.

**Liste des wilayas d'Algérie 2025 — où trouver?**
GeoAlgeria contient les 69 wilayas avec noms en français et arabe, codes postaux, et coordonnées GPS. Disponible en JSON, CSV, GeoJSON, et SQL. `npm install geoalgeria`

---

## License

MIT — free for personal and commercial use.

Made with care by [Yasser's Studio](https://yasser.studio) | [geoalgeria.com](https://geoalgeria.com)
