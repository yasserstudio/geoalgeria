**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/cliniques

**Algeria's clinics and proximity-care facilities, as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/cliniques)](https://www.npmjs.com/package/@geoalgeria/cliniques)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/cliniques)](https://www.npmjs.com/package/@geoalgeria/cliniques)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**2,059 geocoded care facilities** across **66 wilayas** of Algeria, every one
with coordinates, classified by **type** (polyclinique · salle de soins ·
centre de santé · maternité · clinique), most with Arabic and/or French names,
and commune/wilaya linkage. Extracted from **OpenStreetMap**. This is the
**community tier** of the health sector: the Ministry of Health registry
(CHU/EPH/EHS/EPSP) is deliberately *excluded* here and lives in
[`@geoalgeria/sante`](https://www.npmjs.com/package/@geoalgeria/sante). Shipped
as JSON, CSV, GeoJSON, and TypeScript. Part of
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/cliniques
```

```js
import cliniques from "@geoalgeria/cliniques";

const all = cliniques.cliniques();   // 2,059 geocoded care facilities

// The public proximity tier of one wilaya
const proximite = cliniques.cliniquesByWilaya("16")
  .filter((c) => c.type === "polyclinique" || c.type === "salle_de_soins");

// Facilities that tag an emergency service
const urgences = all.filter((c) => c.emergency);
```

## What you can build

- **"Care near me" locators**, coordinates on all 2,059 records, ready for a map
  or nearest-facility distance sorting.
- **Proximity-care coverage maps**, count polycliniques and salles de soins per
  commune or wilaya, the structures Algerians actually walk into first.
- **Bilingual directories**, thousands of Arabic and French names side by side,
  with phone, opening hours and speciality where the map carries them.

## What's inside

| Dataset | Count | Coordinates | Notes |
| --- | --- | --- | --- |
| Care facilities | **2,059** | ✅ all | 1,780 named, 66 wilayas |

**By type**

| Type | Count | Meaning |
| --- | --- | --- |
| `clinique` | 1,257 | clinic (عيادة / مصحة), mostly private practice-level care |
| `polyclinique` | 419 | polyclinique (عيادة متعددة الخدمات), public proximity tier |
| `salle_de_soins` | 210 | salle de soins / dispensaire (قاعة علاج / مستوصف) |
| `centre_sante` | 140 | centre de santé / centre de soins (مركز صحي) |
| `maternite` | 33 | maternité / clinique d'accouchement (مصحة توليد) |

> **This is an OpenStreetMap extract, not an official registry.** Coverage is
> partial and uneven by wilaya, and three wilayas (54 In Guezzam, 62 Bir El Ater,
> 63 El Aricha) carry no mapped facility at all. Nothing official enumerates this
> population, so the package ships **no coverage percentage**: the Ministry of
> Health publishes counts for the registry tier this package excludes, and no
> public register lists private clinics. Counts move as OpenStreetMap is edited;
> each rebuild reflects the current state of the map.

> **It does not overlap [`@geoalgeria/sante`](https://www.npmjs.com/package/@geoalgeria/sante), and the two must not be summed.**
> `sante` is the *registry* tier: 695 public establishments (CHU, EPH, EHS, EPSP)
> from the Ministry of Health. This package is the *community* tier and drops
> every record that classifies as one of those. They describe different
> populations of place, so adding 695 to 2,059 counts nothing real.

**Type is inferred from the name.** A polyclinique names itself
polyclinique/عيادة متعددة الخدمات, a salle de soins قاعة علاج/مستوصف/dispensaire,
a centre de santé مركز صحي/centre de soins. Order matters: the facility words are
matched *before* the bare word "hôpital"/مستشفى, because Algerian mappers use that
word for proximity structures too (10 records name themselves both ways, e.g.
"Polyclinique des consultations spécialisées" tagged `name:ar=مستشفى بودغن`).
Everything left over is `clinique`, including the 279 unnamed clinic-tagged
points, which the tag alone already identifies as care facilities.

**What was excluded, and why.** The pull returns 2,936 OSM elements; 801 are
dropped before anything is emitted:

| Excluded | Count | Reason |
| --- | --- | --- |
| `hopital` | 416 | hôpital / مستشفى / EPH / EHS, the registry tier (`@geoalgeria/sante`) |
| `unnamed_hospital` | 242 | no name at all *and* tagged as a hospital, so it cannot be told apart from the registry tier |
| `epsp_entity` | 107 | the EPSP administrative entity itself (its facilities stay) |
| `cabinet` | 18 | single-practitioner cabinet médical / dentaire, out of scope |
| `chu` | 16 | centre hospitalo-universitaire |
| `paramedical` | 2 | paramedical training school, education rather than care |

Hospitals are queried on purpose even though none ship: they are the only way to
reach the clinic-class records Algerian mappers file under `amenity=hospital`.

**Sector is asserted only on signal.** `public` when OSM says `operator:type`, or
structurally for `polyclinique` and `salle_de_soins` (both are public structures
of the Algerian proximity-care system by definition); `private` on
`operator:type=private` or a privé/خاصة name. 643 records are public, 64 private,
and the remaining 1,352 stay `null`. Most cliniques are private in practice, but
the map does not say so, so the field does not pretend to know.

**Also on each record:** `speciality` (from OSM `healthcare:speciality`, on 190
records), `address` (from `addr:*` tags, on 699), `phone` (on 125),
`opening_hours` (on 192) and `emergency` (`true` on the 91 records tagged
`emergency=yes`, never `false`: a silent map is not a claim that there is no
emergency service).

## Formats

The npm package ships the **JSON** (importable directly):

```js
import cliniques from "@geoalgeria/cliniques/data/cliniques.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/cliniques/data/cliniques.json
```

The loaders and record shapes are fully **typed**, TypeScript definitions ship in the package:

```ts
import cliniques, { type Clinique } from "@geoalgeria/cliniques";
const all: Clinique[] = cliniques.cliniques();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  cliniques.json              # 2,059 care facilities (array)
  metadata.json               # sources, counts, coverage, updated
  csv/cliniques.csv           # repo + Release bundle (not in npm tarball)
  geojson/cliniques.geojson   # Point features
```

## Record shape

```json
{
  "id": "02-00006",
  "name": "عيادة متعددة الخدمات",
  "name_fr": null,
  "name_ar": "عيادة متعددة الخدمات",
  "wilaya_code": "02",
  "commune_code": "0207",
  "commune": "Beni Haoua",
  "lat": 36.530021,
  "lng": 1.58226,
  "geo_precision": "exact",
  "geo_method": "osm_node",
  "source": "osm",
  "refs": {
    "osm": "node/4144869592"
  },
  "type": "polyclinique",
  "type_label_fr": "Polyclinique",
  "type_label_ar": "عيادة متعددة الخدمات",
  "sector": "public",
  "speciality": null,
  "address": null,
  "phone": "027753479",
  "opening_hours": "24/7",
  "emergency": null
}
```

`id` is a stable `{wilaya_code}-{seq}` key synthesized by GeoAlgeria, unique
within this dataset; the matched OSM element is kept as `refs.osm`. `name` is the
best available display name and is `null` for unnamed points, which the app
titles by `type` instead. `type` carries bilingual labels. `speciality`,
`address`, `phone` and `opening_hours` come straight from OSM (`null` when the
tags are absent). `sector` is `"public"`/`"private"` only when signalled, else
`null`. `geo_precision` is `"exact"` for a surveyed OSM node or `"approximate"`
for a building/area centroid (1,189 and 870 respectively), `geo_method` records
which. `wilaya_code` joins to GeoAlgeria's `wilaya_code`.

> **Commune/wilaya linkage is derived, not from the source.** OpenStreetMap does
> not carry Algerian administrative codes. GeoAlgeria attaches `wilaya_code` by
> **point-in-polygon** against the 69 wilaya boundaries, then `commune_code` and
> `commune` as the nearest centroid **within that wilaya**, so the join can never
> cross a wilaya boundary. Wilaya is effectively exact; commune is best-effort
> (centroid proximity, not polygon containment).

## Need the administrative divisions too?

For wilayas, dairas, and communes, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package, it's how
you turn a facility's `commune_code` into a polygon or centroid. Use
`@geoalgeria/cliniques` when you *only* need the care facilities.

## Source & method

Run `npm run fetch` to regenerate every output. It:

1. queries **OpenStreetMap** (Overpass) for `amenity`/`healthcare=clinic`,
   `healthcare=centre` and `amenity`/`healthcare=hospital` inside Algeria;
2. **classifies each record** from the French and Arabic name, excluding the
   registry tier, cabinets and paramedical schools (see the table above);
3. de-duplicates the same facility mapped as both a node and a building;
4. attaches wilaya by polygon containment and commune by nearest centroid inside it.

The raw source pull is captured under
[`sources/cliniques/`](https://github.com/yasserstudio/geoalgeria/tree/main/sources/cliniques),
so a rebuild never depends on Overpass being up.

## License & attribution

Package **code** is [MIT](LICENSE). The **data** is from **OpenStreetMap**:
**© OpenStreetMap contributors**, licensed under the
**[ODbL 1.0](https://www.openstreetmap.org/copyright)**. If you use or
redistribute this dataset, you must **attribute OpenStreetMap contributors** and
keep derived databases under a compatible license.

Verify against official sources for authoritative information. This dataset is
provided for reference and to power [GeoAlgeria](https://geoalgeria.com).

[API docs & field reference →](https://geoalgeria.com/data/docs/cliniques) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
