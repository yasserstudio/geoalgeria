[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/ferroviaire

**Le transport ferroviaire et urbain d'Algérie — chaque station et arrêt, en données prêtes à installer.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/ferroviaire)](https://www.npmjs.com/package/@geoalgeria/ferroviaire)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/ferroviaire)](https://www.npmjs.com/package/@geoalgeria/ferroviaire)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

744 nœuds ferroviaires et de transport urbain en Algérie — **gares, arrêts de tramway,
stations de métro, téléphériques et télécabines** — avec noms bilingues FR/AR, exploitant
(SNTF / SETRAM / SEMA), ligne, coordonnées GPS et rattachement wilaya/commune. Composite
Wikidata + OpenStreetMap, en JSON, CSV et GeoJSON. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> **Exploitants (sources) :** SNTF (rail), SETRAM (tramways), SEMA/EMA (Métro d'Alger).
> Les **gares routières** sont dans [`@geoalgeria/gares-routieres`](https://www.npmjs.com/package/@geoalgeria/gares-routieres).

```bash
npm install @geoalgeria/ferroviaire
```

```js
import ferroviaire from "@geoalgeria/ferroviaire";

const tout = ferroviaire.stations();               // 744
const trams = ferroviaire.stationsByType("tram");  // 190 arrêts de tram
const alger = ferroviaire.stationsByWilaya(16);    // rail + métro + tram à Alger
```

## Contenu

| Type | Nombre | Exploitant |
| --- | --- | --- |
| Rail (train) | **463** | SNTF |
| Tramway | **190** | SETRAM (7 réseaux) |
| Métro | **56** | SEMA — Métro d'Alger |
| Téléphérique | **24** | — |
| Télécabine | **11** | — |

Couvrant **50 wilayas**, tous géocodés. `wilaya_code` est lié au modèle à 69 wilayas de
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

> Note de couverture : univers de nœuds Wikidata + OSM. SETRAM exploite 172 stations de
> tram sur 7 réseaux ; le Métro d'Alger (SEMA) compte **19 stations en exploitation**
> (Wikidata liste davantage de nœuds métro : accès/extensions).

## Formats

```js
import stations from "@geoalgeria/ferroviaire/data/stations.json" with { type: "json" };
// via CDN : https://cdn.jsdelivr.net/npm/@geoalgeria/ferroviaire/data/stations.json
```

**CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et joints à chaque
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases).

## Source & licence

Composite de **Wikidata** (CC0) et **OpenStreetMap** (© contributeurs OpenStreetMap,
ODbL 1.0), avec exploitants **SNTF**, **SETRAM**, **SEMA/EMA**. Le code est sous
[MIT](LICENSE) ; les données issues d'OSM restent sous ODbL — conservez l'attribution.
Vérifiez auprès des exploitants pour toute information officielle.

[Voir tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
