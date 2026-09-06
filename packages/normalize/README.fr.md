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
import { conservativeKey, looseKey, tokenize, searchKeys, NORMALIZE_VERSION } from "@geoalgeria/normalize";

conservativeKey("Béjaïa");         // "bejaia"
conservativeKey("Sidi-Bel-Abbès"); // "sidi bel abbes"
conservativeKey("El M’Ghair");     // "el m ghair"
conservativeKey("بِجَايَة");           // "بجاية"
conservativeKey("الجـــزائر");        // "الجزاير"

looseKey("قسنطينة");                // "قسنطينه"
looseKey("مصطفى");                  // "مصطفي"
tokenize("Sidi-Bel-Abbès");        // ["sidi", "bel", "abbes"]

searchKeys("قسنطينة");
// { conservative: "قسنطينة", loose: "قسنطينه", tokens: ["قسنطينة"], looseDiffers: true }

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
| Le latin étendu A et les lettres accentuées du latin étendu B se plient aussi | `Bāb el Oued` devient `bab el oued`, `Ǧerǧer` devient `gerger` |
| Une lettre du berbère latin garde sa lettre et ne perd que sa majuscule | `TAMAZIƔT` devient `tamaziɣt` |
| Les chiffres arabo-indiens et arabo-indiens orientaux deviennent des chiffres ASCII | `٣٤٥` et `۳۴۵` donnent `345` |
| Les variantes d'apostrophe et de trait d'union séparent les mots | `El M'Ghair` et `El M’Ghair` donnent `el m ghair` |
| Les espaces se réduisent, et les limites de mots survivent dans la clé | `  Oran   El Bahia ` devient `oran el bahia` |
| La casse est ramenée en minuscules | `SÉTIF` devient `setif` |
| Un caractère qu'aucune table ne nomme est conservé, jamais supprimé | `Tamaziɣt` devient `tamaziɣt` |

## La clé souple

La **clé souple** est la clé conservatrice plus exactement deux équivalences, et rien
d'autre :

| Règle | Exemple |
| --- | --- |
| L'alef maqsura et le yaa sont une seule lettre | `مصطفى` devient `مصطفي` |
| Le taa marbuta et le haa sont une seule lettre | `قسنطينة` devient `قسنطينه` |

Elles sont séparées afin qu'une correspondance qu'elles provoquent puisse être classée en
dessous d'une correspondance exacte au lieu d'être indiscernable d'elle. `searchKeys` dit si
l'une d'elles s'est réellement appliquée :

```js
searchKeys("تيزي وزو").looseDiffers; // false, les deux clés sont la même chaîne
searchKeys("قسنطينة").looseDiffers;   // true
```

## Les mots, et l'ensemble des séparateurs

Les deux clés sont la liste des mots jointe par une seule espace : un dernier mot partiel
peut donc encore se compléter, et une requête n'est jamais comparée à une longue suite de
lettres collées. `tokenize` est cette découpe, et l'index construit par un consommateur doit
s'y accorder caractère pour caractère. Un mot se termine à, et seulement à :

- une espace : `U+0009` à `U+000D`, `U+0020`, `U+00A0`, `U+1680`, `U+2000` à `U+200A`,
  `U+2028`, `U+2029`, `U+202F`, `U+205F`, `U+3000` ;
- une variante d'apostrophe : `'` `` ` `` `ʼ` `‘` `’` (`U+0027`, `U+0060`, `U+02BC`, `U+2018`, `U+2019`) ;
- une variante de trait d'union ou de tiret : `-` et `U+2010` à `U+2015`.

Tout le reste est plié, supprimé, ou fait partie du mot où il se trouve. Les caractères
invisibles, dont le trait d'union conditionnel et les marques bidirectionnelles, sont
supprimés plutôt que traités comme des limites, car ce n'est pas ce que le lecteur voit. La
ponctuation n'en fait pas partie non plus : une virgule reste dans le mot qu'elle suit, et un
cas du corpus le consigne, car combler cet écart serait une règle que ce paquet ne porte pas
encore.

## Les règles et leurs identifiants

Chaque pliage porte un identifiant stable, `ar.taa-marbuta-haa` ou `latn.extended-a`, et
chaque règle est prouvée par au moins un cas du corpus. Les identifiants sont la partie
durable : un cas du corpus, une fiche de relecture et un appelant qui demande quelle règle a
produit une correspondance nomment tous la même chaîne.

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

Les tables déclarent l'ASCII, le supplément latin-1, le latin étendu A et B, les signes
diacritiques combinants, le bloc arabe, le supplément arabe, l'arabe étendu A et les deux
blocs de formes de présentation arabes. À l'intérieur de ces blocs, les signes sont
supprimés et les variantes pliées ; les lettres qui sont des lettres à part entière, le
gamma du berbère latin, le g dur maghrébin du supplément arabe, le peh, le veh et le ng,
sont conservées telles quelles. Un caractère hors de tout bloc déclaré est mis en minuscule
s'il s'agit d'une majuscule ASCII, et sinon transmis inchangé, jamais supprimé.

Le paquet n'a **aucune dépendance d'exécution**.

## Le corpus de référence

Le corpus est le contrat, 62 cas. Chaque règle ci-dessus est prouvée par au moins un cas construit
à partir d'un vrai nom algérien, et les consommateurs importent la même fixture plutôt que
d'écrire leurs propres cas :

```js
import { corpus } from "@geoalgeria/normalize/fixtures";

for (const cas of corpus) {
  // cas.input, cas.conservative, cas.loose, cas.tokens, cas.proves, cas.note
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
