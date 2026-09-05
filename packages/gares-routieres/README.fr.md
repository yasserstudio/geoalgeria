[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/gares-routieres

**Toutes les gares routières d'Algérie, sous forme de données prêtes à installer.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/gares-routieres)](https://www.npmjs.com/package/@geoalgeria/gares-routieres)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/gares-routieres)](https://www.npmjs.com/package/@geoalgeria/gares-routieres)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

74 gares routières à travers l'Algérie – avec noms officiels, adresses, coordonnées GPS,
superficies et rattachement wilaya/commune. Données issues de **SOGRAL** (l'exploitant
public des gares routières), livrées en JSON, CSV et GeoJSON. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> **Également connu sous le nom de :** réseau SOGRAL. SOGRAL est la *source* ; le paquet
> est nommé par domaine (`gares-routieres`) et repérable via le mot-clé `sogral`.

```bash
npm install @geoalgeria/gares-routieres
```

```js
import gares from "@geoalgeria/gares-routieres";

const tout = gares.stations();                 // 74
const alger = gares.stationById("16-01");      // Alger – Grands Invalides
const setif = gares.stationsByWilaya(19);      // gares de la wilaya 19
```

## Ce que vous pouvez construire

- **Recherche de la gare la plus proche** – coordonnées sur chaque enregistrement.
- **Voyage & logistique** – associer une wilaya ou un point à sa gare routière.
- **Cartes** – couche GeoJSON de points, prête à l'emploi.
- **Capacités** – superficies totale/bâtie par gare.

## Contenu

| Jeu de données | Nombre | Notes |
| --- | --- | --- |
| Gares routières | **74** | nom officiel, adresse, coordonnées, superficies |

Couvrant **52 wilayas**, toutes géocodées. `wilaya_code` est lié au modèle à 69 wilayas de
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

## Formats

Le paquet npm livre le **JSON** (importable directement) ; **CSV et GeoJSON** sont dans le
dépôt sous [`data/`](data) et joints à chaque
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases).

```
data/
  stations.json            # 74 gares (tableau)
  metadata.json            # sources, décomptes, license, updated
  csv/stations.csv
  geojson/stations.geojson # entités Point (74 géocodées)
```

## Source

Données de **SOGRAL – EPE SOGRAL Spa** (Société de Gestion des Gares Routières d'Algérie),
issues de l'instantané du registre SOGRAL récupéré sur `live.sogral.com` le
01/07/2026 ; cet hôte est désormais retiré. Les 73 valeurs
`refs.mahatati_agency` renseignées ont été revérifiées le 28/08/2026 avec une
correspondance exacte dans la liste publique des gares de départ de
[MAHATATI](https://mahatati.sogral.com/) ; In Saleh est la seule gare qui n'y
figure pas comme gare de départ. `wilaya_code`/`commune` sont résolus par
centroïde de commune le plus proche à partir du jeu `geoalgeria`.

## Licence & attribution

Le code est sous [MIT](LICENSE). Les données sont © **SOGRAL**, redistribuées à titre de
référence pour [GeoAlgeria](https://geoalgeria.com). Vérifiez auprès de SOGRAL pour toute
information officielle et à jour.

[Voir tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
