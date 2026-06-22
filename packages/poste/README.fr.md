[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/poste

**Chaque bureau et distributeur d'Algérie Poste — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/poste)](https://www.npmjs.com/package/@geoalgeria/poste)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/poste)](https://www.npmjs.com/package/@geoalgeria/poste)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

3 908 bureaux de poste et 2 026 distributeurs automatiques (DAB) à travers l'Algérie — avec de **vrais codes postaux**, des noms bilingues (français / arabe), des coordonnées GPS et un rattachement commune/wilaya. Données issues d'Algérie Poste, distribuées en JSON, CSV et GeoJSON. Fait partie de [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/poste
```

```js
import poste from "@geoalgeria/poste";

const offices = poste.postOffices();   // 3 908
const atms = poste.atms();             // 2 026

// Bureaux de poste dans une commune (jointure sur code_commune de GeoAlgeria)
const inAdrar = offices.filter((o) => o.commune_code === "0101");

// Le DAB le plus proche ? Chaque enregistrement a lat/lng pour vos calculs.
```

## Ce que vous pouvez construire

- **Validation et recherche de codes postaux** — chaque bureau porte son vrai `postal_code`.
- **Localisateurs de bureaux / DAB** — coordonnées sur (presque) chaque enregistrement, prêtes pour le tri par distance ou l'affichage sur carte.
- **Fintech et logistique** — faites correspondre les adresses au bureau de poste ou au GAB le plus proche.
- **Cartes** — couches de points GeoJSON prêtes à l'emploi pour l'ensemble du réseau postal.

## Contenu

| Jeu de données | Nombre | Notes |
| --- | --- | --- |
| Bureaux de poste | **3 908** | chacun avec son propre code postal (`postal_code`) |
| DAB | **2 026** | Réseau GAB d'Algérie Poste |

## Formats

Le paquet npm contient le **JSON** (importable directement) :

```js
import offices from "@geoalgeria/poste/data/postoffices.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/poste/data/postoffices.json
```

Les chargeurs et les structures d'enregistrements sont entièrement **typés** — les définitions TypeScript sont incluses dans le paquet :

```ts
import poste, { type PostOffice, type Atm } from "@geoalgeria/poste";
const offices: PostOffice[] = poste.postOffices();
```

Les fichiers **CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et inclus dans chaque
[Release GitHub](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  postoffices.json            # 3 908 bureaux (tableau)
  atms.json                   # 2 026 DAB (tableau)
  metadata.json               # source, comptages, generated_at
  csv/postoffices.csv         # dépôt + bundle Release (pas dans le tarball npm)
  csv/atms.csv
  geojson/postoffices.geojson # Entités Point (enregistrements avec coordonnées)
  geojson/atms.geojson
```

> Le GeoJSON n'inclut que les enregistrements ayant des coordonnées — quelques
> bureaux et DAB ne rapportent pas de `lat`/`lng` et en sont absents (mais
> restent dans JSON/CSV). Les enregistrements de DAB n'ont pas de `commune_code`
> (l'API source ne le fournit pas).

## Structure des enregistrements

**Bureau de poste**

```json
{
  "id": 1,
  "name": "ADRAR RP",
  "name_ar": "أدرار م ر",
  "class": "CE",
  "postal_code": "01000",
  "address": "ADRAR CENTRE RUE DES MARYTIM",
  "commune_code": "0101",
  "commune_fr": "ADRAR",
  "commune_ar": "أدرار",
  "wilaya_code": "01",
  "wilaya_fr": "ADRAR",
  "wilaya_ar": "أدرار",
  "lat": 27.8708439,
  "lng": -0.2871417
}
```

`class` est la catégorie du bureau (`CE`, `R1`–`R4`, `HC`, `GA`). `commune_code`
est le code commune à 4 chiffres d'Algérie Poste, qui se joint au `code_commune`
de GeoAlgeria.

**DAB** — même structure, identifié par `id`/`name`/`postal_code`/`wilaya_*` avec `lat`/`lng` ; pas de `commune_code`.

## Besoin des divisions administratives ?

Si vous avez aussi besoin des wilayas, dairas et communes, utilisez le paquet
principal **[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — il
intègre ces données postales et expose `postOffices` / `atms` aux côtés du jeu
de données complet des divisions. Utilisez `@geoalgeria/poste` quand vous
n'avez besoin *que* des données postales/bancaires.

## Source

Les données proviennent d'**Algérie Poste** via l'API publique BaridiMap
(<https://baridimap.poste.dz>). Exécutez `npm run fetch` pour régénérer toutes
les sorties à partir de l'API en direct ; la même exécution reflète les données
dans le paquet `geoalgeria` pour que les deux ne divergent jamais (ce paquet est
la source canonique). Relancez périodiquement — BaridiMap classe toujours les
bureaux selon le schéma à 58 wilayas, donc les nouvelles wilayas 59–69
apparaissent actuellement sous leur wilaya mère.

## Licence et attribution

Le code est sous [MIT](LICENSE). Les données sous-jacentes sont © **Algérie Poste**,
redistribuées à titre de référence et pour alimenter
[GeoAlgeria](https://geoalgeria.com). Vérifiez auprès d'Algérie Poste pour des
informations officielles et en temps réel.

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
