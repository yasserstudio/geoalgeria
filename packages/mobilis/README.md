**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/mobilis

**The Mobilis sales network in Algeria — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/mobilis)](https://www.npmjs.com/package/@geoalgeria/mobilis)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/mobilis)](https://www.npmjs.com/package/@geoalgeria/mobilis)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

The **165 commercial agencies** (*Agence Mobilis*) and **12,180 approved points
of sale** (*points de vente agréés*) of **Mobilis** (ATM Mobilis), Algeria's
state-owned mobile operator. Agencies come with bilingual FR/AR name and
address and geographic coordinates; points of sale come with name, address, and the
commune they sit in. Shipped as JSON, CSV, and GeoJSON. Part of
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/mobilis
```

```js
import mobilis from "@geoalgeria/mobilis";

const agences = mobilis.agences();   // 165 geocoded Mobilis agencies
const pdv = mobilis.pdv();           // 12,180 approved points of sale
const all = mobilis.all();           // everything (agencies first)

// Agencies in a wilaya (joins GeoAlgeria's wilaya_code)
const inOran = agences.filter((a) => a.wilaya_code === "31");

// Points of sale in a commune
const inBabEzzouar = pdv.filter((p) => p.commune === "BAB EZZOUAR");
```

## What you can build

- **Agency locators** — coordinates on every one of the 165 agencies, ready for
  distance sorting or a map.
- **Coverage by commune** — the points of sale are tagged with their commune, so
  you can count or rank Mobilis presence per commune/wilaya.
- **Bilingual directories** — agency name and address in both French and Arabic.

## What's inside

| Dataset | Count | Coordinates | Notes |
| --- | --- | --- | --- |
| Agencies (*Agence Mobilis*) | **165** | ✅ all 165 | bilingual FR/AR, 56/58 wilayas |
| Approved points of sale | **12,180** | ❌ none | FR name + address + commune |

> The points of sale are a **commune-level directory** — the source carries no
> coordinates for them. To map them, aggregate to commune centroids (join
> `commune` to the [`geoalgeria`](https://www.npmjs.com/package/geoalgeria)
> communes) or geocode the addresses yourself.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import agences from "@geoalgeria/mobilis/data/agences.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/mobilis/data/agences.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import mobilis, { type Agence, type Pdv } from "@geoalgeria/mobilis";
const agences: Agence[] = mobilis.agences();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  agences.json              # 165 agencies (array)
  pdv.json                  # 12,180 points of sale (array)
  metadata.json             # source, counts, generated_at
  csv/agences.csv           # repo + Release bundle (not in npm tarball)
  csv/pdv.csv
  geojson/agences.geojson   # Point features (agencies only)
```

> Only the agencies are geocoded, so only `agences.geojson` exists. The points
> of sale have no `lat`/`lng` and are not emitted as GeoJSON.

## Record shapes

**Agency (*Agence Mobilis*)**

```json
{
  "id": "01-001",
  "code": "12237",
  "type": "agence",
  "name": "Agence Commerciale Adrar",
  "name_ar": "الوكالة التجارية أدرار",
  "address": "Rue de l'indépendance, Adrar",
  "address_ar": "شارع الإستقلال، أدرار.",
  "wilaya_code": "01",
  "lat": 27.877829,
  "lng": -0.274316
}
```

**Approved point of sale**

```json
{
  "id": "01-001",
  "code": "2955",
  "type": "pdv",
  "name": "PDV LIBRAIRIE GAFA ABDERRAHMANE",
  "address": "RUE 17 OCTOBRE CITE 20 AOUT N 03",
  "commune": "ADRAR",
  "wilaya_code": "01",
  "lat": null,
  "lng": null
}
```

`id` is a stable `{wilaya_code}-{seq}` key synthesized by GeoAlgeria (seq ordered
by the source id). Mobilis' own id is kept as `code`. `wilaya_code` joins to
GeoAlgeria's `wilaya_code`.

## Need the administrative divisions too?

For wilayas, dairas, and communes, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it's how
you turn a point of sale's `commune` into a polygon or centroid. Use
`@geoalgeria/mobilis` when you *only* need the Mobilis network.

## Source

Data comes from the **Mobilis** store locator
(<https://mobilis.dz/mapagence>). There is no documented API — the locator calls
a handful of JSON endpoints behind an `X-Requested-With` header, and the site
sits behind a WAF. Run `npm run fetch` to regenerate every output: it primes a
session, walks all 58 wilayas for both categories, parses the `"lat, lng"`
coordinate strings (handling the comma-decimal rows), and normalizes wilaya
codes. Mobilis files records under the **58-wilaya scheme**, so new wilayas
59–69 currently appear under their mother wilaya — same as the Algérie Poste and
ANEM data.

## License & attribution

Code is [MIT](LICENSE). The underlying data is © **ATM Mobilis**, redistributed
for reference and to power [GeoAlgeria](https://geoalgeria.com). Verify against
Mobilis for authoritative, real-time information. The points-of-sale list churns
as resellers come and go — each rebuild reflects whatever the locator currently
shows.

[API docs & field reference →](https://geoalgeria.com/data/docs/mobilis) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
