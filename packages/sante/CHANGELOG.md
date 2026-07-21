# @geoalgeria/sante

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

Algeria's public health establishments — 695 from the Ministry of Health, bilingual, typed and mostly geocoded.

### Added

- 695 public health establishments across the 58 wilayas with health
  directorates, from the Ministry of Health (MoH) registry — 270 EPH
  (public hospitals), 292 EPSP (proximity health), 108 EHS (specialized),
  20 CHU (university hospitals) and 5 other hospitals
- Bilingual naming (563 records with both French and Arabic names), official
  `type` with French and Arabic labels, and `sector` (`public` for the whole
  MoH registry; private clinics will carry `private`)
- Commune/wilaya linkage (`wilaya`, `wilaya_ar`, `wilaya_code`, `commune`,
  `commune_code`) — wilaya from the MoH tag (exact), commune by matching the
  establishment locality to the geoalgeria commune set (best-effort)
- Coordinates on 600 of 695 records, with per-record `geo_precision`: 121 from
  an OpenStreetMap facility, 3 from Wikidata, 476 from the commune centroid;
  95 records whose locality did not resolve carry no coordinates
- Per-record provenance (`source`, `wikidata` QID, `osm_id`) and stable
  `{wilaya_code}-{type}-{seq}` ids
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
