[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/formation-professionnelle

**Tous les établissements de formation professionnelle d'Algérie — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/formation-professionnelle)](https://www.npmjs.com/package/@geoalgeria/formation-professionnelle)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/formation-professionnelle)](https://www.npmjs.com/package/@geoalgeria/formation-professionnelle)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

1 932 établissements de formation professionnelle à travers l'Algérie — **CFPA**, **INSFP**,
**IFEP**, **IEP**, **DFEP** et centres privés agréés — chacun avec son nom officiel (arabe,
avec le français quand disponible), **type** d'établissement, **capacité**, informations
d'**internat**, **coordonnées de contact** détaillées (téléphone, fax, email, site web,
Facebook) et coordonnées GPS. Source : **Ministère de la Formation et de l'Enseignement
Professionnels (MFEP)** via [takwin.dz](https://takwin.dz), distribué en JSON, CSV et GeoJSON.
Fait partie de [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/formation-professionnelle
```

```js
import fp from "@geoalgeria/formation-professionnelle";

const all = fp.establishments();                    // 1 932
const byWilaya = fp.establishmentsByWilaya(16);     // établissements de la wilaya 16
const cfpas = fp.establishmentsByType("cfpa");      // tous les CFPA
const one = fp.establishmentById(1);                // un seul enregistrement par id

// 1 375 enregistrements ont lat/lng — tri par distance, carte ou centre le plus proche en quelques lignes.
```

## Ce que vous pouvez construire

- **Recherche du centre de formation le plus proche** — 1 375 enregistrements géocodés, prêts pour le tri par distance.
- **Annuaires de formation professionnelle** — noms bilingues, type, capacité et coordonnées de contact complètes.
- **Cartes** — couche de points GeoJSON prête à l'emploi pour le réseau de formation professionnelle (71 % géocodés).
- **Planification des capacités** — capacités théoriques et réelles, disponibilité d'internat et superficie.
- **Analyse sectorielle** — 1 209 établissements publics contre 723 privés à travers 58 wilayas.

## Contenu

| Type | Code | Nombre |
| --- | --- | --- |
| Centre de Formation Professionnelle et de l'Apprentissage | `cfpa` | 856 |
| Centre privé accrédité | `prive` | 723 |
| Institut National Spécialisé de Formation Professionnelle | `insfp` | 182 |
| Annexe CFPA | `annexe_cfpa` | 70 |
| Direction de la Formation et de l'Enseignement Professionnels | `dfep` | 58 |
| Institut d'Enseignement Professionnel | `iep` | 18 |
| Annexe CNFEPD | `annexe_cnfepd` | 9 |
| Annexe INSFP | `annexe_insfp` | 9 |
| Institut de Formation et d'Enseignement Professionnel | `ifep` | 6 |
| Institut National de la Formation et de l'Enseignement Professionnels | `infep` | 1 |
| **Total** | | **1 932** |

Couvrant **58 wilayas** (schéma pré-réforme). 1 375 des 1 932 établissements sont géocodés
(71 %) — `lat`/`lng` est `null` pour les 557 restants. `wilaya_code` utilise le schéma
à 58 wilayas tel que publié par la source.

## Formats

Le package npm fournit le **JSON** (importable directement) :

```js
import establishments from "@geoalgeria/formation-professionnelle/data/establishments.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/formation-professionnelle/data/establishments.json
```

Les chargeurs et les formes d'enregistrement sont entièrement **typés** — les définitions TypeScript sont incluses dans le package :

```ts
import fp, { type Establishment } from "@geoalgeria/formation-professionnelle";
const all: Establishment[] = fp.establishments();
```

Les formats **CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et inclus dans chaque
[Release GitHub](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  establishments.json      # 1 932 établissements (tableau)
  metadata.json            # source, comptages, by_type, by_secteur, geocoded, generated_at
  csv/                     # Export CSV (dépôt + bundle Release, pas dans le tarball npm)
  geojson/                 # Entités GeoJSON (1 375 points géocodés)
```

## Structure d'un enregistrement

```json
{
  "id": 1,
  "name": "مديرية التكوينو التعليم المهنيينأدرار",
  "name_fr": "DFEPADRAR",
  "type": "dfep",
  "type_label": "مديرية التكوين والتعليم المهنيين",
  "abreviation": "DFEP ADRAR",
  "code": "0100",
  "secteur": "public",
  "commune": "أدرار",
  "wilaya_code": "01",
  "lat": null,
  "lng": null,
  "adresse": "حي 103مسكن أدرار",
  "adresse_fr": "Cité 103 logtAdrar",
  "telephone": "049364333",
  "fax": "049364332",
  "email": "dfpadrar@gmail.com",
  "site_web": null,
  "facebook": "www.facebook.com/profile.php?id=100057469388259",
  "capacite": null,
  "capacite_reelle": null,
  "surface_m2": 2443.42,
  "internat": false,
  "capacite_internat": null,
  "vocations": null,
  "source": "takwin.dz (MFEP)"
}
```

`id` est un entier stable commençant à 1. Les noms sont bilingues — `name` est en arabe
(toujours présent), `name_fr` est en français (peut être `null`). `type` est un slug
correspondant à l'un des dix types d'établissements listés ci-dessus. `secteur` est
`"public"` ou `"prive"`. `wilaya_code` est complété à deux chiffres avec un zéro dans le
schéma à 58 wilayas. `lat`/`lng` sont `null` pour les 29 % d'enregistrements non encore
géocodés. `capacite` (théorique) et `capacite_reelle` (réalisée) sont des nombres de places ;
`internat` indique la disponibilité d'un internat avec un `capacite_internat` optionnel.
`vocations` est un tableau de spécialisations quand disponible.

## Besoin aussi des divisions administratives ?

Si vous avez également besoin des wilayas, daïras et communes pour des jointures, utilisez
le package principal **[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — il fournit
le jeu de données complet des 69 wilayas. Utilisez `@geoalgeria/formation-professionnelle`
quand vous avez *uniquement* besoin des données de formation professionnelle.

## Source

Les données proviennent du **MFEP — Ministère de la Formation et de l'Enseignement
Professionnels**, via [takwin.dz](https://takwin.dz). La source utilise le **schéma
pré-réforme à 58 wilayas**. Exécutez `npm run fetch` pour régénérer toutes les sorties à
partir du site en direct. Les noms, types, contacts, capacités et coordonnées sont tels
que publiés par le ministère.

## Licence et attribution

Le code est sous licence [MIT](LICENSE). Les données sous-jacentes sont &copy; **MFEP**,
redistribuées à titre de référence et pour alimenter [GeoAlgeria](https://geoalgeria.com).
Vérifiez auprès du ministère pour des informations officielles et en temps réel.

[Documentation API et référence des champs →](https://geoalgeria.com/data/docs/formation-professionnelle) · [Parcourir tous les paquets →](https://geoalgeria.com/data)

---

Fait par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
