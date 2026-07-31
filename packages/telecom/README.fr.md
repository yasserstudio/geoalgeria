[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/telecom

**La couverture des réseaux mobiles en Algérie, sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/telecom)](https://www.npmjs.com/package/@geoalgeria/telecom)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/telecom)](https://www.npmjs.com/package/@geoalgeria/telecom)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**2 798 points de couverture 5G** à travers l'Algérie, publiés à partir des
cartes de couverture des opérateurs – **Djezzy (1 001)**, **Mobilis (1 621)** et
**Ooredoo (176)** – chacun avec ses coordonnées et son rattachement
wilaya/commune. Distribué en JSON, CSV, GeoJSON et TypeScript. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/telecom
```

```js
import telecom from "@geoalgeria/telecom";

const sites = telecom.coverage();                       // les 2 798 points
const djezzy = telecom.coverageByOperator("djezzy");    // 1 001
const mobilis = telecom.coverageByOperator("mobilis");  // 1 621
const ooredoo = telecom.coverageByOperator("ooredoo");  // 176

// Couverture 5G dans une wilaya (jointure sur wilaya_code de GeoAlgeria)
const inAlger = sites.filter((s) => s.wilaya_code === "16");
```

Les chargeurs et les structures d'enregistrements sont entièrement **typés** :

```ts
import telecom, { type CoverageSite } from "@geoalgeria/telecom";
const sites: CoverageSite[] = telecom.coverage("5G");
```

## Ce que vous pouvez construire

- **Vérificateurs de couverture 5G** – « y a-t-il de la 5G près de chez moi / dans ma wilaya ? »
- **Comparaison entre opérateurs** – empreinte Djezzy / Mobilis / Ooredoo par wilaya/commune.
- **Cartes** – couches de points GeoJSON prêtes à l'emploi pour le déploiement 5G.

## Contenu

| Opérateur | Points | Granularité | Carte source |
| --- | --- | --- | --- |
| Djezzy | **1 001** | site cellulaire | djezzy5g.dz |
| Mobilis | **1 621** | site cellulaire | mobilis.dz/map/5g |
| Ooredoo | **176** | commune couverte | ooredoo.dz |

Couvrant **58 wilayas** (y compris les nouvelles wilayas comme Timimoun, In Salah,
Touggourt).

> **Ce qu'est un point :** chaque enregistrement est un point publié sur la
> carte de couverture 5G de l'opérateur. Djezzy et Mobilis publient des
> emplacements de **sites cellulaires** ; Ooredoo publie des points au **niveau
> communal** dans les communes couvertes (quelques communes en comportent
> plusieurs). Les cercles affichés sur ces cartes ont un rayon fixe d'affichage,
> **pas une mesure de couverture RF** – considérez-les comme des points de
> *présence* 5G, et non comme des polygones de couverture.

## Organisation (évolutive)

Les fichiers sont nommés par **technologie et opérateur**, de sorte que l'ajout
d'une nouvelle génération est purement additif – rien n'est renommé :

```
data/
  5g-djezzy.json  5g-mobilis.json  5g-ooredoo.json
  csv/5g-djezzy.csv  ...             # miroir CSV par fichier
  geojson/5g-djezzy.geojson  ...     # entités Point par fichier
  metadata.json                      # métadonnées v2 canoniques (schema_version, sources[], entities[], by_operator)
```

Le paquet npm contient le **JSON, le CSV et le GeoJSON** ; les mêmes fichiers
sont inclus dans chaque [Release GitHub](https://github.com/yasserstudio/geoalgeria/releases).
`coverage()` concatène les fichiers par opérateur (les ids sont préfixés par
l'opérateur, l'union est donc sans collision).

## Structure d'un enregistrement

Les enregistrements suivent le contrat canonique GeoAlgeria v2 (`geo_precision`,
`geo_method`, `source` comme clé vers `metadata.sources[]`), plus les champs
propres à la couverture :

```json
{
  "id": "djezzy-ba5a8250cb",
  "name": "Ain benian ville",
  "wilaya_code": "16",
  "commune_code": null,
  "commune": null,
  "commune_ar": null,
  "lat": 36.7898,
  "lng": 2.91341,
  "geo_precision": "exact",
  "geo_method": "operator_map",
  "source": "djezzy",
  "operator": "djezzy",
  "technology": "5G",
  "address": "AIN BENIAN"
}
```

`id` est une clé déterministe `{operator}-{coordinate-hash}`, stable d'une
extraction à l'autre. `wilaya_code` permet la jointure avec le `wilaya_code` de
GeoAlgeria. Les champs qu'un opérateur donné ne fournit pas sont `null` (Djezzy
n'a pas de commune ; Mobilis a la commune FR/AR mais pas d'adresse ; Ooredoo n'a
que le nom de la commune). Pour Ooredoo, `name` est la commune couverte et les
points sont `approximate` (`operator_commune_point`) : un point par commune
couverte, pas un site cellulaire.

## Besoin des divisions administratives ?

Pour les wilayas, dairas et communes, utilisez le paquet principal
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** – c'est lui qui
vous permet de convertir un `wilaya_code` en polygone ou en nom.

## Source et régénération

Les données proviennent de la carte de couverture 5G publique de chaque
opérateur. Exécutez `npm run fetch` pour régénérer toutes les sorties : le
script décode le blob encodé de marqueurs de Djezzy, lit le point d'accès JSON
de Mobilis et lit le point d'accès des communes couvertes d'Ooredoo via une
session navigateur réelle (le site d'Ooredoo s'authentifie lui-même ; cette
étape nécessite le CLI
[`agent-browser`](https://www.npmjs.com/package/agent-browser) dans le `PATH`).
Tout est normalisé en un schéma unique avec `wilaya_code` résolu vers les codes
GeoAlgeria. Les opérateurs utilisent le schéma à 58 wilayas. Les écritures sont
tout-ou-rien : un opérateur en échec n'écrase jamais des données valides
commitées avec un jeu partiel.

## Licence et attribution

Le code est sous [MIT](LICENSE). Les données sous-jacentes sont la propriété des
opérateurs respectifs (**Djezzy**, **Mobilis**, **Ooredoo**), redistribuées à
titre de référence et pour alimenter
[GeoAlgeria](https://geoalgeria.com). Le déploiement 5G est en cours – chaque
reconstruction reflète ce que les cartes des opérateurs montrent à ce moment ;
vérifiez auprès des opérateurs pour des informations officielles et en temps
réel.

[Documentation API et référence des champs →](https://geoalgeria.com/data/docs/telecom) · [Parcourir tous les paquets →](https://geoalgeria.com/data)

---

Fait par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
