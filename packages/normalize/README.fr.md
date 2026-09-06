[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/normalize

**Les clés de recherche des noms de lieux algériens, en arabe et en français. Un seul pliage, partout.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/normalize)](https://www.npmjs.com/package/@geoalgeria/normalize)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/normalize)](https://www.npmjs.com/package/@geoalgeria/normalize)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

Taper `bejaia` doit trouver **Béjaïa**, et taper `بجاية` doit trouver **بِجَايَة**. Cela ne
fonctionne que si tous les programmes de la chaîne réduisent un nom exactement à la même
chaîne de caractères : le site qui cherche dans le navigateur, la génération de version qui
remplit un index plein texte, et un téléphone qui cherche hors ligne. Ce paquet est ce
pliage, et rien d'autre. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/normalize
```

```js
import { conservativeKey, NORMALIZE_VERSION } from "@geoalgeria/normalize";

conservativeKey("Béjaïa");         // "bejaia"
conservativeKey("Sidi-Bel-Abbès"); // "sidi bel abbes"
conservativeKey("El M’Ghair");     // "el m ghair"
conservativeKey("بِجَايَة");           // "بجاية"
conservativeKey("الجـــزائر");        // "الجزاير"

NORMALIZE_VERSION;                 // 1
```

## La clé conservatrice

La **clé conservatrice** résout les différentes façons d'écrire un même nom, sans jamais
plier ce qui change la lettre que le lecteur voit :

| Règle | Exemple |
| --- | --- |
| Les formes de présentation arabes reviennent à leurs lettres de base | `ﺃﺩﺭﺍﺭ` devient `ادرار` |
| Les variantes de l'alef (hamza dessus, hamza dessous, madda, wasla) deviennent l'alef nu | `أدرار` `إدرار` `آدرار` `ٱدرار` donnent tous `ادرار` |
| La hamza portée par un waw ou un yaa se plie sur la lettre simple | `الجزائر` devient `الجزاير` |
| Le tatweel est supprimé | `الجـــزائر` devient `الجزاير` |
| Les harakat et les autres signes combinants arabes sont supprimés | `بِجَايَة` devient `بجاية` |
| Les accents latins reviennent à leur lettre de base, précomposés ou décomposés | `Béjaïa` devient `bejaia` |
| Les chiffres arabo-indiens et arabo-indiens orientaux deviennent des chiffres ASCII | `٣٤٥` et `۳۴۵` donnent `345` |
| Les variantes d'apostrophe et de trait d'union séparent les mots | `El M'Ghair` et `El M’Ghair` donnent `el m ghair` |
| Les espaces se réduisent, et les limites de mots survivent dans la clé | `  Oran   El Bahia ` devient `oran el bahia` |
| La casse est ramenée en minuscules | `SÉTIF` devient `setif` |

Deux pliages sont volontairement **absents** : le taa marbuta avec le haa, et l'alef maqsura
avec le yaa. Ils relèvent du niveau plus souple, afin qu'une correspondance qu'ils
provoquent puisse être classée en dessous d'une correspondance exacte au lieu d'être
indiscernable d'elle.

Deux règles sont écartées explicitement, et consignées pour ne pas être réintroduites en
silence : l'article défini arabe n'est jamais retiré (savoir si un nom avec l'article et un
nom sans article désignent le même lieu est un fait sur ce lieu, pas sur l'écriture), et
aucune translittération latine d'un nom arabe n'est produite (une graphie qu'aucune source
ne fournit est un nom inventé).

## Indépendance vis-à-vis du moteur

Le chemin de la clé possède ses propres tables de points de code. Il n'appelle rien de la
machinerie Unicode du moteur, n'utilise aucune classe de propriété, aucune opération de
casse dépendante de la locale, et n'importe aucun module natif de la plateforme : il produit
donc les mêmes octets sous Node et sur un téléphone, et une mise à jour du moteur ne peut
pas changer silencieusement une clé déjà publiée. Un test le vérifie en lisant le code
source, plutôt qu'en faisant confiance à un commentaire.

Le paquet n'a **aucune dépendance d'exécution**.

## Le corpus de référence

Le corpus est le contrat. Chaque règle ci-dessus est prouvée par au moins un cas construit
à partir d'un vrai nom algérien, et les consommateurs importent la même fixture plutôt que
d'écrire leurs propres cas :

```js
import { corpus } from "@geoalgeria/normalize/fixtures";

for (const cas of corpus) {
  // cas.input, cas.conservative, cas.note
}
```

## Versionnage

`NORMALIZE_VERSION` est le numéro majeur semver de ce paquet. Tout changement de ce qu'une
fonction de clé renvoie pour une entrée quelconque est une version **majeure**, y compris
une correction de bogue, car les clés sont figées dans les catalogues publiés et un
catalogue installé n'est jamais migré enregistrement par enregistrement. Ajouter un export
est une mineure ; la documentation et les types sont un correctif. Les consommateurs
épinglent une version exacte.

## Licence

MIT. Ce paquet ne livre que du code, aucune donnée.
