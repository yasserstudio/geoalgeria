[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/aviation

**Tous les aéroports civils d'Algérie, sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/aviation)](https://www.npmjs.com/package/@geoalgeria/aviation)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/aviation)](https://www.npmjs.com/package/@geoalgeria/aviation)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

36 aéroports civils à travers l'Algérie, avec les noms officiels, les **codes OACI (ICAO)
et IATA**, les adresses postales, numéros de téléphone, sites web, coordonnées GPS et
rattachement à la wilaya. Source : ANAC (Autorité Nationale de l'Aviation Civile), avec les
codes IATA et trois aéroports absents de la carte de l'ANAC repris d'OurAirports. Distribué
en JSON, CSV et GeoJSON. Fait partie de [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/aviation
```

```js
import aviation from "@geoalgeria/aviation";

const all = aviation.airports();                 // 36
const algiers = aviation.airportByIcao("DAAG");  // Houari Boumediene, iata "ALG"
const byIata = aviation.airportByIata("TLM");     // Tlemcen, depuis un flux de vols
const inOran = aviation.airportsByWilaya(31);     // aéroports de la wilaya 31

// Chaque enregistrement a lat/lng – tri par distance, carte ou aéroport le plus proche en quelques lignes.
```

## Ce que vous pouvez construire

- **Recherche de l'aéroport le plus proche** – coordonnées sur chaque enregistrement, prêtes pour le tri par distance.
- **Résolution OACI/IATA ↔ aéroport** : associer l'un ou l'autre code, venu d'un flux de vols, d'un système de réservation ou d'un horaire, à un nom, des contacts et une localisation.
- **Voyage et logistique** – associer une wilaya ou un point à son aéroport desservant.
- **Cartes** – couche de points GeoJSON prête à l'emploi pour tout le réseau d'aéroports civils.

## Contenu

| Jeu de données | Nombre | Notes |
| --- | --- | --- |
| Aéroports civils | **36** | nom officiel, codes OACI et IATA, adresse, téléphone, site web, coordonnées |
| Lignes sans escale | **70** | liaisons directionnelles avec exploitant, statut, niveau de preuve et source |

Couvrant **33 wilayas**, chaque aéroport est géocodé et porte un code IATA. `wilaya_code`
est lié au modèle 69 wilayas de [`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

33 des 36 viennent de la carte de l'ANAC. Les trois autres, Hassi R'Mel (`HRM`), Mécheria
(`MZW`) et Laghouat (`LOO`), en sont absents et viennent d'OurAirports : ils portent
`source: "ourairports"` et aucun champ de contact.

## Formats

Le package npm fournit le **JSON** (importable directement) :

```js
import airports from "@geoalgeria/aviation/data/airports.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/aviation/data/airports.json
```

Les chargeurs et les formes d'enregistrement sont entièrement **typés** – les définitions TypeScript sont incluses dans le package :

```ts
import aviation, { type Airport } from "@geoalgeria/aviation";
const airports: Airport[] = aviation.airports();
```

Les formats **CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et inclus dans chaque
[Release GitHub](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  airports.json            # 36 aéroports (tableau)
  metadata.json            # sources, comptages, licence, updated
  csv/airports.csv         # dépôt + bundle Release (pas dans le tarball npm)
  geojson/airports.geojson # Entités Point (les 36 sont géocodés)
```

## Structure d'un enregistrement

```json
{
  "id": "daag",
  "name": "Aéroport d’Alger – Houari Boumediene",
  "wilaya_code": "16",
  "commune_code": null,
  "commune": null,
  "lat": 36.69951171485545,
  "lng": 3.210846808533331,
  "geo_precision": "exact",
  "geo_method": "source_point",
  "source": "anac",
  "refs": { "icao": "DAAG", "iata": "ALG" },
  "icao": "DAAG",
  "iata": "ALG",
  "address": "Alger BP 164 DAR EL BEIDA",
  "phone": "+21323199230",
  "website": "https://www.aeroportalger.dz/"
}
```

`id` est le code OACI en minuscules. `icao` correspond toujours au format `DA[A-Z]{2}`. `iata`
porte le code IATA, renseigné sur les 36 enregistrements mais typé nullable pour qu'un aéroport
sans code assigné ne soit jamais une rupture de contrat. `wilaya_code` est complété à deux
chiffres avec un zéro et rejoint les wilayas de GeoAlgeria ; ce jeu de données ne couvre que le
niveau wilaya, donc `commune_code` et `commune` sont toujours `null`. Chaque point provient
directement de la coordonnée publiée par sa source, donc `geo_precision` vaut toujours
`"exact"` et `geo_method` vaut toujours `"source_point"` : rien ici n'est une valeur de repli
ou une dégradation. `source` est une clé courte résolue dans `metadata.sources[]`, `"anac"` ou
`"ourairports"`, et `refs` duplique les `icao` et `iata` de premier niveau. Un enregistrement
ANAC (`dabs`, Tébessa) a un `phone` à `null` lorsque l'ANAC n'en indique pas ; les trois
enregistrements OurAirports ont `address`, `phone` et `website` à `null`, qu'OurAirports ne
publie pas.

## Besoin aussi des divisions administratives ?

Si vous avez également besoin des wilayas, dairas et communes pour des jointures, utilisez
le package principal **[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** – il fournit
le jeu de données complet des 69 wilayas auquel `wilaya_code` fait référence ici. Utilisez
`@geoalgeria/aviation` quand vous avez *uniquement* besoin des données aéroportuaires.

## Source

Les données proviennent de l'**ANAC – Autorité Nationale de l'Aviation Civile**, via la carte
publique des aéroports (<https://www.anac.dz/en/carte-des-aeroports-3/>). Exécutez `npm run fetch`
pour régénérer toutes les sorties à partir de la carte en direct ; le build suit l'iframe de la
carte, donc une mise à jour de version par l'ANAC ne le casse pas, et il échoue bruyamment si le
nombre d'aéroports ou le format OACI change. `wilaya_code` est résolu par le centroïde de commune
le plus proche à partir du jeu de données `geoalgeria` (le package principal fournit des
centroïdes, pas des polygones de limites).

L'ANAC ne publie que les codes OACI et omet trois aéroports, donc le même build lit aussi le
fichier `airports.csv` du domaine public d'**[OurAirports](https://ourairports.com/data/)**. Les
codes IATA sont joints sur l'OACI et, puisqu'un code identique ne prouve pas à lui seul que deux
lignes décrivent le même lieu, chaque jointure est confirmée par rapport à la coordonnée de
l'ANAC et le build échoue au-delà de 5 km. L'écart observé va de 0,31 à 2,15 km, le maximum
étant Ouargla (`DAUU`/`OGX`), dont l'entrée OurAirports porte le nom de l'aérodrome d'Ain Beida
plutôt que celui de la ville.

Les deux sources sont des documents vivants, donc chaque entrée de `metadata.sources[]`
porte un `snapshot` : l'URL réellement récupérée, le SHA-256 de ses octets, sa taille et
son `Last-Modified` lorsque la source en publie un. `retrieved` indique quand le build a
demandé ; le snapshot indique ce qu'il a obtenu. Vérifiez-le vous-même avec
`curl -sL <snapshot.url> | shasum -a 256`. Il atteste, il n'épingle pas : une source
modifiée ne fait jamais échouer le build.

## Licence et attribution

Le code est sous licence [MIT](LICENSE). Les enregistrements ANAC sont © **ANAC**, redistribués
à titre de référence et pour alimenter [GeoAlgeria](https://geoalgeria.com) ; les codes IATA et
les trois aéroports supplémentaires viennent d'OurAirports, qui place ses données dans le
domaine public. Vérifiez auprès de l'ANAC pour des informations officielles et en temps réel.

[Documentation API et référence des champs →](https://geoalgeria.com/data/docs/aviation) · [Parcourir tous les paquets →](https://geoalgeria.com/data)

---

Fait par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
