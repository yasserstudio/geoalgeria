[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/jeunesse

**Toutes les infrastructures de jeunesse et de sport en Algérie — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/jeunesse)](https://www.npmjs.com/package/@geoalgeria/jeunesse)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/jeunesse)](https://www.npmjs.com/package/@geoalgeria/jeunesse)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

2 076 infrastructures de jeunesse et de sport à travers l'Algérie — **maisons de jeunes**, complexes sportifs,
salles polyvalentes, auberges de jeunes, centres culturels, camps de jeunes et plus encore — chacune avec
son nom officiel en arabe, son **type** d'infrastructure, commune / daïra / wilaya, et coordonnées géographiques.
Source : **Ministère de la Jeunesse**, distribué en JSON, CSV et GeoJSON. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/jeunesse
```

```js
import jeunesse from "@geoalgeria/jeunesse";

const all = jeunesse.institutions();              // 2 076
const inAlgiers = jeunesse.institutionsByWilaya(16); // infrastructures de la wilaya 16
const houses = jeunesse.institutionsByType("MJ");  // toutes les maisons de jeunes

// Chaque enregistrement a lat/lng — tri par distance, carte ou infrastructure la plus proche en quelques lignes.
```

## Ce que vous pouvez construire

- **Recherche de la maison de jeunes la plus proche** — coordonnées sur chaque enregistrement, prêtes pour le tri par distance.
- **Applications civiques et jeunesse** — cartographier les maisons de jeunes, complexes sportifs et centres culturels par wilaya.
- **Cartes** — couche de points GeoJSON prête à l'emploi pour tout le réseau jeunesse et sport.
- **Recherche et planification** — densité des infrastructures par type et wilaya à travers le pays.

## Contenu

| Type | Code | Nombre |
| --- | --- | --- |
| Maison de jeunes | `MJ` | 833 |
| Complexe sportif de proximité | `CS` | 577 |
| Salle polyvalente | `SPA` | 297 |
| Auberge de jeunes | `AJ` | 193 |
| Centre culturel | `CC` | 58 |
| Camp de jeunes | `CJ` | 51 |
| Centre de loisirs scientifiques | `CLS` | 35 |
| Club de jeunes | `CLJ` | 29 |
| Piscine de proximité | `PAL` | 3 |
| **Total** | | **2 076** |

Couvrant **50 wilayas**, chaque infrastructure est géocodée. `wilaya_code` est lié au modèle wilaya de
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria). La source publie moins que l'ensemble complet
des wilayas ; les huit absentes de la carte du ministère sont simplement absentes en amont, pas supprimées ici.

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
  institutions.json            # 2 076 infrastructures (tableau)
  metadata.json                # source, comptages, by_type, generated_at
  csv/institutions.csv         # dépôt + bundle Release (pas dans le tarball npm)
  geojson/institutions.geojson # Entités Point (les 2 076 sont géocodées)
```

## Structure d'un enregistrement

```json
{
  "id": 4,
  "name": "دار الشباب خير الدين",
  "type_code": "MJ",
  "type_ar": "دار الشباب",
  "type_fr": "Maison de jeunes",
  "commune": "تقرت",
  "daira": "تقرت",
  "wilaya_code": "55",
  "wilaya_name": "تقرت",
  "lat": 33.10933,
  "lng": 6.07068,
  "source": "https://youthconnect.mjeunesse.gov.dz/institutions-map"
}
```

Le ministère publie les noms en **arabe uniquement**, donc `name`, `commune`, `daira` et
`wilaya_name` sont en arabe ; `type_fr` est un libellé indicatif en français pour le type. Pour les noms
de wilaya et de commune en français, joignez `wilaya_code` avec le jeu de données
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria). `wilaya_code` est complété avec un zéro
sur deux chiffres et est `<= 58` (la source est antérieure à la réforme des 69 wilayas) ; il reste
compatible avec le modèle wilaya de GeoAlgeria.

## Besoin des divisions administratives ?

Si vous avez aussi besoin des wilayas, daïras et communes pour les jointures, utilisez le package principal
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — il fournit le jeu de données complet
des divisions de wilayas auquel `wilaya_code` fait référence ici. Utilisez `@geoalgeria/jeunesse`
quand vous avez *uniquement* besoin des données des infrastructures de jeunesse et de sport.

## Source

Les données proviennent du **Ministère de la Jeunesse**, via la carte publique des infrastructures
(<https://youthconnect.mjeunesse.gov.dz/institutions-map>). Exécutez `npm run fetch` pour régénérer
toutes les sorties depuis la carte en ligne ; le build fait confiance à la jointure commune->wilaya du
ministère, répare les enregistrements avec des coordonnées transposées ou dont le signe est manquant
(un point à l'ouest stocké sans son signe moins — voir `metadata.sign_corrected`), et supprime les
quelques enregistrements avec des coordonnées de remplissage (`metadata.dropped`). Il échoue bruyamment
si le nombre d'infrastructures s'effondre ou si un code de type inconnu apparaît.

## Licence et attribution

Le code est sous licence [MIT](LICENSE). Les données sous-jacentes sont la propriété du
**Ministère de la Jeunesse**, redistribuées à titre de référence et pour alimenter
[GeoAlgeria](https://geoalgeria.com). Vérifiez auprès du ministère pour des informations
officielles et en temps réel.

[Documentation API et référence des champs →](https://geoalgeria.com/data/docs/jeunesse) · [Parcourir tous les paquets →](https://geoalgeria.com/data)

---

Fait par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
