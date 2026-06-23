[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/sports

**Toutes les infrastructures sportives d'Algérie — en données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/sports)](https://www.npmjs.com/package/@geoalgeria/sports)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/sports)](https://www.npmjs.com/package/@geoalgeria/sports)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

5 141 infrastructures sportives à travers l'Algérie — **terrains de proximité**, stades,
piscines, salles spécialisées, pistes d'athlétisme, courts de tennis, centres équestres,
bases nautiques et plus — chacune avec son nom, **type** d'infrastructure, adresse,
commune / daïra / wilaya, capacité, état de fonctionnement, accessibilité PMR, surfaces
bâtie et foncière, année de réception et coordonnées géographiques. Source : le **SIG du Ministère de
la Jeunesse et des Sports (sig.mjs.gov.dz)**. Livré en JSON, CSV et GeoJSON. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/sports
```

```js
import sports from "@geoalgeria/sports";

const toutes = sports.facilities();                  // 5 141
const aOran = sports.facilitiesByWilaya(31);         // infrastructures de la wilaya 31
const piscines = sports.facilitiesByType("P25");     // toutes les piscines 25 m
```

## Ce que vous pouvez construire

- **Recherche « piscine / stade le plus proche »** — coordonnées sur chaque enregistrement.
- **Applications sportives et civiques** — cartographier les stades, piscines et terrains par wilaya.
- **Cartes** — couche GeoJSON de points prête à l'emploi pour tout le réseau sportif.
- **Recherche et planification** — densité par type, analyse de capacité, audits d'état opérationnel.

## Contenu

| Type | Code | Nombre |
| --- | --- | --- |
| Terrain sportif de proximité | `TSP` | 3 292 |
| Aire de jeux football | `AJF` | 437 |
| Salle OMS | `SOMS` | 340 |
| Salle spécialisée | `SS` | 191 |
| Bassin de natation | `BN` | 159 |
| Piscine 25 m | `P25` | 158 |
| Piscine de proximité | `PP` | 103 |
| Terrain de football | `TF` | 83 |
| Stade de football | `SF` | 79 |
| Stade OMS | `STOMS` | 76 |
| Piste d'athlétisme | `PA` | 45 |
| Boulodrome | `BL` | 39 |
| Court de tennis | `CT` | 31 |
| Unité d'hébergement et de récupération | `UHR` | 23 |
| Piscine 50 m | `P50` | 20 |
| Stade d'athlétisme | `SA` | 16 |
| Centre équestre | `CE` | 11 |
| Base nautique | `BNA` | 8 |
| Complexe sportif | `CXS` | 7 |
| Aire de jeux de loisirs | `AJL` | 5 |
| Champ de tir | `CDT` | 5 |
| Centre de regroupement et de préparation | `CRP` | 4 |
| École de jeunes talents | `EJT` | 3 |
| Terrain de réplique | `TR` | 3 |
| Centre de formation régional | `CFR` | 1 |
| Établissement d'éducation physique et sportive | `EPS` | 1 |
| Grand stade | `GS` | 1 |
| **Total** | | **5 141** |

Couvrant **58 wilayas**, chaque infrastructure géolocalisée. `wilaya_code` est relié au
modèle de wilayas de [`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

## Source

Données du **Ministère de la Jeunesse et des Sports**, via le SIG public
(<https://sig.mjs.gov.dz/dashboard/viewer>). Exécutez `npm run fetch` pour régénérer les
données depuis le GIS en direct.

## Licence et attribution

Le code est [MIT](LICENSE). Les données sont © **Ministère de la Jeunesse et des Sports**,
redistribuées à titre de référence pour [GeoAlgeria](https://geoalgeria.com). Vérifiez
auprès du ministère pour les informations officielles en temps réel.

[Documentation API →](https://geoalgeria.com/data/docs/sports) · [Tous les packages →](https://geoalgeria.com/data)

---

Fait par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
