[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/sports

**Toutes les infrastructures sportives d'Algérie, en données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/sports)](https://www.npmjs.com/package/@geoalgeria/sports)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/sports)](https://www.npmjs.com/package/@geoalgeria/sports)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

5 234 infrastructures sportives à travers l'Algérie – **terrains de proximité**, stades,
piscines, salles spécialisées, pistes d'athlétisme, courts de tennis, centres équestres,
bases nautiques et plus – chacune avec son nom, **type** d'infrastructure, adresse,
commune / daïra / wilaya, capacité, état de fonctionnement, accessibilité PMR, surfaces
bâtie et foncière, année de réception et coordonnées géographiques. Source : le **SIG du Ministère de
la Jeunesse et des Sports (sig.mjs.gov.dz)**. Livré en JSON, CSV et GeoJSON. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/sports
```

```js
import sports from "@geoalgeria/sports";

const toutes = sports.facilities();                  // 5 234
const aOran = sports.facilitiesByWilaya(31);         // infrastructures de la wilaya 31
const piscines = sports.facilitiesByType("P25");     // toutes les piscines 25 m
```

## Ce que vous pouvez construire

- **Recherche « piscine / stade le plus proche »** – coordonnées sur chaque enregistrement.
- **Applications sportives et civiques** – cartographier les stades, piscines et terrains par wilaya.
- **Cartes** – couche GeoJSON de points prête à l'emploi pour tout le réseau sportif.
- **Recherche et planification** – densité par type, analyse de capacité, audits d'état opérationnel.

## Contenu

| Type | Code | Nombre |
| --- | --- | --- |
| Terrain sportif de proximité | `TSP` | 3 295 |
| Aire de jeux football | `AJF` | 436 |
| Salle OMS | `SOMS` | 340 |
| Salle spécialisée | `SS` | 203 |
| Piscine 25 m | `P25` | 160 |
| Bassin de natation | `BN` | 157 |
| Piscine de proximité | `PP` | 117 |
| Terrain de football | `TF` | 87 |
| Stade de football | `SF` | 81 |
| Stade OMS | `STOMS` | 77 |
| Piste d'athlétisme | `PA` | 56 |
| Boulodrome | `BL` | 42 |
| Aire de jeux de loisirs | `AJL` | 34 |
| Court de tennis | `CT` | 33 |
| Unité d'hébergement et de récupération | `UHR` | 27 |
| Piscine 50 m | `P50` | 23 |
| Stade d'athlétisme | `SA` | 15 |
| Centre équestre | `CE` | 12 |
| Base nautique | `BNA` | 8 |
| Complexe sportif | `CXS` | 8 |
| Terrain de réplique | `TR` | 7 |
| Champ de tir | `CDT` | 5 |
| Centre de regroupement et de préparation | `CRP` | 4 |
| École de jeunes talents | `EJT` | 2 |
| Grand stade | `GS` | 2 |
| Centre de formation régional | `CFR` | 1 |
| Établissement d'éducation physique et sportive | `EPS` | 1 |
| Parcours d'athlétisme | `PCA` | 1 |
| **Total** | | **5 234** |

Couvrant **69 wilayas**, chaque infrastructure géolocalisée – 5 106 sur un point
`exact`, les 128 restantes `approximate`. `wilaya_code` est relié au modèle de
wilayas de [`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

`refs.mjs` est l'UUID propre à chaque fiche du SIG du ministère (`properties.id` de la
couche `infrastructures_sportives`), présent sur chaque infrastructure depuis l'actualisation
du 27 octobre 2026. L'`id` est reporté d'une version à l'autre sur cet UUID : une
infrastructure renommée, réadressée ou déplacée par le ministère garde son id. Un id n'est
jamais réutilisé : ceux qui ont quitté le package sont listés dans
[`data/retired-ids.json`](data/retired-ids.json), avec, pour une fiche saisie deux fois et
désormais unique, l'id qui porte ses données. Le CSV porte `refs` en colonne JSON après `source`.

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

Réalisé par [Yasser's studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [support@yasser.studio](mailto:support@yasser.studio)

GeoAlgeria est gratuit, et il le reste. Le même studio réalise aussi des cartes, des sites web, des applications mobiles et des données ouvertes pour ses clients.
