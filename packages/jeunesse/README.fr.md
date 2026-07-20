[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/jeunesse

**Toutes les institutions de jeunesse en Algérie — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/jeunesse)](https://www.npmjs.com/package/@geoalgeria/jeunesse)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/jeunesse)](https://www.npmjs.com/package/@geoalgeria/jeunesse)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

2 334 institutions de jeunesse à travers l'Algérie — **maisons de jeunes**, complexes sportifs de
proximité, salles polyvalentes, auberges de jeunes, centres de sciences et centres culturels, camps de jeunes
et plus encore — chacune avec son nom, son **type**, son adresse, sa capacité, son statut opérationnel, l'accessibilité PMR,
la surface bâtie/terrain, commune / daïra / wilaya, et coordonnées GPS. Source : **Ministère de la Jeunesse et des Sports GIS (sig.mjs.gov.dz)** — le même
système officiel derrière le package sœur [`@geoalgeria/sports`](https://www.npmjs.com/package/@geoalgeria/sports).
Distribué en JSON, CSV et GeoJSON. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/jeunesse
```

```js
import jeunesse from "@geoalgeria/jeunesse";

const all = jeunesse.institutions();                 // 2 334
const inAlgiers = jeunesse.institutionsByWilaya(16);  // institutions de la wilaya 16
const houses = jeunesse.institutionsByType("MJ");     // toutes les maisons de jeunes

// Chaque enregistrement a lat/lng — tri par distance, carte ou institution la plus proche en quelques lignes.
```

## Ce que vous pouvez construire

- **Recherche du centre jeunesse le plus proche** — coordonnées sur chaque enregistrement, prêtes pour le tri par distance.
- **Applications civiques et jeunesse** — cartographier les maisons de jeunes, complexes sportifs et centres culturels par wilaya, filtrés par capacité ou statut opérationnel.
- **Cartes** — couche de points GeoJSON prête à l'emploi pour tout le réseau des institutions de jeunesse.
- **Recherche et planification** — densité des institutions par type et wilaya, analyse de capacité, audits d'accessibilité PMR et statut opérationnel.

## Contenu

| Type | Code | Nombre |
| --- | --- | --- |
| Maison de jeunes | `MJ` | 960 |
| Complexe sportif de proximité | `CSP` | 694 |
| Salle polyvalente | `SPA` | 295 |
| Auberge de jeunes | `AJ` | 241 |
| Camp de jeunes | `CJ` | 54 |
| Centre de loisirs scientifiques | `CLS` | 46 |
| Foyer de jeunes | `FJ` | 22 |
| Centre culturel | `CC` | 19 |
| Bloc d'accueil | `BA` | 3 |
| **Total** | | **2 334** |

Couvrant **58 wilayas**, chaque institution est géocodée. `wilaya_code` est lié au modèle wilaya de
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

## Formats

Le package npm fournit le **JSON** (importable directement) :

```js
import institutions from "@geoalgeria/jeunesse/data/institutions.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/jeunesse/data/institutions.json
```

Les chargeurs et les formes d'enregistrement sont entièrement **typés** — les définitions TypeScript sont incluses dans le package :

```ts
import jeunesse, { type Institution } from "@geoalgeria/jeunesse";
const all: Institution[] = jeunesse.institutions();
```

**CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et inclus dans chaque
[Release GitHub](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  institutions.json            # 2 334 institutions (tableau)
  metadata.json                # sources, comptages, by_type, license, updated
  csv/institutions.csv         # dépôt + bundle Release (pas dans le tarball npm)
  geojson/institutions.geojson # Entités Point (toutes géocodées)
```

## Structure d'un enregistrement

```json
{
  "id": "00001",
  "name": "Auberge de jeunes El amir Abdelkader, Sbaa",
  "name_ar": null,
  "wilaya_code": "01",
  "commune_code": null,
  "commune": "SEBAA",
  "lat": 28.2186,
  "lng": -0.173,
  "geo_precision": "exact",
  "geo_method": "sig_mjs",
  "source": "mjs",
  "type": "AJ",
  "type_label_fr": "Auberge de jeunes",
  "type_label_ar": "نزل الشباب",
  "daira": "TSABIT",
  "address": "sabaa, tsabit, adrar",
  "capacity": 50,
  "year": 2012,
  "operational": true,
  "pmr": true,
  "surface_built_m2": 3600,
  "surface_land_m2": 3600
}
```

`id` est une chaîne opaque à séquence complétée par des zéros, unique dans
`institutions.json` — ne pas la parser. Le SIG publie les noms en **français** ; `name_ar`
est le nom arabe **complété** à partir de la carte publique historique du ministère par
appariement géographique au plus proche (≤ 200 m, et vérifié par type pour ne jamais greffer
le nom d'un bâtiment voisin) — présent sur ~59 % des enregistrements, `null` où aucune
correspondance de confiance n'existe (comme ci-dessus). `name` est `null` pour les ~5 % que
la source laisse vides ; `commune` et `daira` sont en français (majuscules, comme publiés) ;
`commune_code` est actuellement toujours `null` (le SIG du MJS ne fournit qu'un nom de
commune). Pour l'ensemble complet des divisions wilaya/commune en français, joignez
`wilaya_code` avec le jeu de données [`geoalgeria`](https://www.npmjs.com/package/geoalgeria).
`wilaya_code` est complété avec un zéro sur deux chiffres et est `≤ 58` (la source est
antérieure à la réforme des 69 wilayas) ; il reste compatible avec le modèle wilaya de
GeoAlgeria. `geo_precision` vaut `"exact"` pour 2 244 enregistrements et `"approximate"` pour
90 (le point du SIG est trop grossier, ou partagé avec un autre établissement, pour compter
comme un point propre à l'établissement) ; tous les enregistrements sont géocodés, donc
`null` n'apparaît pas ici.

## Infrastructures sportives aussi ?

Pour les stades, piscines, pistes, terrains de jeu et autres installations **sportives** d'Algérie (du
même SIG du MJS), consultez le package sœur
**[`@geoalgeria/sports`](https://www.npmjs.com/package/@geoalgeria/sports)**. Utilisez
`@geoalgeria/jeunesse` pour les institutions de jeunesse ; utilisez `@geoalgeria/sports` pour les
infrastructures sportives.

## Besoin des divisions administratives ?

Si vous avez aussi besoin des wilayas, daïras et communes pour les jointures, utilisez le package principal
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — il fournit le jeu de données complet
des divisions de wilayas auquel `wilaya_code` fait référence ici.

## Source

Les données proviennent du **Ministère de la Jeunesse et des Sports**, via son SIG public
(<https://sig.mjs.gov.dz/dashboard/viewer>). Exécutez `npm run fetch` pour régénérer
toutes les sorties depuis le système en ligne ; le build résout chaque nom de wilaya français au code wilaya officiel,
répare les enregistrements avec des coordonnées transposées, complète les noms arabes à partir de la carte historique, et
supprime les quelques enregistrements avec des coordonnées de remplissage/hors limites. Il échoue bruyamment
si le nombre d'institutions s'effondre ou si un type inconnu apparaît.

## Licence et attribution

Le code est sous licence [MIT](LICENSE). Les données sous-jacentes sont © **Ministère de la Jeunesse et des Sports**,
redistribuées à titre de référence et pour alimenter [GeoAlgeria](https://geoalgeria.com). Vérifiez auprès du
ministère pour des informations officielles et en temps réel.

[Documentation API et référence des champs →](https://geoalgeria.com/data/docs/jeunesse) · [Parcourir tous les paquets →](https://geoalgeria.com/data)

---

Fait par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
