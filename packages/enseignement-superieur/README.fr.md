[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/enseignement-superieur

**Tous les établissements d'enseignement supérieur en Algérie — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/enseignement-superieur)](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/enseignement-superieur)](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

110 établissements d'enseignement supérieur à travers l'Algérie — **universités**, grandes
écoles, écoles normales supérieures et centres universitaires — chacun avec son nom officiel,
**son propre site web**, son **type** d'établissement, son rattachement wilaya / commune et ses
coordonnées. Source : le **Ministère de l'Enseignement Supérieur et de la Recherche Scientifique
(MESRS)**, livré en JSON, CSV et GeoJSON. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/enseignement-superieur
```

```js
import es from "@geoalgeria/enseignement-superieur";

const all = es.institutions();                  // 110
const inAlgiers = es.institutionsByWilaya(16);   // établissements de la wilaya 16
const universities = es.institutionsByType("universite"); // toutes les universités

// Chaque enregistrement a lat/lng — tri par distance, carte ou campus le plus proche en quelques lignes.
```

## Ce que vous pouvez construire

- **Recherche de l'université la plus proche** — coordonnées sur chaque enregistrement, prêtes pour le tri par distance.
- **Applications étudiantes et citoyennes** — cartographier le réseau d'enseignement supérieur par wilaya, avec lien direct vers le site de chaque établissement.
- **Cartes** — couche de points GeoJSON prête à l'emploi pour tout le réseau d'enseignement supérieur.
- **Recherche et planification** — nombre d'établissements par type et par wilaya à travers le pays.

## Contenu

| Type | Code | Nombre |
| --- | --- | --- |
| Université | `universite` | 58 |
| Grande école | `grande_ecole` | 35 |
| École normale supérieure | `ens` | 12 |
| Centre universitaire | `centre_universitaire` | 5 |
| **Total** | | **110** |

Couvrant **51 wilayas**. `wilaya_code` est relié au modèle de wilayas de
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) (schéma à 69 wilayas).

## Noms et coordonnées — provenance

L'**identité** de chaque enregistrement est à 100 % MESRS : `name`, `type` et le `website`
officiel proviennent directement de la liste du réseau universitaire du ministère (qui publie
les noms **uniquement en français**).

La page du ministère ne contient **ni coordonnées ni adresse**, donc la **géographie est
fournie ici** et étiquetée honnêtement sur chaque enregistrement via `geo_precision` :

| `geo_precision` | Nombre | Ce que représente la coordonnée |
| --- | --- | --- |
| `campus` | 61 | Un géocodage OpenStreetMap du campus nommé, vérifié : un géocodage qui atterrit dans une wilaya différente de celle du nom de l'établissement est rejeté. |
| `commune` | 16 | Le centroïde de la commune de l'établissement, issu du jeu de données principal `geoalgeria` — utilisé quand OSM ne trouve pas le campus par son nom. |
| `wilaya` | 33 | Le centroïde de la wilaya de l'établissement — solution de repli quand seule la wilaya est connue. |

`wilaya_code`, `wilaya_name` et `commune` sont toujours réconciliés avec le jeu de données
principal `geoalgeria`, ils font donc autorité et suivent le schéma à 69 wilayas. Les
coordonnées sont une couche d'enrichissement — précises au niveau indiqué, pas une position
de campus relevée. Régénérez-les avec `npm run geocode` (OpenStreetMap Nominatim), puis
`npm run fetch`.

## Formats

Le package npm contient le **JSON** (importable directement) :

```js
import institutions from "@geoalgeria/enseignement-superieur/data/institutions.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/enseignement-superieur/data/institutions.json
```

Les chargeurs et les structures d'enregistrement sont entièrement **typés** — les définitions TypeScript sont incluses dans le package :

```ts
import es, { type Institution } from "@geoalgeria/enseignement-superieur";
const all: Institution[] = es.institutions();
```

Les fichiers **CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et inclus dans chaque
[Release GitHub](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  institutions.json            # 110 établissements (tableau)
  metadata.json                # source, comptages, by_type, by_precision, generated_at
  csv/institutions.csv         # dépôt + bundle Release (pas dans le tarball npm)
  geojson/institutions.geojson # Entités point (les 110 placées ; 61 géocodées au campus, voir geo_precision)
```

## Structure d'un enregistrement

```json
{
  "id": 53,
  "name": "Université des sciences et de la technologie d'Alger, Houari Boumediène",
  "type": "universite",
  "type_fr": "Université",
  "website": "http://www.usthb.dz/",
  "commune": "Bab Ezzouar",
  "wilaya_code": "16",
  "wilaya_name": "Alger",
  "lat": 36.7121849,
  "lng": 3.1810204,
  "geo_precision": "campus",
  "source": "https://www.mesrs.dz/en/university-network/"
}
```

La page du réseau MESRS publie les noms **uniquement en français**, donc `name` est en français ;
pour les noms de wilaya et de commune en arabe, joignez `wilaya_code` au jeu de données
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria). `wilaya_code` est complété à deux
chiffres avec un zéro.

## Besoin des divisions administratives aussi ?

Si vous avez aussi besoin des wilayas, daïras et communes pour effectuer des jointures, utilisez
le package principal
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — il contient le jeu de données
complet des divisions de wilayas auquel `wilaya_code` fait référence ici. Utilisez
`@geoalgeria/enseignement-superieur` quand vous avez *uniquement* besoin des données
d'établissements d'enseignement supérieur.

## Source

L'identité des établissements provient du **MESRS**, via la page publique du réseau
universitaire (<https://www.mesrs.dz/en/university-network/>). Exécutez `npm run fetch` pour
régénérer toutes les sorties à partir de la liste en ligne ; la commande réconcilie la
wilaya/commune de chaque enregistrement avec le jeu de données principal et attache les
coordonnées de référence (`scripts/seeds/coordinates.json`, actualisées avec `npm run geocode`).
Elle échoue bruyamment si le nombre d'établissements s'effondre. Les coordonnées sont dérivées
d'OpenStreetMap — voir **Noms et coordonnées** ci-dessus.

## Licence et attribution

Le code est sous [MIT](LICENSE). Les données des établissements sont © **MESRS**, redistribuées
à titre de référence et pour alimenter [GeoAlgeria](https://geoalgeria.com). Les coordonnées
sont © contributeurs OpenStreetMap (ODbL), dérivées via Nominatim. Vérifiez auprès du ministère
et de chaque établissement pour des informations faisant autorité.

---

Fait par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
