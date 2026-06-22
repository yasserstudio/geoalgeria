**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/livraison

**Algeria's delivery carriers and their stop-desks — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/livraison)](https://www.npmjs.com/package/@geoalgeria/livraison)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/livraison)](https://www.npmjs.com/package/@geoalgeria/livraison)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

The COD / e-commerce delivery layer for Algeria, in three parts: a **registry** of
delivery carriers, **411 geocoded stop-desk points** across 61 wilayas, and
**per-carrier coverage**. Shipped as JSON, CSV, and GeoJSON. Part of
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/livraison
```

```js
import livraison from "@geoalgeria/livraison";

const all = livraison.carriers();                    // 16 carriers
const yalidine = livraison.carrierById("yalidine");  // one carrier
const inAlgiers = livraison.stopdesksByWilaya(16);    // stop-desks in wilaya 16
const guepexDesks = livraison.stopdesksByCarrier("guepex");
const reach = livraison.coverageByCarrier("yalidine"); // wilayas it serves

// Every stop-desk has lat/lng — nearest-desk, map, or distance-sort in a few lines.
```

## What you can build

- **Nearest stop-desk** — coordinates on every stop-desk, ready for distance sorting.
- **Checkout drop-off pickers** — list a carrier's desks in the buyer's wilaya.
- **Carrier comparison** — registry of who operates, their model (stop-desk vs home), and COD support.
- **Maps** — drop-in GeoJSON point layer for the whole open stop-desk network.

## What's inside

| Dataset | Count | Geocoded | Notes |
| --- | --- | --- | --- |
| Carriers (`carriers.json`) | **16** | — | registry: name, website, model, COD, scope, data openness, API |
| Stop-desks (`stopdesks.json`) | **411** | ✅ all | id, operator, name, address, commune, `wilaya_code`, lat/lng |
| Coverage (`coverage.json`) | **9** | — | per-carrier wilaya/commune stop-desk presence |

Stop-desks span **61 wilayas**, every one geocoded. `wilaya_code` links against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) 69-wilaya model.

### A note on coverage and honesty

Algeria has 90+ delivery companies, but only a few publish their agency locations
openly. The **registry** covers the field (the major carriers and what each is); the
**geocoded layer** covers the carriers that publish locations openly:

- the **Yalidine + Guepex relay ecosystem** — Yalidine, Guepex, and the operators that
  ride their shared network (EasyAndSpeed, WeCanServices, SpeedMail, Zimou Express);
- **Anderson**, **Noest** and **Maystro**, three independent networks, each geocoded from
  the Google Maps link on its agency cards (agencies whose links are missing, unresolvable,
  or point to a different wilaya than the card declares are omitted).

Carriers like ZR Express, DHD, DHL and Aramex keep their agency lists behind apps,
logins, or licensed APIs, so they appear in the registry with `open_agency_data: "none"`
and no stop-desks here. Coverage is *stop-desk presence* for the carriers with open data,
not a claim about home-delivery reach.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import carriers from "@geoalgeria/livraison/data/carriers.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/livraison/data/stopdesks.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import livraison, { type StopDesk } from "@geoalgeria/livraison";
const desks: StopDesk[] = livraison.stopdesks();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  carriers.json             # 16 carriers (registry)
  stopdesks.json            # 411 geocoded stop-desks (array)
  coverage.json             # 9 per-carrier coverage rows
  metadata.json             # sources, counts, generated_at
  csv/                      # repo + Release bundle (not in npm tarball)
    carriers.csv
    stopdesks.csv
    coverage.csv
  geojson/stopdesks.geojson # Point features (all 411 geocoded)
```

## Record shapes

```json
// stopdesks.json
{
  "id": "160101",
  "operator": "guepex",
  "name": "Agence Sacré-Cœur",
  "address": "116 Didouche Mourad, Sacré Cœur, Alger",
  "commune": "Alger Centre",
  "wilaya_code": 16,
  "lat": 36.7635831801555,
  "lng": 3.0471151913967005,
  "sources": ["guepex", "yalidine"]
}
```

```json
// carriers.json
{
  "id": "yalidine",
  "name": "Yalidine Express",
  "website": "https://yalidine-express.com.dz",
  "type": "both",
  "cod": true,
  "scope": "domestic",
  "open_agency_data": "geocoded",
  "api": "documented",
  "in_stopdesks": true,
  "stopdesk_count": 93,
  "stopdesk_wilaya_count": 54,
  "notes": "Largest COD network; publishes an open geocoded stop-desk table."
}
```

`operator` on a stop-desk joins `carriers[].id`. `wilaya_code` joins GeoAlgeria's
wilayas. `sources` lists which open feeds carry the desk — `["yalidine","guepex"]` when
the relay maps agree, or `["anderson"]` for an Anderson agency.

## Need the administrative divisions too?

If you also need wilayas, dairas, and communes to join against, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it ships the full
69-wilaya division dataset that `wilaya_code` here links to. Use `@geoalgeria/livraison`
when you *only* need delivery data.

## Source

Stop-desks come from the carriers that publish open agency data:

- **Yalidine** (<https://yalidine-express.com.dz/nos-agences/>) and **Guepex**
  (<https://www.guepex.dz/public/data/agences.json>) share a federated relay network and
  stop-desk ids, so their records are merged and de-duplicated by id.
- **Anderson** (<https://anderson-ecommerce.com>), **Noest** (<https://noest-dz.com>) and
  **Maystro** (<https://maystro-delivery.com/Coverage.html>) each list their agencies with a
  Google Maps link per card; the build resolves each link to the agency's pin (agencies whose
  links are missing, unresolvable, or resolve to a different wilaya than the card declares are
  omitted).

The carrier registry is compiled from [CourierDZ](https://github.com/PiteurStudio/CourierDZ),
carrier websites, and GeoAlgeria research. Run `npm run fetch` to regenerate every output
from the live sources; the build fails loudly if any source's count collapses or an
unknown carrier appears. `wilaya_code` is resolved by nearest commune centroid from the
`geoalgeria` dataset.

## License & attribution

Code is [MIT](LICENSE). Stop-desk data is © the respective carriers; the carrier
registry is compiled by GeoAlgeria. Redistributed for reference and to power
[GeoAlgeria](https://geoalgeria.com). Verify against each carrier for authoritative,
real-time information.

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
