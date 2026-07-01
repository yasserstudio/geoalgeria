[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/buses

**Les réseaux de bus urbains d'Algérie — en données prêtes à installer.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

Les **lignes** de bus urbains d'Algérie — terminus, nombre d'arrêts, communes et stations
desservies par chaque ligne. Jeu de données **multi-exploitants** ; la v1 livre **50 lignes
ETUSA** (Alger). En JSON et CSV. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> **Exploitant (source) :** ETUSA — Établissement de transport urbain et suburbain d'Alger.
> D'autres villes/exploitants seront ajoutés. Pour les gares routières voir
> [`@geoalgeria/gares-routieres`](https://www.npmjs.com/package/@geoalgeria/gares-routieres) ;
> pour rail/tram/métro voir [`@geoalgeria/ferroviaire`](https://www.npmjs.com/package/@geoalgeria/ferroviaire).

```bash
npm install @geoalgeria/buses
```

```js
import buses from "@geoalgeria/buses";
const all = buses.lines();                    // 50
const etusa = buses.linesByOperator("ETUSA"); // 50
const l1 = buses.lineById("etusa-1");
```

## Contenu

| Jeu de données | Nombre | Notes |
| --- | --- | --- |
| Lignes de bus urbaines | **50** | ETUSA (Alger) — terminus, nombre d'arrêts, communes & stations desservies |

> **Portée (v1) :** attributs au niveau ligne uniquement. La **géométrie** par arrêt/ligne
> (OSM `route=bus`) est reportée à la **v1.1** (couverture OSM taguée ETUSA insuffisante).
> Couvre 50 des ~122 lignes voyageurs ETUSA. `wilaya_code` = `16` (Alger).

## Source & licence

Données de lignes issues de **fr.wikipedia** (articles des lignes ETUSA) — sous licence
**CC BY-SA 4.0** (attribution + partage à l'identique). Exploitant : **ETUSA**. Le code du
paquet est sous [MIT](LICENSE) ; les données de lignes héritent de la licence CC BY-SA de
Wikipédia. Vérifiez auprès d'ETUSA pour les lignes officielles et à jour.

[Voir tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
