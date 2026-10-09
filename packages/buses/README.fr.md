[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/buses

**Les réseaux de bus urbains d'Algérie, en données prêtes à installer.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

Les **lignes** de bus urbains et suburbains d'Algérie. Cette version livre **184 lignes**,
**76 tracés**, **128 directions** et **1 603 stations** pour 16 exploitants. En JSON,
CSV et GeoJSON. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> Pour les gares routières inter-wilayas voir
> [`@geoalgeria/gares-routieres`](https://www.npmjs.com/package/@geoalgeria/gares-routieres) ;
> pour rail/tram/métro voir [`@geoalgeria/ferroviaire`](https://www.npmjs.com/package/@geoalgeria/ferroviaire).

```bash
npm install @geoalgeria/buses
```

```js
import buses from "@geoalgeria/buses";
const all = buses.lines();                    // 184
const etusa = buses.linesByOperator("ETUSA"); // 76
const trace = buses.shapeForLine("etusa-1");
```

## Contenu

| Jeu de données | Nombre | Notes |
| --- | --- | --- |
| Lignes | **184** | 16 exploitants ; lignes officielles sans tracé conservées dans l'annuaire |
| Tracés OSM | **76** | 61 ETUSA + 15 lignes des autres exploitants |
| Directions | **128** | Relations OSM sources |
| Stations | **1 603** | Nœuds OSM, noms nuls conservés |

L'ordre des 2 685 appartenances est l'ordre brut des membres OSM, marqué
`osm_member_order_unvalidated` : il ne constitue pas un ordre voyageurs validé et aucun
terminus n'est déduit automatiquement.

## Source & licence

Les attributs ETUSA issus de **fr.wikipedia** sont sous **CC BY-SA 4.0**. Les tracés,
directions et stations OpenStreetMap sont sous **ODbL 1.0**, attribution
**© OpenStreetMap contributors**. Les faits de 14 exploitants cités dans
[NOTICE](NOTICE) sont extraits de sources officielles sans licence ouverte déclarée ; les cartes Google de
Béjaïa, les schémas de M'Sila, les images de tracé de Sidi Bel Abbès et les graphiques
ETUS-C Constantine servent uniquement
à la validation et leur géométrie n'est pas redistribuée. Les 25 lignes de Constantine
sont transcrites de deux graphiques de l'exploitant fournis par le propriétaire du
projet et restent en annuaire seul, sans tracé, sans arrêts intermédiaires et sans horaires.
Les identités, terminus arabes et séquences d'arrêts ordonnées de Skikda viennent du site
de l'exploitant, lu dans un navigateur par le propriétaire du projet car le certificat TLS
du site avait expiré : les six lignes partent toutes de la place ساحة الشهداء au centre-ville,
`stops` porte la longueur de la séquence publiée, et la plage de service 06:00 à 19:00,
qui vaut pour le réseau entier, n'est pas publiée comme horaires par ligne. Les départs complets de Sidi
Bel Abbès sont transcrits du HTML officiel fourni par le propriétaire du projet ; les
jours non indiqués restent explicitement inconnus.
Les données de lignes sont donc **© les exploitants respectifs, redistribuées à titre de
référence** ; aucune licence ouverte n'est revendiquée sur elles. Le code est sous
[MIT](LICENSE). Aucune expression SPDX ne couvre ce mélange : le manifeste déclare
`SEE LICENSE IN LICENSE` et les conditions sont énoncées en clair dans [LICENSE](LICENSE) ;
voir [NOTICE](NOTICE).

[Voir tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [support@yasser.studio](mailto:support@yasser.studio)

GeoAlgeria est gratuit, et il le reste. Le même studio réalise aussi des cartes, des sites web, des applications mobiles et des données ouvertes pour ses clients.
