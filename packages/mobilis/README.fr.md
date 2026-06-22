[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/mobilis

**Le réseau commercial de Mobilis en Algérie — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/mobilis)](https://www.npmjs.com/package/@geoalgeria/mobilis)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/mobilis)](https://www.npmjs.com/package/@geoalgeria/mobilis)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

Les **165 agences commerciales** (*Agence Mobilis*) et les **12 180 points de
vente agréés** de **Mobilis** (ATM Mobilis), l'opérateur mobile public algérien.
Les agences disposent de noms et adresses bilingues FR/AR ainsi que de
coordonnées GPS ; les points de vente disposent du nom, de l'adresse et de la
commune. Livré en JSON, CSV et GeoJSON. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/mobilis
```

```js
import mobilis from "@geoalgeria/mobilis";

const agences = mobilis.agences();   // 165 agences Mobilis géocodées
const pdv = mobilis.pdv();           // 12 180 points de vente agréés
const all = mobilis.all();           // tout (agences en premier)

// Agences dans une wilaya (jointure sur wilaya_code de GeoAlgeria)
const inOran = agences.filter((a) => a.wilaya_code === "31");

// Points de vente dans une commune
const inBabEzzouar = pdv.filter((p) => p.commune === "BAB EZZOUAR");
```

## Ce que vous pouvez construire

- **Localisateurs d'agences** — coordonnées de chacune des 165 agences, prêtes
  pour un tri par distance ou un affichage sur carte.
- **Couverture par commune** — les points de vente sont associés à leur commune,
  ce qui permet de compter ou classer la présence de Mobilis par commune/wilaya.
- **Annuaires bilingues** — nom et adresse des agences en français et en arabe.

## Contenu

| Jeu de données | Nombre | Coordonnées | Notes |
| --- | --- | --- | --- |
| Agences (*Agence Mobilis*) | **165** | ✅ les 165 | bilingue FR/AR, 56/58 wilayas |
| Points de vente agréés | **12 180** | ❌ aucune | nom FR + adresse + commune |

> Les points de vente constituent un **annuaire au niveau communal** — la source
> ne fournit pas de coordonnées pour eux. Pour les cartographier, agrégez-les
> aux centroïdes des communes (jointure de `commune` avec les communes de
> [`geoalgeria`](https://www.npmjs.com/package/geoalgeria)) ou géocodez les
> adresses vous-même.

## Formats

Le package npm fournit le **JSON** (importable directement) :

```js
import agences from "@geoalgeria/mobilis/data/agences.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/mobilis/data/agences.json
```

Les chargeurs et les structures d'enregistrement sont entièrement **typés** — les définitions TypeScript sont incluses dans le package :

```ts
import mobilis, { type Agence, type Pdv } from "@geoalgeria/mobilis";
const agences: Agence[] = mobilis.agences();
```

Les fichiers **CSV et GeoJSON** se trouvent dans le dépôt sous [`data/`](data) et sont inclus dans chaque
[Release GitHub](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  agences.json              # 165 agences (tableau)
  pdv.json                  # 12 180 points de vente (tableau)
  metadata.json             # source, compteurs, generated_at
  csv/agences.csv           # dépôt + bundle Release (pas dans le tarball npm)
  csv/pdv.csv
  geojson/agences.geojson   # Entités Point (agences uniquement)
```

> Seules les agences sont géocodées, donc seul `agences.geojson` existe. Les
> points de vente n'ont pas de `lat`/`lng` et ne sont pas exportés en GeoJSON.

## Structures d'enregistrement

**Agence (*Agence Mobilis*)**

```json
{
  "id": "01-001",
  "code": "12237",
  "type": "agence",
  "name": "Agence Commerciale Adrar",
  "name_ar": "الوكالة التجارية أدرار",
  "address": "Rue de l'indépendance, Adrar",
  "address_ar": "شارع الإستقلال، أدرار.",
  "wilaya_code": "01",
  "lat": 27.877829,
  "lng": -0.274316
}
```

**Point de vente agréé**

```json
{
  "id": "01-001",
  "code": "2955",
  "type": "pdv",
  "name": "PDV LIBRAIRIE GAFA ABDERRAHMANE",
  "address": "RUE 17 OCTOBRE CITE 20 AOUT N 03",
  "commune": "ADRAR",
  "wilaya_code": "01",
  "lat": null,
  "lng": null
}
```

`id` est une clé stable `{wilaya_code}-{seq}` générée par GeoAlgeria (seq
ordonnée par l'identifiant source). L'identifiant propre à Mobilis est conservé
dans `code`. `wilaya_code` permet la jointure avec le `wilaya_code` de
GeoAlgeria.

## Besoin des divisions administratives ?

Pour les wilayas, daïras et communes, utilisez le package principal
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — c'est ainsi que
vous transformez la `commune` d'un point de vente en polygone ou centroïde.
Utilisez `@geoalgeria/mobilis` si vous avez *uniquement* besoin du réseau
Mobilis.

## Source

Les données proviennent du localisateur de magasins de **Mobilis**
(<https://mobilis.dz/mapagence>). Il n'existe pas d'API documentée — le
localisateur appelle quelques endpoints JSON derrière un en-tête
`X-Requested-With`, et le site est protégé par un WAF. Exécutez `npm run fetch`
pour régénérer toutes les sorties : il initialise une session, parcourt les 58
wilayas pour les deux catégories, analyse les chaînes de coordonnées
`"lat, lng"` (en gérant les lignes avec virgule décimale) et normalise les codes
de wilaya. Mobilis enregistre les données selon le **schéma à 58 wilayas**, donc
les nouvelles wilayas 59–69 apparaissent actuellement sous leur wilaya mère —
comme pour les données d'Algérie Poste et de l'ANEM.

## Licence et attribution

Le code est sous licence [MIT](LICENSE). Les données sous-jacentes sont
© **ATM Mobilis**, redistribuées à titre de référence et pour alimenter
[GeoAlgeria](https://geoalgeria.com). Vérifiez auprès de Mobilis pour des
informations officielles et en temps réel. La liste des points de vente évolue
au fil des arrivées et départs de revendeurs — chaque reconstruction reflète ce
que le localisateur affiche à ce moment-là.

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
