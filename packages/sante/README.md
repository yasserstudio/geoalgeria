**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/sante

**Algeria's public health establishments — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/sante)](https://www.npmjs.com/package/@geoalgeria/sante)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/sante)](https://www.npmjs.com/package/@geoalgeria/sante)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**695 public health establishments** across all **58 wilayas** with health
directorates — public hospitals (EPH), proximity-health establishments (EPSP),
specialized hospitals (EHS) and university hospitals (CHU) from the **Ministry of Health (MoH)**, bilingual French/Arabic, **600 geocoded** via OpenStreetMap
and Wikidata with commune/wilaya linkage. Shipped as JSON, CSV, GeoJSON, and
TypeScript. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/sante
```

```js
import sante from "@geoalgeria/sante";

const all = sante.sante();              // 695 establishments

// Public hospitals in a wilaya (joins GeoAlgeria's wilaya_code)
const ephAlger = all.filter((e) => e.wilaya_code === "16" && e.type === "eph");

// Only the geocoded ones, ready to map
const mappable = all.filter((e) => e.lat != null);
```

## What you can build

- **Hospital & clinic locators** — coordinates on 600 of 695 records, ready for a
  map or nearest-facility search.
- **Bilingual health directories** — French and Arabic names, official type and
  wilaya for every establishment.
- **Coverage & planning analysis** — count establishments by type per
  commune/wilaya across the whole country.

## What's inside

| Dataset | Count | Coordinates | Notes |
| --- | --- | --- | --- |
| Health establishments | **695** | 600 geocoded | 58 wilayas, 563 bilingual |

**By type**

| Type | Count | Meaning |
| --- | --- | --- |
| `eph` | 270 | Établissement Public Hospitalier — public hospital |
| `epsp` | 292 | Établissement Public de Santé de Proximité — proximity health |
| `ehs` | 108 | Établissement Hospitalier Spécialisé — specialized hospital |
| `chu` | 20 | Centre Hospitalo-Universitaire — university hospital |
| `hopital` | 5 | other public hospital |

**By coordinate precision** (`geo_precision`)

| Value | Count | Meaning |
| --- | --- | --- |
| `osm_point` | 121 | precise point from an OpenStreetMap facility in the commune |
| `wikidata_point` | 3 | precise point from a Wikidata facility in the commune |
| `commune_centroid` | 476 | the establishment's commune centroid (approximate) |
| `none` | 95 | locality not resolved to a commune — no coordinates |

> **The registry is official; the coordinates are best-effort.** Names, type and
> wilaya come from the Ministry of Health. The MoH publishes no coordinates,
> so GeoAlgeria derives them — see *Source & method* below. Counts move as the
> MoH, OpenStreetMap and Wikidata are edited; each rebuild reflects their current
> state.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import sante from "@geoalgeria/sante/data/sante.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/sante/data/sante.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import sante, { type HealthEstablishment } from "@geoalgeria/sante";
const all: HealthEstablishment[] = sante.sante();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  sante.json              # 695 establishments (array)
  metadata.json           # sources, counts, coverage, generated_at
  csv/sante.csv           # repo + Release bundle (not in npm tarball)
  geojson/sante.geojson   # Point features (geocoded records only)
```

## Record shape

```json
{
  "id": "01-ehs-02",
  "name": "Etablissement Hospitalier Spécialisé Psychiatrie Adrar",
  "name_ar": "المؤسسة الاستشفائية المتخصصة في الأمراض العقلية أدرار",
  "name_fr": "Etablissement Hospitalier Spécialisé Psychiatrie Adrar",
  "type": "ehs",
  "type_label_fr": "Établissement Hospitalier Spécialisé",
  "type_label_ar": "المؤسسة الاستشفائية المتخصصة",
  "sector": "public",
  "wilaya": "Adrar",
  "wilaya_ar": "أدرار",
  "wilaya_code": "01",
  "commune": "Adrar",
  "commune_code": 101,
  "source": "msp+osm",
  "geo_precision": "osm_point",
  "wikidata": null,
  "osm_id": "way/432370657",
  "msp_id": 3588,
  "slug": "etablissement-hospitalier-specialise-psychiatrie-adrar",
  "lat": 27.875834,
  "lng": -0.307533
}
```

`id` is a stable `{wilaya_code}-{type}-{seq}` key synthesized by GeoAlgeria (the
MoH publishes no establishment code). `name` is the French name where available,
else Arabic. `type` is derived from the establishment's title; `wilaya` from the
MoH's wilaya tag. `sector` is `"public"` for the whole MoH registry (private
clinics, when added, will carry `"private"`). `source` records which registries
contributed; `geo_precision` records where the coordinate came from. `lat`/`lng`
are `null` for the 95 records whose locality could not be matched to a commune.

> **Coordinates and commune are derived, not from the MoH.** The Ministry of
> Health lists names, type and wilaya only. GeoAlgeria matches each
> establishment's locality to the [`geoalgeria`](https://www.npmjs.com/package/geoalgeria)
> commune set within its wilaya (giving `commune`, `commune_code` and a centroid
> coordinate), then upgrades the coordinate to a precise point where a hospital
> or clinic in OpenStreetMap or Wikidata sits in that same commune. Wilaya is
> exact; commune and coordinates are best-effort.

## Need the administrative divisions too?

For wilayas, dairas, and communes, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it's how
you turn an establishment's `commune_code` into a polygon or centroid. Use
`@geoalgeria/sante` when you *only* need the health establishments.

## Source & method

Run `npm run fetch` to regenerate every output. It:

1. pulls the **Ministry of Health** establishment registry from the
   `sante.gov.dz` WordPress REST API (`healthinstitution`), in French and Arabic,
   each tagged with its wilaya;
2. derives the **type** from each title and **pairs** the French and Arabic posts
   into one bilingual record;
3. matches each establishment's **locality to a commune** in the `geoalgeria`
   set within its wilaya, attaching `commune`, `commune_code` and a centroid;
4. queries **Wikidata** (SPARQL, hospitals) and **OpenStreetMap** (Overpass,
   `amenity=hospital`/`clinic`, `healthcare=*`) and **upgrades** the coordinate
   to a precise point where one sits in the establishment's commune.

Raw source pulls are cached under
[`research/sante/`](https://github.com/yasserstudio/geoalgeria/tree/main/research/sante).

## License & attribution

Package **code** is [MIT](LICENSE). The **data** is a composite:

- The **Ministry of Health** registry (names, type, wilaya) is a factual
  public-sector listing.
- **Coordinates** are derived from **Wikidata** (**CC0**, public domain) and
  **OpenStreetMap** (**© OpenStreetMap contributors**, licensed under the
  **[ODbL 1.0](https://www.openstreetmap.org/copyright)**). If you use or
  redistribute this dataset, you must **attribute OpenStreetMap contributors**
  and keep derived databases under a compatible license.

Verify against official sources for authoritative information. This dataset is
provided for reference and to power [GeoAlgeria](https://geoalgeria.com).

[API docs & field reference →](https://geoalgeria.com/data/docs/sante) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
