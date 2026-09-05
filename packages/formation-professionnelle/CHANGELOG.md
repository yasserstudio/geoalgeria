# @geoalgeria/formation-professionnelle

## 2.1.2

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.1.1

### Patch Changes

- 64b10a1: Map establishments from the source's pre-reform directorates to the current 69-wilaya division through exact coordinate containment and commune resolution.

## 2.1.0

### Minor Changes

- 682f0cd: Place the 557 establishments takwin.dz publishes without coordinates, taking the dataset from 1,375 of 1,932 geocoded (71%) to 1,920 (99%).

  The portal stores a coordinate pair per establishment but leaves one or both axes at the sentinel `0.000000000000000000000000000000` for 557 records: 304 have neither axis, 192 lost only the latitude, 60 only the longitude, and 3 fall outside Algeria. Those are gaps in the ministry's own database rather than in our capture, so no re-pull can close them.

  Each is now placed on the centroid of the commune its own record names, joined against the flagship geoalgeria commune set by normalized Arabic name within the record's own wilaya: 510 records, `geo_precision` `"approximate"` and `geo_method` `"commune"`. Where the commune field repeats the wilaya name and no commune of that name exists (31 Algiers records reading `الجزائر`, plus 4 whose seat commune is spelled differently upstream), only the wilaya centroid is claimed: 35 records, `geo_method` `"wilaya"`. Twelve records whose commune name could not be resolved confidently keep their null coordinates rather than being guessed at.

  The join is scoped to each record's own wilaya plus the wilayas carved out of it by the 2026 reform, because takwin.dz still publishes the pre-reform 58-wilaya scheme while the flagship commune set uses the 69-wilaya one. Same territory under both schemes, so no match crosses a real boundary.

  Independently checked against the source: 241 of the placed records still carry one real axis upstream, and the assigned centroid agrees with it to a median of 0.7 km (p90 6.8 km). The twelve disagreements above 25 km are all bad values in the portal's own surviving axis, including a sign-flipped Oran longitude and Ouargla and Hassi Messaoud holding each other's.

  Every existing id and every coordinate the portal did supply is unchanged; 545 records differ, each only by gaining `lat`, `lng`, `geo_precision` and `geo_method`. `geo_method` gains `"commune"` and `"wilaya"` alongside `"takwin"` in the published types.

  The package also moves onto the source-store convention: its raw pull is now committed at `sources/formation-professionnelle/takwin-etab.json` and the build replays it offline, since takwin.dz and its ibtikar mirror both answer a non-browser client with a WAF block page.

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

### Minor Changes

- c384525: Algeria's 1,932 vocational training establishments from takwin.dz (MFEP) — CFPA, INSFP, IFEP, IEP, DFEPs and private accredited centers across 58 wilayas, with type, capacity, boarding, contacts and GPS coordinates. JSON, CSV, GeoJSON, TypeScript.
