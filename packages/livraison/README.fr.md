[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/livraison

**Les transporteurs de livraison en Algérie et leurs bureaux de retrait — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/livraison)](https://www.npmjs.com/package/@geoalgeria/livraison)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/livraison)](https://www.npmjs.com/package/@geoalgeria/livraison)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

La couche livraison / e-commerce pour l'Algérie, en trois volets : un **registre** de
transporteurs, **411 bureaux de retrait géocodés** répartis sur 61 wilayas, et la
**couverture par transporteur**. Distribué en JSON, CSV et GeoJSON. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/livraison
```

```js
import livraison from "@geoalgeria/livraison";

const all = livraison.carriers();                    // 16 transporteurs
const yalidine = livraison.carrierById("yalidine");  // un transporteur
const inAlgiers = livraison.stopdesksByWilaya(16);    // bureaux de retrait dans la wilaya 16
const guepexDesks = livraison.stopdesksByCarrier("guepex");
const reach = livraison.coverageByCarrier("yalidine"); // wilayas desservies

// Chaque bureau de retrait a des coordonnées lat/lng — tri par distance, carte ou bureau le plus proche en quelques lignes.
```

## Ce que vous pouvez construire

- **Bureau de retrait le plus proche** — coordonnées sur chaque bureau, prêtes pour le tri par distance.
- **Sélecteur de point de dépôt au checkout** — lister les bureaux d'un transporteur dans la wilaya de l'acheteur.
- **Comparaison de transporteurs** — registre indiquant qui opère, leur modèle (bureau de retrait vs domicile) et le support du paiement à la livraison.
- **Cartes** — couche de points GeoJSON prête à l'emploi pour tout le réseau ouvert de bureaux de retrait.

## Contenu

| Jeu de données | Nombre | Géocodé | Notes |
| --- | --- | --- | --- |
| Transporteurs (`carriers.json`) | **16** | — | registre : nom, site web, modèle, paiement à la livraison, périmètre, ouverture des données, API |
| Bureaux de retrait (`stopdesks.json`) | **411** | ✅ tous | id, opérateur, nom, adresse, commune, `wilaya_code`, lat/lng |
| Couverture (`coverage.json`) | **9** | — | présence par transporteur (wilaya/commune) |

Les bureaux de retrait couvrent **61 wilayas**, tous géocodés. `wilaya_code` se joint au
modèle 69 wilayas de [`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

### Une note sur la couverture et la transparence

L'Algérie compte plus de 90 entreprises de livraison, mais seules quelques-unes publient
leurs emplacements d'agences ouvertement. Le **registre** couvre le paysage (les principaux
transporteurs et ce que chacun fait) ; la **couche géocodée** couvre les transporteurs qui
publient leurs emplacements de manière ouverte :

- l'**écosystème relais Yalidine + Guepex** — Yalidine, Guepex, et les opérateurs qui
  utilisent leur réseau partagé (EasyAndSpeed, WeCanServices, SpeedMail, Zimou Express) ;
- **Anderson**, **Noest** et **Maystro**, trois réseaux indépendants, chacun géocodé à
  partir du lien Google Maps sur ses fiches d'agence (les agences dont les liens sont
  manquants, irrésolvables ou pointent vers une wilaya différente de celle déclarée sur
  la fiche sont omises).

Les transporteurs comme ZR Express, DHD, DHL et Aramex gardent leurs listes d'agences
derrière des applications, des connexions ou des API sous licence, et apparaissent donc
dans le registre avec `open_agency_data: "none"` sans bureaux de retrait ici. La couverture
représente la *présence de bureaux de retrait* pour les transporteurs ayant des données
ouvertes, pas une affirmation sur la portée de la livraison à domicile.

## Formats

Le package npm distribue le **JSON** (importable directement) :

```js
import carriers from "@geoalgeria/livraison/data/carriers.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/livraison/data/stopdesks.json
```

Les chargeurs et les formes d'enregistrement sont entièrement **typés** — les définitions TypeScript sont incluses dans le package :

```ts
import livraison, { type StopDesk } from "@geoalgeria/livraison";
const desks: StopDesk[] = livraison.stopdesks();
```

Les fichiers **CSV et GeoJSON** se trouvent dans le dépôt sous [`data/`](data) et sont
inclus dans chaque [Release GitHub](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  carriers.json             # 16 transporteurs (registre)
  stopdesks.json            # 411 bureaux de retrait géocodés (tableau)
  coverage.json             # 9 lignes de couverture par transporteur
  metadata.json             # sources, compteurs, generated_at
  csv/                      # dépôt + bundle Release (pas dans le tarball npm)
    carriers.csv
    stopdesks.csv
    coverage.csv
  geojson/stopdesks.geojson # Entités Point (les 411 géocodées)
```

## Formes d'enregistrement

```json
// stopdesks.json
{
  "id": "160101",
  "operator": "guepex",
  "name": "Agence Sacré-Cœur",
  "address": "116 Didouche Mourad, Sacré Cœur, Alger",
  "commune": "Alger Centre",
  "wilaya_code": 16,
  "lat": 36.7635831801555,
  "lng": 3.0471151913967005,
  "sources": ["guepex", "yalidine"]
}
```

```json
// carriers.json
{
  "id": "yalidine",
  "name": "Yalidine Express",
  "website": "https://yalidine-express.com.dz",
  "type": "both",
  "cod": true,
  "scope": "domestic",
  "open_agency_data": "geocoded",
  "api": "documented",
  "in_stopdesks": true,
  "stopdesk_count": 93,
  "stopdesk_wilaya_count": 54,
  "notes": "Largest COD network; publishes an open geocoded stop-desk table."
}
```

`operator` sur un bureau de retrait fait la jointure avec `carriers[].id`. `wilaya_code`
fait la jointure avec les wilayas de GeoAlgeria. `sources` liste les flux ouverts qui
référencent le bureau — `["yalidine","guepex"]` quand les cartes relais concordent, ou
`["anderson"]` pour une agence Anderson.

## Besoin aussi des divisions administratives ?

Si vous avez également besoin des wilayas, dairas et communes pour effectuer des jointures,
utilisez le package principal
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — il fournit le jeu de données
complet des 69 wilayas auquel `wilaya_code` se rattache ici. Utilisez `@geoalgeria/livraison`
quand vous avez *uniquement* besoin des données de livraison.

## Sources

Les bureaux de retrait proviennent des transporteurs qui publient des données d'agences ouvertes :

- **Yalidine** (<https://yalidine-express.com.dz/nos-agences/>) et **Guepex**
  (<https://www.guepex.dz/public/data/agences.json>) partagent un réseau relais fédéré et
  des identifiants de bureaux de retrait communs, leurs enregistrements sont donc fusionnés
  et dédupliqués par identifiant.
- **Anderson** (<https://anderson-ecommerce.com>), **Noest** (<https://noest-dz.com>) et
  **Maystro** (<https://maystro-delivery.com/Coverage.html>) listent chacun leurs agences
  avec un lien Google Maps par fiche ; le build résout chaque lien vers le point de
  l'agence (les agences dont les liens sont manquants, irrésolvables ou pointent vers une
  wilaya différente de celle déclarée sur la fiche sont omises).

Le registre des transporteurs est compilé à partir de
[CourierDZ](https://github.com/PiteurStudio/CourierDZ), des sites web des transporteurs
et des recherches GeoAlgeria. Exécutez `npm run fetch` pour régénérer toutes les sorties
à partir des sources en ligne ; le build échoue bruyamment si le nombre d'une source
s'effondre ou si un transporteur inconnu apparaît. `wilaya_code` est résolu par le
centroïde de commune le plus proche à partir du jeu de données `geoalgeria`.

## Licence et attribution

Le code est sous licence [MIT](LICENSE). Les données des bureaux de retrait sont
© les transporteurs respectifs ; le registre des transporteurs est compilé par GeoAlgeria.
Redistribué à titre de référence et pour alimenter
[GeoAlgeria](https://geoalgeria.com). Vérifiez auprès de chaque transporteur pour des
informations officielles et en temps réel.

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
