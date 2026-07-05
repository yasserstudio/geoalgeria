[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/ooredoo

**Le réseau de boutiques d'Ooredoo Algérie — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/ooredoo)](https://www.npmjs.com/package/@geoalgeria/ooredoo)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

# Aperçu

572 points de vente Ooredoo répartis sur **63 wilayas** — Espaces Ooredoo (EO), City Shops (CSO) et Espaces Services (ESO) — depuis l'API de localisation de l'opérateur, chacun avec des **coordonnées réelles** et un rattachement wilaya/commune. Complète le trio télécom avec [`@geoalgeria/mobilis`](https://www.npmjs.com/package/@geoalgeria/mobilis) et [`@geoalgeria/djezzy`](https://www.npmjs.com/package/@geoalgeria/djezzy).

## Installation

```bash
npm install @geoalgeria/ooredoo
```

## Démarrage rapide

```js
import { stores, storesByType, storesByWilaya, metadata } from "@geoalgeria/ooredoo";

stores().length; // 572
storesByType("ESO").length; // 436
storesByWilaya(16).map((r) => r.name); // Alger
metadata().wilayas_covered; // 63
```

## Contenu

| Type | Nombre | Signification |
| --- | --- | --- |
| `EO` | 100 | Espace Ooredoo |
| `ESO` | 436 | Espace Services Ooredoo |
| `CSO` | 36 | City Shop Ooredoo |

Coordonnées : les 572 en `exact`.

## Formats

- `data/stores.json` — tableau complet (typé par `types/index.d.ts`)
- `data/csv/stores.csv` — CSV à plat
- `data/geojson/stores.geojson` — `FeatureCollection`
- `data/metadata.json` — comptes, sources, date de génération

## Précision

> Noms, types et coordonnées proviennent de **l'opérateur** (`geo_precision : "exact"`). La wilaya est quasi exacte (issue du point relevé) ; la commune est un rapprochement au centroïde le plus proche. L'API classant les points selon l'ancien découpage à 48 wilayas, la wilaya/commune est recalculée depuis les coordonnées vers le découpage actuel à 69 wilayas ; la wilaya déclarée par l'opérateur est conservée dans `operator_wilaya`.

## Source & licence

Données © **Ooredoo Algérie**, redistribuées à titre de référence (même statut que `@geoalgeria/mobilis` / `@geoalgeria/djezzy`). Le rattachement wilaya/commune utilise le jeu de données de base geoalgeria. Code du paquet sous licence MIT (voir [LICENSE](LICENSE)).

## Questions ?

Ouvrez une issue : https://github.com/yasserstudio/geoalgeria/issues
