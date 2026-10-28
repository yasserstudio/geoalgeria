[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/enseignement-superieur

**Tous les établissements d'enseignement supérieur en Algérie, sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/enseignement-superieur)](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/enseignement-superieur)](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

187 établissements d'enseignement supérieur à travers l'Algérie – **universités**, grandes
écoles, écoles normales supérieures, centres universitaires, les **institutions privées
agréées**, et les établissements **relevant d'autres ministères** (Défense, Santé, Culture…)
que le MESRS supervise – chacun avec son nom (français et/ou arabe), son **type**
d'établissement, son **secteur**, le ministère de tutelle, **son propre site web**, son
rattachement wilaya / commune et ses coordonnées. Source : le **Ministère de l'Enseignement
Supérieur et de la Recherche Scientifique (MESRS)**, livré en JSON, CSV et GeoJSON. Fait
partie de [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/enseignement-superieur
```

```js
import es from "@geoalgeria/enseignement-superieur";

const all = es.institutions();                  // 187
const inAlgiers = es.institutionsByWilaya(16);   // établissements de la wilaya 16
const universities = es.institutionsByType("universite"); // toutes les universités
const privates = es.institutionsBySector("private");      // les 19 établissements privés

// Chaque enregistrement a lat/lng – tri par distance, carte ou campus le plus proche en quelques lignes.
```

## Ce que vous pouvez construire

- **Recherche de l'université la plus proche** – coordonnées sur chaque enregistrement, prêtes pour le tri par distance.
- **Applications étudiantes et citoyennes** – cartographier le réseau d'enseignement supérieur par wilaya, scinder public vs privé, lien direct vers le site de chaque établissement.
- **Cartes** – couche de points GeoJSON prête à l'emploi pour tout le réseau d'enseignement supérieur.
- **Recherche et planification** – nombre d'établissements par type, secteur, ministère de tutelle et wilaya à travers le pays.

## Contenu

| Type | Code | Nombre |
| --- | --- | --- |
| Université | `universite` | 59 |
| Grande école | `grande_ecole` | 110 |
| École normale supérieure | `ens` | 13 |
| Centre universitaire | `centre_universitaire` | 5 |
| **Total** | | **187** |

Par **secteur** : 168 publiques · 19 privées agréées. Parmi les établissements publics, 50 relèvent
**d'autres ministères** que le MESRS qu'il supervise pédagogiquement – lisez `supervisory_ministry`
(ex. `"Ministère de la Santé"` pour les 25 instituts paramédicaux, `"Ministère de la Défense nationale"`
pour les 16 écoles militaires), qui est `null` pour le réseau MESRS lui-même.

Couvrant **51 wilayas**. `wilaya_code` est relié au modèle de wilayas de
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) (schéma à 69 wilayas).

## Noms et coordonnées – provenance

L'**identité** de chaque enregistrement est à 100 % MESRS. Le réseau public's `name` (français)
et `website` proviennent de la liste du ministère ; les établissements privés et relevant d'autres
ministères sont publiés uniquement en arabe, donc ils portent `name_ar` avec `name: null`. `name_ar`
est également **rétroempli** pour le réseau public (jointure sur site web) – présent sur ~93% de tous
les enregistrements.

La page du ministère ne contient **ni coordonnées ni adresse**, donc la **géographie est
fournie ici** et étiquetée honnêtement sur chaque enregistrement via `geo_method` (le détail) et
`geo_precision` (`"exact"` pour `campus`, `"approximate"` pour `commune`/`wilaya`) :

| `geo_method` | Nombre | `geo_precision` | Ce que représente la coordonnée |
| --- | --- | --- | --- |
| `campus` | 71 | `exact` | Un point OpenStreetMap propre au campus de cet établissement, vérifié : un géocodage qui atterrit dans une wilaya différente de celle du nom de l'établissement est rejeté. |
| `commune` | 20 | `approximate` | Le centroïde de la commune de l'établissement, issu du jeu de données principal `geoalgeria`, utilisé quand aucune source ouverte ne situe le campus lui-même. |
| `wilaya` | 96 | `approximate` | Le centroïde de la wilaya de l'établissement, solution de repli quand seule la wilaya est connue. Presque chaque établissement privé/relevant d'autres ministères s'y trouve, car la source ne publie pas d'adresse pour eux. |

`wilaya_code` et `commune` sont toujours réconciliés avec le jeu de données principal
`geoalgeria`, ils font donc autorité et suivent le schéma à 69 wilayas (`commune_code` vaut
actuellement `null` sur tous les enregistrements – MESRS ne fournit aucun code commune). Les
coordonnées sont une couche d'enrichissement – précises au niveau indiqué, pas une position
de campus relevée. Régénérez-les avec `npm run geocode` (OpenStreetMap Nominatim), puis
`npm run fetch`.

## Formats

Le package npm contient le **JSON** (importable directement) :

```js
import institutions from "@geoalgeria/enseignement-superieur/data/institutions.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/enseignement-superieur/data/institutions.json
```

Les chargeurs et les structures d'enregistrement sont entièrement **typés** – les définitions TypeScript sont incluses dans le package :

```ts
import es, { type Institution } from "@geoalgeria/enseignement-superieur";
const all: Institution[] = es.institutions();
```

Les fichiers **CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et inclus dans chaque
[Release GitHub](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  institutions.json            # 187 établissements (tableau)
  metadata.json                # sources, comptages, by_type, by_sector, by_geo_method, updated
  retired-ids.json             # ids qu’aucun enregistrement ne peut reprendre, chacun renvoyé vers l’id qui porte désormais l’établissement
  csv/institutions.csv         # dépôt + bundle Release (pas dans le tarball npm)
  geojson/institutions.geojson # Entités point (les 187 placées ; 71 géocodées au campus, voir geo_method)
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
pour les établissements privés/relevant d'autres ministères publiés uniquement en arabe –
utilisez `name ?? name_ar` pour un label d'affichage. Pour les noms de wilaya et de commune en
arabe, joignez `wilaya_code` au jeu de données
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria). `wilaya_code` est complété à deux
chiffres avec un zéro ; `commune_code` vaut actuellement `null` sur tous les enregistrements.
`geo_precision` vaut `"exact"` pour un vrai point de campus ou `"approximate"` pour un centroïde
de commune/wilaya – `geo_method` précise lequel. `source` est une clé de provenance dans
`metadata.sources[]`, pas une URL : `"mesrs"` pour un enregistrement issu de la liste du réseau
universitaire, `"bac-2026"` pour un enregistrement fourni par le fichier des affectations BAC 2026,
et `"mesrs+bac-2026"` lorsque la liste fournit l'enregistrement et le fichier des affectations son
nom actuel. Voir **Source** ci-dessous pour les publications réelles.

## Besoin des divisions administratives aussi ?

Si vous avez aussi besoin des wilayas, daïras et communes pour effectuer des jointures, utilisez
le package principal
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** – il contient le jeu de données
complet des divisions de wilayas auquel `wilaya_code` fait référence ici. Utilisez
`@geoalgeria/enseignement-superieur` quand vous avez *uniquement* besoin des données
d'établissements d'enseignement supérieur.

## Source

L'identité des établissements provient du **MESRS**, via la page publique du réseau
universitaire – la [liste en anglais](https://www.mesrs.dz/en/university-network/) pour les noms
français du réseau et la [liste en arabe](https://www.mesrs.dz/reseau-universitaire-ar/) pour les
noms arabes et les établissements privés + relevant d'autres ministères que la page anglaise
omet. Exécutez `npm run fetch` pour régénérer toutes les sorties à partir des listes en ligne ;
la commande réconcilie la wilaya/commune de chaque enregistrement avec le jeu de données principal
et attache les coordonnées de référence (`scripts/seeds/coordinates.json`, actualisées avec
`npm run geocode`). Elle échoue bruyamment si le nombre d'établissements s'effondre. Les
coordonnées sont dérivées d'OpenStreetMap – voir **Noms et coordonnées** ci-dessus.

**Le fichier des affectations BAC 2026** : *Moyennes minimales BAC 2026 (suite à la première
phase)*, [publié en PDF de 350 pages](https://www.esi.dz/wp-content/uploads/2026/07/BAC-2026-Fichier-des-moyennes-minimales-apres-phase-1.pdf),
qui nomme chaque établissement où le ministère affecte les nouveaux bacheliers, par le code
d'établissement du ministère lui-même. Il décrit le réseau tel qu'il est aujourd'hui : il apporte
donc **12 établissements** que la page du réseau omet, le **nom actuel de 2** qu'elle liste
encore sous un nom plus ancien, et **une succession** : l'ENSTA (`P05`), que le décret exécutif
22-398 a faite l'héritière des deux écoles d'Alger qu'il a dissoutes et que la page du réseau
liste toujours séparément. Ces deux enregistrements disparaissent donc et leurs ids sont
renvoyés vers l'ENSTA dans `data/retired-ids.json`. Ce qui en est versionné est une projection respectueuse des
droits de ses lignes d'établissements, `sources/enseignement-superieur/bac-2026.json` : le code
d'établissement et le nom officiel français seulement, jamais les moyennes minimales par filière
et jamais le PDF, l'URL du PDF, son SHA-256, sa taille et son nombre de pages étant consignés
dans le manifeste de capture. Cette projection fait **autorité** pour le nom français de ces
enregistrements : `scripts/bac-2026.mjs` refuse tout nom de `scripts/seeds/bac-2026.json` qui ne
se réduit pas à la ligne publiée par le ministère sous ce code, de sorte que la graine peut
restituer les accents et la casse que le fichier tout en capitales perd, sans jamais introduire
un nom qui lui soit propre.

## Licence et attribution

Le code est sous [MIT](LICENSE). Les données des établissements sont © **MESRS**, redistribuées
à titre de référence et pour alimenter [GeoAlgeria](https://geoalgeria.com). Les coordonnées
sont © contributeurs OpenStreetMap (ODbL), dérivées via Nominatim. Vérifiez auprès du ministère
et de chaque établissement pour des informations faisant autorité.

[Documentation API et référence des champs →](https://geoalgeria.com/data/docs/enseignement-superieur) · [Parcourir tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [support@yasser.studio](mailto:support@yasser.studio)

GeoAlgeria est gratuit, et il le reste. Le même studio réalise aussi des cartes, des sites web, des applications mobiles et des données ouvertes pour ses clients.
