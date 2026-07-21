**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/culture

**Algeria's cultural atlas — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/culture)](https://www.npmjs.com/package/@geoalgeria/culture)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/culture)](https://www.npmjs.com/package/@geoalgeria/culture)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**1,083 cultural places** across **66 of Algeria's 69 wilayas** — protected
heritage sites, museums, theatres, libraries and cultural establishments (maisons
& palais de la culture, cinemas, culture directorates, arts schools) from the
**Ministry of Culture's** *Cartes du Patrimoine Culturel Algérien* atlas,
**100% bilingual** French/Arabic and **fully geocoded** (every place carries a
source coordinate). Shipped as JSON, CSV, GeoJSON, and TypeScript. Part of
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/culture
```

```js
import culture from "@geoalgeria/culture";

const all = culture.culture();          // 1,083 cultural places

// Museums in a wilaya (joins GeoAlgeria's wilaya_code)
const museumsAlger = all.filter((p) => p.wilaya_code === "16" && p.type === "museum");

// Just the protected heritage sites, ready to map
const heritage = all.filter((p) => p.category === "heritage");

// Places with a 360° virtual tour
const tours = all.filter((p) => p.has_virtual_tour);
```

## What you can build

- **Cultural maps & nearest-place search** — every one of the 1,083 places has
  coordinates, ready for a map or a "what's near me" feature.
- **Bilingual cultural directories** — French and Arabic names, official type and
  wilaya for every place; filter heritage vs. operating establishments.
- **Heritage & tourism apps** — protected sites, museums and 360° virtual tours,
  linked to commune/wilaya for routing and coverage analysis.

## What's inside

| Dataset | Count | Coordinates | Notes |
| --- | --- | --- | --- |
| Cultural places | **1,083** | 1,083 geocoded | 66 wilayas, 100% bilingual, 22 with 360° tours |

**By category**

| Category | Count | Meaning |
| --- | --- | --- |
| `heritage` | 943 | protected sites, museums, theatres, libraries |
| `establishment` | 140 | operating cultural venues & directorates |

**By type**

| Type | Count | Meaning |
| --- | --- | --- |
| `protected-cultural-property` | 580 | Bien culturel protégé — protected monument/site |
| `library` | 257 | Bibliothèque — public reading library |
| `museum` | 48 | Musée — museum |
| `theatre` | 45 | Théâtre — theatre |
| `museum-moudjahid` | 13 | Musée du Moudjahid — museum of the war of independence |
| `cultural-house` | 51 | Maison de la culture |
| `cultural-directorate` | 33 | Direction de la culture — wilaya culture directorate/office |
| `cinema` | 20 | Salle de cinéma — cinema / cinematheque |
| `cultural-center` | 15 | Centre culturel — cultural / research centre |
| `arts-school` | 15 | École d'art — fine-arts school / conservatory |
| `cultural-palace` | 6 | Palais de la culture |

> **The atlas is official; treat the coordinates as best-effort.** Names, type,
> coordinates and the 360° flag come from the Ministry of Culture's portal. Wilaya
> is exact; commune is derived (see *Source & method*). Counts move as the portal
> is edited; each rebuild reflects its current state.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import culture from "@geoalgeria/culture/data/culture.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/culture/data/culture.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import culture, { type CulturalSite } from "@geoalgeria/culture";
const all: CulturalSite[] = culture.culture();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  culture.json              # 1,083 cultural places (array)
  metadata.json             # sources, counts, coverage, license, updated
  csv/culture.csv           # repo + Release bundle
  geojson/culture.geojson   # Point features (every record)
```

## Record shape

```json
{
  "id": "16-museum-03",
  "name": "Musée national Public d'art moderne et contemporain",
  "name_fr": "Musée national Public d'art moderne et contemporain",
  "name_ar": "المتحف العمومي الوطني للفن الحديث و المعاصر",
  "wilaya_code": "16",
  "commune_code": "1607",
  "commune": "Casbah",
  "lat": 36.777301,
  "lng": 3.057572,
  "geo_precision": "exact",
  "geo_method": "source_point",
  "source": "patrimoine",
  "refs": {
    "patrimoine": "817"
  },
  "type": "museum",
  "category": "heritage",
  "type_label_fr": "Musée",
  "type_label_ar": "متحف",
  "has_virtual_tour": true,
  "url": "https://cartes.patrimoineculturelalgerien.org/fr/node/101",
  "slug": "musee-national-public-d-art-moderne-et-contemporain"
}
```

`id` is a stable `{wilaya_code}-{type_code}-{seq}` key, unique within this
file — treat it as opaque. `name` is the French name where available, else
Arabic. `type` is the place's layer on the portal; `category` groups the 11
types into `heritage` vs. `establishment`. `has_virtual_tour` is true for the
22 places with a 360° tour. `geo_precision` is `"exact"` for 1,067 records and
`"approximate"` for 16 — every place has a coordinate, but 16 don't meet the
precision bar for `"exact"`. `geo_method` is `"source_point"` for every
record: the coordinate is the portal's own published point, not a derived
centroid. `refs.patrimoine` is the place's node id on the portal.

> **Wilaya is exact; commune is derived.** The portal still files some places
> under pre-2019 wilaya codes; GeoAlgeria rescopes each place to the current
> 69-wilaya scheme by matching its coordinate to the nearest
> [`geoalgeria`](https://www.npmjs.com/package/geoalgeria) commune centroid (which
> also yields `commune`/`commune_code`). Commune is best-effort (the flagship
> ships centroids, not boundary polygons).

## Need the administrative divisions too?

For wilayas, dairas, and communes, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it's how
you turn a place's `commune_code` into a polygon or centroid. Use
`@geoalgeria/culture` when you *only* need the cultural places.

## Source & method

Run `npm run fetch` to regenerate every output. It:

1. reads the curated, bilingual cultural atlas (assembled and translated from the
   Ministry of Culture's `cartes.patrimoineculturelalgerien.org` portal — the
   portal's French and Arabic catalogs are disjoint node sets, unioned by
   coordinate proximity and translated to fill the bilingual gaps);
2. **rescopes** each place to the current 69-wilaya scheme and attaches a
   `commune`/`commune_code` by matching its coordinate to the nearest `geoalgeria`
   commune centroid;
3. assigns stable ids, drops exact duplicate nodes, and emits JSON, CSV, GeoJSON
   and metadata.

The curated source and extraction notes are under
[`research/patrimoine/`](https://github.com/yasserstudio/geoalgeria/tree/main/research/patrimoine).

## License & attribution

Package **code** is [MIT](LICENSE). The **data** is a factual public listing from
the **Ministry of Culture's** cultural-heritage portal (names, types, coordinates
and 360° tours as published). Commune/wilaya linkage is derived from the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) administrative dataset.

Verify against official sources for authoritative information. This dataset is
provided for reference and to power [GeoAlgeria](https://geoalgeria.com).

[API docs & field reference →](https://geoalgeria.com/data/docs/culture) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
