**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/sante

**Algeria's public health establishments, as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/sante)](https://www.npmjs.com/package/@geoalgeria/sante)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/sante)](https://www.npmjs.com/package/@geoalgeria/sante)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

**657 public health establishments** across all **58 wilayas** with health
directorates, public hospitals (EPH), proximity-health establishments (EPSP),
specialized hospitals (EHS) and university hospitals (CHU) from the **Ministry of Health (MoH)**, bilingual French/Arabic, **587 geocoded** (123 to a precise
OpenStreetMap/Wikidata point, 11 verified by hand, 453 to a commune centroid) with commune/wilaya
linkage. One establishment, CHU Béjaïa, runs on three sites, so it ships **2 extra
site records** (`site_of`) beside its own: 659 records in all. Shipped as JSON, CSV, GeoJSON, and
TypeScript. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> **The community tier lives in [`@geoalgeria/cliniques`](https://www.npmjs.com/package/@geoalgeria/cliniques), and the two must not be summed.**
> This package is the *registry* tier: the public establishments the Ministry of
> Health runs, official and closed. `cliniques` is the *community* tier: 1,914
> polycliniques, salles de soins, centres de santé, maternités and clinics
> mapped by OpenStreetMap volunteers, partial by nature. Every OSM element a
> record here references is excluded there by construction, so no place is
> published twice under the same element, but the two describe different tiers
> of a health system and adding 657 to 1,914 counts nothing real.

```bash
npm install @geoalgeria/sante
```

```js
import sante from "@geoalgeria/sante";

const all = sante.sante();              // 659 records: 657 establishments + 2 sites

// One record per establishment (drop the extra site records)
const establishments = all.filter((e) => !e.site_of);

// Public hospitals in a wilaya (joins GeoAlgeria's wilaya_code)
const ephAlger = all.filter((e) => e.wilaya_code === "16" && e.type === "eph");

// Only the geocoded ones, ready to map
const mappable = all.filter((e) => e.lat != null);
```

## What you can build

- **Hospital & clinic locators**: coordinates on 589 of 659 records, ready for a
  map or nearest-facility search.
- **Bilingual health directories** – French and Arabic names, official type and
  wilaya for every establishment.
- **Coverage & planning analysis** – count establishments by type per
  commune/wilaya across the whole country.

## What's inside

| Dataset | Count | Coordinates | Notes |
| --- | --- | --- | --- |
| Health establishments | **657** | 587 geocoded | 58 wilayas, 594 bilingual |
| Site records (`site_of`) | **2** | 2 geocoded | further sites of CHU Béjaïa, bilingual |

**By type**

| Type | Count | Meaning |
| --- | --- | --- |
| `eph` | 252 | Établissement Public Hospitalier – public hospital |
| `epsp` | 280 | Établissement Public de Santé de Proximité – proximity health |
| `ehs` | 103 | Établissement Hospitalier Spécialisé – specialized hospital |
| `chu` | 19 | Centre Hospitalo-Universitaire: university hospital (17 establishments + 2 site records) |
| `hopital` | 5 | other public hospital |

**By coordinate precision** (`geo_precision`)

| Value | Count | Meaning |
| --- | --- | --- |
| `exact` | 136 | precise point: an OSM or Wikidata facility in the commune, or a location verified by hand |
| `approximate` | 453 | the establishment's commune centroid |
| `null` | 70 | locality not resolved to a commune – no coordinates (`lat`/`lng` also `null`) |

**By coordinate method** (`geo_method`)

| Value | Count | Meaning |
| --- | --- | --- |
| `osm_point` | 122 | precise point from an OpenStreetMap facility in the commune |
| `wikidata_point` | 3 | precise point from a Wikidata facility in the commune |
| `commune_centroid` | 453 | the establishment's commune centroid (approximate) |
| `owner_verified` | 11 | location read off the map by the project owner, through the reviewed-correction ledger |
| `null` | 70 | no method – record has no coordinate |

> **The registry is official; the coordinates are best-effort.** Names, type and
> wilaya come from the Ministry of Health. The MoH publishes no coordinates,
> so GeoAlgeria derives them, see *Source & method* below. Counts move as the
> MoH, OpenStreetMap and Wikidata are edited; each rebuild reflects their current
> state.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import sante from "@geoalgeria/sante/data/sante.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/sante/data/sante.json
```

The loaders and record shapes are fully **typed**, TypeScript definitions ship in the package:

```ts
import sante, { type HealthEstablishment } from "@geoalgeria/sante";
const all: HealthEstablishment[] = sante.sante();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  sante.json              # 659 records: 657 establishments + 2 sites (array)
  metadata.json           # sources, counts, coverage, updated
  retired-ids.json        # ids no record may hold again, and where each one's data went
  csv/sante.csv           # repo + Release bundle (not in npm tarball)
  geojson/sante.geojson   # Point features (geocoded records only)
```

## Record shape

```json
{
  "id": "01-ehs-02",
  "name": "Etablissement Hospitalier Spécialisé Psychiatrie Adrar",
  "name_fr": "Etablissement Hospitalier Spécialisé Psychiatrie Adrar",
  "name_ar": "المؤسسة الاستشفائية المتخصصة في الأمراض العقلية أدرار",
  "wilaya_code": "01",
  "commune_code": "0101",
  "commune": "Adrar",
  "lat": 27.875834,
  "lng": -0.307533,
  "geo_precision": "exact",
  "geo_method": "osm_point",
  "source": "msp",
  "refs": {
    "osm": "way/432370657",
    "msp": "3588"
  },
  "type": "ehs",
  "type_label_fr": "Établissement Hospitalier Spécialisé",
  "type_label_ar": "المؤسسة الاستشفائية المتخصصة",
  "sector": "public",
  "slug": "etablissement-hospitalier-specialise-psychiatrie-adrar"
}
```

`id` is a stable `{wilaya_code}-{type}-{seq}` key synthesized by GeoAlgeria (the
MoH publishes no establishment code), opaque, unique within `sante.json`.
`name` is the French name where available, else Arabic. `type` is derived from
the establishment's title; `wilaya_code` from the MoH's wilaya tag. `sector` is
`"public"` for the whole MoH registry, which lists no private establishment at
all; the private facilities OpenStreetMap records live in
[`@geoalgeria/cliniques`](https://www.npmjs.com/package/@geoalgeria/cliniques).
`source` is `"msp"` (the Ministry of Health registry) on every establishment;
`refs` carries the per-provenance ids that contributed the record, `msp`
on every establishment, plus `msp_twin` where the registry published the same establishment a
second time in the other language and `msp_repeat` where the registry entered it
a second time in the same language, plus `osm` or `wikidata` when the coordinate
was upgraded to a precise point. `geo_precision` is `"exact"`, `"approximate"`, or `null`; `geo_method`
names how the coordinate was obtained (`osm_point`, `wikidata_point`,
`commune_centroid`, `owner_verified`, or `null`). `lat`/`lng`/`geo_precision`/`geo_method` are all
`null` together for the 70 records whose locality could not be matched to a
commune.

**Sites.** The registry lists an establishment once, but some run on several
premises. Where a reviewed seed names them, the establishment's own record sits
on one of its sites, and each further site is a record of its own whose
`site_of` holds the establishment's `id`. A site record has `source: "osm"`,
`refs.osm` and no `refs.msp` or `slug`; it copies the establishment's wilaya,
commune, type and sector, and takes its name from OpenStreetMap. Each site's
point is an OpenStreetMap object the project owner confirmed on the map within
500 m. Today one establishment has sites: CHU Béjaïa (`06-chu-01`, Khelil Amrane)
with `06-chu-01-s2` (Frantz Fanon) and `06-chu-01-s3` (the Targa Ouzemmour
maternity unit). To count establishments, skip records with `site_of`;
`metadata.sites` gives their number.

```json
{
  "id": "06-chu-01-s2",
  "name": "Hôpital Frantz Fanon",
  "name_fr": "Hôpital Frantz Fanon",
  "name_ar": "مستشفى فرانز فانون",
  "wilaya_code": "06",
  "commune_code": "0601",
  "commune": "Bejaia",
  "lat": 36.756421,
  "lng": 5.083552,
  "geo_precision": "exact",
  "geo_method": "osm_point",
  "source": "osm",
  "refs": { "osm": "way/156238581" },
  "type": "chu",
  "type_label_fr": "Centre Hospitalo-Universitaire",
  "type_label_ar": "المركز الاستشفائي الجامعي",
  "sector": "public",
  "site_of": "06-chu-01"
}
```

> **Coordinates and commune are derived, not from the MoH.** The Ministry of
> Health lists names, type and wilaya only. GeoAlgeria matches each
> establishment's locality to the [`geoalgeria`](https://www.npmjs.com/package/geoalgeria)
> commune set within its wilaya (giving `commune`, `commune_code` and a centroid
> coordinate), then upgrades the coordinate to a precise point where a hospital
> or clinic in OpenStreetMap or Wikidata sits in that same commune. Wilaya is
> exact; commune and coordinates are best-effort.

## Need the administrative divisions too?

For wilayas, dairas, and communes, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package, it's how
you turn an establishment's `commune_code` into a polygon or centroid. Use
`@geoalgeria/sante` when you *only* need the health establishments.

## Source & method

Run `npm run fetch` to regenerate every output. It:

1. pulls the **Ministry of Health** establishment registry from the
   `sante.gov.dz` WordPress REST API (`healthinstitution`), in French and Arabic,
   each tagged with its wilaya;
2. derives the **type** from each title and **pairs** the French and Arabic posts
   into one bilingual record. The pairing goes by locality, then by an
   unambiguous shared commune, then by the registry's own habit of publishing
   the two posts under consecutive ids. That last step needs more than the
   adjacency, since only 42.9% of French posts have an Arabic post at id+1: the
   two names must also agree on a consonant skeleton, which is what French and
   Arabic spellings of one name actually share, and an ambiguous candidate is
   left as two records rather than guessed at. Adjacency only reaches two post
   ids, so four pairs across three cities, whose halves the registry entered 4,
   10, 14 and 1284 ids apart, are paired by hand instead, in an explicit table.
   Each row records what its evidence covers, and the two levels are not the
   same claim: for two of them a source that is **not** the registry (an
   OpenStreetMap element, a Wikidata item) names the establishment in **both**
   scripts, so it states the pair itself; for the other two that source confirms
   the **French half only**, and the Arabic half rests on the two titles being
   exact translations of each other together with the pair being the one
   candidate left in its wilaya and type group. Four further cases the table was
   asked about stay two records, because no source names them at all, and they
   are listed beside the pairs with what is missing. Every decision, including each
   refusal and its reason, is written to
   [`quality/sante-twin-recovery.json`](https://github.com/yasserstudio/geoalgeria/blob/main/quality/sante-twin-recovery.json).
   A record cites both posts: `refs.msp` is its primary (French) post and
   `refs.msp_twin` the Arabic one, so either id resolves to it;
3. folds in the registry's **repeat posts**: 7 establishments were entered a
   second time in the language they already had, which step 2 can never see,
   because it only ever pairs a French post with an Arabic one. The whole title
   has to fold to the same
   [`@geoalgeria/normalize`](https://www.npmjs.com/package/@geoalgeria/normalize)
   key, so a name the registry wrote differently stays two records: the two
   Skikda hospitals and the two Ouargla ones are two facilities, not one entered
   twice. Every decision and every pair kept apart is written to
   [`quality/sante-repeat-posts.json`](https://github.com/yasserstudio/geoalgeria/blob/main/quality/sante-repeat-posts.json),
   and the merged record cites the absorbed post as `refs.msp_repeat`;
4. matches each establishment's **locality to a commune** in the `geoalgeria`
   set within its wilaya, attaching `commune`, `commune_code` and a centroid;
5. queries **Wikidata** (SPARQL, hospitals) and **OpenStreetMap** (Overpass,
   `amenity=hospital`/`clinic`, `healthcare=*`) and **upgrades** the coordinate
   to a precise point where one sits in the establishment's commune;
6. applies the reviewed **site seed**
   ([`scripts/seeds/sites.json`](scripts/seeds/sites.json)): an establishment
   that runs on several premises is placed on one of its sites, and each further
   site becomes a `site_of` record. The build re-measures each Owner
   confirmation and refuses one past 500 m. `npm run fetch -- --committed`
   re-applies the seed to the committed records offline.

Raw source pulls are cached under
[`research/sante/`](https://github.com/yasserstudio/geoalgeria/tree/main/research/sante).

## Licence & attribution

Package **code** is [MIT](LICENSE). The **data** is a composite:

- The **Ministry of Health** registry (names, type, wilaya) is a factual
  public-sector listing.
- **Coordinates** are derived from **Wikidata** (**CC0**, public domain) and
  **OpenStreetMap** (**© OpenStreetMap contributors**, licensed under the
  **[ODbL 1.0](https://www.openstreetmap.org/copyright)**). If you use or
  redistribute this dataset, you must **attribute OpenStreetMap contributors**
  and keep derived databases under a compatible licence.

Verify against official sources for authoritative information. This dataset is
provided for reference and to power [GeoAlgeria](https://geoalgeria.com).

[API docs & field reference →](https://geoalgeria.com/data/docs/sante) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [support@yasser.studio](mailto:support@yasser.studio)

GeoAlgeria is free, and it stays free. The same studio also makes maps, websites, mobile apps and open data for clients.
