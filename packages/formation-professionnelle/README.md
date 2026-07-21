**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/formation-professionnelle

**Every vocational training establishment in Algeria — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/formation-professionnelle)](https://www.npmjs.com/package/@geoalgeria/formation-professionnelle)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/formation-professionnelle)](https://www.npmjs.com/package/@geoalgeria/formation-professionnelle)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

1,932 vocational training establishments across Algeria — **CFPA**, **INSFP**, **IFEP**,
**IEP**, **DFEP** and private accredited centers — each with its official name (Arabic,
with French where available), establishment **type**, **capacity**, **boarding** info, rich
**contact details** (phone, fax, email, website, Facebook), and GPS coordinates. Sourced
from the **Ministere de la Formation et de l'Enseignement Professionnels (MFEP)** via
[takwin.dz](https://takwin.dz), shipped as JSON, CSV, and GeoJSON.
Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/formation-professionnelle
```

```js
import fp from "@geoalgeria/formation-professionnelle";

const all = fp.establishments();                    // 1,932
const byWilaya = fp.establishmentsByWilaya(16);     // establishments in wilaya 16
const cfpas = fp.establishmentsByType("cfpa");      // every CFPA
const one = fp.establishmentById("00001");          // single record by id

// 1,375 records have lat/lng — distance-sort, map, or nearest center in a few lines.
```

## What you can build

- **"Nearest training center" lookups** — 1,375 geocoded records, ready for distance sorting.
- **Vocational training directories** — bilingual names, type, capacity and full contact info on every record.
- **Maps** — drop-in GeoJSON point layer for the vocational training network (71% geocoded).
- **Capacity planning** — theoretical and realized capacities, boarding availability and surface area.
- **Sector analysis** — 1,209 public vs 723 private establishments across 58 wilayas.

## What's inside

| Type | Code | Count |
| --- | --- | --- |
| Centre de Formation Professionnelle et de l'Apprentissage | `cfpa` | 856 |
| Centre privé accrédité | `prive` | 723 |
| Institut National Spécialisé de Formation Professionnelle | `insfp` | 182 |
| Annexe CFPA | `annexe_cfpa` | 70 |
| Direction de la Formation et de l'Enseignement Professionnels | `dfep` | 58 |
| Institut d'Enseignement Professionnel | `iep` | 18 |
| Annexe CNFEPD | `annexe_cnfepd` | 9 |
| Annexe INSFP | `annexe_insfp` | 9 |
| Institut de Formation et d'Enseignement Professionnel | `ifep` | 6 |
| Institut National de la Formation et de l'Enseignement Professionnels | `infep` | 1 |
| **Total** | | **1,932** |

Spanning **58 wilayas** (pre-reform scheme). 1,375 of 1,932 establishments are geocoded
(71%) — `lat`/`lng` is `null` for the remaining 557. `wilaya_code` uses the 58-wilaya
scheme as published by the source.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import establishments from "@geoalgeria/formation-professionnelle/data/establishments.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/formation-professionnelle/data/establishments.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import fp, { type Establishment } from "@geoalgeria/formation-professionnelle";
const all: Establishment[] = fp.establishments();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  establishments.json      # 1,932 establishments (array)
  metadata.json            # sources, counts, by_type, by_secteur, geocoded, license, updated
  csv/                     # CSV export (repo + Release bundle, not in npm tarball)
  geojson/                 # GeoJSON features (1,375 geocoded points)
```

## Record shape

```json
{
  "id": "00001",
  "name": "مديرية التكوينو التعليم المهنيينأدرار",
  "name_fr": "DFEPADRAR",
  "wilaya_code": "01",
  "commune_code": null,
  "commune": "أدرار",
  "lat": null,
  "lng": null,
  "geo_precision": null,
  "geo_method": null,
  "source": "mfep",
  "type": "dfep",
  "type_label": "مديرية التكوين والتعليم المهنيين",
  "abreviation": "DFEP ADRAR",
  "code": "0100",
  "secteur": "public",
  "adresse": "حي 103مسكن أدرار",
  "adresse_fr": "Cité 103 logtAdrar",
  "telephone": "049364333",
  "fax": "049364332",
  "email": "dfpadrar@gmail.com",
  "site_web": null,
  "facebook": "www.facebook.com/profile.php?id=100057469388259",
  "capacite": null,
  "capacite_reelle": null,
  "surface_m2": 2443.42,
  "internat": false,
  "capacite_internat": null,
  "vocations": null
}
```

`id` is an opaque, zero-padded sequence string (e.g. `"00001"`), unique within
`establishments.json` — don't parse it. Names are bilingual — `name` is Arabic (always present),
`name_fr` is French (may be `null`). `type` is a slug matching one of the ten establishment
types listed above. `secteur` is `"public"` or `"prive"`. `wilaya_code` is zero-padded to two
digits in the 58-wilaya scheme; `commune_code` is currently always `null` for this source (no
ONS code published by takwin.dz). `lat`/`lng`, and `geo_precision`/`geo_method` with them, are
`null` for the 29% of records that are not yet geocoded; where present, `geo_precision` is
`"exact"` or `"approximate"` and `geo_method` records how the coordinate was sourced (e.g.
`takwin`). `capacite` (theoretical) and `capacite_reelle` (realized) are seat counts; `internat`
flags boarding availability with an optional `capacite_internat`. `vocations` is an array of
specialization strings when available.

## Need the administrative divisions too?

If you also need wilayas, dairas, and communes to join against, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it ships the full
69-wilaya division dataset. Use `@geoalgeria/formation-professionnelle` when you *only*
need vocational training data.

## Source

Data comes from the **MFEP — Ministere de la Formation et de l'Enseignement Professionnels**,
via [takwin.dz](https://takwin.dz). The source uses the pre-reform **58-wilaya scheme**.
Run `npm run fetch` to regenerate every output from the live site. Names, types, contacts,
capacities and coordinates are as published by the ministry.

## License & attribution

Code is [MIT](LICENSE). The underlying data is &copy; **MFEP**, redistributed for reference
and to power [GeoAlgeria](https://geoalgeria.com). Verify against the ministry for
authoritative, real-time information.

[API docs & field reference →](https://geoalgeria.com/data/docs/formation-professionnelle) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
