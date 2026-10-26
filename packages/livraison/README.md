**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/livraison

**Algeria's delivery carriers and their stop-desks, as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/livraison)](https://www.npmjs.com/package/@geoalgeria/livraison)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/livraison)](https://www.npmjs.com/package/@geoalgeria/livraison)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

The COD / e-commerce delivery layer for Algeria, in three parts: a **registry** of
delivery carriers, **650 geocoded stop-desk points** across 64 wilayas, and
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

// Every stop-desk has lat/lng – nearest-desk, map, or distance-sort in a few lines.
```

## What you can build

- **Nearest stop-desk** – coordinates on every stop-desk, ready for distance sorting.
- **Checkout drop-off pickers** – list a carrier's desks in the buyer's wilaya.
- **Carrier comparison** – registry of who operates, their model (stop-desk vs home), and COD support.
- **Maps** – drop-in GeoJSON point layer for the whole open stop-desk network.

## What's inside

| Dataset | Count | Geocoded | Notes |
| --- | --- | --- | --- |
| Carriers (`carriers.json`) | **18** | – | registry: name, website, model, COD, scope, data openness, API |
| Stop-desks (`stopdesks.json`) | **650** | ✅ all | id, operator, name, `name_ar`, address, commune, `wilaya_code`, lat/lng |
| Coverage (`coverage.json`) | **12** | – | per-carrier wilaya/commune stop-desk presence |

Stop-desks span **64 wilayas**, every one geocoded. `wilaya_code` links against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) 69-wilaya model.

### A note on coverage and honesty

Algeria has 90+ delivery companies, but only a few publish their agency locations
openly. The **registry** covers the field (the major carriers and what each is); the
**geocoded layer** covers the carriers that publish locations openly:

- the **Yalidine + Guepex relay ecosystem** – Yalidine, Guepex, and the operators that
  ride their shared network (EasyAndSpeed, WeCanServices, SpeedMail, Zimou Express);
- **Anderson**, **Noest**, **Maystro**, **ZR Express**, **Swift Express** and
  **HHD Express**, six independent networks, each geocoded from the Google Maps link on its
  agency cards, office rows or published agency list (agencies whose links are missing,
  unresolvable, or point to a different wilaya than the card declares are omitted; nothing
  is geocoded from an address).

Carriers like DHD, DHL and Aramex keep their agency lists behind apps,
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

The loaders and record shapes are fully **typed**, TypeScript definitions ship in the package:

```ts
import livraison, { type StopDesk } from "@geoalgeria/livraison";
const desks: StopDesk[] = livraison.stopdesks();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  carriers.json             # 18 carriers (registry)
  stopdesks.json            # 650 geocoded stop-desks (array)
  coverage.json             # 12 per-carrier coverage rows
  metadata.json             # sources, counts, updated
  csv/                      # repo + Release bundle (not in npm tarball)
    carriers.csv
    stopdesks.csv
    coverage.csv
  geojson/stopdesks.geojson # Point features (all 650 geocoded)
```

## Record shapes

```json
// stopdesks.json
{
  "id": "160101",
  "name": "Agence Sacré-Cœur",
  "wilaya_code": "16",
  "commune_code": null,
  "commune": "Alger Centre",
  "lat": 36.7635831801555,
  "lng": 3.0471151913967005,
  "geo_precision": "exact",
  "geo_method": "carrier_relay",
  "source": "guepex",
  "operator": "guepex",
  "address": "116 Didouche Mourad, Sacré Cœur, Alger",
  "sources": ["guepex", "yalidine"]
}
```

`geo_precision` is `"exact"` on 648 of the 650 stop-desks and `"approximate"` on two: ZR Express publishes its Constantine sorting centre and its Zouaghi office on one operator pin, and a coordinate two desks share is not a per-desk point, so both are published as approximate.

`metadata.json` also carries `carried_pins`: the desks shipping a coordinate the latest refresh did not read, each with its id, its name and the date of the run that did read it. `metadata.sources[].retrieved` dates the carrier's list, this dates the pin itself. The list is empty when every carrier link resolved, and joins `stopdesks.json` by id.

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
  "notes": "Largest COD network; publishes an open geocoded stop-desk table that also lists partner operators (federated relay). Documented developer API (centers/communes/wilayas) is merchant-key gated.",
  "in_stopdesks": true,
  "stopdesk_count": 93,
  "stopdesk_wilaya_count": 54
}
```

`operator` on a stop-desk joins `carriers[].id`. `commune_code` is always `null`, carrier
relay feeds publish a commune name only, never an ONS code. `wilaya_code` joins GeoAlgeria's
wilayas. `sources` lists which open feeds carry the desk, `["yalidine","guepex"]` when
the relay maps agree, or `["anderson"]` for an Anderson agency.

## Need the administrative divisions too?

If you also need wilayas, dairas, and communes to join against, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package, it ships the full
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
- **ZR Express** (<https://www.zrexpress.net/en/offices>) lists its offices with the pin
  already inside the Maps link (`?api=1&query=<lat>,<lng>`), so no link has to be resolved.
  Its row numbers are a display index, not branch codes, so ids are minted from the wilaya
  and commune. Three rows link a place-name search instead of a coordinate and are omitted
  rather than geocoded.
- **Swift Express** (<https://www.swiftexpress.org/fr/offices>) renders its agency list
  server-side, so one ordinary request returns the whole network as JSON inside the page.
  Each office carries its own record key, which is what its id is minted from, plus its
  address, its wilaya and a Google Maps shortlink resolved like Anderson's and Noest's.
- **HHD Express** (<https://hhd.dz/>) shows six agencies on the page and compiles all 80
  into the client chunk that draws the section, so the chunk the page names is read instead
  of the preview. An agency carries no record key, so ids are minted from the wilaya and
  commune. Eleven agencies link a Maps place that publishes no coordinate, or no link at
  all, and are omitted rather than geocoded. HHD files El Meniaa under Ghardaïa, the
  wilaya it was carved out of in 2021, so its pin lands outside the one the list declares;
  the cross-check every carded carrier gets reads that parent from the wilaya registry,
  recognises the pair and keeps the agency.

The carrier registry is compiled from [CourierDZ](https://github.com/PiteurStudio/CourierDZ),
carrier websites, and GeoAlgeria research. Run `npm run fetch` to regenerate every output
from the live sources; the build fails loudly if any source's count collapses or an
unknown carrier appears. Every pull is committed to the repository's `sources/livraison/`
store, so `node scripts/fetch.mjs --cache` rebuilds the whole package from it with no
network. `wilaya_code` is resolved by nearest commune centroid from the
`geoalgeria` dataset.

## Licence & attribution

Code is [MIT](LICENSE). Stop-desk data is © the respective carriers; the carrier
registry is compiled by GeoAlgeria. Redistributed for reference and to power
[GeoAlgeria](https://geoalgeria.com). Verify against each carrier for authoritative,
real-time information.

[API docs & field reference →](https://geoalgeria.com/data/docs/livraison) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [support@yasser.studio](mailto:support@yasser.studio)

GeoAlgeria is free, and it stays free. The same studio also makes maps, websites, mobile apps and open data for clients.
