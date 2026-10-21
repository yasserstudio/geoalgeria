# @geoalgeria/tourisme

## 2.0.4

### Patch Changes

- f70ce29: Ten sites stop claiming `exact` on a coordinate the number itself disproves.

  A **rounded placeholder** is a coordinate a source rounded instead of measuring. One kind is easy to spot (35, 8 locates a degree square), and the other hides inside it: degrees and whole arcminutes with the seconds dropped, which survives a decimal-digit count because minutes divided by 60 leave a long tail. 36.6166667, 6.8833333 is 36°37'N 6°53'E, a cell about 1.5 km across, and it cannot be a per-site point.

  Ten tourisme sites carried such a value as `geo_precision: "exact"`: the caves `attraction-846` and `attraction-848`, the sites `historic-91`, `historic-144`, `historic-487`, `historic-746` and `historic-837`, and the national parks `park-25`, `park-29` and `park-31`. All ten now read `"approximate"`. The three parks are areas in any case, so a single point for them was never a facility point.

  Not one coordinate moves, and no record, field or id changes: `geo_precision` goes from 4,315 `exact` / 33 `approximate` to 4,305 / 43 over the same 4,348 geocoded sites. The claim is what was wrong, and the honest claim is the correction.

  The writer now applies this rule to every package on every emit, beside the shared-point rule it already applied, so a point on the whole-arcminute grid cannot be published as `exact` again.

## 2.0.3

### Patch Changes

- e056b8d: Reform-stale wilaya corrections (yasserstudio/geoalgeria.com#209): records whose source still files them under the wilaya their commune belonged to before the 2026 reform (law 26-06, JO 25; presidential decree 26-206, JO 40) now carry the current wilaya, with the commune the correction was derived from. Each is a reviewed decision in `quality/overrides/tourisme.json`, so a regeneration reapplies it and stops if the source's own value has moved. No id changes.

## 2.0.2

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

## 2.0.1

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.0.0

### Major Changes

- e84384a: Data v2 — one canonical record contract across every sector package (breaking schema overhaul).

  Every sector package now shares a single record shape defined by the new `@geoalgeria/schema` dependency, replacing the hand-written, drifted `types/index.d.ts` per package. Read [`packages/schema/MIGRATING.md`](https://github.com/yasserstudio/geoalgeria/blob/main/packages/schema/MIGRATING.md) before adopting `2.0.0`.

  - **Breaking record shape**: `wilaya_code` is a zero-padded **string** (`"16"`, not `16`); commune linkage is `commune_code` (string ONS code) + `commune`; coordinates are `lat`/`lng`; external ids collapse into `refs: { osm, wikidata, … }`; `id` is an opaque string unique within its file (no more global `{sector}:{WW}-{seq}` form). Every record ships in **JSON, CSV and GeoJSON**.
  - **Breaking `geo_precision`**: strictly `exact | approximate | null`, **null if and only if** the record has no coordinate; the old method vocabulary moved to a new `geo_method` field under the same null-iff rule. `exact` now requires ≥3 decimals and a point unique within its file — 409 records that could not carry that claim were downgraded to `approximate`.
  - **Honest metadata**: real per-source `retrieved` dates; licence URLs only where the source is genuinely open, `conditionsOfAccess` prose otherwise. A root `index.json` catalog and a `schema.org/Dataset` descriptor ship alongside the data.
  - **Data fixes**: the capital-coordinate 9-cycle swap repaired; 30+11 mislinked records relinked; emploi communes recovered; 972 previously-dropped tourisme values restored.

  Not part of this release: the core `geoalgeria` dataset and `@geoalgeria/telecom` predate this contract and stay on their current v1 versions until migrated.
