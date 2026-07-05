[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/pharmacies

**Les pharmacies d'Algérie — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/pharmacies)](https://www.npmjs.com/package/@geoalgeria/pharmacies)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

# Aperçu

3 790 pharmacies (officines) réparties sur **67 wilayas**, issues d'**OpenStreetMap** — chaque enregistrement géocodé, bilingue (FR/AR) lorsque nommé, avec téléphone, horaires et un indicateur `dispensing` là où OSM les renseigne, plus le rattachement wilaya/commune.

## Installation

```bash
npm install @geoalgeria/pharmacies
```

## Démarrage rapide

```js
import {
  pharmacies,
  pharmacyById,
  pharmaciesByWilaya,
  metadata,
} from "@geoalgeria/pharmacies";

pharmacies().length; // 3790
pharmaciesByWilaya(16).length; // Alger
pharmacyById("16-00001")?.commune;
metadata().wilayas_covered; // 67
```

## Contenu

| Jeu de données | Nombre | Coordonnées | Notes |
| --- | --- | --- | --- |
| `pharmacies` | 3 790 | les 3 790 | OpenStreetMap, géocodé, rattaché wilaya/commune |

- **Nommées :** 2 459 · **avec téléphone :** 146 · **avec horaires :** 255 · **avec adresse :** 1 159 · **avec `dispensing` :** 524

## Formats

- `data/pharmacies.json` — tableau complet (typé par `types/index.d.ts`)
- `data/csv/pharmacies.csv` — CSV à plat
- `data/geojson/pharmacies.geojson` — `FeatureCollection`
- `data/metadata.json` — comptes, sources, date de génération

## Précision & couverture

> **Couverture partielle.** 3 790 pharmacies sont cartographiées dans OpenStreetMap face à un estimé de **~11 000 officines** à l'échelle nationale (ordre de grandeur — aucun registre officiel ouvert ; le portail de l'Ordre National des Pharmaciens est hors service). La couverture est inégale selon la wilaya et plus dense au nord — c'est un extrait communautaire, **pas un registre officiel**.
>
> Les coordonnées sont des points OSM (relevés) ou des centroïdes de bâtiment (`geo_precision`). La commune est un rapprochement au centroïde le plus proche (au mieux) ; la wilaya est quasi exacte. Noms, téléphones et horaires ne figurent que là où un contributeur OSM les a renseignés.

## Source & licence

Données © **contributeurs d'OpenStreetMap**, sous licence **ODbL 1.0**. Toute redistribution doit créditer OpenStreetMap et rester sous ODbL. Le rattachement wilaya/commune utilise le jeu de données de base geoalgeria. Code du paquet sous licence MIT (voir [LICENSE](LICENSE)).

## Questions ?

Ouvrez une issue : https://github.com/yasserstudio/geoalgeria/issues
