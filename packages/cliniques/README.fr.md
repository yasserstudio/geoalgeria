[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/cliniques

**Les cliniques et structures de soins d'Algérie, en données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/cliniques)](https://www.npmjs.com/package/@geoalgeria/cliniques)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/cliniques)](https://www.npmjs.com/package/@geoalgeria/cliniques)
[![License: MIT AND ODbL-1.0](https://img.shields.io/badge/License-MIT%20AND%20ODbL--1.0-green.svg)](LICENSE)

</div>

**1 894 structures de soins géolocalisées** sur **66 wilayas**, toutes avec
coordonnées, classées par **type** (polyclinique · salle de soins · centre de
santé · maternité · clinique), la plupart avec des noms arabes et/ou français, et
un rattachement commune/wilaya. Extraites d'**OpenStreetMap**. C'est le **volet
communautaire** du secteur santé : le registre du Ministère de la Santé
(CHU/EPH/EHS/EPSP) en est volontairement *exclu* et se trouve dans
[`@geoalgeria/sante`](https://www.npmjs.com/package/@geoalgeria/sante). Livré en
JSON, CSV, GeoJSON et TypeScript. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/cliniques
```

```js
import cliniques from "@geoalgeria/cliniques";

const all = cliniques.cliniques();   // 1 894 structures géolocalisées

// Le volet public de proximité d'une wilaya
const proximite = cliniques.cliniquesByWilaya("16")
  .filter((c) => c.type === "polyclinique" || c.type === "salle_de_soins");

// Les structures qui déclarent un service d'urgences
const urgences = all.filter((c) => c.emergency);
```

## Ce que vous pouvez construire

- **Des localisateurs « soins près de chez moi »**, coordonnées sur les 1 894
  enregistrements, prêts pour une carte ou un tri par distance.
- **Des cartes de couverture de proximité**, comptez polycliniques et salles de
  soins par commune ou wilaya, les structures que les Algériens poussent en premier.
- **Des annuaires bilingues**, des milliers de noms arabes et français côte à
  côte, avec téléphone, horaires et spécialité quand la carte les porte.

## Ce qu'il y a dedans

| Jeu de données | Nombre | Coordonnées | Notes |
| --- | --- | --- | --- |
| Structures de soins | **1 894** | ✅ toutes | 1 617 nommées, 66 wilayas |

**Par type**

| Type | Nombre | Signification |
| --- | --- | --- |
| `clinique` | 1 098 | clinique (عيادة / مصحة), majoritairement privée |
| `polyclinique` | 411 | polyclinique (عيادة متعددة الخدمات), volet public de proximité |
| `salle_de_soins` | 206 | salle de soins / dispensaire (قاعة علاج / مستوصف) |
| `centre_sante` | 137 | centre de santé / centre de soins (مركز صحي) |
| `maternite` | 28 | maternité / clinique d'accouchement (مصحة توليد) |

> **C'est un extrait OpenStreetMap, pas un registre officiel.** La couverture est
> partielle et inégale selon les wilayas, et trois wilayas (54 In Guezzam,
> 62 Bir El Ater, 63 El Aricha) ne portent aucune structure cartographiée. Aucune
> source officielle ne dénombre cette population : le paquet ne publie donc
> **aucun pourcentage de couverture**. Le Ministère de la Santé publie des
> comptes pour le volet registre que ce paquet exclut, et aucun registre public
> ne liste les cliniques privées. Les chiffres bougent au fil des contributions.

> **Ce paquet ne republie jamais un élément OSM déjà publié par [`@geoalgeria/sante`](https://www.npmjs.com/package/@geoalgeria/sante), et les deux ne s'additionnent pas.**
> `sante` est le volet *registre* : 695 établissements publics (CHU, EPH, EHS,
> EPSP) du Ministère de la Santé. Ce paquet est le volet *communautaire*. 121 des
> enregistrements de `sante` référencent un élément OSM par identifiant, et
> chacun de ces éléments est exclu ici **par construction** : aucun lieu n'est
> publié deux fois sous le même élément OSM. Soyons précis sur ce que cela ne
> garantit pas : les 574 autres enregistrements de `sante` ne portent aucune
> référence OSM, donc un même établissement physique peut malgré tout figurer
> dans les deux paquets, sous des coordonnées et des identifiants différents,
> sans qu'aucun mécanisme ne puisse le détecter. Les deux décrivent des volets
> différents : additionner 695 et 1 894 ne compte rien de réel.

**Le type est déduit du nom.** Une polyclinique se nomme
polyclinique/عيادة متعددة الخدمات, une salle de soins قاعة علاج/مستوصف/dispensaire,
un centre de santé مركز صحي/centre de soins. L'ordre compte : les mots de
structure sont testés *avant* le mot « hôpital »/مستشفى, que les contributeurs
algériens emploient aussi pour des structures de proximité (10 enregistrements
portent les deux, par ex. « Polyclinique des consultations spécialisées » avec
`name:ar=مستشفى بودغن`). Le mot simple « clinique »/عيادة/مصحة compte aussi comme
mot de structure, un rang sous les trois types précis. Le reste est `clinique`,
y compris les 276 points non nommés tagués `clinic`, que le tag suffit à
identifier comme structures de soins.

**Ce qui a été exclu, et pourquoi.** L'extraction ramène 2 936 éléments OSM ;
990 sont écartés avant toute émission :

| Exclu | Nombre | Raison |
| --- | --- | --- |
| `hopital` | 359 | hôpital / مستشفى / المؤسسة الاستشفائية / EPH / EHS / EHU / centre anti-cancer, le volet registre (`@geoalgeria/sante`) |
| `unnamed_hospital` | 239 | aucun nom *et* tagué hôpital, donc indistinguable du volet registre |
| `sante_overlap` | 89 | l'élément OSM est déjà publié par un enregistrement **hospitalier** (CHU/EPH/EHS) de `@geoalgeria/sante`, quel que soit son nom ici. Les éléments référencés par un enregistrement *EPSP* de sante ne sont pas exclus : la référence y sert d'ancrage de géocodage sur le siège de l'entité, et l'élément visé est en général une structure que ce paquet doit porter |
| `cabinet` | 96 | cabinet individuel : le mot cabinet, ou un nom qui n'est qu'un praticien (Dr X, الطبيب …) |
| `epsp_entity` | 92 | l'entité administrative EPSP elle-même (ses structures restent) |
| `hospital_subfeature` | 58 | partie d'un hôpital cartographiée à part : une entrée, un service, « Service de radiologie », un simple « urgences » |
| `pharmacie` | 6 | pharmacie, relève de [`@geoalgeria/pharmacies`](https://www.npmjs.com/package/@geoalgeria/pharmacies) |
| `chu` | 15 | centre hospitalo-universitaire |
| `institut_pasteur` | 3 | institut de recherche plutôt que structure de soins |
| `paramedical` | 2 | école paramédicale, formation plutôt que soins |

Les hôpitaux sont interrogés exprès bien qu'aucun ne soit livré : c'est le seul
moyen d'atteindre les structures de soins taguées `amenity=hospital`.

**Les établissements hospitaliers privés sont gardés, volontairement.** Un
« EHP », établissement hospitalier privé, est une *clinique privée*, soit
exactement la population de ce paquet : le test de propriété passe donc avant
tous les motifs registre, et ces enregistrements entrent en `clinique` avec
`sector: "private"`. C'est précisément pourquoi l'ordre compte : EHP (privé) ne
doit jamais être lu comme EPH (public).

**Le secteur n'est affirmé que sur signal.** `public` quand OSM porte
`operator:type` (y compris `university`, un EHU étant un opérateur public
d'enseignement), ou structurellement pour `polyclinique` et `salle_de_soins`
(deux structures publiques par définition dans le système algérien) ; `private`
sur `operator:type=private` ou un nom en privé/خاصة lu sur toutes les balises de
nom, un enregistrement pouvant ne porter son signal que dans `name:en`. 629
enregistrements sont publics, 67 privés, et les 1 184 restants demeurent `null`.
La plupart des cliniques sont privées en pratique, mais la carte ne le dit pas.

**Aussi sur chaque enregistrement :** `speciality` (depuis
`healthcare:speciality`, sur 158), `address` (depuis les tags `addr:*`, sur 634),
`phone` (sur 106), `opening_hours` (sur 166) et `emergency` (`true` sur les 68
enregistrements tagués `emergency=yes`, jamais `false` : un silence de la carte
n'est pas une affirmation d'absence d'urgences).

## Formats

Le paquet npm livre le **JSON** (importable directement) :

```js
import cliniques from "@geoalgeria/cliniques/data/cliniques.json" with { type: "json" };
// ou via CDN, sans installation :
// https://cdn.jsdelivr.net/npm/@geoalgeria/cliniques/data/cliniques.json
```

Les chargeurs et les formes d'enregistrement sont entièrement **typés** :

```ts
import cliniques, { type Clinique } from "@geoalgeria/cliniques";
const all: Clinique[] = cliniques.cliniques();
```

**CSV et GeoJSON** sont dans le dépôt sous [`data/`](data) et joints à chaque
[Release GitHub](https://github.com/yasserstudio/geoalgeria/releases) :

```
data/
  cliniques.json              # 1 894 structures (tableau)
  metadata.json               # sources, comptes, couverture, mise à jour
  csv/cliniques.csv           # dépôt + bundle Release (pas dans le tarball npm)
  geojson/cliniques.geojson   # entités Point
```

## Forme d'un enregistrement

```json
{
  "id": "02-00006",
  "name": "عيادة متعددة الخدمات",
  "name_fr": null,
  "name_ar": "عيادة متعددة الخدمات",
  "wilaya_code": "02",
  "commune_code": "0207",
  "commune": "Beni Haoua",
  "lat": 36.530021,
  "lng": 1.58226,
  "geo_precision": "exact",
  "geo_method": "osm_node",
  "source": "osm",
  "refs": {
    "osm": "node/4144869592"
  },
  "type": "polyclinique",
  "type_label_fr": "Polyclinique",
  "type_label_ar": "عيادة متعددة الخدمات",
  "sector": "public",
  "speciality": null,
  "address": null,
  "phone": "027753479",
  "opening_hours": "24/7",
  "emergency": null
}
```

`id` est une clé stable `{wilaya_code}-{seq}` synthétisée par GeoAlgeria, unique
dans ce jeu de données ; l'élément OSM apparié est conservé dans `refs.osm`.
`name` est le meilleur nom d'affichage disponible et vaut `null` pour les points
non nommés. `type` porte des libellés bilingues. `speciality`, `address`, `phone`
et `opening_hours` viennent directement d'OSM (`null` si les tags sont absents).
`sector` ne vaut `"public"`/`"private"` que sur signal explicite, sinon `null`.
`geo_precision` vaut `"exact"` pour un nœud OSM relevé ou `"approximate"` pour un
centroïde de bâtiment (1 059 et 821 respectivement). `wilaya_code` se joint au
`wilaya_code` de GeoAlgeria.

> **Le rattachement commune/wilaya est dérivé, pas issu de la source.**
> OpenStreetMap ne porte pas les codes administratifs algériens. GeoAlgeria
> attribue `wilaya_code` par **point-dans-polygone** sur les 69 limites de
> wilayas, puis `commune_code` et `commune` comme le centroïde le plus proche
> **à l'intérieur de cette wilaya**, de sorte que la jointure ne franchit jamais
> une limite de wilaya. La wilaya est de fait exacte ; la commune reste
> approchée (proximité de centroïde, pas inclusion dans un polygone).

## Besoin aussi des divisions administratives ?

Pour les wilayas, daïras et communes, utilisez le paquet principal
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** : c'est ainsi que
vous transformez un `commune_code` en polygone ou centroïde. Utilisez
`@geoalgeria/cliniques` quand vous ne voulez *que* les structures de soins.

## Source & méthode

Lancez `npm run fetch` pour régénérer toutes les sorties. Le script :

1. interroge **OpenStreetMap** (Overpass) pour `amenity`/`healthcare=clinic`,
   `healthcare=centre` et `amenity`/`healthcare=hospital` en Algérie ;
2. **classe chaque enregistrement** d'après le nom français et arabe, en excluant
   le volet registre, les cabinets et les écoles paramédicales (voir le tableau) ;
3. dédoublonne la même structure cartographiée en nœud et en bâtiment ;
4. rattache la wilaya par inclusion polygonale et la commune par centroïde le
   plus proche à l'intérieur.

L'extraction brute est capturée sous
[`sources/cliniques/`](https://github.com/yasserstudio/geoalgeria/tree/main/sources/cliniques).

## Licence & attribution

Le **code** du paquet est [MIT](LICENSE). Les **données** viennent
d'**OpenStreetMap** : **© les contributeurs OpenStreetMap**, sous licence
**[ODbL 1.0](https://www.openstreetmap.org/copyright)**. Si vous utilisez ou
redistribuez ce jeu de données, vous devez **attribuer les contributeurs
OpenStreetMap** et garder les bases dérivées sous une licence compatible.

Vérifiez auprès des sources officielles pour toute information faisant autorité.
Ce jeu de données est fourni à titre de référence et pour alimenter
[GeoAlgeria](https://geoalgeria.com).

[Docs API & champs →](https://geoalgeria.com/data/docs/cliniques) · [Voir tous les paquets →](https://geoalgeria.com/data)

---

Réalisé par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
