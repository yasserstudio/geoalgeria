[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/agriculture

**Les institutions du secteur agricole en Algérie — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/agriculture)](https://www.npmjs.com/package/@geoalgeria/agriculture)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/agriculture)](https://www.npmjs.com/package/@geoalgeria/agriculture)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

# Aperçu

196 institutions du secteur agricole issues de l'annuaire du **Ministère de l'Agriculture et du Développement Rural (MADR)** — directions des services agricoles, conservations des forêts, instituts techniques et de recherche, centres de formation, chambres d'agriculture, offices et groupes publics — bilingue (FR/AR), typé, avec rattachement wilaya/commune et coordonnées.

## Installation

```bash
npm install @geoalgeria/agriculture
```

## Démarrage rapide

```js
import { agriculture, institutionsByWilaya, institutionsByType } from "@geoalgeria/agriculture";

agriculture().length; // 196

// Toutes les directions des services agricoles (une par wilaya)
institutionsByType("dsa").length; // 58

// Tout dans Alger (code 16)
institutionsByWilaya(16).map((r) => r.name);
```

## Ce que vous pouvez construire

- Un annuaire/localisateur des institutions agricoles par wilaya
- Un carnet de contacts des instituts, offices et groupes nationaux (tél./fax)
- Une couche cartographique de l'empreinte administrative du secteur agricole

## Contenu

| Jeu de données | Nombre | Coordonnées | Notes |
| --- | --- | --- | --- |
| `agriculture` | 196 | les 196 | Annuaire MADR, géocodé au centroïde commune/wilaya |

**Par réseau (`type`)**

| Type | Nombre | Signification |
| --- | --- | --- |
| `dsa` | 58 | Directions des Services Agricoles (une par wilaya) |
| `conservation_forets` | 48 | Conservations des Forêts |
| `chambre_agriculture` | 49 | Chambres d'Agriculture (+ chambre nationale) |
| `institut_recherche` | 16 | Instituts techniques et de recherche (INRAA, INRF, ITGC, ITDAS…) |
| `centre_formation` | 11 | Instituts et centres de formation (ITMAS/CFATSF/CFVA) |
| `groupe_public` | 10 | Groupes publics (GVAPRO, AGROLOG, GIPLAIT…) |
| `office_public` | 4 | Offices publics (OAIC, ONIL, ONILEV, ONTA) |

**Par précision des coordonnées** (`geo_precision`)

| Valeur | Nombre | Signification |
| --- | --- | --- |
| `commune_centroid` | 89 | L'adresse correspond à une commune ; centroïde de cette commune |
| `wilaya_centroid` | 107 | Pas de commune dans l'adresse ; centroïde du chef-lieu de wilaya |

> Les DSA couvrent les **58 wilayas**. Les Conservations des Forêts (48) et les Chambres d'Agriculture (49) utilisent le découpage **48 wilayas** d'avant 2019 — les wilayas du Sud y sont rattachées à leurs wilayas mères.

## Formats

- `data/agriculture.json` — tableau complet (typé par `types/index.d.ts`)
- `data/csv/agriculture.csv` — CSV plat
- `data/geojson/agriculture.geojson` — `FeatureCollection` (tous les enregistrements)
- `data/metadata.json` — comptes, sources, date de génération

## Comment les données sont construites

Extraites de l'annuaire du MADR (`madr.gov.dz/contact/دليل-الهاتف/`, arabe — la version à jour ; `fr.madr.gov.dz/contact/annuaire/` pour les libellés bilingues des catégories), normalisées vers les codes wilaya officiels, puis géocodées sur l'ensemble des communes de geoalgeria. Voir `research/agriculture/` dans le monorepo.

## Sur la précision

> Les noms, la wilaya, l'adresse et le tél./fax sont **officiels** (annuaire du MADR). L'annuaire ne contient **aucune coordonnée** : chaque enregistrement est placé au centroïde de la commune nommée dans son adresse, ou — à défaut — au centroïde du chef-lieu de wilaya (voir `geo_precision`). Ce sont des emplacements approximatifs de la *wilaya/commune*, pas des points de bâtiments relevés.

## Source & licence

Données du **Ministère de l'Agriculture et du Développement Rural (MADR)** — un listing factuel du secteur public, redistribué à titre de référence. Le rattachement wilaya/commune utilise le jeu de données de base geoalgeria. Code du paquet sous MIT (voir [LICENSE](LICENSE)).

## Questions ?

Ouvrez une issue : https://github.com/yasserstudio/geoalgeria/issues
