**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/enseignement-superieur

**Every higher-education institution in Algeria, as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/enseignement-superieur)](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/enseignement-superieur)](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

187 higher-education institutions across Algeria, **universities**, grandes écoles, écoles
normales supérieures, centres universitaires, the **licensed private institutions**, and the
establishments **under other ministries** (Défense, Santé, Culture…) that MESRS supervises,
each with its name (French and/or Arabic), institution **type**, **sector**, supervising
ministry, its own **website**, wilaya / commune linkage and coordinates. Sourced from the
**Ministry of Higher Education and Scientific Research (MESRS)**, shipped as
JSON, CSV, and GeoJSON. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/enseignement-superieur
```

```js
import es from "@geoalgeria/enseignement-superieur";

const all = es.institutions();                  // 187
const inAlgiers = es.institutionsByWilaya(16);   // institutions in wilaya 16
const universities = es.institutionsByType("universite"); // every university
const privates = es.institutionsBySector("private");      // the 19 private institutions

// Everything has lat/lng – distance-sort, map, or nearest-campus in a few lines.
```

## What you can build

- **"Nearest university" lookups** – coordinates on every record, ready for distance sorting.
- **Student & civic apps** – map the higher-education network per wilaya, split public vs private, link straight to each institution's site.
- **Maps** – drop-in GeoJSON point layer for the whole higher-education network.
- **Research & planning** – institution counts by type, sector, supervising ministry and wilaya across the country.

## What's inside

| Type | Code | Count |
| --- | --- | --- |
| Université | `universite` | 59 |
| Grande école | `grande_ecole` | 110 |
| École normale supérieure | `ens` | 13 |
| Centre universitaire | `centre_universitaire` | 5 |
| **Total** | | **187** |

By **sector**: 168 public · 19 licensed private. Of the public institutions, 50 are
establishments **under other ministries** that MESRS supervises pedagogically, read
`supervisory_ministry` (e.g. `"Ministère de la Santé"` for the 25 paramedical institutes,
`"Ministère de la Défense nationale"` for the 16 military schools), which is `null` for the
MESRS network itself.

Spanning **51 wilayas**. `wilaya_code` is linked against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) wilaya model (69-wilaya scheme).

## Names and coordinates: provenance

The **identity** of every record is 100% MESRS. The public network's `name` (French) and
`website` come from the ministry's listing; the private and other-ministry institutions are
published in Arabic only, so they carry `name_ar` with `name: null`. `name_ar` is also
**backfilled** for the public network (joined on website), present on ~93% of all records.

The ministry's page carries **no coordinates and no address**, so the **geography is supplied
here** and labelled honestly on every record via `geo_method` (detail) and `geo_precision`
(`"exact"` for `campus`, `"approximate"` for `commune`/`wilaya`):

| `geo_method` | Count | `geo_precision` | What the coordinate is |
| --- | --- | --- | --- |
| `campus` | 79 | `exact` | A per-campus OpenStreetMap point for that institution, cross-checked: a geocode that lands in a different wilaya than the institution's name is rejected. |
| `commune` | 16 | `approximate` | The centroid of the institution's commune (city), from the `geoalgeria` flagship, used where no open source places the campus itself, or, from the 2026-10-28 review on, where a new campus point has only one open source (`docs/adr/0001` asks for two). Most `campus` points rest on one OpenStreetMap reading each; the per-record review state is in `research/enseignement-superieur/`. |
| `wilaya` | 92 | `approximate` | The centroid of the institution's wilaya, the fallback when only the wilaya is known. Nearly every private/other-ministry institution lands here, as the source publishes no address for them. |

`wilaya_code` and `commune` are always reconciled to the `geoalgeria` flagship dataset, so they
are authoritative and in the 69-wilaya scheme (`commune_code` is currently `null` on every
record, MESRS gives no commune code). Coordinates are an enrichment layer, accurate to the
labelled precision, not a surveyed campus position. Regenerate them with `npm run geocode`
(OpenStreetMap Nominatim), then `npm run fetch`.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import institutions from "@geoalgeria/enseignement-superieur/data/institutions.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/enseignement-superieur/data/institutions.json
```

The loaders and record shapes are fully **typed**, TypeScript definitions ship in the package:

```ts
import es, { type Institution } from "@geoalgeria/enseignement-superieur";
const all: Institution[] = es.institutions();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  institutions.json            # 187 institutions (array)
  metadata.json                # sources, counts, by_type, by_sector, by_geo_method, updated
  retired-ids.json             # ids no record may hold again, each forwarded to the id that carries the establishment now
  csv/institutions.csv         # repo + Release bundle (not in npm tarball)
  geojson/institutions.geojson # Point features (all 187 placed; 79 campus-geocoded, see geo_method)
```

## Record shape

```json
{
  "id": "00053",
  "name": "Université des sciences et de la technologie d’Alger, Houari Boumediène",
  "name_ar": "جامعة الجزائر هواري بومدين للعلوم و التكنولوجيا",
  "wilaya_code": "16",
  "commune_code": null,
  "commune": "Bab Ezzouar",
  "lat": 36.7121849,
  "lng": 3.1810204,
  "geo_precision": "exact",
  "geo_method": "campus",
  "source": "mesrs",
  "type": "universite",
  "type_label_fr": "Université",
  "sector": "public",
  "supervisory_ministry": null,
  "website": "http://www.usthb.dz/"
}
```

`id` is a stable zero-padded string assigned by GeoAlgeria (the MESRS source publishes none),
unique within this dataset. `name` is French (the MESRS network) or `null` for the Arabic-only
private/other-ministry institutions, use `name ?? name_ar` for a display label. For Arabic
wilaya and commune names, join `wilaya_code` against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) dataset. `wilaya_code` is zero-padded
to two digits; `commune_code` is currently `null` on every record. `geo_precision` is `"exact"`
for a real campus point or `"approximate"` for a commune/wilaya centroid, `geo_method` records
which. `source` is a key into `metadata.sources[]`, not a URL: `"mesrs"` for a
record from the university-network listing, `"bac-2026"` for one the BAC 2026 placement file
supplied, and `"mesrs+bac-2026"` where the listing supplies the record and the placement file
its current name. See **Source** below for the actual publications.

## Need the administrative divisions too?

If you also need wilayas, dairas, and communes to join against, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package, it ships the full wilaya
division dataset that `wilaya_code` here links to. Use `@geoalgeria/enseignement-superieur` when
you *only* need higher-education institution data.

## Source

Institution identity comes from the **MESRS**, via two of the ministry's own publications.

**The university-network page**: the
[English listing](https://www.mesrs.dz/en/university-network/) for the network's French names
and the [Arabic listing](https://www.mesrs.dz/reseau-universitaire-ar/) for Arabic names and the
private + other-ministry institutions the English page omits.

**The BAC 2026 placement file**: *Moyennes minimales BAC 2026 (suite à la première phase)*,
[published as a 350-page PDF](https://www.esi.dz/wp-content/uploads/2026/07/BAC-2026-Fichier-des-moyennes-minimales-apres-phase-1.pdf),
which names every establishment the ministry places new bacheliers into, by the ministry's own
establishment code. It states the network as it stands today, so it supplies **12 institutions
the network page omits**, the **current name of 2** the network page still lists under an older
one, and **one succession**: ENSTA (`P05`), which décret exécutif 22-398 made the successor of
the two Algiers schools it dissolved and which the network page still lists separately, so those
two records leave and their ids are forwarded to ENSTA in `data/retired-ids.json`. What is committed from it is a rights-safe projection of its institution rows,
`sources/enseignement-superieur/bac-2026.json`: the establishment code and official French name
only, never the per-filière minimum averages and never the PDF, with the PDF's own URL, SHA-256,
byte count and page count recorded in the capture manifest. That projection is the **authority**
for those records' French names: `scripts/bac-2026.mjs` refuses any name in
`scripts/seeds/bac-2026.json` that does not fold to the row the ministry published under that
code, so the seed can restore the French accents and capitalisation the all-caps file drops but
can never introduce a name of its own. Rebuild the projection with `node scripts/bac-2026.mjs
--capture <rows.json>`, where `<rows.json>` is `{ rows: [{ code, name }] }` read off the PDF.

Run `npm run fetch` to regenerate every output; it reconciles each record's wilaya/commune to
the flagship dataset and attaches the coordinate seed (`scripts/seeds/coordinates.json`,
refreshed with `npm run geocode`). It fails loudly if the institution count collapses, if a
seeded name is not the ministry's own row, or if a seeded campus coordinate lands in a wilaya
the seed does not claim. `node scripts/fetch.mjs --cache` rebuilds offline from the committed
captures, which is how this package is built while www.mesrs.dz is unreachable. Coordinates are
OpenStreetMap-derived, see **Names and coordinates** above.

## Licence & attribution

Code is [MIT](LICENSE). Institution data is © **MESRS**, redistributed for reference and to
power [GeoAlgeria](https://geoalgeria.com). Coordinates are © OpenStreetMap contributors (ODbL),
derived via Nominatim. Verify against the ministry and each institution for authoritative
information.

[API docs & field reference →](https://geoalgeria.com/data/docs/enseignement-superieur) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [support@yasser.studio](mailto:support@yasser.studio)

GeoAlgeria is free, and it stays free. The same studio also makes maps, websites, mobile apps and open data for clients.
