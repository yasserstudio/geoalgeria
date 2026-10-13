# @geoalgeria/schema

> The canonical data contract every GeoAlgeria dataset conforms to, one shared schema, one validator, one metadata shape.

This package is the single source of truth for the shape of GeoAlgeria's open datasets (schema **v2**). It ships:

- **TypeScript types** – `GeoRecord`, `DatasetMetadata`, `SourceRef`, `Manifest`, `Refs`, `GeoPrecision`. Each `@geoalgeria/*` dataset's records are a `GeoRecord` plus domain-specific extra fields.
- **A zero-dependency runtime validator** – `validateRecords` / `validateMetadata`. Enforces the contract (string `wilaya_code`, string ONS `commune_code`, `geo_precision: exact|approximate|null` and `geo_method`, each null if and only if the record has no coordinate, `lat`/`lng`, `refs`), an always-on **Algeria-bbox coordinate guard** that catches lat/lng swaps and sign flips, and an optional **point-in-wilaya** check when you supply boundary polygons. It also refuses `geo_precision: "exact"` where the coordinates disprove the claim themselves: one rounded to fewer than `MIN_EXACT_DECIMALS` fraction digits (±556 m at two decimals is a neighbourhood, not a facility), and one that another record in the same file also carries, since a shared point is not a per-facility point.
- **Coordinate-quality helpers** – `fractionDigits`, `coordDecimals`, `sharedPoints` and `onArcminuteGrid`, the rules above as functions a generator can apply before it emits. `onArcminuteGrid` is the third rounding case, a coordinate written as degrees and minutes with the seconds dropped (33°35'N 2°40'E arrives as 33.58333, 2.66667 and reads as five honest decimals). It is a helper rather than a validator error, because several packages still ship pre-existing DMS points; this repository fails on a new one in `test/arcminute-exact.test.mjs`.
- **Canonical builders** – `buildMetadata` (counts, precision breakdown, honest `estimated_universe` coverage, `bbox`), `buildManifest` (the repo catalog / `index.json`), and `buildDcat` (a schema.org `Dataset` descriptor for Google Dataset Search / AI answer engines).
- **Emit helpers** – `toCSV`, `toGeoJSON`, `wcode`, `round6`, `haversine`, `bbox`.

## Usage

```js
import { validateRecords, buildMetadata } from "@geoalgeria/schema";

const { errors, warnings } = validateRecords(records, { requireName: true });
if (errors.length) throw new Error(errors.join("\n"));

const meta = buildMetadata({
  package: "@geoalgeria/sante",
  records,
  sources: [{ key: "msp", name: "Ministry of Health", url: "https://sante.gov.dz", license: "official" }],
  license: "MIT",
  updated: "2026-07-18",
  estimatedUniverse: 800,
});
```

### The contract in one glance

| field | type | notes |
|---|---|---|
| `id` | `string` | opaque, unique **within its file** – not globally unique, not unique across files even within one package |
| `name` / `name_fr` / `name_ar` | `string \| null` | domain-default `name`; localized variants optional |
| `wilaya_code` | `string` | zero-padded `"01".."69"` |
| `commune_code` | `string \| null` | ONS 2021 code; communes moved by later reforms retain their mother-wilaya prefix |
| `lat` / `lng` | `number \| null` | both set or both null |
| `geo_precision` | `"exact" \| "approximate" \| null` | detail in `geo_method`; **null iff `lat`/`lng` are null** |
| `geo_method` | `string \| null` | how the point was obtained (`"osm_node"`, …); **null iff `lat`/`lng` are null** |
| `refs` | `{ osm?, wikidata?, msp?, … }` | cross-dataset external ids |

## Boundary checks

`validateRecords` runs the point-in-wilaya check only when you pass `boundaries` (built with `loadBoundaries(featureCollection)`), so the package ships no polygons. Without them, the Algeria-bbox guard still catches gross coordinate errors. This repo's polygons live in `packages/dataset/data/geojson/wilaya-boundaries.geojson` (69 wilayas, OSM/ODbL; published in the `geoalgeria` npm package under `data/geojson/`).

`loadBoundaries` **throws** rather than returning an empty or partial index, on no usable features, on any feature it cannot index, and on a duplicate wilaya code. `pointInWilaya` reports a code it has no polygon for as *inside* ("can't disprove, don't flag"), so a degraded index does not weaken the check, it silently switches it off; a load-time throw is the only outcome that cannot be mistaken for a clean run.

## License

MIT (code). Dataset content is licensed per each `@geoalgeria/*` package.
