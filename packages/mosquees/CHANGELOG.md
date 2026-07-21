# @geoalgeria/mosquees

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

Algeria's mosques — 20,759 geocoded, a Wikidata + OpenStreetMap composite with Arabic & French names, typed and ready to map.

### Added

- 20,759 mosques across all 69 wilayas, compiled from Wikidata (CC0) and
  OpenStreetMap (ODbL) — near-complete national coverage against the ~18,449
  counted by the Ministry of Religious Affairs (MARW)
- Provenance on every record (`source`: wikidata / wikidata+osm / osm) with
  `wikidata` QID and `osm_id` cross-links: 13,200 Wikidata-only, 5,897 matched
  in both, 1,662 OpenStreetMap-only additions
- Bilingual naming — 15,138 Arabic names, 7,874 French names — plus denomination
  where known (sunni / ibadi / sufi)
- Commune/wilaya linkage (`wilaya_code`, `commune_code`, `commune`) attached by
  nearest-centroid join against the geoalgeria commune model — wilaya exact,
  commune best-effort
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
