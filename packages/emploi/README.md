**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/emploi

**Every public employment agency in Algeria — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/emploi)](https://www.npmjs.com/package/@geoalgeria/emploi)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/emploi)](https://www.npmjs.com/package/@geoalgeria/emploi)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

The **58 AWEM** (wilaya employment agencies) and **273 ALEM** (local employment
agencies) of Algeria's national employment agency, **ANEM** — each with address,
phone, fax, email, manager, and GPS coordinates. Shipped
as JSON, CSV, and GeoJSON. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/emploi
```

```js
import emploi from "@geoalgeria/emploi";

const awem = emploi.awem();         // 58 wilaya-level agencies
const alem = emploi.alem();         // 273 local agencies
const all = emploi.agencies();      // all 331 (AWEM first)

// Agencies in a wilaya (joins GeoAlgeria's wilaya_code)
const inAlger = all.filter((a) => a.wilaya_code === "16");

// Find a local agency by name
const reggane = alem.filter((a) => a.name.includes("REGGANE"));
```

## What you can build

- **Agency locators** — coordinates on (almost) every record, ready for distance sorting or a map.
- **Contact directories** — phone, fax, email, and manager per agency.
- **Maps** — drop-in GeoJSON point layers for the whole employment network.

## What's inside

| Dataset | Count | Notes |
| --- | --- | --- |
| AWEM (wilaya agencies) | **58** | one per wilaya |
| ALEM (local agencies) | **273** | sub-wilaya offices, named by locality |

## Formats

The npm package ships the **JSON** (importable directly):

```js
import alem from "@geoalgeria/emploi/data/alem.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/emploi/data/alem.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import emploi, { type Awem, type Alem } from "@geoalgeria/emploi";
const local: Alem[] = emploi.alem();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  awem.json               # 58 wilaya agencies (array)
  alem.json               # 273 local agencies (array)
  metadata.json           # sources, counts, updated
  csv/awem.csv            # repo + Release bundle (not in npm tarball)
  csv/alem.csv
  geojson/awem.geojson    # Point features (records with coordinates)
  geojson/alem.geojson
```

> GeoJSON includes only records that have coordinates — 2 ALEM report no
> `lat`/`lng` and are omitted there (but remain in JSON/CSV).

## Record shapes

**ALEM (local agency)**

```json
{
  "id": "01-02",
  "name": "ALEM REGGANE",
  "wilaya_code": "01",
  "commune_code": null,
  "commune": null,
  "lat": 26.71627,
  "lng": 0.17441,
  "geo_precision": "exact",
  "geo_method": "anem",
  "source": "anem",
  "type": "ALEM",
  "code": "0102",
  "address": "Hai Saada - Reggane",
  "phone": "(049) 320 - 373",
  "fax": "(049) 320 - 372",
  "email": "alem.reggane@anem.dz",
  "manager": "BELHADJ ABBELKADER"
}
```

`id` is a stable `{wilaya_code}-{seq}` key synthesized by GeoAlgeria, unique
across the merged `agencies()` set (AWEM ids never contain a dash, ALEM ids
always do) — ANEM's own `code` is kept too but is missing on some records and
not unique, so prefer `id`. `commune_code`/`commune` are currently `null` on
every record — ANEM's source resolves to wilaya only, not commune. `wilaya_code`
joins to GeoAlgeria's `wilaya_code`.

**AWEM (wilaya agency)** — same shape, `id` = the 2-digit `wilaya_code`, keyed by
`name` / `address` / `phone` / `manager` with `lat`/`lng`.

## Need the administrative divisions too?

For wilayas, dairas, and communes (and postal data), use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package. Use
`@geoalgeria/emploi` when you *only* need the employment-agency network.

## Source

Data comes from **ANEM** (National Employment Agency) via its cartographic
portal (<https://www.anem.dz/#/portail-carto>). There is no public API — the
agencies are embedded in the portal's JavaScript bundle. Run `npm run fetch` to
regenerate every output: it rediscovers the current bundle, extracts both
datasets, fixes the source's `X`=lat / `Y`=lng inversion, and normalizes wilaya
codes. ANEM files agencies under the **58-wilaya scheme**, so new wilayas 59–69
currently appear under their mother wilaya.

## License & attribution

Code is [MIT](LICENSE). The underlying data is © **ANEM**, redistributed for
reference and to power [GeoAlgeria](https://geoalgeria.com). Verify against ANEM
for authoritative, real-time information.

The `manager` field is the agency head's name as published, verbatim, on ANEM's
own public portal — it is not private data. Each rebuild reflects whatever ANEM
currently shows; if they remove it, it drops out here too.

[API docs & field reference →](https://geoalgeria.com/data/docs/emploi) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
