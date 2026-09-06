---
"geoalgeria": patch
---

Add `@geoalgeria/normalize` to the family at 1.0.0, the package that owns search-key generation.

- **`@geoalgeria/normalize`** ships `conservativeKey`, the strict fold every GeoAlgeria index must reproduce byte for byte: Arabic presentation forms back to base letters, alef variants and hamza on waw or yaa to the plain letter, tatweel and the Arabic combining marks removed, Latin accents folded from precomposed and decomposed spellings alike, Arabic-Indic and Eastern Arabic-Indic digits to ASCII, apostrophe and hyphen variants as word separators, whitespace collapsed and case folded to lower. Taa marbuta and alef maqsura stay as written; those belong to the loose tier.
- `NORMALIZE_VERSION` is the semver major the Content manifest records for the release it was built with, and the Golden corpus ships as an importable fixture at `@geoalgeria/normalize/fixtures`, 48 cases, so every consumer proves the same keys from the same inputs.
- The key path owns its codepoint tables and has no runtime dependencies, so a Node or Hermes upgrade cannot change a published catalog's keys. Code only, plain MIT, no dataset metadata.
