[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/mosquees

**Les mosquées d'Algérie — sous forme de données prêtes à installer.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/mosquees)](https://www.npmjs.com/package/@geoalgeria/mosquees)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/mosquees)](https://www.npmjs.com/package/@geoalgeria/mosquees)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**20 759 mosquées géolocalisées** dans les **69 wilayas** d'Algérie — chacune avec
ses coordonnées, la plupart avec un nom en arabe et/ou en français, et un
rattachement commune/wilaya. Un **composite communautaire de Wikidata et
d'OpenStreetMap**, présenté honnêtement face au décompte national du Ministère des
Affaires Religieuses (MARW) d'environ 18 449. Livré en JSON, CSV, GeoJSON et
TypeScript. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/mosquees
```

```js
import mosquees from "@geoalgeria/mosquees";

const all = mosquees.mosquees();   // 20 759 mosquées géolocalisées

// Mosquées d'une wilaya (jointure sur le wilaya_code de GeoAlgeria)
const aSetif = all.filter((m) => m.wilaya_code === "19");

// Uniquement celles avec un nom en français
const named = all.filter((m) => m.name_fr);
```

## Ce que vous pouvez construire

- **Cartes et localisateurs de mosquées** — des coordonnées sur les 20 759
  enregistrements, prêtes pour une carte ou un tri par distance.
- **Annuaires bilingues** — plus de 15 000 noms en arabe et 7 000 en français.
- **Analyse de couverture** — compter ou classer la densité de mosquées par
  commune/wilaya sur tout le pays.

## Contenu

| Jeu de données | Nombre | Coordonnées | Notes |
| --- | --- | --- | --- |
| Mosquées | **20 759** | ✅ toutes | 19 783 nommées, 69 wilayas |

**Par source**

| Source | Nombre | Signification |
| --- | --- | --- |
| `wikidata` | 13 200 | issu de Wikidata seul |
| `wikidata+osm` | 5 897 | dans les deux, apparié à ~150 m près (OSM apporte un nom français / une dénomination / un `refs.osm`) |
| `osm` | 1 662 | cartographié dans OpenStreetMap, pas encore dans Wikidata |

> **C'est un composite, pas un registre officiel.** Wikidata offre une couverture
> quasi complète (~19 000 mosquées géolocalisées, proche du chiffre MARW d'environ
> 18 449) ; OpenStreetMap ajoute des coordonnées précises, des noms français, la
> dénomination, et des mosquées absentes de Wikidata. Les totaux évoluent au gré
> des deux projets — chaque reconstruction reflète l'état actuel des sources.

## Formats

Le paquet npm fournit le **JSON** (importable directement) :

```js
import mosquees from "@geoalgeria/mosquees/data/mosquees.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/mosquees/data/mosquees.json
```

Les chargeurs et les enregistrements sont entièrement **typés** — les définitions TypeScript sont incluses :

```ts
import mosquees, { type Mosquee } from "@geoalgeria/mosquees";
const all: Mosquee[] = mosquees.mosquees();
```

Les **CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et inclus dans
chaque [GitHub Release](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  mosquees.json              # 20 759 mosquées (tableau)
  metadata.json              # sources, totaux, couverture, updated
  csv/mosquees.csv           # dépôt + Release (pas dans le tarball npm)
  geojson/mosquees.geojson   # entités Point
```

## Structure d'un enregistrement

```json
{
  "id": "16-0914",
  "name": "مسجد عبد الحميد بن باديس",
  "name_fr": "Mosquée Ibn Badis",
  "name_ar": "مسجد عبد الحميد بن باديس",
  "wilaya_code": "16",
  "commune_code": "1607",
  "commune": "Casbah",
  "lat": 36.779365,
  "lng": 3.05949,
  "geo_precision": "approximate",
  "geo_method": "osm_relation",
  "source": "wikidata+osm",
  "refs": {
    "wikidata": "Q28717404",
    "osm": "relation/15870867"
  },
  "denomination": "sunni"
}
```

`id` est une clé stable `{wilaya_code}-{seq}` synthétisée par GeoAlgeria, unique
dans `mosquees.json`. `refs.wikidata` et `refs.osm` renvoient aux objets
sources. `name` est le meilleur nom d'affichage disponible (français de
préférence, sinon arabe) et vaut `null` pour les points OSM sans nom.
`wilaya_code` se joint au `wilaya_code` de GeoAlgeria.

> **Le rattachement commune/wilaya est dérivé, pas issu des sources.** Ni Wikidata
> ni OSM ne portent les codes administratifs algériens. GeoAlgeria attache
> `wilaya_code`, `commune_code` et `commune` par **jointure au centroïde le plus
> proche** sur le jeu de communes
> [`geoalgeria`](https://www.npmjs.com/package/geoalgeria). La wilaya est quasi
> exacte ; la commune est une approximation (proximité de centroïde, non inclusion
> dans le polygone).

## Besoin des divisions administratives ?

Pour les wilayas, dairas et communes, utilisez le paquet principal
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — c'est ce qui
transforme le `commune_code` d'une mosquée en polygone ou centroïde. Utilisez
`@geoalgeria/mosquees` quand vous n'avez besoin *que* des mosquées.

## Source & méthode

Lancez `npm run fetch` pour régénérer les sorties. Le script :

1. interroge **Wikidata** (SPARQL) pour tout élément instance d'une sous-classe de
   *mosquée* (Q32815) située en Algérie (P17 = Q262) avec une coordonnée (P625) —
   la base exhaustive ;
2. interroge **OpenStreetMap** (Overpass) pour `amenity=place_of_worship` +
   `religion=muslim` en Algérie ;
3. les **fusionne** — une mosquée OSM à ~150 m d'une mosquée Wikidata est intégrée
   à cet enregistrement (apportant son nom français, sa dénomination et son
   `refs.osm`) ; les mosquées OSM sans correspondance deviennent leurs propres
   enregistrements ;
4. attache la commune/wilaya par centroïde de commune le plus proche.

Les extractions brutes sont mises en cache sous
[`research/mosquees/`](https://github.com/yasserstudio/geoalgeria/tree/main/research/mosquees).

## Licence & attribution

Le **code** du paquet est sous [MIT](LICENSE). Les **données** sont un composite :

- Le contenu **Wikidata** est sous **CC0** (domaine public).
- Le contenu **OpenStreetMap** est **© les contributeurs d'OpenStreetMap**, sous
  licence **[ODbL 1.0](https://www.openstreetmap.org/copyright)**. Si vous
  utilisez ou redistribuez ce jeu de données, vous devez **attribuer aux
  contributeurs d'OpenStreetMap** et conserver les bases dérivées sous une licence
  compatible.

Vérifiez auprès des sources officielles pour toute information faisant foi. Ce jeu
de données est fourni à titre de référence et pour alimenter
[GeoAlgeria](https://geoalgeria.com).

[Docs API & champs →](https://geoalgeria.com/data/docs/mosquees) · [Tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
