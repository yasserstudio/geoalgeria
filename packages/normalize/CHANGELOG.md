# @geoalgeria/normalize

## 1.0.0

Search-key generation for Algerian place names, in Arabic and in French. One fold, shared by every GeoAlgeria index, with its golden corpus.

### Added

- `conservativeKey(text)`, the Conservative key as space-joined tokens: Arabic presentation
  forms fold back to base letters, alef variants and hamza on waw or yaa fold to the plain
  letter, tatweel and the Arabic combining marks are removed, Latin accents fold to their
  base letter whether the input is precomposed or decomposed, Arabic-Indic and Eastern
  Arabic-Indic digits fold to ASCII, apostrophe and hyphen variants and punctuation become
  word separators so a key never carries punctuation, whitespace collapses, and case folds to
  lower. Taa marbuta and alef maqsura are left as
  written: those belong to the Loose key.
- `looseKey(text)`, the Loose key: the Conservative key plus exactly two equivalences, alef
  maqsura with yaa and taa marbuta with haa. They are a tier of their own so that a match
  they cause can be ranked below an exact one instead of being indistinguishable from it.
- `tokenize(text)`, the words a name folds to, in order. Both keys are that list joined by
  single spaces, so a partial last word still completes and a query is never matched against
  one long run of letters. A word ends at whitespace, at an apostrophe, hyphen or dash
  variant, and at punctuation in either script, which is where a full-text tokenizer ends one
  too; the exact set is written out in the READMEs.
- `searchKeys(text)`, both keys, the tokens and `looseDiffers` from one pass over the text:
  the call the Content release generator makes.
- `rules`, the reviewed table, frozen: every fold with its stable identifier
  (`ar.taa-marbuta-haa`, `latn.extended-a`), its class, its script, the exact codepoint
  sequences it maps from and to, the sentence it asserts about the script, and a review
  record naming who reviewed that sentence and when. The two declined rules are in the table
  too, with the fold they decline, so what was refused is as legible as what was accepted:
  the Arabic definite article is never stripped, and no Latin transliteration of an Arabic
  name is generated. `from` and `to` are read out of the tables the key path runs, so the
  published claim and the applied fold cannot drift apart. The rationales are listed in all
  three READMEs, in each language, because the reader most able to find a wrong rule is one
  who reads the language rather than the code.
- `explain(text)`, the keys plus `applied`: the identifiers of the rules that fired, in the
  order they ran. A loose match can therefore say what made it loose, which is what lets a
  ranking place it below an exact one. It is the key path with the record switched on rather
  than a second implementation, so it cannot disagree with `searchKeys`. A rule is reported
  when it changed at least one codepoint or ended at least one word; the rules that state a
  fold this package does not apply, the pass-through rule and the two declined ones, are
  proved instead by a corpus case whose expected keys show the character, or the article,
  surviving.
- `NORMALIZE_VERSION`, the package's semver major, which the Content manifest records for
  the release it was built with. A change to what a key function returns for any input is a
  major version, because keys are baked into published catalogs and an installed catalog is
  never migrated record by record.
- `@geoalgeria/normalize/fixtures`, the Golden corpus: 64 cases built from real Algerian
  names, each with both keys, the tokens, the Rule ids it proves and a note saying what it is
  about. Every Rule is exercised by at least one case, and for every rule that folds
  something the ids a case names are exactly what `explain` reports for that input. Consumers
  assert against this fixture rather than writing cases of their own. The subpath is in the
  `exports` map and in the `files` array, so it resolves from an installed tarball and not
  only from a checkout, and a package test holds the map, the array and the files on disk
  together.
- `matchCases` on the same subpath: 17 cases carrying the class a query and a name produce,
  one of `exact`, `prefix`, `loose` or `none`, decided from the keys and their tokens alone.
  The word-boundary rule the `prefix` class uses is written out in the type declaration and
  in all three READMEs, in each language: every query word but the last equals the name's
  word at the same position, and the last query word is a prefix of the name's word there, so
  a query may stop part way through the word it is still typing and only there. The package
  exports no classifier, deliberately: the reviewed root surface is the seven exports above,
  and a consumer writes the rule and proves its implementation against this fixture. Every
  class is covered, and each of the two loose rules causes at least one loose case.
- Trilingual documentation (English, French, Arabic), hand-written type declarations, and no
  runtime dependencies.

### Notes

- The data repository's `pnpm validate` gates the table: a rule with no review record, a rule
  no corpus case proves, a case naming a rule that is not in the table, a repeated identifier
  and a table order that stops matching the committed reviewed order each fail the build.
  Review is a rule here rather than a habit.
- A second gate runs on pull requests only: a diff touching `src/`, `fixtures/corpus.js` or
  `index.js` must carry a changeset declaring `"@geoalgeria/normalize": major`. The check is
  path-based and deliberately blunt, so a documentation-only edit to one of those files still
  needs the major; the contributing guide records that as the accepted cost. While the
  package is not yet on npm the guard also passes on an unpublished registry answer, because
  there is no published catalog to invalidate; that path closes by itself at the first
  release.
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
