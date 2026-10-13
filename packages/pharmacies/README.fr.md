[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/pharmacies

**Les pharmacies d'Algérie, sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/pharmacies)](https://www.npmjs.com/package/@geoalgeria/pharmacies)
[![License: MIT AND ODbL-1.0](https://img.shields.io/badge/License-MIT%20AND%20ODbL--1.0-green.svg)](LICENSE)

</div>

# Aperçu

3 795 pharmacies (officines) réparties sur **67 wilayas**, issues d'**OpenStreetMap** – chaque enregistrement géocodé, bilingue (FR/AR) lorsque nommé, avec téléphone, horaires et un indicateur `dispensing` là où OSM les renseigne, plus le rattachement wilaya/commune.

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

pharmacies().length; // 3795
pharmaciesByWilaya(16).length; // Alger
pharmacyById("16-00001")?.commune;
metadata().wilayas_covered; // 67
```

## Contenu

| Jeu de données | Nombre | Coordonnées | Notes |
| --- | --- | --- | --- |
| `pharmacies` | 3 795 | les 3 795 | OpenStreetMap, géocodé, rattaché wilaya/commune |

- **Nommées :** 2 455 · **avec téléphone :** 145 · **avec horaires :** 256 · **avec adresse :** 1 161 · **avec `dispensing` :** 530

## Formats

- `data/pharmacies.json` – tableau complet (typé par `types/index.d.ts`)
- `data/csv/pharmacies.csv` – CSV à plat
- `data/geojson/pharmacies.geojson` – `FeatureCollection`
- `data/metadata.json` – comptes, sources, date de génération
- `data/retired-ids.json` – identifiants qu'aucun enregistrement ne peut reprendre, chacun redirigé vers celui qui porte désormais la pharmacie, avec les éléments OpenStreetMap que la fusion recouvrait

## Comment les données sont construites

Les noms sont répartis strictement par écriture : `name_ar` ne contient que de l'arabe et `name_fr` que du latin, même quand OSM les étiquette mal. Une étiquette qui porte plusieurs langues à la fois (« Pharmacie bouchekouf صيدلية بوشقوف ») est coupée à chaque frontière d'écriture, donc chaque champ garde sa propre moitié et aucun ne gagne un mot absent de la source. Le tifinagh est la troisième écriture et n'appartient à aucun des deux champs : un nom en tamazight reste sur `name`, l'étiquette brute, plutôt que d'être supprimé ou classé comme arabe.

Là où OpenStreetMap tient une même pharmacie pour deux éléments (un nœud et le contour d'un bâtiment, ou deux orthographes), les éléments sont fusionnés en un seul enregistrement. Deux éléments sont une même pharmacie lorsqu'ils se trouvent à moins de 40 m et que leurs noms partagent une **clé de nom souple** : chaque moitié issue de la coupure par écriture, pliée via [`@geoalgeria/normalize`](../normalize) et comparée comme clé et non comme texte affiché, les mots qui ne disent que « pharmacie » étant écartés. C'est ainsi que « Pharmacie Bouchekouf صيدلية بوشقوف » et le simple « بوشقوف » à six mètres sont lus comme un seul enregistrement. L'élément conservé reprend tout champ qui lui manque de celui qu'il remplace, donc une fusion ne coûte ni téléphone, ni adresse, ni horaires, ni indicateur `dispensing` ; sa propre valeur prime partout où les deux en donnent une, et rien n'est concaténé.

## Précision & couverture

> **Couverture partielle.** 3 795 pharmacies sont cartographiées dans OpenStreetMap face à un estimé de **~11 000 officines** à l'échelle nationale (ordre de grandeur – aucun registre officiel ouvert ; le portail de l'Ordre National des Pharmaciens est hors service). La couverture est inégale selon la wilaya et plus dense au nord – c'est un extrait communautaire, **pas un registre officiel**.
>
> Les coordonnées sont des points OSM (relevés) ou des centroïdes de bâtiment (`geo_method`). La commune est un rapprochement au centroïde le plus proche (au mieux) ; la wilaya est quasi exacte. Noms, téléphones et horaires ne figurent que là où un contributeur OSM les a renseignés.

## Source & licence

Données © **contributeurs d'OpenStreetMap**, sous licence **ODbL 1.0**. Toute redistribution doit créditer OpenStreetMap et rester sous ODbL. Le rattachement wilaya/commune utilise le jeu de données de base geoalgeria. Code du paquet sous licence MIT (voir [LICENSE](LICENSE)).

## Questions ?

Ouvrez une issue : https://github.com/yasserstudio/geoalgeria/issues
