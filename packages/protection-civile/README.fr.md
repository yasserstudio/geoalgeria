[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/protection-civile

**Les unités de la Protection Civile d'Algérie, sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/protection-civile)](https://www.npmjs.com/package/@geoalgeria/protection-civile)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/protection-civile)](https://www.npmjs.com/package/@geoalgeria/protection-civile)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

# Aperçu

**880 unités de la Protection Civile** réparties sur toutes les wilayas, directement issues du **jeu de données de la DGPC** (dgpc.dz), chaque unité avec un nom arabe, une adresse, téléphone et fax, un palier de statut (`statut`) et une coordonnée DGPC réelle. C'est une source **officielle primaire** : la DGPC est la source d'autorité « cette unité existe ici ».

## Installation

```bash
npm install @geoalgeria/protection-civile
```

## Démarrage rapide

```js
import {
  units,
  unitById,
  unitsByWilaya,
  unitsByStatut,
  metadata,
} from "@geoalgeria/protection-civile";

units().length; // 880
unitsByWilaya(16).length; // Alger
unitsByStatut("UNITE PRINCIPALE").length;
unitById("16-001")?.commune;
metadata().wilayas_covered; // 69
```

## Ce que vous pouvez construire

- Un localisateur ou une couche cartographique de protection civile / secours & incendie pour l'Algérie
- Une analyse de la couverture des secours par wilaya
- Une couche de base à joindre aux bulletins DGPC en temps réel

## Contenu

| Jeu de données | Nombre | Coordonnées | Notes |
| --- | --- | --- | --- |
| `protection-civile` | 880 | les 880 | DGPC (dgpc.dz), géocodé, rattachement wilaya post-réforme 2026 |

**Par palier de statut (`statut`) :** UNITE SECONDAIRE 444 · POSTE AVANCE 146 · UNITE DE SECTEUR 132 · UNITE PRINCIPALE 62 · SIEGE DE DIRECTION WILAYA 58 · POSTE DE SECOURS ROUTIER 20 · UNITE MARINE 15 · U.N D'INSTRUCTION ET D'INTERVENTION 1 · DIRECTION GENERALE 1 · CELLULE DE SECURITE 1

Chaque unité porte `tel`, `fax` et `address` ; **780** communes rattachées par nom, le reste au centroïde le plus proche.

## Formats

- `data/protection-civile.json`, tableau complet (typé par `types/index.d.ts`)
- `data/csv/protection-civile.csv`, CSV à plat
- `data/geojson/protection-civile.geojson`, `FeatureCollection`
- `data/metadata.json`, comptes, sources, date de génération

## Comment les données sont construites

Téléchargé depuis le GeoJSON de la DGPC (`dgpc.dz/dgpc2/unite.geojson`). Les coordonnées proviennent du `x`/`y` décimal de chaque entité. Le `wilaya_code` est dérivé par point-dans-polygone contre les 69 limites de wilayas post-réforme 2026, puis **réconcilié avec le `cod_wilaya` propre à la DGPC** (pré-réforme, codes `"01".."58"`) : les unités désormais dans les 11 nouvelles wilayas 2026 portent leur nouveau code correct (géométrie `59..69`), mais lorsque la géométrie et le code DGPC divergent entre codes pré-réforme, une unité frontalière mal classée par un contour simplifié à `~150 m`, le code officiel de la DGPC l'emporte et la commune est re-rapprochée là. Le code DGPC est conservé tel quel dans `refs.dgpc_wilaya` comme reçu. La commune est au mieux, le nom arabe `commune_1` est rapproché du jeu de communes geoalgeria dans la wilaya résolue (repli au centroïde le plus proche). Reconstruire avec `npm run fetch` (ou `--cache` pour repartir du tirage en cache). Voir `research/protection-civile/` dans le monorepo.

> **Risque connu, clés de report.** Les ids publics stables sont reportés d'une reconstruction à l'autre via l'`objectid` de la DGPC (`refs.dgpc`), un identifiant de substitution de type ArcGIS que la DGPC pourrait renuméroter de son côté. La reconstruction journalise un décompte de reports ; une chute soudaine sous ~880 signifie que le substitut a été renuméroté, comparez les ids avant de committer plutôt que de les laisser se régénérer.

## Précision & couverture

> **C'est le réseau complet publié par la DGPC, 880 unités.** Chaque unité porte une coordonnée DGPC réelle ; quelques points coïncidents sont honnêtement marqués `approximate` (`geo_precision`), le reste `exact`. Il n'y a pas de nom français dans la source, donc `name_fr` n'est pas dérivé, rien n'est traduit automatiquement. La commune est un rapprochement par nom (au mieux) ; **la wilaya est dérivée de la géométrie puis recoupée avec le code propre à la DGPC**: les conflits entre codes pré-réforme (une unité frontalière mal classée par un contour simplifié) se résolvent au code officiel de la DGPC.
>
> Le `cod_wilaya` d'origine de la DGPC est pré-réforme 2026 et n'est conservé que dans `refs.dgpc_wilaya`. Utilisez `wilaya_code` (le code post-réforme dérivé de la géométrie) pour tout rattachement wilaya.

## Source & licence

Données © **Direction Générale de la Protection Civile (DGPC)**: contenu officiel public, redistribué ici pour référence. **Aucune licence ouverte** ; à traiter comme un listing public factuel avec attribution de la DGPC. Le rattachement wilaya/commune utilise le jeu de données de base geoalgeria. Code du paquet sous licence MIT (voir [LICENSE](LICENSE)).

## Questions ?

Ouvrez une issue : https://github.com/yasserstudio/geoalgeria/issues
