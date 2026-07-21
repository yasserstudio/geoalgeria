[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/industrie-pharmaceutique

**Les fabricants pharmaceutiques agréés d'Algérie — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/industrie-pharmaceutique)](https://www.npmjs.com/package/@geoalgeria/industrie-pharmaceutique)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

# Aperçu

171 **fabricants** pharmaceutiques agréés issus du registre de fabrication du **Ministère de l'Industrie Pharmaceutique (MIP)** (`agrément de fabrication`, mis à jour le 28/06/2026) — fabricants de médicaments (PP), de dispositifs médicaux (DM) et producteurs mixtes — bilingues (FR/AR), typés par nature, avec rattachement wilaya/commune et coordonnées.

## Installation

```bash
npm install @geoalgeria/industrie-pharmaceutique
```

## Démarrage rapide

```js
import {
  manufacturers,
  manufacturersByNature,
  manufacturersByWilaya,
  metadata,
} from "@geoalgeria/industrie-pharmaceutique";

manufacturers().length; // 171
manufacturersByNature("pp").length; // 120 (médicaments)
manufacturersByWilaya(16).map((r) => r.name); // Alger
metadata().wilayas_covered; // 25
```

## Contenu

| Nature | Nombre | Signification |
| --- | --- | --- |
| `pp` | 120 | Produits Pharmaceutiques — fabricants de médicaments |
| `dm` | 48 | Dispositifs Médicaux — fabricants de dispositifs |
| `mixte` | 3 | Les deux (PP + DM) |

**Méthode de géocodage** (`geo_method`) : `commune_centroid` (126) · `wilaya_centroid` (45).
Les 171 enregistrements portent tous `geo_precision: "approximate"` (le registre n'a pas de
coordonnées réelles ; chaque point est un centroïde, jamais exact).

## Formats

- `data/industrie-pharmaceutique.json` — tableau complet (typé par `types/index.d.ts`)
- `data/csv/industrie-pharmaceutique.csv` — CSV à plat
- `data/geojson/industrie-pharmaceutique.geojson` — `FeatureCollection`
- `data/metadata.json` — comptes, sources, date de génération

## Sur la précision

> Les noms d'opérateurs et la nature PP/DM sont **officiels** (registre MIP). Le registre ne comporte **aucune coordonnée** : chaque enregistrement est placé au centroïde de sa commune résolue, ou — lorsque seule la wilaya est connue — au centroïde de la wilaya (voir `geo_method` ; `geo_precision` vaut `"approximate"` pour
chaque enregistrement). Ce sont des emplacements approximatifs de la *wilaya/commune*, non des points d'usine relevés.
>
> **Couverture :** 171 des ~186 établissements de fabrication agréés sont géocodés ici. Les autres sont des sous-traitants (sans site propre) ou de très petits fabricants de dispositifs sans adresse localisable — omis plutôt que placés arbitrairement. Les importateurs, grossistes, établissements d'exploitation et de promotion sont des registres MIP distincts, non inclus.

## Source & licence

Données du registre de fabrication du **Ministère de l'Industrie Pharmaceutique (MIP)** — un listing factuel du secteur public, redistribué à titre de référence. Rattachement wilaya/commune via le jeu de données de base geoalgeria. Code du paquet sous licence MIT (voir [LICENSE](LICENSE)).

## Questions ?

Ouvrez une issue : https://github.com/yasserstudio/geoalgeria/issues
