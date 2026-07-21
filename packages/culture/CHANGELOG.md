# @geoalgeria/culture

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

Algeria's cultural atlas — 1,083 places from the Ministry of Culture's Patrimoine Culturel portal, bilingual FR/AR, fully geocoded.

### Added

- **1,083 cultural places** across **66 of Algeria's 69 wilayas**, every place carrying a source coordinate (`geo_precision: "source_point"`) — **100% bilingual** (French + Arabic). Places the portal still files under pre-2019 wilaya codes are rescoped to the current 69-wilaya scheme (Law 26-06) by nearest-commune geography (e.g. Timimoun, Touggourt, Djanet, Ksar El Boukhari).
- **11 typed layers** in two categories. **Heritage (943):** protected cultural property 580, libraries 257, museums 48, theatres 45, museums of the Moudjahid 13. **Establishments (140):** maisons de culture 51, culture directorates 33, cinemas 20, cultural centres 15, arts schools 15, palais de culture 6.
- `has_virtual_tour` flag — 22 places offer a 360° virtual tour on the portal.
- Commune/wilaya linkage: wilaya is exact (from the portal); commune is nearest-centroid from the GeoAlgeria commune set.
- Stable `{wilaya_code}-{type_code}-{seq}` ids, portal deep links, and FR/AR node ids.
- Shipped as JSON, CSV, GeoJSON, and TypeScript definitions.
