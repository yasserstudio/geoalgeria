<div align="center">

# @geoalgeria/jeunesse

**Every youth & sports institution in Algeria — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/jeunesse)](https://www.npmjs.com/package/@geoalgeria/jeunesse)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/jeunesse)](https://www.npmjs.com/package/@geoalgeria/jeunesse)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

2,076 youth & sports institutions across Algeria — **maisons de jeunes**, sports complexes,
salles polyvalentes, auberges de jeunes, cultural centers, youth camps and more — each with
its official Arabic name, institution **type**, commune / daïra / wilaya, and GPS coordinates.
Sourced from the **Ministère de la Jeunesse**, shipped as JSON, CSV, and GeoJSON. Part of
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/jeunesse
```

```js
import jeunesse from "@geoalgeria/jeunesse";

const all = jeunesse.institutions();              // 2,076
const inAlgiers = jeunesse.institutionsByWilaya(16); // institutions in wilaya 16
const houses = jeunesse.institutionsByType("MJ");  // every maison de jeunes

// Everything has lat/lng — distance-sort, map, or nearest-institution in a few lines.
```

## What you can build

- **"Nearest youth center" lookups** — coordinates on every record, ready for distance sorting.
- **Civic & youth apps** — map maisons de jeunes, sports complexes and cultural centers per wilaya.
- **Maps** — drop-in GeoJSON point layer for the whole youth & sports network.
- **Research & planning** — institution density by type and wilaya across the country.

## What's inside

| Type | Code | Count |
| --- | --- | --- |
| Maison de jeunes | `MJ` | 833 |
| Complexe sportif de proximité | `CS` | 577 |
| Salle polyvalente | `SPA` | 297 |
| Auberge de jeunes | `AJ` | 193 |
| Centre culturel | `CC` | 58 |
| Camp de jeunes | `CJ` | 51 |
| Centre de loisirs scientifiques | `CLS` | 35 |
| Club de jeunes | `CLJ` | 29 |
| Piscine de proximité | `PAL` | 3 |
| **Total** | | **2,076** |

Spanning **50 wilayas**, every institution geocoded. `wilaya_code` is linked against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) wilaya model. The source publishes
fewer than the full set of wilayas; the eight not present in the ministry's map are simply
absent upstream, not dropped here.

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
  institutions.json            # 2,076 institutions (array)
  metadata.json                # source, counts, by_type, generated_at
  csv/institutions.csv         # repo + Release bundle (not in npm tarball)
  geojson/institutions.geojson # Point features (all 2,076 are geocoded)
```

## Record shape

```json
{
  "id": 4,
  "name": "دار الشباب خير الدين",
  "type_code": "MJ",
  "type_ar": "دار الشباب",
  "type_fr": "Maison de jeunes",
  "commune": "تقرت",
  "daira": "تقرت",
  "wilaya_code": "55",
  "wilaya_name": "تقرت",
  "lat": 33.10933,
  "lng": 6.07068,
  "source": "https://youthconnect.mjeunesse.gov.dz/institutions-map"
}
```

The ministry publishes names in **Arabic only**, so `name`, `commune`, `daira` and
`wilaya_name` are Arabic; `type_fr` is an indicative French label for the type. For French
wilaya and commune names, join `wilaya_code` against the [`geoalgeria`](https://www.npmjs.com/package/geoalgeria)
dataset. `wilaya_code` is zero-padded to two digits and is `≤ 58` (the source predates the
69-wilaya reform); it still joins the GeoAlgeria wilaya model.

## Need the administrative divisions too?

If you also need wilayas, dairas, and communes to join against, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it ships the full
wilaya division dataset that `wilaya_code` here links to. Use `@geoalgeria/jeunesse` when you
*only* need youth & sports institution data.

## Source

Data comes from the **Ministère de la Jeunesse**, via the public institutions map
(<https://youthconnect.mjeunesse.gov.dz/institutions-map>). Run `npm run fetch` to regenerate
every output from the live map; the build trusts the ministry's own commune→wilaya join,
repairs the records with transposed or sign-dropped coordinates (a western point stored
without its minus sign — see `metadata.sign_corrected`), and drops the few with placeholder
coordinates (`metadata.dropped`). It fails loudly if the institution count collapses or an
unknown type code appears.

## License & attribution

Code is [MIT](LICENSE). The underlying data is © **Ministère de la Jeunesse**, redistributed
for reference and to power [GeoAlgeria](https://geoalgeria.com). Verify against the ministry
for authoritative, real-time information.

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
