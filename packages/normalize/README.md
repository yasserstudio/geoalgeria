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
import { conservativeKey, NORMALIZE_VERSION } from "@geoalgeria/normalize";

conservativeKey("Béjaïa");         // "bejaia"
conservativeKey("Sidi-Bel-Abbès"); // "sidi bel abbes"
conservativeKey("El M’Ghair");     // "el m ghair"
conservativeKey("بِجَايَة");           // "بجاية"
conservativeKey("الجـــزائر");        // "الجزاير"

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
| Arabic-Indic and Eastern Arabic-Indic digits fold to ASCII | `٣٤٥` and `۳۴۵` both become `345` |
| Apostrophe and hyphen variants are word separators | `El M'Ghair`, `El M’Ghair` become `el m ghair` |
| Whitespace collapses, and word boundaries survive into the key | `  Oran   El Bahia ` becomes `oran el bahia` |
| Case folds to lower | `SÉTIF` becomes `setif` |

Two folds are deliberately **not** here: taa marbuta with haa, and alef maqsura with yaa.
They belong to the looser tier, so that a match they cause can be ranked below an exact
one instead of being indistinguishable from it.

Two rules are declined outright, and recorded so they are not quietly re-added: the Arabic
definite article is never stripped (whether a name with the article and one without are the
same place is a fact about that place, not about the script), and no Latin transliteration
of an Arabic name is generated (a spelling no source supplies is a fabricated name).

## Host independence

The key path owns its codepoint tables. It calls nothing from the runtime's Unicode
machinery, uses no property escapes, no locale-aware case operation, and imports no
platform built-in, so it produces the same bytes on Node and on a phone, and a runtime
upgrade cannot silently change a published key. A test enforces that by reading the source
rather than trusting a comment.

The package has **zero runtime dependencies**.

## The golden corpus

The corpus is the contract. Every rule above is proved by at least one case built from a
real Algerian name, and consumers import the same fixture rather than writing cases of
their own:

```js
import { corpus } from "@geoalgeria/normalize/fixtures";

for (const kase of corpus) {
  // kase.input, kase.conservative, kase.note
}
```

## Versioning

`NORMALIZE_VERSION` is this package's semver major. Any change to what a key function
returns for any input is a **major** version, including a bug fix, because keys are baked
into published catalogs and installed catalogs are never migrated record by record. Adding
an export is a minor; documentation and types are a patch. Consumers pin an exact version.

## License

MIT. This package ships code only, no data.
