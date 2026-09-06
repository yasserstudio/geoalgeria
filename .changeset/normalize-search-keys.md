---
"geoalgeria": patch
---

Add `@geoalgeria/normalize` to the family at 1.0.0, the package that owns search-key generation.

- **`@geoalgeria/normalize`** ships `conservativeKey`, the strict fold every GeoAlgeria index must reproduce byte for byte: Arabic presentation forms back to base letters, alef variants and hamza on waw or yaa to the plain letter, tatweel and the Arabic combining marks removed, Latin accents folded from precomposed and decomposed spellings alike, Arabic-Indic and Eastern Arabic-Indic digits to ASCII, apostrophe and hyphen variants and punctuation as word separators, whitespace collapsed and case folded to lower. Taa marbuta and alef maqsura stay as written; those belong to the loose tier.
- It also ships `looseKey`, the Conservative key plus exactly two equivalences (alef maqsura with yaa, taa marbuta with haa) so a looser match can be ranked below an exact one; `tokenize`, the word split both keys are joined from and the index must agree with; and `searchKeys`, which returns both keys, the tokens and `looseDiffers` from one pass, the call the Content release generator makes.
- Every fold carries a stable Rule id (`ar.taa-marbuta-haa`, `latn.extended-a`) with the sentence it asserts about the script, and the two declined rules are recorded with their reasons: the Arabic definite article is never stripped, and no Latin transliteration of an Arabic name is generated.
- `NORMALIZE_VERSION` is the semver major the Content manifest records for the release it was built with, and the Golden corpus ships as an importable fixture at `@geoalgeria/normalize/fixtures`, 63 cases covering every Rule, so every consumer proves the same keys from the same inputs.
- The key path owns its codepoint tables and has no runtime dependencies, so a Node or Hermes upgrade cannot change a published catalog's keys. Code only, plain MIT, no dataset metadata.
