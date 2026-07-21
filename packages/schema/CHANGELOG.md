# @geoalgeria/schema

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
