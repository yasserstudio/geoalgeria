**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/tourisme

**Algeria's tourism infrastructure — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/tourisme)](https://www.npmjs.com/package/@geoalgeria/tourisme)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/tourisme)](https://www.npmjs.com/package/@geoalgeria/tourisme)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

4,348 geocoded tourism sites across Algeria's 69 wilayas — **hotels**, attractions, historic
sites, thermal springs and protected areas — each with coordinates, wilaya linkage and source
attribution. Sourced from **ASAL Geoportail** (thermal springs), **OpenStreetMap** (hotels,
attractions, historic sites, parks) and **Wikidata** (heritage sites, museums, parks). Shipped
as JSON, CSV, and GeoJSON. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/tourisme
```

```js
import tourisme from "@geoalgeria/tourisme";

const everything = tourisme.all();               // 4,348
const hotels = tourisme.lodging();               // 1,602
const springs = tourisme.thermalSprings();        // 282
const inTipaza = tourisme.byWilaya(42);           // all tourism sites in wilaya 42
const ruins = tourisme.byLayer("historic");       // 1,184 historic sites

// Everything has lat/lng — distance-sort, map, or nearest-site in a few lines.
```

## What you can build

- **Tourism apps** — searchable directory of hotels, attractions and historic sites by wilaya.
- **Nearest-site lookups** — coordinates on every record, ready for distance sorting.
- **Maps** — drop-in GeoJSON point layers for the full tourism network.
- **Thermal-spring guides** — temperature, flow rate, altitude and mineral composition data for 282 springs.
- **Heritage & culture** — Wikipedia/Wikidata-linked historic sites, monuments and archaeological sites.

## What's inside

| Layer | Function | Count | Notes |
| --- | --- | --- | --- |
| Lodging | `lodging()` | **1,602** | hotels, hostels, guest houses, chalets, alpine huts |
| Attractions | `attractions()` | **1,248** | museums, viewpoints, caves, waterfalls, zoos |
| Historic | `historic()` | **1,184** | archaeological sites, ruins, monuments, forts, castles |
| Thermal springs | `thermalSprings()` | **282** | temperature, flow rate, altitude, minerality |
| Parks | `parks()` | **32** | national parks, nature reserves, protected areas |
| **Total** | `all()` | **4,348** | |

Spanning **69 wilayas**. `wilaya_code` is linked against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) wilaya model (69-wilaya scheme).

## Formats

The npm package ships the **JSON** (importable directly):

```js
import lodging from "@geoalgeria/tourisme/data/lodging.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/tourisme/data/lodging.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import tourisme, { type Lodging, type ThermalSpring } from "@geoalgeria/tourisme";
const hotels: Lodging[] = tourisme.lodging();
const springs: ThermalSpring[] = tourisme.thermalSprings();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  lodging.json            # 1,602 lodging entries
  attractions.json        # 1,248 attractions
  historic.json           # 1,184 historic sites
  thermal-springs.json    # 282 thermal springs
  parks.json              # 32 parks
  metadata.json           # sources, counts, coverage
  csv/                    # CSV exports (repo + Release bundle, not in npm tarball)
  geojson/                # GeoJSON features
```

## Record shape

**Lodging** — hotels, hostels, guest houses:

```json
{
  "name": "عريان الراس",
  "name_ar": "عريان الراس تسابيت",
  "type": "alpine_hut",
  "wilaya_code": "01",
  "lat": 28.4162728,
  "lng": -0.2620846,
  "source": "OpenStreetMap",
  "osm_id": 8107956617,
  "id": 1
}
```

`type` is one of `hotel`, `hostel`, `guest_house`, `apartment`, `chalet`, `motel`, `alpine_hut`.
Optional fields: `stars`, `rooms`, `phone`, `website`, `address`, `name_fr`.

**Thermal spring** — ASAL Geoportail sourced, with physical properties:

```json
{
  "id": 1,
  "name": "FORAGE DAR OUAD",
  "type": "forage",
  "temperature_c": 32,
  "debit_l_s": 15,
  "altitude_m": 423,
  "minerality": "BICARBONATEE CALCIQUE",
  "wilaya_code": "43",
  "wilaya_name": "CONSTANTINE",
  "commune_name": "BENI H'MIDENE",
  "lat": 36.4625,
  "lng": 6.4827778,
  "source": "ASAL geoportail"
}
```

`type` is one of `hammam`, `ain`, `source`, `forage`. Physical properties (`temperature_c`,
`debit_l_s`, `altitude_m`, `minerality`) come directly from the ASAL dataset.

`wilaya_code` is zero-padded to two digits across all layers and joins GeoAlgeria's wilayas.

## Need the administrative divisions too?

If you also need wilayas, dairas, and communes to join against, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it ships the full
69-wilaya division dataset that `wilaya_code` here links to. Use `@geoalgeria/tourisme`
when you *only* need tourism data.

## Source

Data comes from three sources:

- **ASAL Geoportail** — thermal springs (temperature, flow rate, altitude, mineral composition).
  Public government data.
- **OpenStreetMap** — hotels, attractions, historic sites, and parks. Licensed under
  [ODbL](https://opendatacommons.org/licenses/odbl/).
- **Wikidata** — heritage sites, museums, and park metadata. Licensed under
  [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## License & attribution

Code is [MIT](LICENSE). Underlying data:

- Thermal springs: public government data (ASAL).
- OSM-sourced layers: © OpenStreetMap contributors, [ODbL](https://opendatacommons.org/licenses/odbl/).
- Wikidata-sourced records: [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

Redistributed for reference and to power [GeoAlgeria](https://geoalgeria.com). Verify against
original sources for authoritative, real-time information.

[API docs & field reference →](https://geoalgeria.com/data/docs/tourisme) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
