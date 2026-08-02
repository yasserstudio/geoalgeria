**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/telecom

**Algeria mobile-network coverage, as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/telecom)](https://www.npmjs.com/package/@geoalgeria/telecom)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/telecom)](https://www.npmjs.com/package/@geoalgeria/telecom)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**3,096 5G coverage points** across Algeria, published by the operators' own
coverage maps, **Djezzy (1,001)**, **Mobilis (1,919)**, and **Ooredoo (176)**,
each with coordinates and wilaya/commune linkage. Shipped as JSON, CSV, GeoJSON,
and TypeScript. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/telecom
```

```js
import telecom from "@geoalgeria/telecom";

const sites = telecom.coverage();                       // all 3,096 points
const djezzy = telecom.coverageByOperator("djezzy");    // 1,001
const mobilis = telecom.coverageByOperator("mobilis");  // 1,919
const ooredoo = telecom.coverageByOperator("ooredoo");  // 176

// 5G coverage in a wilaya (joins GeoAlgeria's wilaya_code)
const inAlger = sites.filter((s) => s.wilaya_code === "16");
```

The loaders and record shapes are fully **typed**:

```ts
import telecom, { type CoverageSite } from "@geoalgeria/telecom";
const sites: CoverageSite[] = telecom.coverage("5G");
```

## What you can build

- **5G coverage checkers** – "is there 5G near me / in my wilaya?"
- **Operator comparison** – Djezzy / Mobilis / Ooredoo footprint per wilaya/commune.
- **Maps** – drop-in GeoJSON point layers for the 5G rollout.

## What's inside

| Operator | Points | Granularity | Source map |
| --- | --- | --- | --- |
| Djezzy | **1,001** | cell site | djezzy5g.dz |
| Mobilis | **1,919** | cell site | mobilis.dz/map/5g |
| Ooredoo | **176** | covered commune | ooredoo.dz |

Covering **58 wilayas** (including new wilayas like Timimoun, In Salah,
Touggourt).

> **What a point is:** each record is a point published on the operator's own 5G
> coverage map. Djezzy and Mobilis publish **cell-site** locations; Ooredoo
> publishes **commune-level** points within covered communes (a few communes
> carry several). The circles those maps draw are a fixed display radius, **not
> measured RF coverage**, treat these as 5G *presence* points, not coverage
> polygons.

## Organization (future-proof)

Files are named by **technology and operator**, so adding a new generation later
is purely additive, nothing renames:

```
data/
  5g-djezzy.json  5g-mobilis.json  5g-ooredoo.json
  csv/5g-djezzy.csv  ...             # CSV mirror per file
  geojson/5g-djezzy.geojson  ...     # Point features per file
  metadata.json                      # canonical v2 metadata (schema_version, sources[], entities[], by_operator)
```

The npm package ships **JSON, CSV and GeoJSON**; the same files also ride in
every [GitHub Release](https://github.com/yasserstudio/geoalgeria/releases).
`coverage()` concatenates the per-operator files (ids are operator-prefixed, so
the union is collision-free).

## Record shape

Records follow the canonical GeoAlgeria v2 contract (`geo_precision`,
`geo_method`, `source` as a key into `metadata.sources[]`), plus the
coverage-specific fields:

```json
{
  "id": "djezzy-ba5a8250cb",
  "name": "Ain benian ville",
  "wilaya_code": "16",
  "commune_code": null,
  "commune": null,
  "commune_ar": null,
  "lat": 36.7898,
  "lng": 2.91341,
  "geo_precision": "exact",
  "geo_method": "operator_map",
  "source": "djezzy",
  "operator": "djezzy",
  "technology": "5G",
  "address": "AIN BENIAN"
}
```

`id` is a deterministic `{operator}-{coordinate-hash}` key, stable across
re-fetches. `wilaya_code` joins to GeoAlgeria's `wilaya_code`. Fields a given
operator doesn't provide are `null` (Djezzy has no commune; Mobilis has commune
FR/AR but no street address; Ooredoo has the commune name only). For Ooredoo,
`name` is the covered commune and points are `approximate`
(`operator_commune_point`), one point per covered commune, not a cell site.

## Need the administrative divisions too?

For wilayas, dairas, and communes, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package, it's how
you turn a `wilaya_code` into a polygon or name.

## Source & regeneration

Data comes from each operator's public 5G coverage map. Run `npm run fetch` to
regenerate every output: it decodes Djezzy's encoded marker blob, reads Mobilis's
JSON endpoint, and reads Ooredoo's covered-communes endpoint from a real browser
session (the Ooredoo site authenticates itself; this step needs the
[`agent-browser`](https://www.npmjs.com/package/agent-browser) CLI on `PATH`).
Everything is normalized into one schema with `wilaya_code` resolved to GeoAlgeria
codes. Operators file under the 58-wilaya scheme. Writes are all-or-nothing, so a
failed operator never overwrites good committed data with a partial set.

## License & attribution

Code is [MIT](LICENSE). The underlying data is © the respective operators
(**Djezzy**, **Mobilis**, **Ooredoo**), redistributed for reference and to power
[GeoAlgeria](https://geoalgeria.com). 5G rollout is ongoing, each rebuild
reflects whatever the operators' maps currently show; verify against the
operators for authoritative, real-time information.

[API docs & field reference →](https://geoalgeria.com/data/docs/telecom) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
