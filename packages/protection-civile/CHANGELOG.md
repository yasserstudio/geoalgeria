# @geoalgeria/protection-civile

## 1.0.3

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

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
