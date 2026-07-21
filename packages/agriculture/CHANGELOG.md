# @geoalgeria/agriculture

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

Algeria's agriculture-sector institutions — 196 from the Ministry of Agriculture, across 7 networks, bilingual, typed and geocoded.

### Added

- 196 agriculture-sector institutions from the Ministry of Agriculture, Rural
  Development and Fisheries (MADR) institutional directory, across 7 networks:
  58 agricultural-services directorates (DSA), 48 forest conservations, 16
  technical & research institutes (INRAA, INRF, ITGC, ITDAS…), 11 training
  centres (ITMAS/CFATSF/CFVA), 49 chambers of agriculture (+ the national
  chamber), 4 public offices (OAIC, ONIL, ONILEV, ONTA) and 10 public groups
  (GVAPRO, AGROLOG, GIPLAIT…)
- Bilingual `type` with French and Arabic labels, Latin `abbreviation` for the
  named institutes/offices/groups, and `sector` (`public` for the whole MADR
  directory)
- Wilaya/commune linkage (`wilaya`, `wilaya_ar`, `wilaya_code`, `commune`,
  `commune_code`) — wilaya from the directory (normalized to official codes),
  commune by matching the address to the geoalgeria commune set (best-effort)
- Coordinates on all 196 records, with per-record `geo_precision`: 89 from the
  matched commune centroid, 107 from the wilaya chief-town centroid (the MADR
  directory carries no coordinates)
- Contact fields (`address`, `phone`, `fax`) and per-record provenance
  (`source`, `wikidata`, `osm_id`) with stable `{wilaya_code}-{type}-{seq}` ids
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors

### Notes

- DSA covers all 58 wilayas; forest conservations (48) and chambers of
  agriculture (49) use the pre-2019 48-wilaya administrative division, so the
  southern wilayas fold into their parents there
- Coordinates are best-effort (commune/wilaya centroid). Upgrading the named
  institutes to precise OpenStreetMap/Wikidata points is planned
