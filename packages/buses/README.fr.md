[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/buses

**Les réseaux de bus urbains d'Algérie, en données prêtes à installer.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

Les **lignes** de bus urbains et suburbains d'Algérie. Cette version livre **61 lignes**,
**44 tracés**, **79 directions** et **1 061 stations** pour ETUSA (Alger), ETUS Tiaret,
ETUSTO (Tizi Ouzou) et ETUS Mostaganem. En JSON, CSV et GeoJSON. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> Pour les gares routières inter-wilayas voir
> [`@geoalgeria/gares-routieres`](https://www.npmjs.com/package/@geoalgeria/gares-routieres) ;
> pour rail/tram/métro voir [`@geoalgeria/ferroviaire`](https://www.npmjs.com/package/@geoalgeria/ferroviaire).

```bash
npm install @geoalgeria/buses
```

```js
import buses from "@geoalgeria/buses";
const all = buses.lines();                    // 61
const etusa = buses.linesByOperator("ETUSA"); // 50
const trace = buses.shapeForLine("etusa-1");
```

## Contenu

| Jeu de données | Nombre | Notes |
| --- | --- | --- |
| Lignes | **61** | ETUSA 50, ETUS Tiaret 7, ETUSTO 3, ETUS Mostaganem 1 |
| Tracés OSM | **44** | 33 ETUSA + les 11 lignes ajoutées |
| Stations | **1 061** | Nœuds OSM, noms nuls conservés |

L'ordre des 1 869 appartenances est l'ordre brut des membres OSM, marqué
`osm_member_order_unvalidated` : il ne constitue pas un ordre voyageurs validé et aucun
terminus n'est déduit automatiquement.

## Source & licence

Les attributs ETUSA issus de **fr.wikipedia** sont sous **CC BY-SA 4.0**. Les tracés,
directions et stations OpenStreetMap sont sous **ODbL 1.0**, attribution
**© OpenStreetMap contributors**. Le code est sous [MIT](LICENSE) ; voir [NOTICE](NOTICE).

[Voir tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
