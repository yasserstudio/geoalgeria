**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/jeunesse

**Every youth establishment in Algeria — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/jeunesse)](https://www.npmjs.com/package/@geoalgeria/jeunesse)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/jeunesse)](https://www.npmjs.com/package/@geoalgeria/jeunesse)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

2,334 youth establishments across Algeria — **maisons de jeunes**, complexes sportifs de
proximité, salles polyvalentes, auberges de jeunes, science & cultural centers, youth camps
and more — each with its name, **type**, address, capacity, operational status, PMR
accessibility, built/land area, commune / daïra / wilaya, and GPS coordinates. Sourced from
the **Ministère de la Jeunesse et des Sports GIS (sig.mjs.gov.dz)** — the same official
system behind [`@geoalgeria/sports`](https://www.npmjs.com/package/@geoalgeria/sports).
Shipped as JSON, CSV, and GeoJSON. Part of
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/jeunesse
```

```js
import jeunesse from "@geoalgeria/jeunesse";

const all = jeunesse.institutions();                 // ~2,334
const inAlgiers = jeunesse.institutionsByWilaya(16);  // establishments in wilaya 16
const houses = jeunesse.institutionsByType("MJ");     // every maison de jeunes

// Everything has lat/lng — distance-sort, map, or nearest-establishment in a few lines.
```

## What you can build

- **"Nearest youth center" lookups** — coordinates on every record, ready for distance sorting.
- **Civic & youth apps** — map maisons de jeunes, sports complexes and cultural centers per wilaya, filtered by capacity or operational status.
- **Maps** — drop-in GeoJSON point layer for the whole youth-establishment network.
- **Research & planning** — establishment density by type and wilaya, capacity analysis, PMR-accessibility and operational-status audits.

## What's inside

| Type | Code | Count |
| --- | --- | --- |
| Maison de jeunes | `MJ` | 960 |
| Complexe sportif de proximité | `CSP` | 694 |
| Salle polyvalente | `SPA` | 295 |
| Auberge de jeunes | `AJ` | 241 |
| Camp de jeunes | `CJ` | 54 |
| Centre de loisirs scientifiques | `CLS` | 46 |
| Foyer de jeunes | `FJ` | 22 |
| Centre culturel | `CC` | 19 |
| Bloc d'accueil | `BA` | 3 |
| **Total** | | **2,334** |

Spanning **58 wilayas**, every establishment geocoded. `wilaya_code` is linked against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) wilaya model.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import institutions from "@geoalgeria/jeunesse/data/institutions.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/jeunesse/data/institutions.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import jeunesse, { type Institution } from "@geoalgeria/jeunesse";
const all: Institution[] = jeunesse.institutions();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  institutions.json            # ~2,334 establishments (array)
  metadata.json                # source, counts, by_type, generated_at
  csv/institutions.csv         # repo + Release bundle (not in npm tarball)
  geojson/institutions.geojson # Point features (all geocoded)
```

## Record shape

```json
{
  "id": 1,
  "name": "Auberge de jeunes El amir Abdelkader, Sbaa",
  "name_ar": "دار الشباب الأمير عبد القادر",
  "type_code": "AJ",
  "type_fr": "Auberge de jeunes",
  "type_ar": "نزل الشباب",
  "address": "sabaa, tsabit, adrar",
  "commune": "SEBAA",
  "daira": "TSABIT",
  "wilaya_code": "01",
  "wilaya_name": "ADRAR",
  "capacity": 50,
  "year": 2012,
  "operational": true,
  "pmr": true,
  "surface_built_m2": 3600,
  "surface_land_m2": 3600,
  "lat": 28.2186,
  "lng": -0.173,
  "source": "https://sig.mjs.gov.dz/dashboard/viewer"
}
```

The GIS publishes names in **French**; `name_ar` is the Arabic name **backfilled** from the
ministry's legacy public map by nearest-neighbour geo-match (≤ 200 m, and type-checked so a
different kind of facility's name is never grafted on) — present on ~59% of records, `null`
where no confident match exists. `name` is `null` for the ~5% the source
leaves blank; `commune`, `daira` and `wilaya_name` are French (uppercase, as published). For
the full French wilaya/commune divisions, join `wilaya_code` against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) dataset. `wilaya_code` is zero-padded
to two digits and is `≤ 58` (the source predates the 69-wilaya reform); it still joins the
GeoAlgeria wilaya model.

## Sports infrastructure too?

For stadiums, pools, tracks, courts and the rest of Algeria's **sports** facilities (from the
same MJS GIS), see the sister package
**[`@geoalgeria/sports`](https://www.npmjs.com/package/@geoalgeria/sports)**. Use
`@geoalgeria/jeunesse` for youth establishments; use `@geoalgeria/sports` for sports
infrastructure.

## Need the administrative divisions too?

If you also need wilayas, dairas, and communes to join against, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it ships the full
wilaya division dataset that `wilaya_code` here links to.

## Source

Data comes from the **Ministère de la Jeunesse et des Sports**, via its public GIS
(<https://sig.mjs.gov.dz/dashboard/viewer>). Run `npm run fetch` to regenerate every output
from the live system; the build resolves each French wilaya name to the flagship wilaya code,
repairs records with transposed coordinates, backfills Arabic names from the legacy map, and
drops the few with placeholder/out-of-country coordinates (`metadata.dropped`). It fails
loudly if the establishment count collapses or an unknown type appears.

## License & attribution

Code is [MIT](LICENSE). The underlying data is © **Ministère de la Jeunesse et des Sports**,
redistributed for reference and to power [GeoAlgeria](https://geoalgeria.com). Verify against
the ministry for authoritative, real-time information.

[API docs & field reference →](https://geoalgeria.com/data/docs/jeunesse) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
