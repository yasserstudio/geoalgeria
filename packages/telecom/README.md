<div align="center">

# @geoalgeria/telecom

**Algeria mobile-network coverage — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/telecom)](https://www.npmjs.com/package/@geoalgeria/telecom)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/telecom)](https://www.npmjs.com/package/@geoalgeria/telecom)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**1,505 5G cell-site locations** across Algeria, published by the operators' own
coverage maps — **Djezzy (1,001)** and **Mobilis (504)** — each with coordinates
and wilaya (and, where available, commune) linkage. Shipped as JSON, CSV,
GeoJSON, and TypeScript. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/telecom
```

```js
import telecom from "@geoalgeria/telecom";

const sites = telecom.coverage();                       // all 1,505 5G sites
const djezzy = telecom.coverageByOperator("djezzy");    // 1,001
const mobilis = telecom.coverageByOperator("mobilis");  // 504

// 5G sites in a wilaya (joins GeoAlgeria's wilaya_code)
const inAlger = sites.filter((s) => s.wilaya_code === "16");
```

The loaders and record shapes are fully **typed**:

```ts
import telecom, { type CoverageSite } from "@geoalgeria/telecom";
const sites: CoverageSite[] = telecom.coverage("5G");
```

## What you can build

- **5G coverage checkers** — "is there a 5G site near me / in my wilaya?"
- **Operator comparison** — Djezzy vs Mobilis footprint per wilaya/commune.
- **Maps** — drop-in GeoJSON point layers for the 5G rollout.

## What's inside

| Operator | 5G sites | Source map |
| --- | --- | --- |
| Djezzy | **1,001** | djezzy5g.dz |
| Mobilis | **504** | mobilis.dz/map/5g |

Covering **18 wilayas** (including new wilayas like Timimoun, In Salah,
Touggourt). Ooredoo is **not yet included** — its map gates data behind an
authenticated store-locator API rather than publishing 5G sites openly; it will
be added if/when an open source is available.

> **What a "site" is:** each record is a point the operator publishes on its own
> 5G coverage map. The circles those maps draw are a fixed display radius, **not
> measured RF coverage** — treat these as 5G *presence* points, not coverage
> polygons.

## Organization (future-proof)

Coverage is namespaced by **technology**, so adding a new generation later is
purely additive — nothing renames:

```
data/
  coverage/5g/
    sites.json          # combined — all operators
    djezzy.json  mobilis.json
  csv/coverage/5g/sites.csv          # repo + Release bundle (not in npm tarball)
  geojson/coverage/5g/sites.geojson  # Point features
  metadata.json         # sources, technologies, per-operator counts, generated_at
```

The npm package ships the **JSON**; CSV/GeoJSON ride in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases).

## Record shape

```json
{
  "id": "djezzy-ba5a8250cb",
  "technology": "5G",
  "operator": "djezzy",
  "name": "Ain benian ville",
  "address": "AIN BENIAN",
  "commune": null,
  "commune_ar": null,
  "commune_code": null,
  "wilaya_code": "16",
  "lat": 36.7898,
  "lng": 2.91341,
  "source": "https://www.djezzy5g.dz/map.html"
}
```

`id` is a deterministic `{operator}-{coordinate-hash}` key, stable across
re-fetches. `wilaya_code` joins to GeoAlgeria's `wilaya_code`. Fields a given
operator doesn't provide are `null` (Djezzy has no commune; Mobilis has commune
FR/AR but no street address).

## Need the administrative divisions too?

For wilayas, dairas, and communes, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it's how
you turn a `wilaya_code` into a polygon or name.

## Source & regeneration

Data comes from each operator's public 5G coverage map. Run `npm run fetch` to
regenerate every output: it pulls Djezzy's encoded marker blob and decodes it,
reads Mobilis's JSON endpoint, normalizes both into one schema, and resolves
wilaya names to GeoAlgeria codes. Operators file sites under the 58-wilaya
scheme.

## License & attribution

Code is [MIT](LICENSE). The underlying data is © the respective operators
(**Djezzy**, **Mobilis**), redistributed for reference and to power
[GeoAlgeria](https://geoalgeria.com). 5G rollout is ongoing — each rebuild
reflects whatever the operators' maps currently show; verify against the
operators for authoritative, real-time information.
