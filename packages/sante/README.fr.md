[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/sante

**Les établissements de santé publics d'Algérie — sous forme de données prêtes à installer.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/sante)](https://www.npmjs.com/package/@geoalgeria/sante)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/sante)](https://www.npmjs.com/package/@geoalgeria/sante)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**695 établissements de santé publics** dans les **58 wilayas** dotées d'une
direction de la santé — établissements publics hospitaliers (EPH), de santé de
proximité (EPSP), hospitaliers spécialisés (EHS) et centres hospitalo-universitaires
(CHU) du **Ministère de la Santé (MSP)**, bilingues français/arabe, **600
géolocalisés** via OpenStreetMap et Wikidata avec rattachement commune/wilaya.
Livré en JSON, CSV, GeoJSON et TypeScript. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/sante
```

```js
import sante from "@geoalgeria/sante";

const all = sante.sante();              // 695 établissements

// Hôpitaux publics d'une wilaya (jointure sur le wilaya_code de GeoAlgeria)
const ephAlger = all.filter((e) => e.wilaya_code === "16" && e.type === "eph");

// Uniquement les géolocalisés, prêts pour une carte
const mappable = all.filter((e) => e.lat != null);
```

## Ce que vous pouvez construire

- **Localisateurs d'hôpitaux et de cliniques** — des coordonnées sur 600 des 695
  enregistrements, prêtes pour une carte ou une recherche de proximité.
- **Annuaires de santé bilingues** — noms français et arabe, type officiel et
  wilaya pour chaque établissement.
- **Analyse de couverture & planification** — compter les établissements par type
  par commune/wilaya sur tout le pays.

## Contenu

| Jeu de données | Nombre | Coordonnées | Notes |
| --- | --- | --- | --- |
| Établissements de santé | **695** | 600 géolocalisés | 58 wilayas, 563 bilingues |

**Par type**

| Type | Nombre | Signification |
| --- | --- | --- |
| `eph` | 270 | Établissement Public Hospitalier |
| `epsp` | 292 | Établissement Public de Santé de Proximité |
| `ehs` | 108 | Établissement Hospitalier Spécialisé |
| `chu` | 20 | Centre Hospitalo-Universitaire |
| `hopital` | 5 | autre hôpital public |

**Par précision des coordonnées** (`geo_precision`)

| Valeur | Nombre | Signification |
| --- | --- | --- |
| `osm_point` | 121 | point précis d'un établissement OpenStreetMap dans la commune |
| `wikidata_point` | 3 | point précis d'un établissement Wikidata dans la commune |
| `commune_centroid` | 476 | centroïde de la commune de l'établissement (approximatif) |
| `none` | 95 | localité non rattachée à une commune — pas de coordonnées |

> **Le registre est officiel ; les coordonnées sont au mieux.** Les noms, le type
> et la wilaya proviennent du Ministère de la Santé. Le MSP ne publie pas de
> coordonnées : GeoAlgeria les dérive (voir *Source & méthode*). Les totaux
> évoluent au gré des mises à jour du MSP, d'OpenStreetMap et de Wikidata.

## Formats

Le paquet npm fournit le **JSON** (importable directement) :

```js
import sante from "@geoalgeria/sante/data/sante.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/sante/data/sante.json
```

Les chargeurs et les enregistrements sont entièrement **typés** — les définitions TypeScript sont incluses :

```ts
import sante, { type HealthEstablishment } from "@geoalgeria/sante";
const all: HealthEstablishment[] = sante.sante();
```

Les **CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et inclus dans
chaque [GitHub Release](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  sante.json              # 695 établissements (tableau)
  metadata.json           # sources, totaux, couverture, generated_at
  csv/sante.csv           # dépôt + Release (pas dans le tarball npm)
  geojson/sante.geojson   # entités Point (enregistrements géolocalisés)
```

## Structure d'un enregistrement

```json
{
  "id": "01-ehs-02",
  "name": "Etablissement Hospitalier Spécialisé Psychiatrie Adrar",
  "name_ar": "المؤسسة الاستشفائية المتخصصة في الأمراض العقلية أدرار",
  "name_fr": "Etablissement Hospitalier Spécialisé Psychiatrie Adrar",
  "type": "ehs",
  "type_label_fr": "Établissement Hospitalier Spécialisé",
  "type_label_ar": "المؤسسة الاستشفائية المتخصصة",
  "sector": "public",
  "wilaya": "Adrar",
  "wilaya_ar": "أدرار",
  "wilaya_code": "01",
  "commune": "Adrar",
  "commune_code": 101,
  "source": "msp+osm",
  "geo_precision": "osm_point",
  "wikidata": null,
  "osm_id": "way/432370657",
  "msp_id": 3588,
  "slug": "etablissement-hospitalier-specialise-psychiatrie-adrar",
  "lat": 27.875834,
  "lng": -0.307533
}
```

`id` est une clé stable `{wilaya_code}-{type}-{seq}` synthétisée par GeoAlgeria
(le MSP ne publie pas de code). `name` est le nom français s'il existe, sinon
l'arabe. `type` est déduit du titre ; `wilaya` de l'étiquette du MSP. `sector`
vaut `"public"` pour tout le registre MSP (les cliniques privées, une fois
ajoutées, porteront `"private"`). `source` indique les registres ayant
contribué ; `geo_precision` l'origine de la coordonnée. `lat`/`lng` valent
`null` pour les 95 enregistrements dont la localité n'a pu être rattachée à une
commune.

> **Les coordonnées et la commune sont dérivées, pas issues du MSP.** Le
> Ministère de la Santé ne liste que noms, type et wilaya. GeoAlgeria rattache la
> localité de chaque établissement à une commune du jeu
> [`geoalgeria`](https://www.npmjs.com/package/geoalgeria) dans sa wilaya
> (`commune`, `commune_code` et un centroïde), puis remplace la coordonnée par un
> point précis lorsqu'un hôpital ou une clinique d'OpenStreetMap ou de Wikidata
> se trouve dans la même commune. La wilaya est exacte ; la commune et les
> coordonnées sont approximatives.

## Besoin des divisions administratives ?

Pour les wilayas, dairas et communes, utilisez le paquet principal
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — c'est ce qui
transforme le `commune_code` d'un établissement en polygone ou centroïde.
Utilisez `@geoalgeria/sante` quand vous n'avez besoin *que* des établissements de
santé.

## Source & méthode

Lancez `npm run fetch` pour régénérer les sorties. Le script :

1. récupère le registre des établissements du **Ministère de la Santé** depuis
   l'API REST WordPress de `sante.gov.dz` (`healthinstitution`), en français et
   en arabe, chacun étiqueté par sa wilaya ;
2. déduit le **type** de chaque titre et **apparie** les fiches française et
   arabe en un enregistrement bilingue ;
3. rattache la **localité à une commune** du jeu `geoalgeria` dans sa wilaya
   (`commune`, `commune_code` et un centroïde) ;
4. interroge **Wikidata** (SPARQL, hôpitaux) et **OpenStreetMap** (Overpass,
   `amenity=hospital`/`clinic`, `healthcare=*`) et **remplace** la coordonnée par
   un point précis lorsqu'il s'en trouve un dans la commune.

Les extractions brutes sont mises en cache sous
[`research/sante/`](https://github.com/yasserstudio/geoalgeria/tree/main/research/sante).

## Licence & attribution

Le **code** du paquet est sous [MIT](LICENSE). Les **données** sont un composite :

- Le registre du **Ministère de la Santé** (noms, type, wilaya) est une liste
  factuelle du secteur public.
- Les **coordonnées** sont dérivées de **Wikidata** (**CC0**, domaine public) et
  d'**OpenStreetMap** (**© les contributeurs d'OpenStreetMap**, sous licence
  **[ODbL 1.0](https://www.openstreetmap.org/copyright)**). Si vous utilisez ou
  redistribuez ce jeu de données, vous devez **attribuer aux contributeurs
  d'OpenStreetMap** et conserver les bases dérivées sous une licence compatible.

Vérifiez auprès des sources officielles pour toute information faisant foi. Ce jeu
de données est fourni à titre de référence et pour alimenter
[GeoAlgeria](https://geoalgeria.com).

[Docs API & champs →](https://geoalgeria.com/data/docs/sante) · [Tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
