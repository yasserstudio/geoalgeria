[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/pharma

**Le secteur pharmaceutique d'Algérie — en une seule installation.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/pharma)](https://www.npmjs.com/package/@geoalgeria/pharma)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

Un paquet parapluie qui ré-exporte les jeux de données pharmaceutiques de GeoAlgeria, pour tout installer d'un coup. Fait partie de [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/pharma
```

```js
import pharma from "@geoalgeria/pharma";

pharma.industrie.manufacturers();   // fabricants de médicaments & dispositifs (registre MIP)
pharma.pharmacies.pharmacies();     // pharmacies / officines (OpenStreetMap)

// ou importer un membre directement :
import { pharmacies } from "@geoalgeria/pharma";
```

## Membres

| Espace de noms | Paquet | Contenu |
| --- | --- | --- |
| `industrie` | [`@geoalgeria/industrie-pharmaceutique`](https://www.npmjs.com/package/@geoalgeria/industrie-pharmaceutique) | Fabricants pharmaceutiques agréés — médicaments (PP) & dispositifs (DM) (Ministère de l'Industrie Pharmaceutique) |
| `pharmacies` | [`@geoalgeria/pharmacies`](https://www.npmjs.com/package/@geoalgeria/pharmacies) | Pharmacies / officines (OpenStreetMap) |

> D'autres composantes du secteur pourront rejoindre le paquet (par ex. une couche laboratoires d'analyses dès que la couverture ouverte sera suffisante). Installer `@geoalgeria/pharma` vous garde sur l'ensemble complet.

## Source & licence

Chaque membre porte sa propre source et attribution (voir son README) — registre MIP pour `industrie`, OpenStreetMap (ODbL) pour `pharmacies`. Code du paquet sous licence MIT (voir [LICENSE](LICENSE)).

## Questions ?

Ouvrez une issue : https://github.com/yasserstudio/geoalgeria/issues
