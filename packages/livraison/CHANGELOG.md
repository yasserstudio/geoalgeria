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

## 1.0.1

### Patch Changes

- Metadata: complete the package description and keywords to name the Anderson, Noest and Maystro networks alongside Yalidine and Guepex (data unchanged).

## 1.0.0

### Added

- Algeria's COD / e-commerce delivery layer, as installable data: a 16-carrier registry,
  411 geocoded stop-desks across 61 wilayas, and per-carrier coverage, in JSON, CSV and GeoJSON
- Carrier registry — 16 Algerian COD / e-commerce delivery companies, each with
  website, service model (stop-desk / home / both), cash-on-delivery support, scope,
  how openly it publishes agency data, and public-API availability
- 411 geocoded stop-desk points across 61 wilayas, from the carriers that publish open
  agency data: the **Yalidine + Guepex** federated relay (merged and de-duplicated by
  shared stop-desk id; operators Yalidine, Guepex, EasyAndSpeed, WeCanServices, SpeedMail,
  Zimou Express) plus three independent networks — **Anderson** (89), **Noest** (94) and
  **Maystro** (38) — geocoded from the Google Maps link on each agency card
- Per-carrier coverage — wilaya/commune stop-desk presence for the 9 carriers with open data
- Wilaya linkage (`wilaya_code`) resolved against the geoalgeria 69-wilaya model
  (Law n° 26-06, Journal Officiel n° 25 of 5 April 2026)
- Export formats: JSON, CSV, GeoJSON
- npm package with typed helper accessors (`carriers()`, `stopdesks()`, `coverage()`,
  `carrierById()`, `stopdesksByWilaya()`, `stopdesksByCarrier()`, `coverageByCarrier()`,
  `metadata()`)
