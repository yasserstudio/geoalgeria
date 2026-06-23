**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/sports

**Every sports facility in Algeria — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/sports)](https://www.npmjs.com/package/@geoalgeria/sports)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/sports)](https://www.npmjs.com/package/@geoalgeria/sports)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

5,141 sports facilities across Algeria — **proximity fields**, stadiums, swimming pools,
specialized halls, athletics tracks, tennis courts, equestrian centers, nautical bases and
more — each with its name, facility **type**, address, commune / daïra / wilaya, capacity,
operational status, PMR accessibility, built and land area, year of reception, and geographic
coordinates. Sourced from the **Ministère de la Jeunesse et des Sports GIS
(sig.mjs.gov.dz)**, shipped as JSON, CSV, and GeoJSON. Part of
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/sports
```

```js
import sports from "@geoalgeria/sports";

const all = sports.facilities();                    // 5,141
const inOran = sports.facilitiesByWilaya(31);       // facilities in wilaya 31
const pools = sports.facilitiesByType("P25");       // every 25 m pool

// Everything has lat/lng — distance-sort, map, or nearest-facility in a few lines.
```

## What you can build

- **"Nearest pool / stadium" lookups** — coordinates on every record, ready for distance sorting.
- **Sports & civic apps** — map stadiums, pools and courts per wilaya, filter by type or status.
- **Maps** — drop-in GeoJSON point layer for the entire sports infrastructure network.
- **Research & planning** — facility density by type, capacity analysis, operational status audits.

## What's inside

| Type | Code | Count |
| --- | --- | --- |
| Terrain sportif de proximité | `TSP` | 3,292 |
| Aire de jeux football | `AJF` | 437 |
| Salle OMS | `SOMS` | 340 |
| Salle spécialisée | `SS` | 191 |
| Bassin de natation | `BN` | 159 |
| Piscine 25 m | `P25` | 158 |
| Piscine de proximité | `PP` | 103 |
| Terrain de football | `TF` | 83 |
| Stade de football | `SF` | 79 |
| Stade OMS | `STOMS` | 76 |
| Piste d'athlétisme | `PA` | 45 |
| Boulodrome | `BL` | 39 |
| Court de tennis | `CT` | 31 |
| Unité d'hébergement et de récupération | `UHR` | 23 |
| Piscine 50 m | `P50` | 20 |
| Stade d'athlétisme | `SA` | 16 |
| Centre équestre | `CE` | 11 |
| Base nautique | `BNA` | 8 |
| Complexe sportif | `CXS` | 7 |
| Aire de jeux de loisirs | `AJL` | 5 |
| Champ de tir | `CDT` | 5 |
| Centre de regroupement et de préparation | `CRP` | 4 |
| École de jeunes talents | `EJT` | 3 |
| Terrain de réplique | `TR` | 3 |
| Centre de formation régional | `CFR` | 1 |
| Établissement d'éducation physique et sportive | `EPS` | 1 |
| Grand stade | `GS` | 1 |
| **Total** | | **5,141** |

Spanning **58 wilayas**, every facility geocoded. `wilaya_code` is linked against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) wilaya model.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import facilities from "@geoalgeria/sports/data/facilities.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/sports/data/facilities.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import sports, { type Facility } from "@geoalgeria/sports";
const all: Facility[] = sports.facilities();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  facilities.json            # 5,141 facilities (array)
  metadata.json              # source, counts, by_type, generated_at
  csv/facilities.csv         # repo + Release bundle (not in npm tarball)
  geojson/facilities.geojson # Point features (all 5,141 are geocoded)
```

## Record shape

```json
{
  "id": 6,
  "name": "Bassin de natation T'sabit",
  "type_code": "BN",
  "type_fr": "Bassin de natation",
  "address": "Tsabit. Adrar",
  "commune": "TSABIT",
  "daira": "TSABIT",
  "wilaya_code": "01",
  "wilaya_name": "ADRAR",
  "capacity": 80,
  "year": 2005,
  "operational": false,
  "pmr": false,
  "surface_built_m2": 504,
  "surface_land_m2": 504,
  "lat": 28.3057,
  "lng": -0.2446,
  "source": "https://sig.mjs.gov.dz/dashboard/viewer"
}
```

Names, communes, daïras and wilaya names are French (as published by the ministry's GIS).
`wilaya_code` is zero-padded to two digits. For Arabic wilaya and commune names, join
`wilaya_code` against the [`geoalgeria`](https://www.npmjs.com/package/geoalgeria) dataset.

## Need the administrative divisions too?

If you also need wilayas, dairas, and communes to join against, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it ships the full
wilaya division dataset that `wilaya_code` here links to. Use `@geoalgeria/sports` when you
*only* need sports infrastructure data.

## Source

Data comes from the **Ministère de la Jeunesse et des Sports**, via the public GIS
(<https://sig.mjs.gov.dz/dashboard/viewer>). The ministry maintains a GeoServer with the
`infrastructures_sportives` layer publicly queryable over WMS. Run `npm run fetch` to
regenerate every output from the live GIS. The build resolves wilaya names to codes against
the flagship dataset, normalises infrastructure types to stable short codes, and fails loudly
if the facility count collapses or an unknown type appears.

## License & attribution

Code is [MIT](LICENSE). The underlying data is © **Ministère de la Jeunesse et des Sports**,
redistributed for reference and to power [GeoAlgeria](https://geoalgeria.com). Verify against
the ministry for authoritative, real-time information.

[API docs & field reference →](https://geoalgeria.com/data/docs/sports) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
