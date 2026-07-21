# @geoalgeria/ferroviaire

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

Algeria's rail & urban transit — 692 stations & stops, a Wikidata + OpenStreetMap
composite with operators, lines, and Arabic & French names, typed and ready to map.

### Added

- 692 transit nodes across 50 wilayas: 427 rail + 190 tram + 41 metro + 24 aerial
  tramway + 10 gondola — compiled from Wikidata (CC0) and OpenStreetMap (ODbL)
- Provenance on every record (`source`: wikidata / wikidata+osm / osm) with
  `wikidata` QID and `osm_id` cross-links (127 Wikidata-only, 508 matched in both,
  57 OpenStreetMap-only additions; OSM matched within 150 m)
- Operator stamped by mode — **SNTF** (rail), **SETRAM** (tram, with per-city
  `network`), **SEMA** (Métro d'Alger) — plus `line` membership where known
- Bilingual naming (560 Arabic, 669 French names)
- `wilaya_code`/`commune`/`commune_code` by nearest-centroid join against the
  geoalgeria commune model
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
- Note: bus stations are out of scope — see `@geoalgeria/gares-routieres`. Metro
  node count exceeds SEMA's 19 operational stations (Wikidata includes entrances /
  extensions); SETRAM operates 172 tram stations across 7 networks.
