**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/mosquees

**The mosques of Algeria — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/mosquees)](https://www.npmjs.com/package/@geoalgeria/mosquees)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/mosquees)](https://www.npmjs.com/package/@geoalgeria/mosquees)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**20,759 geocoded mosques** across all **69 wilayas** of Algeria — every one with
coordinates, most with Arabic and/or French names, and commune/wilaya linkage.
A community-maintained **composite of Wikidata and OpenStreetMap**, framed
honestly against the Ministère des Affaires Religieuses (MARW) national count of
~18,449. Shipped as JSON, CSV, GeoJSON, and TypeScript. Part of
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/mosquees
```

```js
import mosquees from "@geoalgeria/mosquees";

const all = mosquees.mosquees();   // 20,759 geocoded mosques

// Mosques in a wilaya (joins GeoAlgeria's wilaya_code)
const inSetif = all.filter((m) => m.wilaya_code === "19");

// Only the named ones, with a French label
const named = all.filter((m) => m.name_fr);
```

## What you can build

- **Mosque maps & locators** — coordinates on all 20,759 records, ready for a map
  or distance sorting.
- **Bilingual directories** — 15k+ Arabic names and 7k+ French names, side by side.
- **Coverage analysis** — count or rank mosque density per commune/wilaya across
  the whole country.

## What's inside

| Dataset | Count | Coordinates | Notes |
| --- | --- | --- | --- |
| Mosques | **20,759** | ✅ all | 19,783 named, 69 wilayas |

**By source**

| Source | Count | Meaning |
| --- | --- | --- |
| `wikidata` | 13,200 | from Wikidata only |
| `wikidata+osm` | 5,897 | in both, matched within ~150 m (OSM lends a French name / denomination / `osm_id`) |
| `osm` | 1,662 | mapped in OpenStreetMap, not yet in Wikidata |

> **This is a composite, not an official registry.** Wikidata gives near-complete
> national coverage (~19k geocoded mosques, close to the MARW figure of ~18,449);
> OpenStreetMap adds precise coordinates, French names, denomination, and mosques
> Wikidata lacks. Counts move as both projects are edited — each rebuild reflects
> the current state of the sources.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import mosquees from "@geoalgeria/mosquees/data/mosquees.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/mosquees/data/mosquees.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import mosquees, { type Mosquee } from "@geoalgeria/mosquees";
const all: Mosquee[] = mosquees.mosquees();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  mosquees.json              # 20,759 mosques (array)
  metadata.json              # sources, counts, coverage, generated_at
  csv/mosquees.csv           # repo + Release bundle (not in npm tarball)
  geojson/mosquees.geojson   # Point features
```

## Record shape

```json
{
  "id": "16-0914",
  "source": "wikidata+osm",
  "wikidata": "Q28717404",
  "osm_id": "relation/15870867",
  "name": "مسجد عبد الحميد بن باديس",
  "name_ar": "مسجد عبد الحميد بن باديس",
  "name_fr": "Mosquée Ibn Badis",
  "denomination": "sunni",
  "wilaya_code": "16",
  "commune_code": 1607,
  "commune": "Casbah",
  "lat": 36.779365,
  "lng": 3.05949
}
```

`id` is a stable `{wilaya_code}-{seq}` key synthesized by GeoAlgeria. `wikidata`
and `osm_id` link back to the upstream objects. `name` is the best available
display name (French preferred, else Arabic) and is `null` for the unnamed OSM
points. `wilaya_code` joins to GeoAlgeria's `wilaya_code`.

> **Commune/wilaya linkage is derived, not from the sources.** Neither Wikidata
> nor OSM carries Algerian administrative codes. GeoAlgeria attaches
> `wilaya_code`, `commune_code`, and `commune` by a **nearest-centroid join**
> against the [`geoalgeria`](https://www.npmjs.com/package/geoalgeria) commune
> set. Wilaya assignment is effectively exact; commune is best-effort (centroid
> proximity, not polygon containment).

## Need the administrative divisions too?

For wilayas, dairas, and communes, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it's how
you turn a mosque's `commune_code` into a polygon or centroid. Use
`@geoalgeria/mosquees` when you *only* need the mosques.

## Source & method

Run `npm run fetch` to regenerate every output. It:

1. queries **Wikidata** (SPARQL) for every item that is an instance of a subclass
   of *mosque* (Q32815) located in Algeria (P17 = Q262) with a coordinate (P625)
   — the comprehensive base;
2. queries **OpenStreetMap** (Overpass) for `amenity=place_of_worship` +
   `religion=muslim` inside Algeria;
3. **merges** them — an OSM mosque within ~150 m of a Wikidata mosque is folded
   into that record (lending its French name, denomination, and `osm_id`); OSM
   mosques with no match become their own records;
4. attaches commune/wilaya by nearest commune centroid.

Raw source pulls are cached under
[`research/mosquees/`](https://github.com/yasserstudio/geoalgeria/tree/main/research/mosquees).

## License & attribution

Package **code** is [MIT](LICENSE). The **data** is a composite:

- **Wikidata** content is **CC0** (public domain).
- **OpenStreetMap** content is **© OpenStreetMap contributors**, licensed under
  the **[ODbL 1.0](https://www.openstreetmap.org/copyright)**. If you use or
  redistribute this dataset, you must **attribute OpenStreetMap contributors**
  and keep derived databases under a compatible license.

Verify against official sources for authoritative information. This dataset is
provided for reference and to power [GeoAlgeria](https://geoalgeria.com).

[API docs & field reference →](https://geoalgeria.com/data/docs/mosquees) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
