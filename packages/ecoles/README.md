**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/ecoles

**The schools of Algeria — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/ecoles)](https://www.npmjs.com/package/@geoalgeria/ecoles)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/ecoles)](https://www.npmjs.com/package/@geoalgeria/ecoles)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**11,830 geocoded schools** across all **69 wilayas** of Algeria — every one with
coordinates, classified by **cycle** (primaire · moyen/CEM · secondaire/lycée ·
préscolaire), most with Arabic and/or French names, and commune/wilaya linkage.
Extracted from **OpenStreetMap** and framed honestly against the ~28,000
establishments of the national school network. Shipped as JSON, CSV, GeoJSON, and
TypeScript. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/ecoles
```

```js
import ecoles from "@geoalgeria/ecoles";

const all = ecoles.ecoles();   // 11,830 geocoded schools

// Lycées in a wilaya (joins GeoAlgeria's wilaya_code)
const lyceesSetif = all.filter((e) => e.wilaya_code === "19" && e.cycle === "secondaire");

// Only the named ones, with a French label
const named = all.filter((e) => e.name_fr);
```

## What you can build

- **School maps & locators** — coordinates on all 11,830 records, ready for a map
  or nearest-school distance sorting.
- **Cycle breakdowns** — filter primaire / moyen / secondaire / préscolaire, or
  rank school density per commune/wilaya across the country.
- **Bilingual directories** — thousands of Arabic and French names, side by side.

## What's inside

| Dataset | Count | Coordinates | Notes |
| --- | --- | --- | --- |
| Schools | **11,830** | ✅ all | 8,640 named, 69 wilayas |

**By cycle**

| Cycle | Count | Meaning |
| --- | --- | --- |
| `primaire` | 4,020 | école primaire (ISCED 1) |
| `moyen` | 2,377 | collège d'enseignement moyen / CEM (ISCED 2) |
| `secondaire` | 1,574 | lycée (ISCED 3) |
| `prescolaire` | 268 | préscolaire / maternelle / روضة (ISCED 0) |
| `autre` | 3,591 | school of undetermined cycle (unnamed, or a name with no cycle word) |

> **This is an OpenStreetMap extract, not an official registry.** Coverage is
> partial and uneven by wilaya — ~11.8k schools mapped against the ~28,000 in the
> national network (primaire + moyen + secondaire, Ministry of National
> Education, approximate). Counts move as OpenStreetMap is edited; each rebuild
> reflects the current state of the map.

**Cycle is inferred.** It comes from `isced:level` and the French/Arabic name — a
CEM always names itself متوسطة/collège, a lycée ثانوية/lycée, a maternelle
روضة/préscolaire. A bare "école"/"مدرسة" with no cycle word is classified
`primaire` by Algerian convention (a standalone school is a primary school);
anything unresolved is `autre`. 93% of *named* schools resolve to a specific cycle.

**By kind** — `kind` is the establishment type, *orthogonal* to cycle, so you can
filter out (or in) the special-purpose places OSM files under `amenity=school`:

| Kind | Count | Meaning | Cycle |
| --- | --- | --- | --- |
| `regular` | 11,640 | a standard école / CEM / lycée / maternelle | its real cycle |
| `formation` | 91 | vocational / training centre | `autre` |
| `coranique` | 40 | Quranic school | `autre` |
| `langues` | 24 | language school / institute | `autre` |
| `special` | 30 | adapted / special-needs school (deaf, blind…) | keeps its cycle |
| `conduite` | 5 | driving school (auto-école) | `autre` |

The four non-K-12 kinds (`formation`/`coranique`/`langues`/`conduite`) carry
cycle `autre` — they're *not* primary schools even though their name contains
"école"; `kind` is what makes them findable instead of buried in `autre`.

**Also on each record:** `isced_levels` (the OSM `isced:level` served, normalized
to a sorted list like `"1;2"` — on 2,037 records), `address` (from OSM `addr:*`
tags — on 2,625), and `sector` (`public`/`private` where the map signals it).

## Formats

The npm package ships the **JSON** (importable directly):

```js
import ecoles from "@geoalgeria/ecoles/data/ecoles.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/ecoles/data/ecoles.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import ecoles, { type Ecole } from "@geoalgeria/ecoles";
const all: Ecole[] = ecoles.ecoles();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  ecoles.json              # 11,830 schools (array)
  metadata.json            # sources, counts, coverage, updated
  csv/ecoles.csv           # repo + Release bundle (not in npm tarball)
  geojson/ecoles.geojson   # Point features
```

## Record shape

```json
{
  "id": "16-00275",
  "name": "Lycée Semrouni 1",
  "name_fr": "Lycée Semrouni 1",
  "name_ar": null,
  "wilaya_code": "16",
  "commune_code": "1651",
  "commune": "Ouled Fayet",
  "lat": 36.729359,
  "lng": 2.939451,
  "geo_precision": "approximate",
  "geo_method": "osm_centroid",
  "source": "osm",
  "refs": {
    "osm": "way/1041517830"
  },
  "cycle": "secondaire",
  "cycle_label_fr": "Lycée",
  "cycle_label_ar": "ثانوية",
  "kind": "regular",
  "kind_label_fr": "École ordinaire",
  "kind_label_ar": "مدرسة عادية",
  "isced_levels": null,
  "sector": null,
  "address": null
}
```

`id` is a stable `{wilaya_code}-{seq}` key synthesized by GeoAlgeria, unique
within this dataset; the matched OSM element is kept as `refs.osm`. `name` is the
best available display name and is `null` for unnamed points. `cycle` is the
education level and `kind` the establishment type (see above), each with
bilingual labels. `isced_levels` and `address` come straight from OSM (`null`
when the tags are absent). `sector` is `"public"`/`"private"` only when the map
carries an explicit signal, else `null`. `geo_precision` is `"exact"` for a
surveyed OSM node or `"approximate"` for a building/area centroid — `geo_method`
records which (`osm_node`/`osm_centroid`). `wilaya_code` joins to GeoAlgeria's
`wilaya_code`.

> **Commune/wilaya linkage is derived, not from the source.** OpenStreetMap does
> not carry Algerian administrative codes. GeoAlgeria attaches `wilaya_code`,
> `commune_code`, and `commune` by a **nearest-centroid join** against the
> [`geoalgeria`](https://www.npmjs.com/package/geoalgeria) commune set. Wilaya
> assignment is effectively exact; commune is best-effort (centroid proximity,
> not polygon containment).

## Need the administrative divisions too?

For wilayas, dairas, and communes, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it's how
you turn a school's `commune_code` into a polygon or centroid. Use
`@geoalgeria/ecoles` when you *only* need the schools.

## Source & method

Run `npm run fetch` to regenerate every output. It:

1. queries **OpenStreetMap** (Overpass) for `amenity=school` and
   `amenity=kindergarten` inside Algeria;
2. **classifies the cycle** from `isced:level` and the French/Arabic name;
3. de-duplicates the same school mapped as both a node and a building;
4. attaches commune/wilaya by nearest commune centroid.

Raw source pulls are cached under
[`research/ecoles/`](https://github.com/yasserstudio/geoalgeria/tree/main/research/ecoles).

## License & attribution

Package **code** is [MIT](LICENSE). The **data** is from **OpenStreetMap** —
**© OpenStreetMap contributors**, licensed under the
**[ODbL 1.0](https://www.openstreetmap.org/copyright)**. If you use or
redistribute this dataset, you must **attribute OpenStreetMap contributors** and
keep derived databases under a compatible license.

Verify against official sources for authoritative information. This dataset is
provided for reference and to power [GeoAlgeria](https://geoalgeria.com).

[API docs & field reference →](https://geoalgeria.com/data/docs/ecoles) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
