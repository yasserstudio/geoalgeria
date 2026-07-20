**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/gares-routieres

**Every intercity bus station in Algeria — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/gares-routieres)](https://www.npmjs.com/package/@geoalgeria/gares-routieres)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/gares-routieres)](https://www.npmjs.com/package/@geoalgeria/gares-routieres)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

74 intercity bus stations (**gares routières**) across Algeria — with official names,
postal addresses, GPS coordinates, surface areas, and wilaya/commune linkage. Sourced
from **SOGRAL** (the state operator of Algeria's coach stations), shipped as JSON, CSV,
and GeoJSON. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> **Also known as:** the SOGRAL network. SOGRAL is the *source*; the package is
> domain-named (`gares-routieres`) and discoverable via the `sogral` keyword.

```bash
npm install @geoalgeria/gares-routieres
```

```js
import gares from "@geoalgeria/gares-routieres";

const all = gares.stations();                 // 74
const alger = gares.stationById("16-01");      // Alger — Grands Invalides
const inSetif = gares.stationsByWilaya(19);    // stations in wilaya 19

// Every station has lat/lng — distance-sort, map, or nearest-station in a few lines.
```

## What you can build

- **Nearest-station lookups** — coordinates on every record, ready for distance sorting.
- **Travel & logistics** — match a wilaya or a point to its serving coach station.
- **Maps** — drop-in GeoJSON point layer for the national gare-routière network.
- **Capacity views** — total/built surface areas per station.

## What's inside

| Dataset | Count | Notes |
| --- | --- | --- |
| Intercity bus stations | **74** | official name, address, coordinates, surface areas |

Spanning **51 wilayas**, every station geocoded. `wilaya_code` is linked against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) 69-wilaya model.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import stations from "@geoalgeria/gares-routieres/data/stations.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/gares-routieres/data/stations.json
```

The loaders and record shapes are fully **typed**:

```ts
import gares, { type Station } from "@geoalgeria/gares-routieres";
const stations: Station[] = gares.stations();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  stations.json            # 74 stations (array)
  metadata.json            # sources, counts, license, updated
  csv/stations.csv
  geojson/stations.geojson # Point features (all 74 are geocoded)
```

## Record shape

```json
{
  "id": "16-01",
  "name": "ALGER",
  "wilaya_code": "16",
  "commune_code": "1631",
  "commune": "El Magharia",
  "lat": 36.7425,
  "lng": 3.108,
  "geo_precision": "exact",
  "geo_method": "exact",
  "source": "sogral",
  "refs": {
    "sogral": "213-000016000"
  },
  "official_name": "La gare routière des Grands Invalides de la guerre de libération nationale",
  "address": "Avenue de L’ALN B.P n°412 – 16040 – Hussein Dey (Alger)",
  "surface_total_m2": 13000,
  "surface_built_m2": 8000
}
```

`id` is an opaque string, `{wilaya_code}-{seq}`-shaped but unique within `stations.json` —
don't parse it. `wilaya_code`/`commune` come from a nearest-centroid join against
`geoalgeria` (which also reconciles SOGRAL's legacy 48-wilaya codes). 71 of 74 stations
are `geo_precision: "exact"`; 3 are `"approximate"` (Guelma, Illizi, Aïn Oussara). The
SOGRAL location code lives under `refs.sogral`.

## Need the administrative divisions too?

For wilayas, dairas, and communes to join against, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it ships the full
69-wilaya division dataset that `wilaya_code` here links to.

## Source

Data comes from **SOGRAL — EPE SOGRAL Spa** (Société de Gestion des Gares Routières
d'Algérie), via its live departures registry (<https://live.sogral.com>). Run
`npm run fetch` to regenerate every output. `wilaya_code`/`commune` are resolved by
nearest commune centroid from the `geoalgeria` dataset.

## License & attribution

Code is [MIT](LICENSE). The underlying data is © **SOGRAL**, redistributed for reference
and to power [GeoAlgeria](https://geoalgeria.com). Verify against SOGRAL for authoritative,
real-time information.

[Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
