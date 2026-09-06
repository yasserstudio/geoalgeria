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
import { conservativeKey, looseKey, tokenize, searchKeys, explain, rules, NORMALIZE_VERSION } from "@geoalgeria/normalize";

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

explain("قسنطينة").applied;        // ["ar.taa-marbuta-haa"], les règles qui ont agi
rules.length;                      // 24, la table relue

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
| La ponctuation sépare les mots et n'atteint jamais la clé | `Alger, Oran (Es Senia).` devient `alger oran es senia`, `وهران، تلمسان؟` devient `وهران تلمسان` |
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
- une variante de trait d'union ou de tiret : `-` et `U+2010` à `U+2015` ;
- la ponctuation : `U+0021` à `U+0026`, `U+0028` à `U+002C`, `U+002E`, `U+002F`, `U+003A` à
  `U+0040`, `U+005B` à `U+005F`, `U+007B` à `U+007E`, les guillemets `U+00AB` et `U+00BB`, la
  virgule arabe `U+060C`, le point-virgule `U+061B`, le point d'interrogation `U+061F` et le
  point `U+06D4`, ainsi que `U+2016` à `U+2017`, `U+201A` à `U+2027` et `U+2030` à `U+205E`.

Tout le reste est plié, supprimé, ou fait partie du mot où il se trouve. Les caractères
invisibles, dont le trait d'union conditionnel et les marques bidirectionnelles, sont
supprimés plutôt que traités comme des limites, car ce n'est pas ce que le lecteur voit. Une
clé ne porte donc jamais de ponctuation, et c'est aussi ce qui garde cette découpe identique
à celle d'un moteur de recherche plein texte.

## La table des règles relues

`rules` est la table elle-même, gelée et publiée. Les équivalences que ce paquet affirme au
sujet des noms algériens doivent être lisibles par quelqu'un qui lit la langue et non le
code : chaque règle porte donc son identifiant, sa classe, l'écriture qu'elle concerne, les
suites exactes de points de code qu'elle transforme et vers quoi, une phrase qu'un locuteur
peut contester, et la fiche indiquant qui a validé cette phrase et quand.

```js
import { rules } from "@geoalgeria/normalize";

rules.find((rule) => rule.id === "ar.taa-marbuta-haa");
// {
//   id: "ar.taa-marbuta-haa", class: "loose", script: "arab",
//   from: ["ة"], to: ["ه"],
//   why: "A name ending in taa marbuta is commonly typed with haa, and the reverse, ...",
//   reviewed: { reviewedBy: "yasserstudio", reviewedAt: "2026-09-06" },
// }
```

`from` et `to` sont lus dans les tables mêmes qu'exécute le chemin de la clé, donc ce qu'une
règle dit replier et ce qu'elle replie ne peuvent pas diverger. Une cible vide signifie que
le caractère est retiré, et une simple espace qu'il termine un mot. Les deux règles écartées
portent le pliage qu'elles refusent, pour que le refus soit aussi lisible que l'accord.

| Règle | Classe | Écriture | Pourquoi |
| --- | --- | --- | --- |
| `ar.presentation-forms-b` | `canonical` | `arab` | Les formes positionnelles du bloc Arabic Presentation Forms-B dessinent les lettres du bloc arabe, donc un nom copié depuis un PDF revient aux lettres avec lesquelles il s'écrit. |
| `ar.presentation-forms-a` | `canonical` | `arab` | Les formes de l'alef wasla et de l'alef maqsura du bloc Arabic Presentation Forms-A sont les mêmes lettres que leurs originaux du bloc arabe. |
| `ar.lam-alef-ligature` | `canonical` | `arab` | La ligature lam-alef est un seul glyphe pour deux lettres, elle se replie donc en lam suivi d'un alef nu, et une recherche sur l'une ou l'autre lettre atteint toujours le nom. |
| `ar.tatweel` | `canonical` | `arab` | Le tatweel étire une lettre pour la mise en page et ne dit rien du nom, donc une graphie rallongée doit atteindre la même clé qu'une graphie sans rallonge. |
| `ar.marks` | `canonical` | `arab` | Les harakat, la shadda, le sukun, l'alef suscrit, la hamza haute et les marques d'annotation coranique sont une vocalisation qu'une source écrit ou non, et personne ne les tape dans une barre de recherche. |
| `latn.combining-marks` | `canonical` | `latn` | Un accent décomposé est la même graphie qu'un accent précomposé, donc retirer les marques combinantes fait se rejoindre les deux sans rien demander au moteur d'exécution. |
| `any.invisible` | `canonical` | `any` | Le trait d'union conditionnel, les caractères de largeur nulle, les marques bidirectionnelles et la marque d'ordre des octets sont invisibles à l'écran, ils sont donc retirés plutôt que laissés couper ou changer un nom. |
| `ar.alef-variants` | `conservative` | `arab` | L'alef avec hamza au-dessus, avec hamza en dessous, avec madda et avec wasla s'écrivent pour la même lettre et sont couramment tapés en alef nu. |
| `ar.waw-hamza` | `conservative` | `arab` | La hamza portée par le waw est une habitude orthographique d'une source, pas une autre lettre à chercher. |
| `ar.yaa-hamza` | `conservative` | `arab` | La hamza portée par le yaa est une habitude orthographique d'une source, pas une autre lettre à chercher. |
| `ar.indic-digits` | `conservative` | `arab` | Le clavier qui produit les chiffres ne doit pas changer quels lieux existent, donc les chiffres arabo-indiens valent les chiffres ASCII qu'ils comptent. |
| `ar.extended-indic-digits` | `conservative` | `arab` | Les chiffres arabo-indiens orientaux sont les mêmes nombres dans un second jeu de formes, et une source qui les emploie nomme le même lieu. |
| `latn.accents` | `conservative` | `latn` | Un nom français est tapé sans ses accents bien plus souvent qu'avec, donc les lettres accentuées du Supplément Latin-1 se replient sur leur lettre de base. |
| `latn.extended-a` | `conservative` | `latn` | Latin étendu A porte la même idée un bloc plus loin, les macrons et les carons des graphies translittérées et la ligature oe française, et elles se replient sur les lettres qu'elles surmontent. |
| `latn.extended-b` | `conservative` | `latn` | Les lettres accentuées de Latin étendu B, dont le caron sur le g des graphies berbères en alphabet latin, se replient sur leur lettre de base ; les lettres de ce bloc qui sont des lettres à part entière gardent leur lettre et ne perdent que leur majuscule. |
| `any.separators` | `conservative` | `any` | Un nom est une seule requête qu'il ait été écrit avec une apostrophe, un trait d'union, un tiret ou une espace, donc chacun de ces signes termine un mot au lieu de coller ou de couper la clé autrement. |
| `any.punctuation` | `conservative` | `any` | Une virgule, un point, une parenthèse ou un guillemet entoure un nom plutôt qu'il n'en fait partie, dans les deux écritures, donc il termine un mot au lieu d'entrer dans la clé : une clé ne porte jamais de ponctuation, et le moteur d'indexation plein texte qui construit un catalogue coupe exactement là où ce paquet coupe. |
| `any.whitespace` | `conservative` | `any` | Les séparateurs répétés et initiaux relèvent de la frappe et non du nom : un séparateur qui ne rencontre aucun mot ouvert n'ajoute rien à la clé, donc la clé est la liste des mots jointe par une seule espace, et un dernier mot partiel peut encore se compléter. |
| `any.case` | `conservative` | `any` | La casse ne distingue jamais deux lieux, et la minuscule est ce que produisent déjà l'index du navigateur et le moteur d'indexation plein texte. Le repli de casse atteint les majuscules ASCII et toute majuscule nommée par une table ; mettre en minuscule une lettre qu'aucune table ne nomme reviendrait à demander au moteur sa paire de casse, c'est-à-dire la dépendance que ce paquet refuse. |
| `any.pass-through` | `conservative` | `any` | Un caractère qu'aucune table ne nomme est gardé tel quel plutôt que supprimé, parce qu'un nom est mieux trouvable par une lettre sur laquelle ce paquet n'a pas d'avis que raccourci en silence. |
| `ar.alef-maqsura-yaa` | `loose` | `arab` | L'alef maqsura et le yaa s'écrivent indifféremment pour la même voyelle finale, souvent par la même source, mais ce sont deux lettres différentes, donc l'équivalence appartient au niveau dont une correspondance peut être déclassée. |
| `ar.taa-marbuta-haa` | `loose` | `arab` | Un nom terminé par un taa marbuta est couramment tapé avec un haa, et l'inverse, mais un lecteur voit bien deux lettres, donc l'équivalence appartient au niveau dont une correspondance peut être déclassée. |
| `ar.definite-article` | `declined` | `arab` | L'article défini arabe n'est jamais retiré, dans aucune des deux clés. Savoir si un nom portant l'article et un nom sans article désignent le même lieu est un fait sur ce lieu, pas sur l'écriture, cela appartient donc à l'alias de ce lieu, avec sa propre source. |
| `latn.transliteration` | `declined` | `any` | Aucune translittération latine d'un nom arabe n'est produite, ni aucune forme arabe d'un nom latin. Une graphie qu'aucune source ne fournit est un nom inventé, et les produits publient des noms plutôt que d'en inventer. |

L'ordre ci-dessus est celui dans lequel le chemin de la clé applique les règles, les règles
écartées en dernier. Dans ce dépôt, `pnpm validate` échoue si une règle n'a pas de fiche de
relecture, si aucun cas du corpus ne la prouve, si un cas nomme une règle absente de la
table, si un identifiant se répète, ou si l'ordre de la table cesse de correspondre à l'ordre
relu, consigné à côté de la vérification.

Si vous lisez l'arabe ou le français et qu'une de ces phrases est fausse, c'est exactement la
demande de tirage que ce paquet attend : changez la règle, ou le cas du corpus qui la prouve,
et dites pourquoi.

## Quelles règles ont agi

`explain` renvoie tout ce que renvoie `searchKeys`, plus `applied`, les identifiants des
règles qui ont agi sur cette entrée, dans l'ordre où elles se sont appliquées. Une
correspondance souple peut ainsi toujours dire ce qui l'a rendue souple, ce qui permet à un
classement de la placer sous une correspondance exacte :

```js
import { explain } from "@geoalgeria/normalize";

explain("قسنطينة").applied;   // ["ar.taa-marbuta-haa"]
explain("الجـــزائر").applied;  // ["ar.tatweel", "ar.yaa-hamza"]
explain("Béjaïa").applied;      // ["any.case", "latn.accents"]
explain("الوادي").applied;     // [], aucune règle n'a touché ce nom
```

Une règle figure dans la liste lorsqu'elle a changé au moins un point de code ou terminé au
moins un mot. Les règles qui énoncent un pliage que ce paquet n'applique pas, celle du
laisser-passer et les deux écartées, n'y figurent jamais : elles se prouvent dans l'autre
sens, par un cas du corpus dont les clés attendues montrent le caractère, ou l'article, qui
survit. `explain` est le chemin de la clé avec l'enregistrement activé, pas une seconde
implémentation, donc il ne peut pas contredire `searchKeys`.

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

Le corpus est le contrat, 64 cas. Chaque règle ci-dessus est prouvée par au moins un cas construit
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
