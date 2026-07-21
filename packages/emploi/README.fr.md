[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/emploi

**Toutes les agences publiques de l'emploi en Algérie — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/emploi)](https://www.npmjs.com/package/@geoalgeria/emploi)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/emploi)](https://www.npmjs.com/package/@geoalgeria/emploi)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

Les **58 AWEM** (agences de wilaya de l'emploi) et **273 ALEM** (agences locales
de l'emploi) de l'agence nationale de l'emploi, **ANEM** — chacune avec adresse,
téléphone, fax, email, responsable et coordonnées GPS.
Livré en JSON, CSV et GeoJSON. Fait partie de [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/emploi
```

```js
import emploi from "@geoalgeria/emploi";

const awem = emploi.awem();         // 58 agences de wilaya
const alem = emploi.alem();         // 273 agences locales
const all = emploi.agencies();      // les 331 (AWEM en premier)

// Agences dans une wilaya (jointure sur wilaya_code de GeoAlgeria)
const inAlger = all.filter((a) => a.wilaya_code === "16");

// Trouver une agence locale par son nom
const reggane = alem.filter((a) => a.name.includes("REGGANE"));
```

## Ce que vous pouvez construire

- **Localisateurs d'agences** — coordonnées sur (presque) chaque enregistrement, prêtes pour le tri par distance ou l'affichage sur carte.
- **Annuaires de contact** — téléphone, fax, email et responsable par agence.
- **Cartes** — couches de points GeoJSON prêtes à l'emploi pour tout le réseau de l'emploi.

## Contenu

| Jeu de données | Nombre | Notes |
| --- | --- | --- |
| AWEM (agences de wilaya) | **58** | une par wilaya |
| ALEM (agences locales) | **273** | bureaux infra-wilaya, nommés par localité |

## Formats

Le package npm contient le **JSON** (importable directement) :

```js
import alem from "@geoalgeria/emploi/data/alem.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/emploi/data/alem.json
```

Les chargeurs et les formes d'enregistrement sont entièrement **typés** — les définitions TypeScript sont incluses dans le package :

```ts
import emploi, { type Awem, type Alem } from "@geoalgeria/emploi";
const local: Alem[] = emploi.alem();
```

**CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et inclus dans chaque
[Release GitHub](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  awem.json               # 58 agences de wilaya (tableau)
  alem.json               # 273 agences locales (tableau)
  metadata.json           # sources, comptages, updated
  csv/awem.csv            # dépôt + bundle Release (pas dans le tarball npm)
  csv/alem.csv
  geojson/awem.geojson    # Entités ponctuelles (enregistrements avec coordonnées)
  geojson/alem.geojson
```

> Le GeoJSON inclut uniquement les enregistrements ayant des coordonnées — 2 ALEM
> ne déclarent pas de `lat`/`lng` et sont omis (mais restent dans JSON/CSV).

## Structure des enregistrements

**ALEM (agence locale)**

```json
{
  "id": "01-02",
  "name": "ALEM REGGANE",
  "wilaya_code": "01",
  "commune_code": null,
  "commune": null,
  "lat": 26.71627,
  "lng": 0.17441,
  "geo_precision": "exact",
  "geo_method": "anem",
  "source": "anem",
  "type": "ALEM",
  "code": "0102",
  "address": "Hai Saada - Reggane",
  "phone": "(049) 320 - 373",
  "fax": "(049) 320 - 372",
  "email": "alem.reggane@anem.dz",
  "manager": "BELHADJ ABBELKADER"
}
```

`id` est une clé stable `{wilaya_code}-{seq}` générée par GeoAlgeria, unique
dans l'ensemble fusionné `agencies()` (les id AWEM ne contiennent jamais de
tiret, ceux des ALEM en contiennent toujours) — le `code` propre à l'ANEM est
conservé mais manque sur certains enregistrements et n'est pas unique, préférez
donc `id`. `commune_code`/`commune` valent actuellement `null` sur tous les
enregistrements — la source de l'ANEM ne résout qu'au niveau wilaya, pas
commune. `wilaya_code` permet la jointure avec le `wilaya_code` de GeoAlgeria.

**AWEM (agence de wilaya)** — même structure, `id` = le `wilaya_code` à 2 chiffres,
avec `name` / `address` / `phone` / `manager` et `lat`/`lng`.

## Besoin des divisions administratives aussi ?

Pour les wilayas, dairas et communes (et les données postales), utilisez le package
principal **[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)**. Utilisez
`@geoalgeria/emploi` quand vous avez *uniquement* besoin du réseau des agences de l'emploi.

## Source

Les données proviennent de l'**ANEM** (Agence Nationale de l'Emploi) via son portail
cartographique (<https://www.anem.dz/#/portail-carto>). Il n'y a pas d'API publique —
les agences sont intégrées dans le bundle JavaScript du portail. Lancez `npm run fetch`
pour régénérer toutes les sorties : le script redécouvre le bundle actuel, extrait les
deux jeux de données, corrige l'inversion `X`=lat / `Y`=lng de la source et normalise
les codes de wilaya. L'ANEM classe les agences selon le **schéma à 58 wilayas**, les
nouvelles wilayas 59-69 apparaissent donc sous leur wilaya mère.

## Licence et attribution

Le code est sous licence [MIT](LICENSE). Les données sous-jacentes sont © **ANEM**,
redistribuées à titre de référence et pour alimenter [GeoAlgeria](https://geoalgeria.com).
Vérifiez auprès de l'ANEM pour des informations officielles et à jour.

Le champ `manager` contient le nom du responsable de l'agence tel que publié, textuellement,
sur le portail public de l'ANEM — ce n'est pas une donnée privée. Chaque reconstruction
reflète ce que l'ANEM affiche actuellement ; s'ils le retirent, il disparaît ici aussi.

[Documentation API et référence des champs →](https://geoalgeria.com/data/docs/emploi) · [Parcourir tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
