# @geoalgeria/protection-civile

## 1.0.4

### Patch Changes

- 0df7cb4: Rebuild 13 sector packages on the corrected commune centres: 45 coordinates moved, 1,178 commune links re-derived.

  `geoalgeria` corrects 56 commune centres in this same release, by 0.75 km to 217 km. Every package here derives from those values, so none of it was right until they were rebuilt against them. Two separate things were stale.

  **45 coordinates were a repudiated commune centre.** These records have no point of their own: they borrow their commune's centre and say so in `geo_method`. The copy does not follow the original. `@geoalgeria/sante`'s _EPH El Harrach (Hassan Badi)_ shipped at the old El Harrach value, 51.5 km from the hospital and inside wilaya 35; the 23 Algiers institutions of `@geoalgeria/agriculture` sat on the Alger Centre point that was in the sea. Moved: sante 7, agriculture 23, formation-professionnelle 10 (including the CFPAs of Melbou, Mazagran, Marsa Ben M'Hidi and Chelghoum Laid), enseignement-superieur 3 (ENP, ENSA and EPAU, all at El Harrach) and industrie-pharmaceutique 2 (SAIDAL El Harrach, BIO OSTEO). Precision is unchanged and still honest: these are commune-level placements, they now name the commune's current centre.

  **1,178 `commune_code` links moved, and 270 `wilaya_code` with them.** `commune` and `commune_code` are stamped by nearest commune centroid, so a centre that moves 25 km stops being the nearest for everything around where it was and starts being it around where it is. Re-derived: mosquees 720, ecoles 266, pharmacies 105, cliniques 39, culture 29, ooredoo 13, djezzy 3 and protection-civile 3. Wilaya moved for 254 mosques, 10 cultural places and 6 pharmacies.

  **Record counts, names, types, contacts and ids are untouched in every package.** Only `lat`/`lng`, `commune`, `commune_code` and `wilaya_code` changed, plus the `metadata.json` fields derived from them (sante's bbox reaches 37.065 now that Chetaibi is on the coast). Ten of the thirteen were rebuilt by re-running their own generator against its committed capture, offline; the other three cannot replay offline and were patched by `scripts/sync-commune-centroid-dependents.mjs`, which reproduces the same reads of the flagship and nothing else.

  **This release is also the first rebuild since the JORA name corrections of 2.1.0**, which no dependent had picked up either. That accounts for a further 3,031 `commune` labels now matching the flagship spelling (`Ain Madhi` to `Aïn Madhi`, `Hassi R'mel` to `Hassi R'Mel`), 258 `commune_code` and 47 `wilaya_code` from the same earlier pass, and one vocational centre in Ouamri that is placed for the first time because its commune name now resolves.

  **A guard keeps the class out.** `pnpm validate` now checks every record that declares a commune-level placement against the flagship: 1,151 of them, and a coordinate that is not the current centre of the commune it names fails the build. It is a table of the bound `geo_method` values, not a guess, because three commune-flavoured methods in this repository are deliberately not a flagship centre (the Ooredoo 5G per-commune points, and the wilaya-mean placements of industrie-pharmaceutique and enseignement-superieur).

  Closes yasserstudio/geoalgeria.com#169.

- 4deabd3: Replace em dashes in source names and citations with plain separators.

  - Every source `name` reads `Operator: descriptor`, where it used to carry a
    U+2014 em dash, in `data/metadata.json` and in the `dataset-metadata.json`
    descriptor built from it.
  - The schema.org/DCAT `citation` entries join a source name and its licence with
    a comma: `OpenStreetMap: schools & kindergartens in Algeria, ODbL 1.0 (© OpenStreetMap contributors)`.
  - Coverage notes, package `description`s, the `types/index.d.ts` documentation and
    the `index.js` headers carry a colon, comma or semicolon in place of the dash.

  No count, coordinate, licence or date changes. Consumers that match a source name
  or a citation string literally need to update the separator; anything keyed on
  `sources[].key` is unaffected. `pnpm validate` now fails on an em dash in
  published metadata, so it cannot come back through a generator.

## 1.0.3

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.
- fb222be: Refresh the official DGPC unit directory (metadata or generated artifacts updated).

## 1.0.2

### Patch Changes

- f27c543: Correct 107 unit records by replacing non-dialable telephone and fax placeholders with null.
- ef41100: Keep retired public record IDs permanently reserved across data refreshes and
  exclude the internal retirement ledger from catalog distributions.
- ee3956c: Cross-check Protection Civile location risks, correct six coarse unit points
  with public evidence, and publish review provenance while keeping unresolved
  coordinates approximate.

## Unreleased

- Cross-checked all 36 precision/boundary risk records against the current DGPC
  snapshot and OpenStreetMap unit evidence.
- Corrected six coarse unit coordinates with public review evidence, raising
  exact coverage from 853 to 857 while retaining 23 unresolved points as
  approximate.
- Added a reproducible review corpus and guarded correction ledger.

## 1.0.1

### Patch Changes

- 64b10a1: Replace duplicated and missing `code_commune` values with the 1,541 unique codes from the official ONS 2021 Code Géographique National. Cascade the corrected foreign keys through every linked dataset, preserve Algérie Poste's differing provider-native values, enforce the SQL and repository-wide FK contracts, retain the 2021 mother-wilaya prefix for communes promoted in later reforms, and document the code contract.

## 1.0.0

Algeria's Protection Civile (civil protection / fire & rescue) units — 880 units
nationwide from the DGPC's own dataset (dgpc.dz), official-primary, on the v2
record contract.

### Added

- **880 Protection Civile units** across all wilayas from the **DGPC** GeoJSON
  (`dgpc.dz/dgpc2/unite.geojson`), each with an Arabic name, address, phone, fax
  and a status tier (`statut`, 10 tiers). Evidence type **official**.
- Every unit geocoded from the DGPC's own decimal coordinate — 853 `exact`, 27
  `approximate` (coincident points honestly demoted).
- **Wilaya derived by point-in-polygon** against the 69 post-2026-reform
  boundaries, then cross-checked against the DGPC's own code: units in the 11 new
  wilayas carry their correct new code, and where geometry and the DGPC code
  disagree among pre-reform codes (a border unit misfiled by a simplified outline)
  the DGPC's official code wins. The DGPC's `cod_wilaya` is preserved in
  `refs.dgpc_wilaya`. Commune best-effort (Arabic name match, nearest-centroid
  fallback), stable `{wilaya}-{seq}` ids.
- JSON, CSV, GeoJSON, TypeScript types, and a `npm run fetch` rebuild script.
- Government content © DGPC — no open licence; published as a factual public
  listing with attribution (`conditionsOfAccess` in the discovery descriptor).
