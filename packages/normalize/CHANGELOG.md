# @geoalgeria/normalize

## 1.0.0

Initial release. Search-key generation for Algerian place names, in Arabic and in French:

- `conservativeKey(text)`: the Conservative key, as space-joined tokens. Arabic presentation
  forms fold back to base letters, alef variants and hamza on waw or yaa fold to the plain
  letter, tatweel and the Arabic combining marks are removed, Latin accents fold to their base
  letter whether the input is precomposed or decomposed, Arabic-Indic and Eastern Arabic-Indic
  digits fold to ASCII, apostrophe and hyphen variants become word separators, whitespace
  collapses, and case folds to lower. Taa marbuta and alef maqsura are deliberately left as
  written: those belong to the Loose key.
- `NORMALIZE_VERSION`: the package's semver major, which the Content manifest records for the
  release it was built with. A change to what a key function returns for any input is a major.
- `@geoalgeria/normalize/fixtures`: the Golden corpus, 46 cases built from real Algerian names,
  each with the key it must produce and the rule it proves. Consumers assert against this
  fixture rather than writing cases of their own.

The key path owns its codepoint tables: no host normalization call, no Unicode property escape,
no locale-aware case operation, no platform built-in, and no runtime dependencies, so a Node or
Hermes upgrade cannot change a published catalog's keys. A test enforces that by reading the
shipped source.
