[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/culture

**L'atlas culturel de l'Algérie — sous forme de données prêtes à installer.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/culture)](https://www.npmjs.com/package/@geoalgeria/culture)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/culture)](https://www.npmjs.com/package/@geoalgeria/culture)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**1 083 lieux culturels** dans **66 des 69 wilayas d'Algérie** — biens culturels
protégés, musées, théâtres, bibliothèques et établissements culturels (maisons et
palais de la culture, salles de cinéma, directions de la culture, écoles d'art) de
l'atlas *Cartes du Patrimoine Culturel Algérien* du **Ministère de la Culture**,
**100 % bilingues** français/arabe et **entièrement géolocalisés** (chaque lieu
porte une coordonnée source). Livré en JSON, CSV, GeoJSON et TypeScript. Fait
partie de [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/culture
```

```js
import culture from "@geoalgeria/culture";

const all = culture.culture();          // 1 083 lieux culturels

// Musées d'une wilaya (jointure sur le wilaya_code de GeoAlgeria)
const museesAlger = all.filter((p) => p.wilaya_code === "16" && p.type === "museum");

// Uniquement les biens culturels protégés, prêts pour une carte
const patrimoine = all.filter((p) => p.category === "heritage");

// Les lieux dotés d'une visite virtuelle à 360°
const visites = all.filter((p) => p.has_virtual_tour);
```

## Ce que vous pouvez construire

- **Cartes culturelles & recherche de proximité** — chacun des 1 083 lieux a des
  coordonnées, prêtes pour une carte ou une fonction « à proximité ».
- **Annuaires culturels bilingues** — noms français et arabe, type officiel et
  wilaya pour chaque lieu ; filtrer patrimoine vs établissements en activité.
- **Applications patrimoine & tourisme** — sites protégés, musées et visites
  virtuelles à 360°, rattachés à la commune/wilaya pour l'itinéraire et l'analyse.

## Contenu

| Jeu de données | Nombre | Coordonnées | Notes |
| --- | --- | --- | --- |
| Lieux culturels | **1 083** | 1 083 géolocalisés | 66 wilayas, 100 % bilingues, 22 visites 360° |

**Par catégorie**

| Catégorie | Nombre | Signification |
| --- | --- | --- |
| `heritage` | 943 | sites protégés, musées, théâtres, bibliothèques |
| `establishment` | 140 | lieux culturels en activité & directions |

**Par type**

| Type | Nombre | Signification |
| --- | --- | --- |
| `protected-cultural-property` | 580 | Bien culturel protégé — monument/site protégé |
| `library` | 257 | Bibliothèque de lecture publique |
| `museum` | 48 | Musée |
| `theatre` | 45 | Théâtre |
| `museum-moudjahid` | 13 | Musée du Moudjahid |
| `cultural-house` | 51 | Maison de la culture |
| `cultural-directorate` | 33 | Direction de la culture / office |
| `cinema` | 20 | Salle de cinéma / cinémathèque |
| `cultural-center` | 15 | Centre culturel / de recherche |
| `arts-school` | 15 | École d'art — beaux-arts / conservatoire |
| `cultural-palace` | 6 | Palais de la culture |

> **L'atlas est officiel ; les coordonnées sont au mieux.** Les noms, le type, les
> coordonnées et le drapeau 360° proviennent du portail du Ministère de la
> Culture. La wilaya est exacte ; la commune est dérivée (voir *Source &
> méthode*). Les totaux évoluent au gré des mises à jour du portail.

## Formats

Le paquet npm fournit le **JSON** (importable directement) :

```js
import culture from "@geoalgeria/culture/data/culture.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/culture/data/culture.json
```

Les chargeurs et les enregistrements sont entièrement **typés** — les définitions TypeScript sont incluses :

```ts
import culture, { type CulturalSite } from "@geoalgeria/culture";
const all: CulturalSite[] = culture.culture();
```

Les **CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et inclus dans
chaque [GitHub Release](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  culture.json              # 1 083 lieux culturels (tableau)
  metadata.json             # sources, totaux, couverture, generated_at
  csv/culture.csv           # dépôt + Release
  geojson/culture.geojson   # entités Point (chaque enregistrement)
```

## Structure d'un enregistrement

```json
{
  "id": "16-museum-03",
  "name": "Musée national Public d'art moderne et contemporain",
  "name_ar": "المتحف العمومي الوطني للفن الحديث و المعاصر",
  "name_fr": "Musée national Public d'art moderne et contemporain",
  "type": "museum",
  "category": "heritage",
  "type_label_fr": "Musée",
  "type_label_ar": "متحف",
  "has_virtual_tour": true,
  "wilaya": "Alger",
  "wilaya_ar": "الجزائر",
  "wilaya_code": "16",
  "commune": "Casbah",
  "commune_code": 1607,
  "source": "patrimoineculturel",
  "geo_precision": "source_point",
  "url": "https://cartes.patrimoineculturelalgerien.org/fr/node/101",
  "node_id_fr": 101,
  "node_id_ar": 817,
  "slug": "musee-national-public-d-art-moderne-et-contemporain",
  "lat": 36.777301,
  "lng": 3.057572
}
```

`id` est une clé stable `{wilaya_code}-{type_code}-{seq}` synthétisée par
GeoAlgeria. `name` est le nom français s'il existe, sinon l'arabe. `type` est la
couche du lieu sur le portail ; `category` regroupe les 11 types en `heritage` vs
`establishment`. `has_virtual_tour` vaut `true` pour les 22 lieux dotés d'une
visite 360°. `geo_precision` vaut `"source_point"` pour chaque enregistrement.

> **La wilaya est exacte ; la commune est dérivée.** Le portail classe encore
> certains lieux sous d'anciens codes de wilaya ; GeoAlgeria les réaffecte au
> découpage actuel à 69 wilayas en rattachant chaque coordonnée au centroïde de
> commune [`geoalgeria`](https://www.npmjs.com/package/geoalgeria) le plus proche
> (qui fournit aussi `commune`/`commune_code`). La commune est approximative (le
> paquet principal fournit des centroïdes, pas des polygones de limites).

## Besoin des divisions administratives ?

Pour les wilayas, dairas et communes, utilisez le paquet principal
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — c'est ce qui
transforme le `commune_code` d'un lieu en polygone ou centroïde. Utilisez
`@geoalgeria/culture` quand vous n'avez besoin *que* des lieux culturels.

## Source & méthode

Lancez `npm run fetch` pour régénérer les sorties. Le script :

1. lit l'atlas culturel bilingue curé (assemblé et traduit depuis le portail
   `cartes.patrimoineculturelalgerien.org` du Ministère de la Culture — les
   catalogues français et arabe du portail sont des ensembles de nœuds disjoints,
   unis par proximité de coordonnées et traduits pour combler les manques
   bilingues) ;
2. **réaffecte** chaque lieu au découpage actuel à 69 wilayas et lui rattache une
   `commune`/`commune_code` en le rapprochant du centroïde de commune `geoalgeria`
   le plus proche ;
3. attribue des identifiants stables, retire les nœuds en double, et produit le
   JSON, le CSV, le GeoJSON et les métadonnées.

La source curée et les notes d'extraction sont sous
[`research/patrimoine/`](https://github.com/yasserstudio/geoalgeria/tree/main/research/patrimoine).

## Licence & attribution

Le **code** du paquet est sous [MIT](LICENSE). Les **données** sont une liste
factuelle publique du portail du patrimoine culturel du **Ministère de la
Culture** (noms, types, coordonnées et visites 360° tels que publiés). Le
rattachement commune/wilaya est dérivé du jeu administratif
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

Vérifiez auprès des sources officielles pour toute information faisant foi. Ce jeu
de données est fourni à titre de référence et pour alimenter
[GeoAlgeria](https://geoalgeria.com).

[Docs API & champs →](https://geoalgeria.com/data/docs/culture) · [Tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
