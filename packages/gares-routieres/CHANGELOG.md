# @geoalgeria/gares-routieres

## 2.1.0

### Minor Changes

- 78886d3: Tindouf comes home, and every station gains its MAHATATI agency id.

  Station 33-01 TINDOUF shipped with a sign-flipped source longitude (+8.125
  for a station at 8.13°W), which also derived the wrong wilaya and commune
  (33/Illizi) from the wrong point. The coordinate is now OSM-verified (node
  4593158192), the station sits in Tindouf (wilaya 37, commune 3701) as its own
  refs and address always said, and coverage grows to 52 wilayas. Because the
  id encodes the wilaya, the record is re-identified as 37-01; 33-01 is retired
  in the new data/retired-ids.json and can never be reassigned. No other id
  changes: the generator now pins committed ids through carryOverIds.

  New: refs.mahatati_agency, the per-station MAHATATI departure-agency id
  (73 of 74 stations; In Saleh is not a departure agency), staged from the
  public MAHATATI departure-station list. refs.sogral is now documented as a
  town-level id shared by twin stations (Annaba and Sidi Brahim, the three
  Constantine gares): never treat it as a station key.

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

Algeria's intercity bus stations — 74 SOGRAL gares routières, geocoded and typed.

### Added

- 74 intercity bus stations across 51 wilayas from **SOGRAL** (EPE SOGRAL Spa),
  the state operator of Algeria's gares routières, via its live registry
  (`live.sogral.com/api/live/agencies`)
- Official name, gare name, postal address, coordinates (74/74 geocoded),
  and total/built surface areas per station
- `wilaya_code`/`commune`/`commune_code` attached by nearest-centroid join
  against the geoalgeria commune model — which also reconciles SOGRAL's legacy
  48-wilaya codes to the 58/69 model (e.g. Touggourt, Djanet)
- 3 broken upstream coordinates fixed: Touggourt & Djanet from OpenStreetMap,
  Guelma from its commune centroid (`geo_precision: "approx"`)
- `sogral_id` + `sogral_code` cross-links kept for provenance
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
