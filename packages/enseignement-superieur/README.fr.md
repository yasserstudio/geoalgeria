[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/enseignement-superieur

**Tous les établissements d'enseignement supérieur en Algérie — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/enseignement-superieur)](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/enseignement-superieur)](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

177 établissements d'enseignement supérieur à travers l'Algérie — **universités**, grandes
écoles, écoles normales supérieures, centres universitaires, les **institutions privées
agréées**, et les établissements **relevant d'autres ministères** (Défense, Santé, Culture…)
que le MESRS supervise — chacun avec son nom (français et/ou arabe), son **type**
d'établissement, son **secteur**, le ministère de tutelle, **son propre site web**, son
rattachement wilaya / commune et ses coordonnées. Source : le **Ministère de l'Enseignement
Supérieur et de la Recherche Scientifique (MESRS)**, livré en JSON, CSV et GeoJSON. Fait
partie de [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/enseignement-superieur
```

```js
import es from "@geoalgeria/enseignement-superieur";

const all = es.institutions();                  // 177
const inAlgiers = es.institutionsByWilaya(16);   // établissements de la wilaya 16
const universities = es.institutionsByType("universite"); // toutes les universités
const privates = es.institutionsBySector("private");      // les 19 établissements privés

// Chaque enregistrement a lat/lng — tri par distance, carte ou campus le plus proche en quelques lignes.
```

## Ce que vous pouvez construire

- **Recherche de l'université la plus proche** — coordonnées sur chaque enregistrement, prêtes pour le tri par distance.
- **Applications étudiantes et citoyennes** — cartographier le réseau d'enseignement supérieur par wilaya, scinder public vs privé, lien direct vers le site de chaque établissement.
- **Cartes** — couche de points GeoJSON prête à l'emploi pour tout le réseau d'enseignement supérieur.
- **Recherche et planification** — nombre d'établissements par type, secteur, ministère de tutelle et wilaya à travers le pays.

## Contenu

| Type | Code | Nombre |
| --- | --- | --- |
| Université | `universite` | 58 |
| Grande école | `grande_ecole` | 102 |
| École normale supérieure | `ens` | 12 |
| Centre universitaire | `centre_universitaire` | 5 |
| **Total** | | **177** |

Par **secteur** : 158 publiques · 19 privées agréées. Parmi les établissements publics, 48 relèvent
**d'autres ministères** que le MESRS qu'il supervise pédagogiquement — lisez `supervisory_ministry`
(ex. `"Ministère de la Santé"` pour les 25 instituts paramédicaux, `"Ministère de la Défense nationale"`
pour les 16 écoles militaires), qui est `null` pour le réseau MESRS lui-même.

Couvrant **51 wilayas**. `wilaya_code` est relié au modèle de wilayas de
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) (schéma à 69 wilayas).

## Noms et coordonnées — provenance

L'**identité** de chaque enregistrement est à 100 % MESRS. Le réseau public's `name` (français)
et `website` proviennent de la liste du ministère ; les établissements privés et relevant d'autres
ministères sont publiés uniquement en arabe, donc ils portent `name_ar` avec `name: null`. `name_ar`
est également **rétroempli** pour le réseau public (jointure sur site web) — présent sur ~93% de tous
les enregistrements.

La page du ministère ne contient **ni coordonnées ni adresse**, donc la **géographie est
fournie ici** et étiquetée honnêtement sur chaque enregistrement via `geo_method` (le détail) et
`geo_precision` (`"exact"` pour `campus`, `"approximate"` pour `commune`/`wilaya`) :

| `geo_method` | Nombre | `geo_precision` | Ce que représente la coordonnée |
| --- | --- | --- | --- |
| `campus` | 61 | `exact` | Un géocodage OpenStreetMap du campus nommé, vérifié : un géocodage qui atterrit dans une wilaya différente de celle du nom de l'établissement est rejeté. |
| `commune` | 16 | `approximate` | Le centroïde de la commune de l'établissement, issu du jeu de données principal `geoalgeria` — utilisé quand OSM ne trouve pas le campus par son nom. |
| `wilaya` | 100 | `approximate` | Le centroïde de la wilaya de l'établissement — solution de repli quand seule la wilaya est connue. Chaque établissement privé/relevant d'autres ministères s'y trouve, car la source ne publie pas d'adresse pour eux. |

`wilaya_code` et `commune` sont toujours réconciliés avec le jeu de données principal
`geoalgeria`, ils font donc autorité et suivent le schéma à 69 wilayas (`commune_code` vaut
actuellement `null` sur tous les enregistrements — MESRS ne fournit aucun code commune). Les
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
  institutions.json            # 177 établissements (tableau)
  metadata.json                # sources, comptages, by_type, by_sector, by_geo_method, updated
  csv/institutions.csv         # dépôt + bundle Release (pas dans le tarball npm)
  geojson/institutions.geojson # Entités point (les 177 placées ; 61 géocodées au campus, voir geo_method)
```

## Structure d'un enregistrement

```json
{
  "id": "00053",
  "name": "Université des sciences et de la technologie d'Alger, Houari Boumediène",
  "name_ar": "جامعة الجزائر هواري بومدين للعلوم و التكنولوجيا",
  "wilaya_code": "16",
  "commune_code": null,
  "commune": "Bab Ezzouar",
  "lat": 36.7121849,
  "lng": 3.1810204,
  "geo_precision": "exact",
  "geo_method": "campus",
  "source": "mesrs",
  "type": "universite",
  "type_label_fr": "Université",
  "sector": "public",
  "supervisory_ministry": null,
  "website": "http://www.usthb.dz/"
}
```

`id` est une chaîne stable à zéros non significatifs assignée par GeoAlgeria (la source MESRS
n'en publie pas), unique dans ce jeu de données. `name` est français (le réseau MESRS) ou `null`
pour les établissements privés/relevant d'autres ministères publiés uniquement en arabe —
utilisez `name ?? name_ar` pour un label d'affichage. Pour les noms de wilaya et de commune en
arabe, joignez `wilaya_code` au jeu de données
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria). `wilaya_code` est complété à deux
chiffres avec un zéro ; `commune_code` vaut actuellement `null` sur tous les enregistrements.
`geo_precision` vaut `"exact"` pour un vrai point de campus ou `"approximate"` pour un centroïde
de commune/wilaya — `geo_method` précise lequel. `source` est une clé de provenance fixe
(`"mesrs"`) dans `metadata.sources[]`, pas une URL — voir **Source** ci-dessous pour les pages
réelles.

## Besoin des divisions administratives aussi ?

Si vous avez aussi besoin des wilayas, daïras et communes pour effectuer des jointures, utilisez
le package principal
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — il contient le jeu de données
complet des divisions de wilayas auquel `wilaya_code` fait référence ici. Utilisez
`@geoalgeria/enseignement-superieur` quand vous avez *uniquement* besoin des données
d'établissements d'enseignement supérieur.

## Source

L'identité des établissements provient du **MESRS**, via la page publique du réseau
universitaire — la [liste en anglais](https://www.mesrs.dz/en/university-network/) pour les noms
français du réseau et la [liste en arabe](https://www.mesrs.dz/reseau-universitaire-ar/) pour les
noms arabes et les établissements privés + relevant d'autres ministères que la page anglaise
omet. Exécutez `npm run fetch` pour régénérer toutes les sorties à partir des listes en ligne ;
la commande réconcilie la wilaya/commune de chaque enregistrement avec le jeu de données principal
et attache les coordonnées de référence (`scripts/seeds/coordinates.json`, actualisées avec
`npm run geocode`). Elle échoue bruyamment si le nombre d'établissements s'effondre. Les
coordonnées sont dérivées d'OpenStreetMap — voir **Noms et coordonnées** ci-dessus.

## Licence et attribution

Le code est sous [MIT](LICENSE). Les données des établissements sont © **MESRS**, redistribuées
à titre de référence et pour alimenter [GeoAlgeria](https://geoalgeria.com). Les coordonnées
sont © contributeurs OpenStreetMap (ODbL), dérivées via Nominatim. Vérifiez auprès du ministère
et de chaque établissement pour des informations faisant autorité.

[Documentation API et référence des champs →](https://geoalgeria.com/data/docs/enseignement-superieur) · [Parcourir tous les paquets →](https://geoalgeria.com/data)

---

Fait par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
