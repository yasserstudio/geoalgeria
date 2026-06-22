**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/poste

**Every Algérie Poste office and ATM — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/poste)](https://www.npmjs.com/package/@geoalgeria/poste)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/poste)](https://www.npmjs.com/package/@geoalgeria/poste)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

3,908 post offices and 2,026 ATMs across Algeria — with **real postal codes**, bilingual (French / Arabic) names, GPS coordinates, and commune/wilaya linkage. Sourced from Algérie Poste, shipped as JSON, CSV, and GeoJSON. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/poste
```

```js
import poste from "@geoalgeria/poste";

const offices = poste.postOffices();   // 3,908
const atms = poste.atms();             // 2,026

// Post offices in a commune (joins GeoAlgeria's code_commune)
const inAdrar = offices.filter((o) => o.commune_code === "0101");

// Nearest ATM? Everything has lat/lng to compute against.
```

## What you can build

- **Postal-code validation & lookup** — every office carries its real `postal_code`.
- **Branch / ATM locators** — coordinates on (almost) every record, ready for distance sorting or a map.
- **Fintech & logistics** — match addresses to the nearest post office or GAB.
- **Maps** — drop-in GeoJSON point layers for the whole postal network.

## What's inside

| Dataset | Count | Notes |
| --- | --- | --- |
| Post offices | **3,908** | each with its own postal code (`postal_code`) |
| ATMs | **2,026** | Algérie Poste GAB network |

## Formats

The npm package ships the **JSON** (importable directly):

```js
import offices from "@geoalgeria/poste/data/postoffices.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/poste/data/postoffices.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import poste, { type PostOffice, type Atm } from "@geoalgeria/poste";
const offices: PostOffice[] = poste.postOffices();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  postoffices.json            # 3,908 offices (array)
  atms.json                   # 2,026 ATMs (array)
  metadata.json               # source, counts, generated_at
  csv/postoffices.csv         # repo + Release bundle (not in npm tarball)
  csv/atms.csv
  geojson/postoffices.geojson # Point features (records with coordinates)
  geojson/atms.geojson
```

> GeoJSON includes only records that have coordinates — a handful of offices and
> ATMs report no `lat`/`lng` and are omitted there (but remain in JSON/CSV). ATM
> records have no `commune_code` (the source API doesn't provide one).

## Record shapes

**Post office**

```json
{
  "id": 1,
  "name": "ADRAR RP",
  "name_ar": "أدرار م ر",
  "class": "CE",
  "postal_code": "01000",
  "address": "ADRAR CENTRE RUE DES MARYTIM",
  "commune_code": "0101",
  "commune_fr": "ADRAR",
  "commune_ar": "أدرار",
  "wilaya_code": "01",
  "wilaya_fr": "ADRAR",
  "wilaya_ar": "أدرار",
  "lat": 27.8708439,
  "lng": -0.2871417
}
```

`class` is the office category (`CE`, `R1`–`R4`, `HC`, `GA`). `commune_code` is
Algérie Poste's 4-digit commune code, which joins to GeoAlgeria's `code_commune`.

**ATM** — same shape, keyed by `id`/`name`/`postal_code`/`wilaya_*` with `lat`/`lng`; no `commune_code`.

## Need the administrative divisions too?

If you also need wilayas, dairas, and communes, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it mirrors
this postal data in and exposes `postOffices` / `atms` alongside the full
division dataset. Use `@geoalgeria/poste` when you *only* need postal/banking data.

## Source

Data comes from **Algérie Poste** via the public BaridiMap API
(<https://baridimap.poste.dz>). Run `npm run fetch` to regenerate every output
from the live API; the same run mirrors the data into the `geoalgeria` package so
the two never drift (this package is the canonical source). Re-fetch periodically
— BaridiMap still files offices under the 58-wilaya scheme, so new wilayas 59–69
currently appear under their mother wilaya.

## License & attribution

Code is [MIT](LICENSE). The underlying data is © **Algérie Poste**, redistributed
for reference and to power [GeoAlgeria](https://geoalgeria.com). Verify against
Algérie Poste for authoritative, real-time information.

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
