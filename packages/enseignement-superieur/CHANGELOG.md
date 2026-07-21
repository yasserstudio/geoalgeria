# Changelog

## 2.0.0

### Major Changes

- e84384a: Data v2 — one canonical record contract across every sector package (breaking schema overhaul).

  Every sector package now shares a single record shape defined by the new `@geoalgeria/schema` dependency, replacing the hand-written, drifted `types/index.d.ts` per package. Read [`packages/schema/MIGRATING.md`](https://github.com/yasserstudio/geoalgeria/blob/main/packages/schema/MIGRATING.md) before adopting `2.0.0`.

  - **Breaking record shape**: `wilaya_code` is a zero-padded **string** (`"16"`, not `16`); commune linkage is `commune_code` (string ONS code) + `commune`; coordinates are `lat`/`lng`; external ids collapse into `refs: { osm, wikidata, … }`; `id` is an opaque string unique within its file (no more global `{sector}:{WW}-{seq}` form). Every record ships in **JSON, CSV and GeoJSON**.
  - **Breaking `geo_precision`**: strictly `exact | approximate | null`, **null if and only if** the record has no coordinate; the old method vocabulary moved to a new `geo_method` field under the same null-iff rule. `exact` now requires ≥3 decimals and a point unique within its file — 409 records that could not carry that claim were downgraded to `approximate`.
  - **Honest metadata**: real per-source `retrieved` dates; licence URLs only where the source is genuinely open, `conditionsOfAccess` prose otherwise. A root `index.json` catalog and a `schema.org/Dataset` descriptor ship alongside the data.
  - **Data fixes**: the capital-coordinate 9-cycle swap repaired; 30+11 mislinked records relinked; emploi communes recovered; 972 previously-dropped tourisme values restored.

  Not part of this release: the core `geoalgeria` dataset and `@geoalgeria/telecom` predate this contract and stay on their current v1 versions until migrated.

## 1.1.0

Algeria's higher-education network — 177 from the MESRS, now with private & other-ministry institutions.

### Added

- 19 licensed private institutions and 48 establishments under other ministries
  (Santé 25, Défense 16, Culture 4, Poste 2, Travail 1) that MESRS supervises
  pedagogically — sourced from the ministry's Arabic listing, which the English
  page omits (110 → 177 institutions)
- New fields: `name_ar` (Arabic name; also backfilled for the public network via
  website join — 164/177 records), `sector` (`public` / `private`), and
  `supervisory_ministry`
- New helper `institutionsBySector("public" | "private")`

### Improved

- `name` is now nullable, so the Arabic-only private/other-ministry institutions
  ship with `name_ar` (use `name ?? name_ar` for a display label)

## 1.0.0

### Added

- Algeria's higher-education network — 110 institutions from the Ministry of Higher Education (MESRS), with official websites, type, wilaya/commune
  linkage and coordinates
- Four institution types: 58 universities, 35 grandes écoles, 12 écoles normales
  supérieures, and 5 centres universitaires, across 51 wilayas
- Every institution carries its official `.dz` website, as listed by the ministry
- Wilaya and commune reconciled to the geoalgeria flagship (69-wilaya scheme);
  coordinates are OpenStreetMap-derived and labelled per record with
  `geo_precision` (`campus` / `commune` / `wilaya`)
- Export formats: JSON, CSV, GeoJSON
- npm package with typed helper accessors (`institutions()`, `institutionById()`,
  `institutionsByWilaya()`, `institutionsByType()`, `metadata()`)
