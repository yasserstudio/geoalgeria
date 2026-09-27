# @geoalgeria/schema

## 1.1.2

### Patch Changes

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

## 1.1.1

### Patch Changes

- 76dfd0d: Confirm the MIT licence field against the new licence-terms validator rule.

## 1.1.0

### Minor Changes

- da9af34: Add a reusable reviewed-correction ledger contract with stale-baseline protection,
  public evidence requirements, and deterministic keep, patch, and exclusion actions.

## 1.0.1

### Patch Changes

- 64b10a1: Replace duplicated and missing `code_commune` values with the 1,541 unique codes from the official ONS 2021 Code Géographique National. Cascade the corrected foreign keys through every linked dataset, preserve Algérie Poste's differing provider-native values, enforce the SQL and repository-wide FK contracts, retain the 2021 mother-wilaya prefix for communes promoted in later reforms, and document the code contract.

## 1.0.0

Initial release. The canonical GeoAlgeria data contract (schema v2):

- TypeScript types: `GeoRecord`, `DatasetMetadata`, `SourceRef`, `Manifest`, `Refs`, `GeoPrecision`.
- Zero-dependency runtime validator: `validateRecords`, `validateMetadata` — string `wilaya_code`,
  string ONS `commune_code`, `geo_precision: exact|approximate`, coordinate pairing, an Algeria-bbox
  guard (catches lat/lng swaps + sign flips), and an optional point-in-wilaya boundary check.
- `loadBoundaries` throws on an index it could not build in full (no usable features, a feature it
  cannot index, a duplicate wilaya code) instead of returning an empty/partial Map — an un-indexed
  wilaya reads as "every point inside", so a silent index is a check that is off, not a check.
- Builders: `buildMetadata`, `buildManifest`, `buildDcat` (schema.org Dataset).
- Emit helpers: `toCSV`, `toGeoJSON`, `wcode`, `round6`, `haversine`, `bbox`.
