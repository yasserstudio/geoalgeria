**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/normalize

**Search keys for Algerian place names, in Arabic and in French. One fold, everywhere.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/normalize)](https://www.npmjs.com/package/@geoalgeria/normalize)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/normalize)](https://www.npmjs.com/package/@geoalgeria/normalize)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

Typing `bejaia` should find **Béjaïa**, and typing `بجاية` should find **بِجَايَة**. That only
works if every program in the chain folds a name to exactly the same string: the site
searching in a browser, the release build that fills a full-text index, and a phone
searching offline. This package is that fold, and nothing else. Part of
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

explain("قسنطينة").applied;        // ["ar.taa-marbuta-haa"], the rules that fired
rules.length;                      // 24, the reviewed table

NORMALIZE_VERSION;                 // 1
```

## The conservative key

The **conservative key** resolves the ways one name gets written, and folds nothing that
changes which letter a reader sees:

| Rule | Example |
| --- | --- |
| Arabic presentation forms fold to their base letters | `ﺃﺩﺭﺍﺭ` becomes `ادرار` |
| Alef variants (hamza above, hamza below, madda, wasla) fold to bare alef | `أدرار` `إدرار` `آدرار` `ٱدرار` all become `ادرار` |
| Hamza on waw or yaa folds to the plain letter | `الجزائر` becomes `الجزاير` |
| Tatweel is removed | `الجـــزائر` becomes `الجزاير` |
| Harakat and the other Arabic combining marks are removed | `بِجَايَة` becomes `بجاية` |
| Latin accents fold to their base letter, precomposed or decomposed alike | `Béjaïa` becomes `bejaia` |
| Latin Extended-A and the accented letters of Latin Extended-B fold too | `Bāb el Oued` becomes `bab el oued`, `Ǧerǧer` becomes `gerger` |
| A Berber Latin letter keeps its letter and loses only its capital | `TAMAZIƔT` becomes `tamaziɣt` |
| Arabic-Indic and Eastern Arabic-Indic digits fold to ASCII | `٣٤٥` and `۳۴۵` both become `345` |
| Apostrophe and hyphen variants are word separators | `El M'Ghair`, `El M’Ghair` become `el m ghair` |
| Punctuation is a word separator and never reaches the key | `Alger, Oran (Es Senia).` becomes `alger oran es senia`, `وهران، تلمسان؟` becomes `وهران تلمسان` |
| Whitespace collapses, and word boundaries survive into the key | `  Oran   El Bahia ` becomes `oran el bahia` |
| Case folds to lower | `SÉTIF` becomes `setif` |
| A character no table names is kept, not dropped | `Tamaziɣt` becomes `tamaziɣt` |

## The loose key

The **loose key** is the conservative key plus exactly two equivalences, and nothing else:

| Rule | Example |
| --- | --- |
| Alef maqsura and yaa are one letter | `مصطفى` becomes `مصطفي` |
| Taa marbuta and haa are one letter | `قسنطينة` becomes `قسنطينه` |

They are separate so that a match they cause can be ranked below an exact one instead of
being indistinguishable from it. `searchKeys` says whether either of them actually fired:

```js
searchKeys("تيزي وزو").looseDiffers; // false, the two keys are the same string
searchKeys("قسنطينة").looseDiffers;   // true
```

## Words, and the separator set

Both keys are the token list joined by single spaces, so a partial last word still
completes and a query is never matched against one long run of letters. `tokenize` is that
split, and the index a consumer builds must agree with it character for character. A token
ends at, and only at:

- whitespace: `U+0009` to `U+000D`, `U+0020`, `U+00A0`, `U+1680`, `U+2000` to `U+200A`,
  `U+2028`, `U+2029`, `U+202F`, `U+205F`, `U+3000`;
- an apostrophe variant: `'` `` ` `` `ʼ` `‘` `’` (`U+0027`, `U+0060`, `U+02BC`, `U+2018`, `U+2019`);
- a hyphen or dash variant: `-` and `U+2010` to `U+2015`;
- punctuation: `U+0021` to `U+0026`, `U+0028` to `U+002C`, `U+002E`, `U+002F`, `U+003A` to
  `U+0040`, `U+005B` to `U+005F`, `U+007B` to `U+007E`, the guillemets `U+00AB` and `U+00BB`,
  the Arabic comma `U+060C`, semicolon `U+061B`, question mark `U+061F` and full stop
  `U+06D4`, and `U+2016` to `U+2017`, `U+201A` to `U+2027` and `U+2030` to `U+205E`.

Everything else is folded, removed, or part of the word it is in. The invisible characters,
the soft hyphen and the bidi marks among them, are removed rather than treated as
boundaries, because they are not what a reader sees. A key therefore never carries
punctuation, which is also what keeps this split and a full-text tokenizer's split the same.

## The reviewed rule table

`rules` is the table itself, frozen and published. The equivalences this package asserts
about Algerian names should be readable by someone who reads the language and not the code,
so every rule carries its identifier, its class, the script it is about, the exact codepoint
sequences it maps from and to, one sentence a speaker can argue with, and the record of who
reviewed that sentence and when.

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

`from` and `to` are read out of the same tables the key path runs, so what a rule says it
folds and what it folds cannot drift apart. An empty target means the character is removed,
and a single space means it ends a word. The two declined rules carry the fold they decline,
so what was refused is as legible as what was accepted.

| Rule | Class | Script | Why |
| --- | --- | --- | --- |
| `ar.presentation-forms-b` | `canonical` | `arab` | The positional shapes of Arabic Presentation Forms-B draw the letters of the Arabic block, so a name copied out of a PDF folds back to the letters it is written with. |
| `ar.presentation-forms-a` | `canonical` | `arab` | The alef wasla and alef maqsura shapes of Arabic Presentation Forms-A are the same letters as their Arabic block originals. |
| `ar.lam-alef-ligature` | `canonical` | `arab` | The lam-alef ligature is one glyph for two letters, so it folds to lam followed by bare alef and a search for either letter still reaches the name. |
| `ar.tatweel` | `canonical` | `arab` | Tatweel stretches a letter for typesetting and says nothing about the name, so a padded spelling must reach the same key as an unpadded one. |
| `ar.marks` | `canonical` | `arab` | Harakat, shadda, sukun, the superscript alef, the high hamza and the Quranic annotation marks are vocalisation a source may or may not have written, and nobody types them into a search box. |
| `latn.combining-marks` | `canonical` | `latn` | A decomposed accent is the same spelling as a precomposed one, so removing the combining marks makes the two meet without asking the runtime to normalise anything. |
| `any.invisible` | `canonical` | `any` | The soft hyphen, the zero-width characters, the bidi marks and the byte order mark are invisible on screen, so they are removed rather than allowed to split or change a name. |
| `ar.alef-variants` | `conservative` | `arab` | Alef with hamza above, with hamza below, with madda and with wasla are written for the same letter and are routinely typed as bare alef. |
| `ar.waw-hamza` | `conservative` | `arab` | Hamza carried on waw is an orthographic habit of one source rather than a different letter to search for. |
| `ar.yaa-hamza` | `conservative` | `arab` | Hamza carried on yaa is an orthographic habit of one source rather than a different letter to search for. |
| `ar.indic-digits` | `conservative` | `arab` | Which digits a keyboard produces must not change which places exist, so Arabic-Indic digits are the ASCII digits they count as. |
| `ar.extended-indic-digits` | `conservative` | `arab` | The Eastern Arabic-Indic digits are the same numbers in a second set of shapes, and a source that uses them names the same place. |
| `latn.accents` | `conservative` | `latn` | A French name is typed without its accents far more often than with them, so the accented letters of Latin-1 Supplement fold to their base letter. |
| `latn.extended-a` | `conservative` | `latn` | Latin Extended-A holds the same idea one block further out, the macrons and carons of transliterated spellings and the French oe ligature, and they fold to the letters they are written over. |
| `latn.extended-b` | `conservative` | `latn` | The accented letters of Latin Extended-B, among them the caron on g that Berber Latin spellings use, fold to their base letter; the letters of that block that are letters in their own right keep their own letter and only lose their capital. |
| `any.separators` | `conservative` | `any` | A name is one query whether it was written with an apostrophe, a hyphen, a dash or a space, so every one of those ends a word instead of joining or splitting the key differently. |
| `any.punctuation` | `conservative` | `any` | A comma, a full stop, a bracket or a quotation mark is around a name rather than in it, in either script, so it ends a word instead of riding into the key: a key never carries punctuation, and the full-text tokenizer that builds a catalog splits exactly where this package splits. |
| `any.whitespace` | `conservative` | `any` | Repeated, leading and trailing whitespace is typing, not naming, so the key is the tokens joined by one space and a partial last word can still complete. |
| `any.case` | `conservative` | `any` | Case is never a distinction between two places, and lower case is what both the browser index and the full-text tokenizer already produce. Case folding reaches the ASCII capitals and every capital a table names; lower-casing a letter no table names would mean asking the engine for its case pair, which is exactly the dependency this package refuses. |
| `any.pass-through` | `conservative` | `any` | A character no table names is kept as it stands rather than dropped, because a name is better searchable by a letter this package has no opinion about than silently shortened. |
| `ar.alef-maqsura-yaa` | `loose` | `arab` | Alef maqsura and yaa are written either way for the same final vowel, often by the same source, but the two are still different letters, so the equivalence belongs to the tier a match can be ranked down for. |
| `ar.taa-marbuta-haa` | `loose` | `arab` | A name ending in taa marbuta is commonly typed with haa, and the reverse, but a reader does see two letters, so the equivalence belongs to the tier a match can be ranked down for. |
| `ar.definite-article` | `declined` | `arab` | The Arabic definite article is never stripped, in either key. Whether a name carrying the article and a name without it are the same place is a fact about that place, not about the script, so it belongs to that place's own alias with its own source. |
| `latn.transliteration` | `declined` | `any` | No Latin transliteration of an Arabic name is generated, and no Arabic form of a Latin name. A spelling that no source supplies is a fabricated name, and the products publish names rather than invent them. |

The order above is the order the key path applies the rules in, with the declined ones last.
`pnpm validate` in this repository fails if a rule has no review record, if no corpus case
proves it, if a case names a rule that is not in the table, if an identifier repeats, or if
the table order stops matching the reviewed order committed beside the check.

If you read Arabic or French and one of these sentences is wrong, that is the pull request
this package exists to receive: change the rule, or the corpus case that proves it, and say
why.

## Which rules fired

`explain` returns everything `searchKeys` returns plus `applied`, the identifiers of the
rules that fired for that input, in the order they ran. A loose match can therefore always
say what made it loose, which is what lets a ranking place it below an exact match:

```js
import { explain } from "@geoalgeria/normalize";

explain("قسنطينة").applied;   // ["ar.taa-marbuta-haa"]
explain("الجـــزائر").applied;  // ["ar.tatweel", "ar.yaa-hamza"]
explain("Béjaïa").applied;      // ["any.case", "latn.accents"]
explain("الوادي").applied;     // [], no rule touched this name
```

A rule is in the list when it changed at least one codepoint or ended at least one word.
The rules that state a fold this package does not apply, the pass-through rule and the two
declined ones, are never in it: they are proved the other way round, by a corpus case whose
expected keys show the character, or the article, surviving. `explain` is the key path with
the record switched on rather than a second implementation of it, so it cannot disagree with
`searchKeys`.

## Host independence

The key path owns its codepoint tables. It calls nothing from the runtime's Unicode
machinery, uses no property escapes, no locale-aware case operation, and imports no
platform built-in, so it produces the same bytes on Node and on a phone, and a runtime
upgrade cannot silently change a published key. A test enforces that by reading the source
rather than trusting a comment.

The tables declare ASCII, Latin-1 Supplement, Latin Extended-A and B, the combining
diacritical marks, the Arabic block, Arabic Supplement, Arabic Extended-A and both Arabic
presentation form blocks. Inside those blocks the marks are removed and the variants are
folded; the letters that are letters in their own right, the Berber Latin gamma, the
Maghrebi hard g of the Arabic Supplement, peh and veh and ng, are kept as they are. A
character outside every declared block is lower-cased if it is an ASCII capital and
otherwise passed through unchanged, never dropped.

The package has **zero runtime dependencies**.

## The golden corpus

The corpus is the contract, 64 cases. Every rule above is proved by at least one case built
from a real Algerian name, and consumers import the same fixture rather than writing cases of
their own:

```js
import { corpus } from "@geoalgeria/normalize/fixtures";

for (const kase of corpus) {
  // kase.input, kase.conservative, kase.loose, kase.tokens, kase.proves, kase.note
}
```

## Versioning

`NORMALIZE_VERSION` is this package's semver major. Any change to what a key function
returns for any input is a **major** version, including a bug fix, because keys are baked
into published catalogs and installed catalogs are never migrated record by record. Adding
an export is a minor; documentation and types are a patch. Consumers pin an exact version.

## License

MIT. This package ships code only, no data.
