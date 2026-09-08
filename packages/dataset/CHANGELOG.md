# Changelog

## 2.0.1

### Patch Changes

- 76dfd0d: Confirm the MIT licence field against the new licence-terms validator rule.
- 8014c6e: Add `@geoalgeria/normalize` to the family at 1.0.0, the package that owns search-key generation.

  - **`@geoalgeria/normalize`** ships `conservativeKey`, the strict fold every GeoAlgeria index must reproduce byte for byte: Arabic presentation forms back to base letters, alef variants and hamza on waw or yaa to the plain letter, tatweel and the Arabic combining marks removed, Latin accents folded from precomposed and decomposed spellings alike, Arabic-Indic and Eastern Arabic-Indic digits to ASCII, apostrophe and hyphen variants and punctuation as word separators, whitespace collapsed and case folded to lower. Taa marbuta and alef maqsura stay as written; those belong to the loose tier.
  - It also ships `looseKey`, the Conservative key plus exactly two equivalences (alef maqsura with yaa, taa marbuta with haa) so a looser match can be ranked below an exact one; `tokenize`, the word split both keys are joined from and the index must agree with; and `searchKeys`, which returns both keys, the tokens and `looseDiffers` from one pass, the call the Content release generator makes.
  - `rules` is the reviewed table, frozen and public: every fold with its stable Rule id (`ar.taa-marbuta-haa`, `latn.extended-a`), its class, its script, the exact codepoint sequences it maps from and to, the sentence it asserts about the script, and a review record naming who reviewed it and when. The two declined rules are in it with the fold they decline: the Arabic definite article is never stripped, and no Latin transliteration of an Arabic name is generated. The rationales are listed in all three READMEs so a reader of the language can argue with one.
  - `explain(text)` returns the keys plus `applied`, the Rule ids that fired for that input in the order they ran, so a loose match can say what made it loose and a ranking can place it below an exact one. It is the key path with the record switched on, not a second implementation.
  - The data repository's `pnpm validate` gates the table: a Rule cannot enter without a review record and a corpus case proving it, a case cannot claim a Rule that is not in the table, an id names one Rule, and the table order must match the committed reviewed order.
  - `NORMALIZE_VERSION` is the semver major the Content manifest records for the release it was built with, and the Golden corpus ships as an importable fixture at `@geoalgeria/normalize/fixtures`, 64 cases covering every Rule, so every consumer proves the same keys from the same inputs. The subpath is in the `exports` map and in the `files` array, so it resolves from an installed tarball and not only from a checkout, and a package test holds the map, the array and the files on disk together.
  - The same subpath ships `matchCases`, 17 cases carrying the class a query and a name produce: `exact`, `prefix`, `loose` or `none`, decided from the keys and their tokens alone. `prefix` is a word-boundary rule, written out in the type declaration and in all three READMEs: every query word but the last equals the name's word at the same position and the last query word is a prefix of the name's word there, so a query may stop part way through the word it is still typing and only there. No classifier is exported; a consumer writes those fifteen lines and proves them against the fixture, which is what keeps the four-way decision the same in every product. Ranking stays private in the products' shared core.
  - A pull request that touches the key path, `packages/normalize/src/**`, `packages/normalize/fixtures/corpus.js` or `packages/normalize/index.js`, must carry a changeset declaring `"@geoalgeria/normalize": major`, or CI fails it. Keys are baked into every published catalog and an installed catalog is never migrated record by record, so a key change rebuilds and re-downloads every catalog on every device. The check is path-based and deliberately blunt: a documentation-only edit to one of those files still needs the major, and `CONTRIBUTING.md` records that as the accepted cost. Until the package's first version is on npm the guard also passes on a 404 from the registry, because there is no published catalog to invalidate; that path closes by itself at the first release. A 404 is the only answer that opens it: a registry that could not be reached fails the check closed, because a timeout is not a statement that the package does not exist.
  - The key path owns its codepoint tables and has no runtime dependencies, so a Node or Hermes upgrade cannot change a published catalog's keys. Code only, plain MIT, no dataset metadata.

## 2.0.0

### Major Changes

- 64b10a1: Replace duplicated and missing `code_commune` values with the 1,541 unique codes from the official ONS 2021 Code Géographique National. Cascade the corrected foreign keys through every linked dataset, preserve Algérie Poste's differing provider-native values, enforce the SQL and repository-wide FK contracts, retain the 2021 mother-wilaya prefix for communes promoted in later reforms, and document the code contract.

### Patch Changes

- 64b10a1: Move Tabelbala and its daïra from Béchar to Béni Abbès across all administrative carriers while preserving public ids, and update linked cultural, rail, and mosque records to the corrected current wilaya.

## 1.3.0

### Minor Changes

- 8a67b74: Commune postal codes are now office-derived: each commune's code comes from its own Algérie Poste offices (baridimap), fixing 187 rows that carried positional or colliding values (Akbou 06001, Bab Ezzouar 16024, Reggane 01004; zero duplicate codes remain). Communes with no resolvable office now carry no code rather than a fabricated one.

## 1.2.0

### Minor Changes

- 9a309c6: The commune table is complete: 1,528 to 1,541, Algeria's official count. The 13 that were missing are the name-twin communes of the reform wilayas (10, 15, 23, 25, 31, 46, 51, 55, 64, 66, 68), each sharing a name with a commune elsewhere in the country, which is how they were lost. Every one is Wikidata-sourced and coordinate-verified, and lands field-identical to the rows the site already serves, so package and app agree. Dairas: 555 to 556, with Zmalet El Emir Abdelkader (wilaya 64) added and 13 `commune_count` values recomputed. Five of the new rows carry `postal_code: null` and five carry `code_commune: null`, where no citable value exists; both fields were already typed nullable, so nothing about the contract changes. Sources and per-record confidence: `research/_communes-reconcile/`.

## 1.1.4

### Patch Changes

- 33507ee: Add four sibling packages to the family, each shipping at 1.0.0:

  - **`@geoalgeria/industrie-pharmaceutique`** — 171 approved pharmaceutical manufacturers (120 medicine/PP + 48 device/DM + 3 mixte) from the Ministry of Pharmaceutical Industry fabrication register, geocoded to commune/wilaya centroid.
  - **`@geoalgeria/pharmacies`** — 3,790 pharmacies (officines) across 67 wilayas from OpenStreetMap (ODbL), geocoded.
  - **`@geoalgeria/ooredoo`** — 572 Ooredoo stores (EO/CSO/ESO) with real coordinates from the operator locator API; completes the telecom retail trio with mobilis + djezzy.
  - **`@geoalgeria/pharma`** — umbrella re-exporting industrie-pharmaceutique + pharmacies in one install.

  The first two plus the umbrella form a new Pharma sector.

## 1.1.3

### Patch Changes

- 78854df: Refresh the package list — all 22 datasets

  - Docs-only patch: the README package tables (EN/FR/AR) now list the full monorepo — adds `@geoalgeria/culture`, `/agriculture`, `/ecoles` and the transport sector (`/gares-routieres`, `/ferroviaire`, `/buses`, `/transport`), which shipped after 1.1.2.
  - No data change: the 69 wilayas / 555 daïras / 1,528 communes and all coordinates, codes and postal data are unchanged.

## 1.1.2

### Patch Changes

- c511d83: Fix commune data integrity and strict-`nodenext` TypeScript resolution.

  - Data: removed 13 duplicate commune records that were each listed under two wilayas — a commune's real entry plus a copy mislabeled under an unrelated wilaya (e.g. Oran's "Aïn El Türk" also appearing under Bouira) — along with the 9 phantom dairas they created. Communes 1,541 → 1,528, dairas 564 → 555. Eight further `code_commune` collisions involving genuinely distinct communes remain and are flagged for an authoritative ONS-sourced reconciliation.
  - Types: `types/index.d.ts` now compiles under strict `nodenext`. The public types live in a `declare namespace algeriaGeodata` that merges with the value, resolving the `export =` / TS2309 conflict; reach them as `geo.Wilaya` (e.g. `import geo = require("geoalgeria")`).
  - Packaging: the `.` `exports` entry is now types-first.

## 1.1.1

### Patch Changes

- Docs: value-led READMEs, official source citation for the 69-wilaya reform (Law n° 26-06, Journal Officiel n° 25 of 5 April 2026), and fixed post-restructure links/badges. No data changes.

## [1.1.0] - 2026-06-08

### Changed

- Replaced synthetic commune postal codes with **real Algérie Poste codes** for
  ~1,440 communes (sourced from baridimap.poste.dz). Previously only ~88 matched
  reality; every commune now maps to a real Algérie Poste office code.
- Normalized wilaya 65 to **"Aïn Oussera"** (wilaya, daira, and commune) to match
  Algérie Poste and common usage.

### Added

- `data/poste/` — **3,908 post offices** and **2,026 ATMs** (real postal codes,
  bilingual names, coordinates, commune/wilaya linkage) from Algérie Poste, in
  JSON, CSV, and GeoJSON.
- `postOffices`, `atms`, and `getPostOfficesByCommune()` JS API, with `PostOffice`
  and `Atm` TypeScript types.

## [1.0.0] - 2025-05-05

### Added

- 69 wilayas (original 48 + 2019 reform wilayas 49–58 + 2025 reform wilayas 59–69)
- 1,541 communes with bilingual names (FR/AR), postal codes, daira assignments
- 1,541 commune coordinates (98.7% coverage)
- 564 dairas as first-class entities
- Multiple export formats: JSON, CSV, GeoJSON, SQL
- E-commerce optimized flat dataset
- TypeScript type definitions
- npm package with helper functions
- Validation script + GitHub Actions CI
- Contributing guide with issue/PR templates
