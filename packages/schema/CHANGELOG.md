# @geoalgeria/schema

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
