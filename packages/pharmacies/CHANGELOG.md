# @geoalgeria/pharmacies

## 2.0.0

### Major Changes

- e84384a: Data v2 — one canonical record contract across every sector package (breaking schema overhaul).

  Every sector package now shares a single record shape defined by the new `@geoalgeria/schema` dependency, replacing the hand-written, drifted `types/index.d.ts` per package. Read [`packages/schema/MIGRATING.md`](https://github.com/yasserstudio/geoalgeria/blob/main/packages/schema/MIGRATING.md) before adopting `2.0.0`.

  - **Breaking record shape**: `wilaya_code` is a zero-padded **string** (`"16"`, not `16`); commune linkage is `commune_code` (string ONS code) + `commune`; coordinates are `lat`/`lng`; external ids collapse into `refs: { osm, wikidata, … }`; `id` is an opaque string unique within its file (no more global `{sector}:{WW}-{seq}` form). Every record ships in **JSON, CSV and GeoJSON**.
  - **Breaking `geo_precision`**: strictly `exact | approximate | null`, **null if and only if** the record has no coordinate; the old method vocabulary moved to a new `geo_method` field under the same null-iff rule. `exact` now requires ≥3 decimals and a point unique within its file — 409 records that could not carry that claim were downgraded to `approximate`.
  - **Honest metadata**: real per-source `retrieved` dates; licence URLs only where the source is genuinely open, `conditionsOfAccess` prose otherwise. A root `index.json` catalog and a `schema.org/Dataset` descriptor ship alongside the data.
  - **Data fixes**: the capital-coordinate 9-cycle swap repaired; 30+11 mislinked records relinked; emploi communes recovered; 972 previously-dropped tourisme values restored.

  Not part of this release: the core `geoalgeria` dataset and `@geoalgeria/telecom` predate this contract and stay on their current v1 versions until migrated.

## 1.0.0

Algeria's pharmacies — 3,790 officines from OpenStreetMap, geocoded, bilingual where named, wilaya/commune-linked.

### Added

- 3,790 pharmacies (`amenity=pharmacy`) across 67 wilayas from **OpenStreetMap**
  (ODbL), each geocoded, de-duplicated (same-name-within-40 m and coincident
  points), with FR/AR names routed by script where present.
- Contact tags where OSM has them: 2,459 named, 146 with phone, 255 with opening
  hours, 1,159 with address, 524 with a `dispensing` flag.
- Wilaya/commune linkage by nearest-centroid join against the geoalgeria base
  dataset (wilaya effectively exact, commune best-effort), stable `{wilaya}-{seq}`
  ids ordered by OSM id.
- Honest partial-coverage framing (~3.8k mapped vs an estimated ~11k officines
  nationally; no open official registry).
- JSON, CSV, GeoJSON, TypeScript types, and a `npm run fetch` rebuild script.
