**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/sports

**Every sports facility in Algeria, as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/sports)](https://www.npmjs.com/package/@geoalgeria/sports)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/sports)](https://www.npmjs.com/package/@geoalgeria/sports)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

5,234 sports facilities across Algeria, **proximity fields**, stadiums, swimming pools,
specialized halls, athletics tracks, tennis courts, equestrian centers, nautical bases and
more, each with its name, facility **type**, address, commune / daïra / wilaya, capacity,
operational status, PMR accessibility, built and land area, year of reception, and geographic
coordinates. Sourced from the **Ministry of Youth and Sports GIS
(sig.mjs.gov.dz)**, shipped as JSON, CSV, and GeoJSON. Part of
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/sports
```

```js
import sports from "@geoalgeria/sports";

const all = sports.facilities();                    // 5,234
const inOran = sports.facilitiesByWilaya(31);       // facilities in wilaya 31
const pools = sports.facilitiesByType("P25");       // every 25 m pool

// Everything has lat/lng – distance-sort, map, or nearest-facility in a few lines.
```

## What you can build

- **"Nearest pool / stadium" lookups** – coordinates on every record, ready for distance sorting.
- **Sports & civic apps** – map stadiums, pools and courts per wilaya, filter by type or status.
- **Maps** – drop-in GeoJSON point layer for the entire sports infrastructure network.
- **Research & planning** – facility density by type, capacity analysis, operational status audits.

## What's inside

| Type | Code | Count |
| --- | --- | --- |
| Terrain sportif de proximité | `TSP` | 3,295 |
| Aire de jeux football | `AJF` | 436 |
| Salle OMS | `SOMS` | 340 |
| Salle spécialisée | `SS` | 203 |
| Piscine 25 m | `P25` | 160 |
| Bassin de natation | `BN` | 157 |
| Piscine de proximité | `PP` | 117 |
| Terrain de football | `TF` | 87 |
| Stade de football | `SF` | 81 |
| Stade OMS | `STOMS` | 77 |
| Piste d'athlétisme | `PA` | 56 |
| Boulodrome | `BL` | 42 |
| Aire de jeux de loisirs | `AJL` | 34 |
| Court de tennis | `CT` | 33 |
| Unité d'hébergement et de récupération | `UHR` | 27 |
| Piscine 50 m | `P50` | 23 |
| Stade d'athlétisme | `SA` | 15 |
| Centre équestre | `CE` | 12 |
| Base nautique | `BNA` | 8 |
| Complexe sportif | `CXS` | 8 |
| Terrain de réplique | `TR` | 7 |
| Champ de tir | `CDT` | 5 |
| Centre de regroupement et de préparation | `CRP` | 4 |
| École de jeunes talents | `EJT` | 2 |
| Grand stade | `GS` | 2 |
| Centre de formation régional | `CFR` | 1 |
| Établissement d'éducation physique et sportive | `EPS` | 1 |
| Parcours d'athlétisme | `PCA` | 1 |
| **Total** | | **5,234** |

Spanning **69 wilayas**, every facility geocoded, 5,106 to an `exact` point, the
remaining 128 `approximate`. `wilaya_code` is linked against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) wilaya model.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import facilities from "@geoalgeria/sports/data/facilities.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/sports/data/facilities.json
```

The loaders and record shapes are fully **typed**, TypeScript definitions ship in the package:

```ts
import sports, { type Facility } from "@geoalgeria/sports";
const all: Facility[] = sports.facilities();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  facilities.json            # 5,234 facilities (array)
  metadata.json              # sources, counts, by_type, updated
  csv/facilities.csv         # repo + Release bundle (not in npm tarball)
  geojson/facilities.geojson # Point features (all 5,234 are geocoded)
```

## Record shape

```json
{
  "id": "00006",
  "name": "Bassin de natation T'sabit",
  "wilaya_code": "01",
  "commune_code": null,
  "commune": "TSABIT",
  "lat": 28.3057,
  "lng": -0.2446,
  "geo_precision": "exact",
  "geo_method": "sig_mjs",
  "source": "mjs",
  "refs": { "mjs": "379177ee-6904-423b-95c8-6e8e388adbce" },
  "type": "BN",
  "type_label_fr": "Bassin de natation",
  "daira": "TSABIT",
  "address": "Tsabit. Adrar",
  "capacity": 80,
  "year": 2005,
  "operational": false,
  "pmr": false,
  "surface_built_m2": 504,
  "surface_land_m2": 504
}
```

Names, communes and daïras are French (as published by the ministry's GIS). `name`
is `null` for 1,659 facilities the ministry lists with no name (their `type_label_fr`
still identifies them). `wilaya_code` is zero-padded to two digits; `commune_code`
is populated for 284 records: 270 whose exact current, former (JORA) or official 2021 ONS
commune label and point agree, and 14 reviewed corrections; otherwise it is `null`. Reconciled records use the current Wilaya and preserve a
differing ministry value in `source_wilaya_code`.
`geo_precision` is `"exact"` or `"approximate"` (every facility is geocoded, so
neither is ever `null` here); `geo_method` is always `"sig_mjs"`. `source` is
`"mjs"`, a key into `metadata.sources[]` (see *Source*, below, for the live GIS
URL). For Arabic wilaya and commune names, join `wilaya_code` against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) dataset.

## Ids and the SIG UUID

`refs.mjs` is the ministry GIS's own per-record UUID (`properties.id` of the
`infrastructures_sportives` layer), on every facility since the 2026-10-27 refresh.
`id` is carried from release to release on it, so a facility the ministry renames,
re-addresses or re-places keeps its id. An id is never reused: one that left the package
is listed in [`data/retired-ids.json`](data/retired-ids.json), and where its record was a
second entry of a facility the GIS now holds once, `migrations` there names the id that
carries its data now. The CSV carries `refs` as a JSON column after `source`.

## Need the administrative divisions too?

If you also need wilayas, dairas, and communes to join against, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package, it ships the full
wilaya division dataset that `wilaya_code` here links to. Use `@geoalgeria/sports` when you
*only* need sports infrastructure data.

## Source

Data comes from the **Ministry of Youth and Sports**, via the public GIS
(<https://sig.mjs.gov.dz/dashboard/viewer>). The ministry maintains a GeoServer with the
`infrastructures_sportives` layer publicly queryable over WMS. Run `npm run fetch` to
regenerate every output from the live GIS. The build resolves wilaya names to codes against
the flagship dataset, normalises infrastructure types to stable short codes, and fails loudly
if the facility count collapses or an unknown type appears.

## Licence & attribution

Code is [MIT](LICENSE). The underlying data is © **Ministry of Youth and Sports**,
redistributed for reference and to power [GeoAlgeria](https://geoalgeria.com). Verify against
the ministry for authoritative, real-time information.

[API docs & field reference →](https://geoalgeria.com/data/docs/sports) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [support@yasser.studio](mailto:support@yasser.studio)

GeoAlgeria is free, and it stays free. The same studio also makes maps, websites, mobile apps and open data for clients.
