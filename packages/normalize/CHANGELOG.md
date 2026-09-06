# @geoalgeria/normalize

## 1.0.0

Search-key generation for Algerian place names, in Arabic and in French. One fold, shared by every GeoAlgeria index, with its golden corpus.

### Added

- `conservativeKey(text)`, the Conservative key as space-joined tokens: Arabic presentation
  forms fold back to base letters, alef variants and hamza on waw or yaa fold to the plain
  letter, tatweel and the Arabic combining marks are removed, Latin accents fold to their
  base letter whether the input is precomposed or decomposed, Arabic-Indic and Eastern
  Arabic-Indic digits fold to ASCII, apostrophe and hyphen variants become word separators,
  whitespace collapses, and case folds to lower. Taa marbuta and alef maqsura are left as
  written: those belong to the Loose key.
- `looseKey(text)`, the Loose key: the Conservative key plus exactly two equivalences, alef
  maqsura with yaa and taa marbuta with haa. They are a tier of their own so that a match
  they cause can be ranked below an exact one instead of being indistinguishable from it.
- `tokenize(text)`, the words a name folds to, in order. Both keys are that list joined by
  single spaces, so a partial last word still completes and a query is never matched against
  one long run of letters. The separator set is documented in the READMEs, and the index a
  consumer builds must agree with it character for character.
- `searchKeys(text)`, both keys, the tokens and `looseDiffers` from one pass over the text:
  the call the Content release generator makes.
- A stable identifier on every fold, `ar.taa-marbuta-haa` or `latn.extended-a`, with the
  sentence it asserts about the script, and the two declined rules recorded with their
  reasons: the Arabic definite article is never stripped, and no Latin transliteration of an
  Arabic name is generated.
- `NORMALIZE_VERSION`, the package's semver major, which the Content manifest records for
  the release it was built with. A change to what a key function returns for any input is a
  major version, because keys are baked into published catalogs and an installed catalog is
  never migrated record by record.
- `@geoalgeria/normalize/fixtures`, the Golden corpus: 60 cases built from real Algerian
  names, each with both keys, the tokens, the Rule ids it proves and a note saying what it is
  about. Every Rule is exercised by at least one case. Consumers assert against this fixture
  rather than writing cases of their own.
- Trilingual documentation (English, French, Arabic), hand-written type declarations, and no
  runtime dependencies.

### Notes

- The key path owns its codepoint tables outright: no call into the host's Unicode
  machinery, no Unicode property escape, no locale-aware case operation and no platform
  built-in, so a Node or Hermes upgrade cannot change a published catalog's keys. A
  source-level test enforces that floor rather than trusting a comment.
- The declared blocks are ASCII, Latin-1 Supplement, Latin Extended-A and B, the combining
  diacritical marks, the Arabic block, Arabic Supplement, Arabic Extended-A and both Arabic
  presentation form blocks. Inside them the marks are removed and the variants folded; the
  letters that are letters in their own right are kept. A character outside every declared
  block is lower-cased if it is an ASCII capital and otherwise passed through unchanged,
  never dropped.
- Code only, plain MIT, no dataset metadata.
