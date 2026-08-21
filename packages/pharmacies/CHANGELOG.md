# @geoalgeria/pharmacies

## 2.1.1

### Patch Changes

- 64b10a1: Replace duplicated and missing `code_commune` values with the 1,541 unique codes from the official ONS 2021 Code Géographique National. Cascade the corrected foreign keys through every linked dataset, preserve Algérie Poste's differing provider-native values, enforce the SQL and repository-wide FK contracts, retain the 2021 mother-wilaya prefix for communes promoted in later reforms, and document the code contract.

## 2.1.0

### Minor Changes

- ec011f3: Fresh OpenStreetMap re-survey (2026-08-08 pull, `timestamp_osm_base` 2026-08-08T14:50:21Z): 3,790 to **3,797** pharmacies, **2,461** named, still **67** wilayas. 9 added and 2 dropped upstream (`44-00029` Barça Toufiq in Aïn Defla and `47-00001` in Ghardaïa). Precision 3,509 exact / 288 approximate. Enrichment moves a little: 146 with phone, 257 with opening hours (was 255), 1,163 with address (was 1,159), 526 with a `dispensing` flag (was 524). The 1,769-way bulk-import artifact near Attatba is still detected and excluded.

  **Ids of surviving records are stable.** All 3,788 records that survive the re-survey keep the id they shipped under, so existing joins on `id` keep working across re-surveys. The fetcher now runs `carryOverIds` keyed on the OSM id before writing, matching the other sector packages. Without it the positional `{wilaya_code}-{seq}` sequence re-homed 1,120 records, because a single pharmacy inserted upstream shifts every later record in its wilaya.

  Four records are re-linked against the current core set rather than against OSM: two points near Menaa move from Aïn Oussera (65) to Bou Saâda (68), and two near Bou Saâda re-link from Bou Saâda to Ouled Sidi Brahim. Since ids carry over, the id prefix on those records no longer matches their `wilaya_code`, which is expected under the v2 contract where `id` is opaque. Eleven records pick up upstream name edits, mostly generic "Pharmacie" placeholders being cleared or a bilingual name being split into `name_fr` / `name_ar`.

  `commune_code` nulls go 18 to **21**. The two re-linked Menaa records drop `"1709"` for null, and the new `16-00749` ships null. Both communes exist in the core set but carry no `code_commune` there (Menaa in wilaya 68, Bologhine Ibnou Ziri in wilaya 16), so this is an upstream gap in `packages/dataset`, not a regression in the join. `commune` names on those records are populated as usual.

  `metadata.json` keeps `evidence_type: "crowdsourced"` on the OpenStreetMap source. `buildMetadata` passes `sources[]` through verbatim, so the fetcher now pins the value instead of leaving it off and silently dropping the provenance claim on every rebuild.

  No API or shape changes: record contract, file layout and loaders are exactly as before.

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

Algeria's pharmacies — 3,790 officines from OpenStreetMap, geocoded, bilingual where named, wilaya/commune-linked.

### Added

- 3,790 pharmacies (`amenity=pharmacy`) across 67 wilayas from **OpenStreetMap**
  (ODbL), each geocoded, de-duplicated (same-name-within-40 m and coincident
  points), with FR/AR names routed by script where present.
- Contact tags where OSM has them: 2,459 named, 146 with phone, 255 with opening
  hours, 1,159 with address, 524 with a `dispensing` flag.
- Wilaya/commune linkage by nearest-centroid join against the geoalgeria base
  dataset (wilaya effectively exact, commune best-effort), stable `{wilaya}-{seq}`
  ids ordered by OSM id.
- Honest partial-coverage framing (~3.8k mapped vs an estimated ~11k officines
  nationally; no open official registry).
- JSON, CSV, GeoJSON, TypeScript types, and a `npm run fetch` rebuild script.
