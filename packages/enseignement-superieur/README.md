<div align="center">

# @geoalgeria/enseignement-superieur

**Every higher-education institution in Algeria — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/enseignement-superieur)](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/enseignement-superieur)](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

110 higher-education institutions across Algeria — **universities**, grandes écoles, écoles
normales supérieures and centres universitaires — each with its official name, **its own
website**, institution **type**, wilaya / commune linkage and coordinates. Sourced from the
**Ministère de l'Enseignement Supérieur et de la Recherche Scientifique (MESRS)**, shipped as
JSON, CSV, and GeoJSON. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/enseignement-superieur
```

```js
import es from "@geoalgeria/enseignement-superieur";

const all = es.institutions();                  // 110
const inAlgiers = es.institutionsByWilaya(16);   // institutions in wilaya 16
const universities = es.institutionsByType("universite"); // every university

// Everything has lat/lng — distance-sort, map, or nearest-campus in a few lines.
```

## What you can build

- **"Nearest university" lookups** — coordinates on every record, ready for distance sorting.
- **Student & civic apps** — map the higher-education network per wilaya, link straight to each
  institution's site.
- **Maps** — drop-in GeoJSON point layer for the whole higher-education network.
- **Research & planning** — institution counts by type and wilaya across the country.

## What's inside

| Type | Code | Count |
| --- | --- | --- |
| Université | `universite` | 58 |
| Grande école | `grande_ecole` | 35 |
| École normale supérieure | `ens` | 12 |
| Centre universitaire | `centre_universitaire` | 5 |
| **Total** | | **110** |

Spanning **51 wilayas**. `wilaya_code` is linked against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) wilaya model (69-wilaya scheme).

## Names and coordinates — provenance

The **identity** of every record is 100% MESRS: `name`, `type`, and the official `website`
come straight from the ministry's network listing (which publishes names in **French only**).

The ministry's page carries **no coordinates and no address**, so the **geography is supplied
here** and labelled honestly on every record via `geo_precision`:

| `geo_precision` | Count | What the coordinate is |
| --- | --- | --- |
| `campus` | 61 | An OpenStreetMap geocode of the named campus, cross-checked: a geocode that lands in a different wilaya than the institution's name is rejected. |
| `commune` | 16 | The centroid of the institution's commune (city), from the `geoalgeria` flagship — used where OSM can't find the campus by name. |
| `wilaya` | 33 | The centroid of the institution's wilaya — the fallback when only the wilaya is known. |

`wilaya_code`, `wilaya_name` and `commune` are always reconciled to the `geoalgeria` flagship
dataset, so they are authoritative and in the 69-wilaya scheme. Coordinates are an enrichment
layer — accurate to the labelled precision, not a surveyed campus position. Regenerate them
with `npm run geocode` (OpenStreetMap Nominatim), then `npm run fetch`.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import institutions from "@geoalgeria/enseignement-superieur/data/institutions.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/enseignement-superieur/data/institutions.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import es, { type Institution } from "@geoalgeria/enseignement-superieur";
const all: Institution[] = es.institutions();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  institutions.json            # 110 institutions (array)
  metadata.json                # source, counts, by_type, by_precision, generated_at
  csv/institutions.csv         # repo + Release bundle (not in npm tarball)
  geojson/institutions.geojson # Point features (all 110 placed; 61 campus-geocoded, see geo_precision)
```

## Record shape

```json
{
  "id": 53,
  "name": "Université des sciences et de la technologie d’Alger, Houari Boumediène",
  "type": "universite",
  "type_fr": "Université",
  "website": "http://www.usthb.dz/",
  "commune": "Bab Ezzouar",
  "wilaya_code": "16",
  "wilaya_name": "Alger",
  "lat": 36.7121849,
  "lng": 3.1810204,
  "geo_precision": "campus",
  "source": "https://www.mesrs.dz/en/university-network/"
}
```

The MESRS network page publishes names in **French only**, so `name` is French; for Arabic
wilaya and commune names, join `wilaya_code` against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) dataset. `wilaya_code` is zero-padded
to two digits.

## Need the administrative divisions too?

If you also need wilayas, dairas, and communes to join against, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it ships the full wilaya
division dataset that `wilaya_code` here links to. Use `@geoalgeria/enseignement-superieur` when
you *only* need higher-education institution data.

## Source

Institution identity comes from the **MESRS**, via the public university-network page
(<https://www.mesrs.dz/en/university-network/>). Run `npm run fetch` to regenerate every output
from the live listing; it reconciles each record's wilaya/commune to the flagship dataset and
attaches the coordinate seed (`scripts/seeds/coordinates.json`, refreshed with `npm run
geocode`). It fails loudly if the institution count collapses. Coordinates are OpenStreetMap-
derived — see **Names and coordinates** above.

## License & attribution

Code is [MIT](LICENSE). Institution data is © **MESRS**, redistributed for reference and to
power [GeoAlgeria](https://geoalgeria.com). Coordinates are © OpenStreetMap contributors (ODbL),
derived via Nominatim. Verify against the ministry and each institution for authoritative
information.

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
