[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/buses

**Les réseaux de bus urbains d'Algérie, en données prêtes à installer.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

Les **lignes** de bus urbains et suburbains d'Algérie. Cette version livre **153 lignes**,
**76 tracés**, **128 directions** et **1 603 stations** pour 14 exploitants. En JSON,
CSV et GeoJSON. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> Pour les gares routières inter-wilayas voir
> [`@geoalgeria/gares-routieres`](https://www.npmjs.com/package/@geoalgeria/gares-routieres) ;
> pour rail/tram/métro voir [`@geoalgeria/ferroviaire`](https://www.npmjs.com/package/@geoalgeria/ferroviaire).

```bash
npm install @geoalgeria/buses
```

```js
import buses from "@geoalgeria/buses";
const all = buses.lines();                    // 153
const etusa = buses.linesByOperator("ETUSA"); // 76
const trace = buses.shapeForLine("etusa-1");
```

## Contenu

| Jeu de données | Nombre | Notes |
| --- | --- | --- |
| Lignes | **153** | 14 exploitants ; lignes officielles sans tracé conservées dans l'annuaire |
| Tracés OSM | **76** | 61 ETUSA + 15 lignes des autres exploitants |
| Directions | **128** | Relations OSM sources |
| Stations | **1 603** | Nœuds OSM, noms nuls conservés |

L'ordre des 2 685 appartenances est l'ordre brut des membres OSM, marqué
`osm_member_order_unvalidated` : il ne constitue pas un ordre voyageurs validé et aucun
terminus n'est déduit automatiquement.

## Source & licence

Les attributs ETUSA issus de **fr.wikipedia** sont sous **CC BY-SA 4.0**. Les tracés,
directions et stations OpenStreetMap sont sous **ODbL 1.0**, attribution
**© OpenStreetMap contributors**. Les faits de 12 exploitants cités dans
[NOTICE](NOTICE) sont extraits de sources officielles sans licence ouverte déclarée ; les cartes Google de
Béjaïa, les schémas de M'Sila et les images de tracé de Sidi Bel Abbès servent uniquement
à la validation et leur géométrie n'est pas redistribuée. Les départs complets de Sidi
Bel Abbès sont transcrits du HTML officiel fourni par le propriétaire du projet ; les
jours non indiqués restent explicitement inconnus.
Le code est sous [MIT](LICENSE) ; voir [NOTICE](NOTICE).

[Voir tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
