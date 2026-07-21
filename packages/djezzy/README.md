**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/djezzy

**The Djezzy boutique network in Algeria — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/djezzy)](https://www.npmjs.com/package/@geoalgeria/djezzy)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/djezzy)](https://www.npmjs.com/package/@geoalgeria/djezzy)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

The **128 boutiques** of **Djezzy** (Optimum Telecom Algérie), one of Algeria's
three mobile operators — every store geocoded, with its category, address,
opening hours, opening code, and commune/wilaya linkage. Shipped as JSON, CSV,
GeoJSON, and TypeScript. Part of
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/djezzy
```

```js
import djezzy from "@geoalgeria/djezzy";

const boutiques = djezzy.boutiques();   // 128 geocoded Djezzy boutiques

// Boutiques in a wilaya (joins GeoAlgeria's wilaya_code)
const inAlgiers = boutiques.filter((b) => b.wilaya_code === "16");

// Nearest boutique to a point, by category
const flagships = boutiques.filter((b) => b.category === "A");
```

## What you can build

- **Store locators** — coordinates on every one of the 128 boutiques, ready for
  distance sorting or a map.
- **Coverage by wilaya** — each boutique is tagged with its commune and wilaya,
  so you can count or rank Djezzy presence across the country's 63 covered wilayas.
- **Operator comparisons** — join against
  [`@geoalgeria/mobilis`](https://www.npmjs.com/package/@geoalgeria/mobilis) on
  `wilaya_code` to compare retail footprints operator by operator.

## What's inside

| Dataset | Count | Coordinates | Notes |
| --- | --- | --- | --- |
| Boutiques | **128** | ✅ all 128 | category A/B/C, hours, 63 wilayas |

## Formats

The npm package ships the **JSON** (importable directly):

```js
import boutiques from "@geoalgeria/djezzy/data/boutiques.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/djezzy/data/boutiques.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import djezzy, { type Boutique } from "@geoalgeria/djezzy";
const boutiques: Boutique[] = djezzy.boutiques();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  boutiques.json              # 128 boutiques (array)
  metadata.json               # sources, counts, license, updated
  csv/boutiques.csv           # repo + Release bundle (not in npm tarball)
  geojson/boutiques.geojson   # Point features
```

## Record shape

```json
{
  "id": "01-001",
  "name": "ADRAR",
  "wilaya_code": "01",
  "commune_code": "0101",
  "commune": "Adrar",
  "lat": 27.87194,
  "lng": -0.28569,
  "geo_precision": "exact",
  "geo_method": "operator_point",
  "source": "djezzy",
  "refs": {
    "djezzy": "Z56"
  },
  "type": "boutique",
  "category": "C",
  "address": "Groupe 74, Prés souk Dinar Tayeb, Adrar.",
  "hours": "08H00 - 18H00",
  "code_ouverture": null
}
```

`id` is a stable `{wilaya_code}-{seq}` key synthesized by GeoAlgeria (seq ordered
by the source code), unique within this dataset. Djezzy's own store code is kept
as `refs.djezzy`. `wilaya_code` joins to GeoAlgeria's `wilaya_code`. `geo_precision`
is always `"exact"` and `geo_method` always `"operator_point"` — every boutique
carries a real Djezzy-published coordinate.

> **Commune/wilaya linkage is derived, not from the source.** Djezzy publishes a
> coordinate pair and an address string but no administrative codes. GeoAlgeria
> attaches `wilaya_code`, `commune_code`, and `commune` by a **nearest-centroid
> join** against the [`geoalgeria`](https://www.npmjs.com/package/geoalgeria)
> commune set. Wilaya assignment is effectively exact; commune is best-effort
> (centroid proximity, not polygon containment).

## Need the administrative divisions too?

For wilayas, dairas, and communes, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it's how
you turn a boutique's `commune_code` into a polygon or centroid. Use
`@geoalgeria/djezzy` when you *only* need the Djezzy network.

## Source

Data comes from the **Djezzy** store locator
(<https://www.djezzy.dz/nos-boutiques/>). The page ships the full boutique list
inline as an HTML-entity-encoded JSON array — there is no separate API. Run
`npm run fetch` to regenerate every output: it parses the inline store objects,
validates the coordinates fall inside Algeria, and attaches the administrative
linkage by nearest commune centroid.

## License & attribution

Code is [MIT](LICENSE). The underlying data is © **Optimum Telecom Algérie
(Djezzy)**, redistributed for reference and to power
[GeoAlgeria](https://geoalgeria.com). Verify against Djezzy for authoritative,
real-time information. The boutique list changes as stores open and close — each
rebuild reflects whatever the locator currently shows.

[API docs & field reference →](https://geoalgeria.com/data/docs/djezzy) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
