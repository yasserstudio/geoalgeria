[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/ecoles

**Les écoles d'Algérie — sous forme de données prêtes à installer.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/ecoles)](https://www.npmjs.com/package/@geoalgeria/ecoles)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/ecoles)](https://www.npmjs.com/package/@geoalgeria/ecoles)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**11 830 écoles géolocalisées** dans les **69 wilayas** d'Algérie — chacune avec
ses coordonnées, classée par **cycle** (primaire · moyen/CEM · secondaire/lycée ·
préscolaire), la plupart avec un nom en arabe et/ou en français, et un
rattachement commune/wilaya. Extraites d'**OpenStreetMap** et présentées
honnêtement face aux ~28 000 établissements du réseau scolaire national. Livré en
JSON, CSV, GeoJSON et TypeScript. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/ecoles
```

```js
import ecoles from "@geoalgeria/ecoles";

const all = ecoles.ecoles();   // 11 830 écoles géolocalisées

// Lycées d'une wilaya (jointure sur wilaya_code de GeoAlgeria)
const lyceesSetif = all.filter((e) => e.wilaya_code === "19" && e.cycle === "secondaire");

// Uniquement les écoles nommées, avec un libellé français
const named = all.filter((e) => e.name_fr);
```

## Ce que vous pouvez construire

- **Cartes & annuaires d'écoles** — coordonnées sur les 11 830 enregistrements,
  prêtes pour une carte ou un tri par école la plus proche.
- **Répartitions par cycle** — filtrez primaire / moyen / secondaire /
  préscolaire, ou classez la densité scolaire par commune/wilaya.
- **Annuaires bilingues** — des milliers de noms en arabe et en français, côte à côte.

## Contenu

| Jeu de données | Nombre | Coordonnées | Notes |
| --- | --- | --- | --- |
| Écoles | **11 830** | ✅ toutes | 8 640 nommées, 69 wilayas |

**Par cycle**

| Cycle | Nombre | Signification |
| --- | --- | --- |
| `primaire` | 4 032 | école primaire (CITE 1) |
| `moyen` | 2 377 | collège d'enseignement moyen / CEM (CITE 2) |
| `secondaire` | 1 574 | lycée (CITE 3) |
| `prescolaire` | 268 | préscolaire / maternelle / روضة (CITE 0) |
| `autre` | 3 579 | école de cycle indéterminé (non nommée, ou nom sans mot de cycle) |

> **Il s'agit d'un extrait OpenStreetMap, pas d'un registre officiel.** La
> couverture est partielle et inégale selon les wilayas — ~11,8k écoles
> cartographiées face aux ~28 000 du réseau national (primaire + moyen +
> secondaire, Ministère de l'Éducation Nationale, approximatif). Les nombres
> évoluent au fil des contributions à OpenStreetMap.

**Le cycle est déduit.** Il provient d'`isced:level` et du nom français/arabe —
un CEM se nomme toujours متوسطة/collège, un lycée ثانوية/lycée, une maternelle
روضة/préscolaire. Une simple « école »/« مدرسة » sans mot de cycle est classée
`primaire` par convention algérienne ; le reste est `autre`. 93 % des écoles
*nommées* obtiennent un cycle précis.

## Formats

Le paquet npm fournit le **JSON** (importable directement) :

```js
import ecoles from "@geoalgeria/ecoles/data/ecoles.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/ecoles/data/ecoles.json
```

Les chargeurs et les formes d'enregistrement sont entièrement **typés** — les
définitions TypeScript sont incluses dans le paquet :

```ts
import ecoles, { type Ecole } from "@geoalgeria/ecoles";
const all: Ecole[] = ecoles.ecoles();
```

Les fichiers **CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et
inclus dans chaque
[Release GitHub](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  ecoles.json              # 11 830 écoles (tableau)
  metadata.json            # source, décomptes, couverture, generated_at
  csv/ecoles.csv           # dépôt + bundle Release (pas dans le tarball npm)
  geojson/ecoles.geojson   # entités Point
```

## Forme d'un enregistrement

```json
{
  "id": "16-00042",
  "source": "osm",
  "osm_id": "way/292876445",
  "name": "Lycée El Idrissi",
  "name_ar": "ثانوية الإدريسي",
  "name_fr": "Lycée El Idrissi",
  "cycle": "secondaire",
  "cycle_label_fr": "Lycée",
  "cycle_label_ar": "ثانوية",
  "sector": null,
  "wilaya": "Alger",
  "wilaya_ar": "الجزائر",
  "wilaya_code": "16",
  "commune": "Casbah",
  "commune_code": 1607,
  "lat": 36.779365,
  "lng": 3.05949,
  "geo_precision": "osm_centroid"
}
```

`id` est une clé stable `{wilaya_code}-{seq}` synthétisée par GeoAlgeria ;
`osm_id` renvoie à l'objet source. `name` est `null` pour les points non nommés.
`sector` vaut `"public"`/`"private"` uniquement en présence d'un signal explicite,
sinon `null`. `geo_precision` vaut `osm_node` (point relevé) ou `osm_centroid`
(centre d'un contour de bâtiment). `wilaya_code` se joint au `wilaya_code` de
GeoAlgeria.

> **Le rattachement commune/wilaya est déduit, pas issu de la source.**
> OpenStreetMap ne porte pas les codes administratifs algériens. GeoAlgeria
> attache `wilaya_code`, `commune_code` et `commune` par une **jointure au
> centroïde le plus proche** contre le jeu de communes
> [`geoalgeria`](https://www.npmjs.com/package/geoalgeria). La wilaya est
> quasi exacte ; la commune est au mieux (proximité de centroïde, pas
> d'inclusion polygonale).

## Besoin aussi des divisions administratives ?

Pour les wilayas, daïras et communes, utilisez le paquet principal
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — c'est ainsi que
vous transformez le `commune_code` d'une école en polygone ou centroïde. Utilisez
`@geoalgeria/ecoles` lorsque vous ne voulez *que* les écoles.

## Source & méthode

Lancez `npm run fetch` pour régénérer toutes les sorties. Le script :

1. interroge **OpenStreetMap** (Overpass) pour `amenity=school` et
   `amenity=kindergarten` en Algérie ;
2. **classe le cycle** à partir d'`isced:level` et du nom français/arabe ;
3. déduplique la même école cartographiée à la fois comme nœud et comme bâtiment ;
4. attache commune/wilaya par centroïde de commune le plus proche.

Les extractions brutes sont mises en cache sous
[`research/ecoles/`](https://github.com/yasserstudio/geoalgeria/tree/main/research/ecoles).

## Licence & attribution

Le **code** du paquet est sous [MIT](LICENSE). Les **données** proviennent
d'**OpenStreetMap** — **© les contributeurs d'OpenStreetMap**, sous licence
**[ODbL 1.0](https://www.openstreetmap.org/copyright)**. Si vous utilisez ou
redistribuez ce jeu de données, vous devez **attribuer les contributeurs
d'OpenStreetMap** et conserver les bases dérivées sous une licence compatible.

Vérifiez auprès des sources officielles pour toute information faisant autorité.
Ce jeu de données est fourni à titre de référence et pour alimenter
[GeoAlgeria](https://geoalgeria.com).

[Docs API & champs →](https://geoalgeria.com/data/docs/ecoles) · [Voir tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
