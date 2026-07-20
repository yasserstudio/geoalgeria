[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/tourisme

**L'infrastructure touristique de l'Algérie — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/tourisme)](https://www.npmjs.com/package/@geoalgeria/tourisme)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/tourisme)](https://www.npmjs.com/package/@geoalgeria/tourisme)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

4 348 sites touristiques géocodés à travers les 69 wilayas d'Algérie — **hôtels**, attractions,
sites historiques, sources thermales et espaces protégés — chacun avec coordonnées, rattachement
à la wilaya et attribution de la source. Sources : **ASAL Geoportail** (sources thermales),
**OpenStreetMap** (hôtels, attractions, sites historiques, parcs) et **Wikidata** (sites
patrimoniaux, musées, parcs). Distribué en JSON, CSV et GeoJSON.
Fait partie de [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/tourisme
```

```js
import tourisme from "@geoalgeria/tourisme";

const everything = tourisme.all();               // 4 348
const hotels = tourisme.lodging();               // 1 602
const springs = tourisme.thermalSprings();        // 282
const inTipaza = tourisme.byWilaya(42);           // tous les sites touristiques de la wilaya 42
const ruins = tourisme.byLayer("historic");       // 1 184 sites historiques

// Chaque enregistrement a lat/lng — tri par distance, carte ou site le plus proche en quelques lignes.
```

## Ce que vous pouvez construire

- **Applications touristiques** — annuaire consultable d'hôtels, d'attractions et de sites historiques par wilaya.
- **Recherche du site le plus proche** — coordonnées sur chaque enregistrement, prêtes pour le tri par distance.
- **Cartes** — couches de points GeoJSON prêtes à l'emploi pour tout le réseau touristique.
- **Guides thermaux** — température, débit, altitude et composition minérale pour 282 sources.
- **Patrimoine et culture** — sites historiques, monuments et sites archéologiques liés à Wikipedia/Wikidata.

## Contenu

| Couche | Fonction | Nombre | Notes |
| --- | --- | --- | --- |
| Hébergement | `lodging()` | **1 602** | hôtels, auberges, maisons d'hôtes, chalets, refuges |
| Attractions | `attractions()` | **1 248** | musées, points de vue, grottes, cascades, zoos |
| Historique | `historic()` | **1 184** | sites archéologiques, ruines, monuments, forts, châteaux |
| Sources thermales | `thermalSprings()` | **282** | température, débit, altitude, minéralité |
| Parcs | `parks()` | **32** | parcs nationaux, réserves naturelles, espaces protégés |
| **Total** | `all()` | **4 348** | |

Couvrant **69 wilayas**. `wilaya_code` est lié au modèle 69 wilayas de
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

## Formats

Le package npm fournit le **JSON** (importable directement) :

```js
import lodging from "@geoalgeria/tourisme/data/lodging.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/tourisme/data/lodging.json
```

Les chargeurs et les formes d'enregistrement sont entièrement **typés** — les définitions TypeScript sont incluses dans le package :

```ts
import tourisme, { type Lodging, type ThermalSpring } from "@geoalgeria/tourisme";
const hotels: Lodging[] = tourisme.lodging();
const springs: ThermalSpring[] = tourisme.thermalSprings();
```

Les formats **CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et inclus dans chaque
[Release GitHub](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  lodging.json            # 1 602 hébergements
  attractions.json        # 1 248 attractions
  historic.json           # 1 184 sites historiques
  thermal-springs.json    # 282 sources thermales
  parks.json              # 32 parcs
  metadata.json           # sources, comptages, couverture
  csv/                    # Exports CSV (dépôt + bundle Release, pas dans le tarball npm)
  geojson/                # Entités GeoJSON
```

## Structure d'un enregistrement

**Hébergement** — hôtels, auberges, maisons d'hôtes :

```json
{
  "name": "عريان الراس",
  "name_ar": "عريان الراس تسابيت",
  "type": "alpine_hut",
  "wilaya_code": "01",
  "lat": 28.4162728,
  "lng": -0.2620846,
  "source": "OpenStreetMap",
  "osm_id": 8107956617,
  "id": "lodging-1"
}
```

`type` est l'un des suivants : `hotel`, `hostel`, `guest_house`, `apartment`, `chalet`, `motel`,
`alpine_hut`. Champs optionnels : `stars`, `rooms`, `phone`, `website`, `address`, `name_fr`.

**Source thermale** — source ASAL Geoportail, avec propriétés physiques :

```json
{
  "id": "thermal-spring-1",
  "name": "FORAGE DAR OUAD",
  "type": "forage",
  "temperature_c": 32,
  "debit_l_s": 15,
  "altitude_m": 423,
  "minerality": "BICARBONATEE CALCIQUE",
  "wilaya_code": "43",
  "wilaya_name": "CONSTANTINE",
  "commune_name": "BENI H'MIDENE",
  "lat": 36.4625,
  "lng": 6.4827778,
  "source": "ASAL geoportail"
}
```

`type` est l'un des suivants : `hammam`, `ain`, `source`, `forage`. Les propriétés physiques
(`temperature_c`, `debit_l_s`, `altitude_m`, `minerality`) proviennent directement du jeu de
données ASAL.

`wilaya_code` est complété à deux chiffres avec un zéro dans toutes les couches et rejoint les
wilayas de GeoAlgeria.

## Besoin aussi des divisions administratives ?

Si vous avez également besoin des wilayas, daïras et communes pour des jointures, utilisez
le package principal **[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — il fournit
le jeu de données complet des 69 wilayas auquel `wilaya_code` fait référence ici. Utilisez
`@geoalgeria/tourisme` quand vous avez *uniquement* besoin des données touristiques.

## Source

Les données proviennent de trois sources :

- **ASAL Geoportail** — sources thermales (température, débit, altitude, composition minérale).
  Données gouvernementales publiques.
- **OpenStreetMap** — hôtels, attractions, sites historiques et parcs. Sous licence
  [ODbL](https://opendatacommons.org/licenses/odbl/).
- **Wikidata** — sites patrimoniaux, musées et métadonnées des parcs. Sous licence
  [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## Licence et attribution

Le code est sous licence [MIT](LICENSE). Les données sous-jacentes :

- Sources thermales : données gouvernementales publiques (ASAL).
- Couches issues d'OSM : © contributeurs OpenStreetMap, [ODbL](https://opendatacommons.org/licenses/odbl/).
- Enregistrements issus de Wikidata : [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

Redistribué à titre de référence et pour alimenter [GeoAlgeria](https://geoalgeria.com). Vérifiez
auprès des sources originales pour des informations officielles et en temps réel.

[Documentation API et référence des champs →](https://geoalgeria.com/data/docs/tourisme) · [Parcourir tous les paquets →](https://geoalgeria.com/data)

---

Fait par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
