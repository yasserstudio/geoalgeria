[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/aviation

**Tous les aéroports civils d'Algérie — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/aviation)](https://www.npmjs.com/package/@geoalgeria/aviation)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/aviation)](https://www.npmjs.com/package/@geoalgeria/aviation)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

33 aéroports civils à travers l'Algérie — avec les noms officiels, les **codes OACI (ICAO)**,
les adresses postales, numéros de téléphone, sites web, coordonnées géographiques et rattachement
à la wilaya. Source : ANAC (Autorité Nationale de l'Aviation Civile), distribué en JSON,
CSV et GeoJSON. Fait partie de [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/aviation
```

```js
import aviation from "@geoalgeria/aviation";

const all = aviation.airports();                 // 33
const algiers = aviation.airportByIcao("DAAG");  // Houari Boumediene
const inOran = aviation.airportsByWilaya(31);     // aéroports de la wilaya 31

// Chaque enregistrement a lat/lng — tri par distance, carte ou aéroport le plus proche en quelques lignes.
```

## Ce que vous pouvez construire

- **Recherche de l'aéroport le plus proche** — coordonnées sur chaque enregistrement, prêtes pour le tri par distance.
- **Résolution OACI ↔ aéroport** — associer les codes OACI des données de vol aux noms, contacts et localisations.
- **Voyage et logistique** — associer une wilaya ou un point à son aéroport desservant.
- **Cartes** — couche de points GeoJSON prête à l'emploi pour tout le réseau d'aéroports civils.

## Contenu

| Jeu de données | Nombre | Notes |
| --- | --- | --- |
| Aéroports civils | **33** | nom officiel, code OACI, adresse, téléphone, site web, coordonnées |

Couvrant **31 wilayas**, chaque aéroport est géocodé. `wilaya_code` est lié au modèle
69 wilayas de [`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

## Formats

Le package npm fournit le **JSON** (importable directement) :

```js
import airports from "@geoalgeria/aviation/data/airports.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/aviation/data/airports.json
```

Les chargeurs et les formes d'enregistrement sont entièrement **typés** — les définitions TypeScript sont incluses dans le package :

```ts
import aviation, { type Airport } from "@geoalgeria/aviation";
const airports: Airport[] = aviation.airports();
```

Les formats **CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et inclus dans chaque
[Release GitHub](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  airports.json            # 33 aéroports (tableau)
  metadata.json            # source, comptages, generated_at
  csv/airports.csv         # dépôt + bundle Release (pas dans le tarball npm)
  geojson/airports.geojson # Entités Point (les 33 sont géocodés)
```

## Structure d'un enregistrement

```json
{
  "id": "daag",
  "name": "Aéroport d'Alger – Houari Boumediene",
  "icao": "DAAG",
  "iata": null,
  "address": "Alger BP 164 DAR EL BEIDA",
  "phone": "+21323199230",
  "website": "https://www.aeroportalger.dz/",
  "wilaya_code": "16",
  "lat": 36.69951171485545,
  "lng": 3.210846808533331,
  "source": "https://www.anac.dz/en/carte-des-aeroports-3/"
}
```

`id` est le code OACI en minuscules. `icao` correspond toujours au format `DA__`. `iata` est
`null` — l'ANAC ne publie que les codes OACI (le champ est réservé pour un enrichissement
ultérieur). `wilaya_code` est complété à deux chiffres avec un zéro et rejoint les wilayas de
GeoAlgeria ; quelques enregistrements peuvent avoir un `phone` à `null` lorsque l'ANAC n'en
indique pas.

## Besoin aussi des divisions administratives ?

Si vous avez également besoin des wilayas, dairas et communes pour des jointures, utilisez
le package principal **[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — il fournit
le jeu de données complet des 69 wilayas auquel `wilaya_code` fait référence ici. Utilisez
`@geoalgeria/aviation` quand vous avez *uniquement* besoin des données aéroportuaires.

## Source

Les données proviennent de l'**ANAC — Autorité Nationale de l'Aviation Civile**, via la carte
publique des aéroports (<https://www.anac.dz/en/carte-des-aeroports-3/>). Exécutez `npm run fetch`
pour régénérer toutes les sorties à partir de la carte en direct ; le build suit l'iframe de la
carte, donc une mise à jour de version par l'ANAC ne le casse pas, et il échoue bruyamment si le
nombre d'aéroports ou le format OACI change. `wilaya_code` est résolu par le centroïde de commune
le plus proche à partir du jeu de données `geoalgeria` (le package principal fournit des
centroïdes, pas des polygones de limites).

## Licence et attribution

Le code est sous licence [MIT](LICENSE). Les données sous-jacentes sont © **ANAC**, redistribuées
à titre de référence et pour alimenter [GeoAlgeria](https://geoalgeria.com). Vérifiez auprès de
l'ANAC pour des informations officielles et en temps réel.

[Documentation API et référence des champs →](https://geoalgeria.com/data/docs/aviation) · [Parcourir tous les paquets →](https://geoalgeria.com/data)

---

Fait par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
