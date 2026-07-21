[English](README.md) | **Français** | [العربية](README.ar.md)

# GeoAlgeria

> Le package de géodonnées algériennes — 69 wilayas, 555 daïras, 1 528 communes. À un `npm install` près.

Vous copiez-collez encore des listes de wilayas depuis des PDF ? Vous utilisez encore des jeux de données bloqués à 48 wilayas ? GeoAlgeria est la première géodonnée algérienne installable via npm et validée par CI — mise à jour pour la réforme de 2026. JSON, CSV, GeoJSON, SQL, TypeScript.

[![CI](https://github.com/yasserstudio/geoalgeria/actions/workflows/ci.yml/badge.svg)](https://github.com/yasserstudio/geoalgeria/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/geoalgeria)](https://www.npmjs.com/package/geoalgeria)
[![npm downloads](https://img.shields.io/npm/dm/geoalgeria)](https://www.npmjs.com/package/geoalgeria)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## En bref

L'Algérie compte **69 wilayas** (provinces), **564 daïras** (districts) et **1 541 communes** (municipalités), officielles depuis **avril 2026**. Cela reflète deux réformes territoriales : la loi 19-12 (2019, ajout des wilayas 49 à 58) et la loi n° 26-06 du 4 avril 2026 (ajout des wilayas 59 à 69), publiée au [*Journal Officiel* n° 25 du 5 avril 2026](https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf). GeoAlgeria modélise les 69 wilayas post-réforme avec codes postaux, coordonnées GPS et noms bilingues. Cette version contient **1 528 enregistrements de communes** et **555 daïras** : un ensemble d'enregistrements présentant des problèmes de données sources a été retiré, et la réconciliation vers les 1 541 officielles est en cours (voir le [journal des modifications](CHANGELOG.md)). Dernière validation : juin 2026.

---

## Pourquoi GeoAlgeria ?

Fatigué des jeux de données qui croient encore que l'Algérie a 48 wilayas ? Nous aussi.

| Fonctionnalité | geoalgeria | leblad | algeria-cities |
|----------------|:-:|:-:|:-:|
| Les 69 wilayas (réforme 2026) | ✅ | ❌ (58) | ✅ |
| Daïras en tant qu'entités à part entière | ✅ | ❌ | ❌ |
| Codes postaux par commune | ✅ | ✅ | ❌ |
| Coordonnées par commune | ✅ | ❌ | ✅ |
| Prêt pour le e-commerce (plat, dénormalisé) | ✅ | ❌ | ❌ |
| Modèles de zones de livraison | ✅ | ❌ | ❌ |
| Package npm + TypeScript | ✅ | ✅ | ❌ |
| Export SQL (MySQL/PG/SQLite) | ✅ | ❌ | ✅ |
| Validé par CI à chaque commit | ✅ | ❌ | ❌ |
| Export GeoJSON | ✅ | ❌ | ✅ |
| Bilingue arabe + français | ✅ | ✅ | ✅ |
| Dernière mise à jour | 2026 | 2021 | 2023 |

Prêt à essayer ? Allez à [Installation](#installation) ou récupérez directement le [JSON brut](data/ecommerce/communes.json).

Également connu sous : provinces algériennes (wilayas), districts (daïras), municipalités (communes), villes d'Algérie, code postal Algérie, liste des communes d'Algérie JSON, Algeria GeoJSON, wilayas 2026, base de données wilayas Algérie, découpage administratif de l'Algérie.

---

## À qui s'adresse-t-il ?

- **Développeurs e-commerce** — formulaires d'adresse, configuration des zones de livraison, validation des codes postaux
- **Ingénieurs backend** — alimentez votre base de données avec un seul fichier SQL
- **Développeurs frontend** — menus déroulants en cascade (wilaya → daïra → commune)
- **Analystes SIG / données** — GeoJSON avec 1 528 entités ponctuelles
- **Développeurs civic tech** — applications gouvernementales, portails citoyens
- **Étudiants et chercheurs** — données propres, structurées et bien documentées

---

## Installation

```bash
npm install geoalgeria
```

```javascript
const dz = require('geoalgeria');

dz.wilayas;                    // les 69 wilayas
dz.communes;                   // les 1 528 communes
dz.dairas;                     // les 555 daïras
dz.ecommerce;                  // jeu de données plat pour formulaires d'adresse
dz.postOffices;                // 3 908 bureaux Algérie Poste
dz.atms;                       // 2 026 distributeurs automatiques

dz.getWilaya(16);              // { name_fr: "Alger", name_ar: "الجزائر", ... }
dz.getCommunesByWilaya(16);    // 57 communes à Alger
dz.getDairasByWilaya(16);      // daïras d'Alger
dz.findCommune('Oran');        // recherche par nom (FR ou AR)
dz.findByPostalCode('16000');  // recherche par code postal
dz.getPostOfficesByCommune(1731); // bureaux de poste d'une commune (par code_commune)
```

Types TypeScript inclus nativement.

**Vous utilisez ces données en production ?** [Dites-le nous](https://github.com/yasserstudio/geoalgeria/discussions) — nous mettons en avant les projets de la communauté dans le README.

---

## Utilisation sans npm

### CDN (aucune installation requise)

```html
<script>
  fetch('https://cdn.jsdelivr.net/npm/geoalgeria/data/ecommerce/communes.json')
    .then(r => r.json())
    .then(communes => { /* construisez votre menu déroulant */ });
</script>
```

### E-commerce / formulaires d'adresse

Récupérez `data/ecommerce/communes.json` — plat, dénormalisé, sans jointures :

```json
{
  "id": 541,
  "commune_name_fr": "Ain El Ibel",
  "commune_name_ar": "عين الإبل",
  "daira_name_fr": "Aïn El Ibel",
  "wilaya_code": 17,
  "wilaya_name_fr": "Djelfa",
  "wilaya_name_ar": "الجلفة",
  "postal_code": "17011"
}
```

### Alimentation de base de données

Téléchargez `data/sql/full.sql` depuis ce dépôt, puis :

```bash
# PostgreSQL
psql -d mydb -f full.sql

# MySQL
mysql mydb < full.sql

# SQLite
sqlite3 mydb.sqlite < full.sql
```

### SIG / Cartographie

Téléchargez `data/geojson/communes.geojson` depuis ce dépôt — GeoJSON standard, compatible avec Leaflet, Mapbox, QGIS, etc.

> **Note :** le package npm ne contient que les fichiers JSON (pour rester léger). Les exports **CSV, GeoJSON et SQL** se trouvent dans le dépôt sous `data/` et sont inclus dans l'archive zip de chaque [release GitHub](https://github.com/yasserstudio/geoalgeria/releases).

---

## Tous les fichiers

| Fichier | Format | Enregistrements | Idéal pour |
|---------|--------|-----------------|------------|
| `data/algeria.json` | JSON | 69 wilayas + communes | Utilisation en fichier unique |
| `data/wilayas.json` | JSON | 69 | Liste des wilayas uniquement |
| `data/dairas.json` | JSON | 555 | Liste des daïras avec nombre de communes |
| `data/communes_w*.json` | JSON | 1 528 | Données détaillées des communes |
| `data/csv/wilayas.csv` | CSV | 69 | Tableurs, imports |
| `data/csv/communes.csv` | CSV | 1 528 | Tableurs, imports |
| `data/geojson/wilayas.geojson` | GeoJSON | 69 | Cartes, SIG |
| `data/geojson/communes.geojson` | GeoJSON | 1 528 | Cartes, SIG |
| `data/sql/full.sql` | SQL | 69 + 1 528 | Base de données normalisée |
| `data/ecommerce/communes.json` | JSON | 1 528 | Formulaires d'adresse, menus déroulants |
| `data/ecommerce/communes.csv` | CSV | 1 528 | Import plat |
| `data/ecommerce/communes.sql` | SQL | 1 528 | Base de données mono-table |
| `data/delivery/*.json` | JSON | 69 par transporteur | Calcul de zones de livraison |
| `data/poste/postoffices.json` | JSON | 3 908 | Bureaux de poste (codes réels, coordonnées) |
| `data/poste/atms.json` | JSON | 2 026 | Emplacements des distributeurs |
| `data/poste/csv/*`, `data/poste/geojson/*` | CSV/GeoJSON | — | Données postales pour tableurs / cartes |

> `data/poste/` provient d'[Algérie Poste](https://baridimap.poste.dz). `commune_code` se joint au `code_commune` de chaque commune.

## Schéma

Voir [`data/README.md`](data/README.md) pour la documentation complète des champs.

---

## Contribuer

Voir [CONTRIBUTING.md](https://github.com/yasserstudio/geoalgeria/blob/main/CONTRIBUTING.md). Nous accueillons :

- Corrections de données (avec sources officielles)
- Valeurs `code_commune` manquantes (10 restantes)
- Données de zones de livraison provenant de vrais comptes transporteurs (Yalidine, ZR Express, Maystro)
- Nouveaux formats d'export (XML, YAML, tableaux PHP, etc.)
- Corrections de traductions et de translittération

**Première contribution ?** Cherchez les issues avec le label `good first issue` — beaucoup ne nécessitent que d'ajouter les coordonnées d'une seule commune.

---

## Versionnement

Ce jeu de données utilise le [versionnement sémantique](https://semver.org/). Voir [CHANGELOG.md](CHANGELOG.md).

---

## L'écosystème GeoAlgeria

`geoalgeria` est la couche administrative de base. Les jeux de données thématiques s'installent à côté et se joignent via `wilaya_code` :

| Package | Contenu |
| --- | --- |
| [`@geoalgeria/poste`](https://www.npmjs.com/package/@geoalgeria/poste) | Bureaux de poste et distributeurs (Algérie Poste) |
| [`@geoalgeria/emploi`](https://www.npmjs.com/package/@geoalgeria/emploi) | Agences pour l'emploi (ANEM : AWEM + ALEM) |
| [`@geoalgeria/mobilis`](https://www.npmjs.com/package/@geoalgeria/mobilis) | Agences et points de vente agréés Mobilis |
| [`@geoalgeria/telecom`](https://www.npmjs.com/package/@geoalgeria/telecom) | Couverture 5G multi-opérateurs (Djezzy, Mobilis, Ooredoo) |
| [`@geoalgeria/aviation`](https://www.npmjs.com/package/@geoalgeria/aviation) | Aéroports civils avec codes OACI (ANAC) |
| [`@geoalgeria/banques`](https://www.npmjs.com/package/@geoalgeria/banques) | Banques agréées, institutions et agences (RIB/SWIFT) |
| [`@geoalgeria/livraison`](https://www.npmjs.com/package/@geoalgeria/livraison) | Transporteurs et points-relais géocodés |
| [`@geoalgeria/jeunesse`](https://www.npmjs.com/package/@geoalgeria/jeunesse) | Établissements de jeunesse et sports (Ministère de la Jeunesse) |
| [`@geoalgeria/enseignement-superieur`](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur) | Réseau de l'enseignement supérieur — universités, grandes écoles, ENS, centres (MESRS) |
| [`@geoalgeria/tourisme`](https://www.npmjs.com/package/@geoalgeria/tourisme) | Infrastructure touristique — hôtels, attractions, sites historiques, sources thermales, parcs (ASAL, OSM, Wikidata) |
| [`@geoalgeria/formation-professionnelle`](https://www.npmjs.com/package/@geoalgeria/formation-professionnelle) | Formation professionnelle — CFPA, INSFP, IFEP, centres privés (MFEP / takwin.dz) |
| [`@geoalgeria/sports`](https://www.npmjs.com/package/@geoalgeria/sports) | Installations sportives — stades, piscines, terrains, pistes (Ministère de la Jeunesse et des Sports) |
| [`@geoalgeria/djezzy`](https://www.npmjs.com/package/@geoalgeria/djezzy) | Boutiques Djezzy — points de vente géocodés avec catégorie et horaires (djezzy.dz) |
| [`@geoalgeria/mosquees`](https://www.npmjs.com/package/@geoalgeria/mosquees) | Mosquées — composite Wikidata + OpenStreetMap, bilingue, les 69 wilayas |
| [`@geoalgeria/sante`](https://www.npmjs.com/package/@geoalgeria/sante) | Établissements de santé publics — EPH, EPSP, EHS, CHU (Ministère de la Santé), bilingues, géolocalisés via OSM + Wikidata |
| [`@geoalgeria/culture`](https://www.npmjs.com/package/@geoalgeria/culture) | Atlas culturel — sites protégés, musées, théâtres, bibliothèques + établissements culturels (Ministère de la Culture), bilingue, entièrement géolocalisé |
| [`@geoalgeria/agriculture`](https://www.npmjs.com/package/@geoalgeria/agriculture) | Institutions agricoles — directions des services agricoles (DSA), conservations des forêts, instituts de recherche/formation, chambres d'agriculture, offices et groupes publics (Ministère de l'Agriculture), bilingue, géolocalisé |
| [`@geoalgeria/ecoles`](https://www.npmjs.com/package/@geoalgeria/ecoles) | Écoles — 11 830 écoles primaires, CEM, lycées et préscolaires classées par cycle, bilingue, les 69 wilayas (OpenStreetMap) |
| [`@geoalgeria/gares-routieres`](https://www.npmjs.com/package/@geoalgeria/gares-routieres) | Gares routières — 74 gares SOGRAL sur 51 wilayas, géolocalisées avec surfaces et rattachement commune/wilaya |
| [`@geoalgeria/ferroviaire`](https://www.npmjs.com/package/@geoalgeria/ferroviaire) | Rail & transport urbain — 692 nœuds train/tram/métro/télécabine/gondole (SNTF/SETRAM/SEMA), composite Wikidata + OpenStreetMap, bilingue |
| [`@geoalgeria/buses`](https://www.npmjs.com/package/@geoalgeria/buses) | Réseaux de bus urbains — 50 lignes ETUSA (Alger) avec terminus, nombre d'arrêts, communes et stations desservies (niveau ligne v1) |
| [`@geoalgeria/industrie-pharmaceutique`](https://www.npmjs.com/package/@geoalgeria/industrie-pharmaceutique) | Fabricants pharmaceutiques — 171 fabricants agréés de médicaments & dispositifs médicaux du Ministère de l'Industrie Pharmaceutique, bilingues, géolocalisés |
| [`@geoalgeria/pharmacies`](https://www.npmjs.com/package/@geoalgeria/pharmacies) | Pharmacies (officines) — 3 790 géolocalisées sur 67 wilayas depuis OpenStreetMap, bilingues si nommées |
| [`@geoalgeria/ooredoo`](https://www.npmjs.com/package/@geoalgeria/ooredoo) | Points de vente Ooredoo — 572 EO / City Shop / Espace Services avec coordonnées réelles ; complète le trio télécom |
| [`@geoalgeria/transport`](https://www.npmjs.com/package/@geoalgeria/transport) | Ombrelle transport — installe aviation + ferroviaire + gares-routieres + buses en une étape |
| [`@geoalgeria/pharma`](https://www.npmjs.com/package/@geoalgeria/pharma) | Parapluie pharma — installe industrie-pharmaceutique + pharmacies en une fois |

Liste complète et monorepo : [github.com/yasserstudio/geoalgeria](https://github.com/yasserstudio/geoalgeria).

---

## Construit avec ces données

Vous utilisez geoalgeria dans votre projet ? [Ouvrez une discussion](https://github.com/yasserstudio/geoalgeria/discussions) et nous le mettrons en avant ici.

---

## Soutien

Chaque étoile aide le prochain développeur algérien à trouver des données propres au lieu de PDF cassés. **[Mettez une étoile à ce dépôt](https://github.com/yasserstudio/geoalgeria)** si cela vous a fait gagner du temps.

Des données incorrectes ? [Ouvrez une issue](https://github.com/yasserstudio/geoalgeria/issues/new/choose) — nous corrigeons sous 48h, garanti.

---

## Sponsoriser

GeoAlgeria est gratuit et sous licence MIT. Si cela vous fait gagner du temps, [**sponsorisez sa maintenance**](https://github.com/sponsors/yasserstudio) — les sponsorisations financent la mise à jour des données à chaque réforme et l'expansion de GeoAlgeria vers *tous* les types de données ouvertes sur l'Algérie.

---

## Aperçu

Visualisez les 69 wilayas sur une carte : [`algeria.geojson`](algeria.geojson) (GitHub affiche automatiquement ce fichier)

---

## FAQ

**Combien de wilayas compte l'Algérie en 2026 ?**
69. Les 48 d'origine, plus 10 ajoutées en 2019 (loi 19-12), plus 11 officialisées en avril 2026 ([loi n° 26-06, *Journal Officiel* n° 25 du 5 avril 2026](https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf)). La période de transition se termine le 31 décembre 2026 ; pleine autonomie à compter du 1er janvier 2027.

**Où trouver une liste de toutes les communes algériennes en JSON ?**
Ici même — `data/ecommerce/communes.json` contient les 1 528 communes dans un format plat, prêt à l'emploi.

**Quelles sont les nouvelles wilayas ajoutées en 2026 ?**
Les wilayas 59 à 69 (numérotées par ordre de code de la wilaya mère) : 59 Aflou (depuis Laghouat), 60 Barika (depuis Batna), 61 El Kantara (depuis Biskra), 62 Bir El Ater (depuis Tébessa), 63 El Aricha (depuis Tlemcen), 64 Ksar Chellala (depuis Tiaret), 65 Aïn Oussara (depuis Djelfa), 66 Messaad (depuis Djelfa), 67 Ksar El Boukhari (depuis Médéa), 68 Bou Saâda (depuis M'sila), 69 El Abiodh Sidi Cheikh (depuis El Bayadh).

**Comment obtenir les codes postaux algériens au format JSON ?**
Installez `geoalgeria` via npm ou téléchargez directement `data/ecommerce/communes.json` — il contient les 1 528 codes postaux associés aux noms de communes en français et en arabe.

**Quel est le meilleur package de géodonnées algériennes pour les développeurs ?**
GeoAlgeria est l'option la plus complète en 2026 — c'est le seul package npm avec les 69 wilayas, codes postaux, coordonnées, daïras et modèles de zones de livraison en une seule installation. Validé par CI à chaque commit.

**Liste des wilayas d'Algérie 2026 — où trouver ?**
GeoAlgeria contient les 69 wilayas avec noms en français et arabe, codes postaux, et coordonnées GPS. Disponible en JSON, CSV, GeoJSON, et SQL. `npm install geoalgeria`

---

## Licence

MIT — libre pour usage personnel et commercial.

Réalisé avec soin par [Yasser's Studio](https://yasser.studio) | [geoalgeria.com](https://geoalgeria.com)

[Documentation API et référence des champs →](https://geoalgeria.com/data/docs/geoalgeria) · [Parcourir tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
