[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/djezzy

**Le réseau de boutiques Djezzy en Algérie — sous forme de données prêtes à installer.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/djezzy)](https://www.npmjs.com/package/@geoalgeria/djezzy)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/djezzy)](https://www.npmjs.com/package/@geoalgeria/djezzy)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

Les **128 boutiques** de **Djezzy** (Optimum Telecom Algérie), l'un des trois
opérateurs mobiles d'Algérie — chaque point de vente géolocalisé, avec sa
catégorie, son adresse, ses horaires, son code d'ouverture et son rattachement
commune/wilaya. Livré en JSON, CSV, GeoJSON et TypeScript. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/djezzy
```

```js
import djezzy from "@geoalgeria/djezzy";

const boutiques = djezzy.boutiques();   // 128 boutiques Djezzy géolocalisées

// Boutiques d'une wilaya (jointure sur le wilaya_code de GeoAlgeria)
const aAlger = boutiques.filter((b) => b.wilaya_code === "16");

// Boutiques par catégorie
const flagships = boutiques.filter((b) => b.category === "A");
```

## Ce que vous pouvez construire

- **Localisateurs de boutiques** — des coordonnées sur chacune des 128 boutiques,
  prêtes pour le tri par distance ou une carte.
- **Couverture par wilaya** — chaque boutique est rattachée à sa commune et sa
  wilaya, pour compter ou classer la présence de Djezzy sur les 63 wilayas couvertes.
- **Comparaisons d'opérateurs** — jointure avec
  [`@geoalgeria/mobilis`](https://www.npmjs.com/package/@geoalgeria/mobilis) sur
  `wilaya_code` pour comparer les réseaux de distribution opérateur par opérateur.

## Contenu

| Jeu de données | Nombre | Coordonnées | Notes |
| --- | --- | --- | --- |
| Boutiques | **128** | ✅ les 128 | catégorie A/B/C, horaires, 63 wilayas |

## Formats

Le paquet npm fournit le **JSON** (importable directement) :

```js
import boutiques from "@geoalgeria/djezzy/data/boutiques.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/djezzy/data/boutiques.json
```

Les chargeurs et les enregistrements sont entièrement **typés** — les définitions TypeScript sont incluses :

```ts
import djezzy, { type Boutique } from "@geoalgeria/djezzy";
const boutiques: Boutique[] = djezzy.boutiques();
```

Les **CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et inclus dans
chaque [GitHub Release](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  boutiques.json              # 128 boutiques (tableau)
  metadata.json               # sources, totaux, licence, updated
  csv/boutiques.csv           # dépôt + Release (pas dans le tarball npm)
  geojson/boutiques.geojson   # entités Point
```

## Structure d'un enregistrement

```json
{
  "id": "01-001",
  "name": "ADRAR",
  "wilaya_code": "01",
  "commune_code": "0101",
  "commune": "Adrar",
  "lat": 27.87194,
  "lng": -0.28569,
  "geo_precision": "exact",
  "geo_method": "operator_point",
  "source": "djezzy",
  "refs": {
    "djezzy": "Z56"
  },
  "type": "boutique",
  "category": "C",
  "address": "Groupe 74, Prés souk Dinar Tayeb, Adrar.",
  "hours": "08H00 - 18H00",
  "code_ouverture": null
}
```

`id` est une clé stable `{wilaya_code}-{seq}` synthétisée par GeoAlgeria, unique
dans ce jeu de données. Le code interne de Djezzy est conservé dans `refs.djezzy`.
`wilaya_code` se joint au `wilaya_code` de GeoAlgeria. `geo_precision` vaut
toujours `"exact"` et `geo_method` toujours `"operator_point"` — chaque boutique
porte une vraie coordonnée publiée par l'opérateur.

> **Le rattachement commune/wilaya est dérivé, pas issu de la source.** Djezzy
> publie des coordonnées et une adresse mais aucun code administratif. GeoAlgeria
> attache `wilaya_code`, `commune_code` et `commune` par **jointure au centroïde
> le plus proche** sur le jeu de communes
> [`geoalgeria`](https://www.npmjs.com/package/geoalgeria). La wilaya est quasi
> exacte ; la commune est une approximation (proximité de centroïde, non
> inclusion dans le polygone).

## Besoin des divisions administratives ?

Pour les wilayas, dairas et communes, utilisez le paquet principal
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — c'est ce qui
transforme le `commune_code` d'une boutique en polygone ou centroïde. Utilisez
`@geoalgeria/djezzy` quand vous n'avez besoin *que* du réseau Djezzy.

## Source

Les données proviennent du localisateur de boutiques **Djezzy**
(<https://www.djezzy.dz/nos-boutiques/>). La page intègre la liste complète sous
forme de tableau JSON encodé en entités HTML — il n'y a pas d'API séparée. Lancez
`npm run fetch` pour régénérer les sorties : le script lit les objets boutique,
vérifie que les coordonnées tombent en Algérie, et attache le rattachement
administratif par commune la plus proche.

## Licence & attribution

Le code est sous [MIT](LICENSE). Les données sont © **Optimum Telecom Algérie
(Djezzy)**, redistribuées à titre de référence et pour alimenter
[GeoAlgeria](https://geoalgeria.com). Vérifiez auprès de Djezzy pour toute
information officielle et en temps réel. La liste des boutiques évolue au fil des
ouvertures et fermetures — chaque reconstruction reflète l'état actuel du
localisateur.

[Docs API & champs →](https://geoalgeria.com/data/docs/djezzy) · [Tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
