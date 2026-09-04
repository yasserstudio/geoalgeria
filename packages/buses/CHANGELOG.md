# @geoalgeria/buses

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

Algeria's urban bus networks — line-level data, starting with ETUSA (Alger).

### Added

- 50 ETUSA (Établissement de transport urbain et suburbain d'Alger) bus lines from
  fr.wikipedia — termini, stop counts (44/50), communes served, and metro/tram/gare
  stations served en route
- Multi-operator design: `operator`/`network` on every line; more cities/operators
  to be added under the same schema
- `wilaya_code` (16, Alger) joins the geoalgeria model
- Export formats: JSON, CSV, with TypeScript types and helper accessors
- Scope note: **line-level attributes only** — per-stop and per-line geometry
  (OSM `route=bus`) is deferred to v1.1 (ETUSA-tagged OSM route coverage is thin).
  Covers 50 of ~122 ETUSA passenger lines.
