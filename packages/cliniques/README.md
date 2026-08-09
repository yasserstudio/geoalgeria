**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/cliniques

**Algeria's clinics and proximity-care facilities, as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/cliniques)](https://www.npmjs.com/package/@geoalgeria/cliniques)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/cliniques)](https://www.npmjs.com/package/@geoalgeria/cliniques)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**1,894 geocoded care facilities** across **66 wilayas** of Algeria, every one
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

const all = cliniques.cliniques();   // 1,894 geocoded care facilities

// The public proximity tier of one wilaya
const proximite = cliniques.cliniquesByWilaya("16")
  .filter((c) => c.type === "polyclinique" || c.type === "salle_de_soins");

// Facilities that tag an emergency service
const urgences = all.filter((c) => c.emergency);
```

## What you can build

- **"Care near me" locators**, coordinates on all 1,894 records, ready for a map
  or nearest-facility distance sorting.
- **Proximity-care coverage maps**, count polycliniques and salles de soins per
  commune or wilaya, the structures Algerians actually walk into first.
- **Bilingual directories**, thousands of Arabic and French names side by side,
  with phone, opening hours and speciality where the map carries them.

## What's inside

| Dataset | Count | Coordinates | Notes |
| --- | --- | --- | --- |
| Care facilities | **1,894** | ✅ all | 1,617 named, 66 wilayas |

**By type**

| Type | Count | Meaning |
| --- | --- | --- |
| `clinique` | 1,098 | clinic (عيادة / مصحة), mostly private practice-level care |
| `polyclinique` | 411 | polyclinique (عيادة متعددة الخدمات), public proximity tier |
| `salle_de_soins` | 206 | salle de soins / dispensaire (قاعة علاج / مستوصف) |
| `centre_sante` | 137 | centre de santé / centre de soins (مركز صحي) |
| `maternite` | 28 | maternité / clinique d'accouchement (مصحة توليد) |

> **This is an OpenStreetMap extract, not an official registry.** Coverage is
> partial and uneven by wilaya, and three wilayas (54 In Guezzam, 62 Bir El Ater,
> 63 El Aricha) carry no mapped facility at all. Nothing official enumerates this
> population, so the package ships **no coverage percentage**: the Ministry of
> Health publishes counts for the registry tier this package excludes, and no
> public register lists private clinics. Counts move as OpenStreetMap is edited;
> each rebuild reflects the current state of the map.

> **It never republishes an OSM element [`@geoalgeria/sante`](https://www.npmjs.com/package/@geoalgeria/sante) already ships, and the two must not be summed.**
> `sante` is the *registry* tier: 695 public establishments (CHU, EPH, EHS, EPSP)
> from the Ministry of Health. This package is the *community* tier. 121 of
> sante's records reference an OSM element by id, and every one of those elements
> is excluded here **by construction**, so no place is published twice under the
> same OSM element. Be precise about what that does and does not guarantee:
> sante's other 574 records carry no OSM reference at all, so the same physical
> establishment can still appear in both packages, under different coordinates
> and different ids, with nothing mechanical to detect it. The two describe
> different tiers of a health system, so adding 695 to 1,894 counts nothing real.

**Type is inferred from the name.** A polyclinique names itself
polyclinique/عيادة متعددة الخدمات, a salle de soins قاعة علاج/مستوصف/dispensaire,
a centre de santé مركز صحي/centre de soins. Order matters: the facility words are
matched *before* the bare word "hôpital"/مستشفى, because Algerian mappers use that
word for proximity structures too (10 records name themselves both ways, e.g.
"Polyclinique des consultations spécialisées" tagged `name:ar=مستشفى بودغن`). The
plain word "clinique"/عيادة/مصحة counts as a facility word too, one rank below
the three specific types. Everything left over is `clinique`, including the 276
unnamed clinic-tagged points, which the tag alone already identifies as care
facilities.

**What was excluded, and why.** The pull returns 2,936 OSM elements; 977 are
dropped before anything is emitted:

| Excluded | Count | Reason |
| --- | --- | --- |
| `hopital` | 369 | hôpital / مستشفى / المؤسسة الاستشفائية / EPH / EHS / EHU / centre anti-cancer, the registry tier (`@geoalgeria/sante`) |
| `unnamed_hospital` | 241 | no name at all *and* tagged as a hospital, so it cannot be told apart from the registry tier |
| `sante_overlap` | 89 | the OSM element is one a `@geoalgeria/sante` **hospital-tier** record (CHU/EPH/EHS) already ships, whatever it is named here. Elements referenced by a sante *EPSP* record are not excluded: there the reference is a geocoding anchor on the entity's seat and the element is usually a facility this package should carry |
| `cabinet` | 96 | single-practitioner practice: the word cabinet, or a name that is just a practitioner (Dr X, الطبيب …) |
| `epsp_entity` | 102 | the EPSP administrative entity itself (its facilities stay) |
| `hospital_subfeature` | 54 | part of a hospital mapped as its own point: an entrance, a ward, "Service de radiologie", a bare "urgences". When the name also says hospital the record is reported as `hopital` instead |
| `pharmacie` | 6 | pharmacy, belongs to [`@geoalgeria/pharmacies`](https://www.npmjs.com/package/@geoalgeria/pharmacies) |
| `chu` | 15 | centre hospitalo-universitaire |
| `institut_pasteur` | 3 | research institute rather than a care facility |
| `paramedical` | 2 | paramedical training school, education rather than care |

Hospitals are queried on purpose even though none ship: they are the only way to
reach the clinic-class records Algerian mappers file under `amenity=hospital`.

**Private hospital establishments are kept, on purpose.** An "EHP" or
"établissement hospitalier privé" is a *clinique privée*, which is exactly this
package's population, so the privacy check runs before every registry pattern
and those records come in as `clinique` with `sector: "private"`. The mirror-image
abbreviations are the reason the order matters: EHP (privé) must never be read as
EPH (public).

**Sector is asserted only on signal.** `public` when OSM says `operator:type`
(including `university`, an EHU being a public teaching operator), or
structurally for `polyclinique` and `salle_de_soins` (both are public structures
of the Algerian proximity-care system by definition); `private` on
`operator:type=private` or a privé/خاصة name read across every name tag, since a
record can carry its only ownership signal in `name:en`. 629 records are public,
67 private, and the remaining 1,184 stay `null`. Most cliniques are private in
practice, but the map does not say so, so the field does not pretend to know.

**Also on each record:** `speciality` (from OSM `healthcare:speciality`, on 158
records), `address` (from `addr:*` tags, on 634), `phone` (on 106),
`opening_hours` (on 166) and `emergency` (`true` on the 68 records tagged
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
  cliniques.json              # 1,894 care facilities (array)
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
for a building/area centroid (1,059 and 821 respectively), `geo_method` records
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
