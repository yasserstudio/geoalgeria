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
- `NORMALIZE_VERSION`, the package's semver major, which the Content manifest records for
  the release it was built with. A change to what a key function returns for any input is a
  major version, because keys are baked into published catalogs and an installed catalog is
  never migrated record by record.
- `@geoalgeria/normalize/fixtures`, the Golden corpus: 48 cases built from real Algerian
  names, each with the key it must produce and a note saying what it proves. Consumers assert
  against this fixture rather than writing cases of their own.
- Trilingual documentation (English, French, Arabic), hand-written type declarations, and no
  runtime dependencies.

### Notes

- The key path owns its codepoint tables outright: no call into the host's Unicode
  machinery, no Unicode property escape, no locale-aware case operation and no platform
  built-in, so a Node or Hermes upgrade cannot change a published catalog's keys. A
  source-level test enforces that floor rather than trusting a comment.
- Code only, plain MIT, no dataset metadata.
