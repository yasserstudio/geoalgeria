# Changelog

## 2.0.5

### Patch Changes

- 69e01da: **Two ALEM offices now exact.** `alem.json` record `15-01` moves from ANEM's two-decimal point (36.71, 4.05) to OpenStreetMap node 3771080748, "ANEM (agence nationale de l'emploi)", and ships `exact` / `osm_node`. Three sources agree within 15 m: that node, ANEM's own point for AWEM Tizi Ouzou, which publishes the same address (01 boulevard Haddadou Med Arezki), and the Owner's reading of 29 October, which confirms the open point (ADR 0001, rule 6). The correction is recorded in `quality/overrides/emploi.json`.

  `09-01` ALEM Blida moves from ANEM's two-decimal point (36.48, 2.84) to the building OpenStreetMap tags as "ANEM" (office=employment_agency) on Rue Yousfi Abdelkader, the record's own street (way 1174133619), and ships `exact` / `osm_way`. Two Votes: that building and the Owner's reading of 29 October, 4 m away. AWEM Blida, at Cité des 402 logts, is a different office and stays approximate.

- f1a05b8: These packages now work in a bundled app: esbuild and Vite can follow the data path.

  Before this release, `import { stations } from "@geoalgeria/ferroviaire"` (and the same for every package here) built fine and then threw `ENOENT ... /data/stations.json` on the first call. The JSON was read at run time from a path joined off `import.meta.url`; esbuild and Vite inline the module without relocating that read, so it went looking for the data next to the generated bundle. Node and Next.js with Turbopack were never affected, which is why this took until now to surface.

  Each package now reaches its data through a generated `loaders.cjs`: one `require` of a literal path per data file, inside a function. A bundler can trace a literal path, and the `require` stays lazy, so importing the package still parses nothing until you call a loader. Every call still answers with a fresh copy, as it always did, so a caller that sorts what it gets cannot reorder another caller's records.

  Nothing is different for you: same exports, same arguments, same return values, same TypeScript types, and not one record of data changed. Verified by packing each real tarball and running it three ways, under plain Node, an esbuild bundle and a Vite 8 SSR bundle (rolldown), with the three required to agree. Those are the three that are checked, and the only ones claimed.

  Turbopack is the one bundler that cannot be checked that way, because it needs a `next build`. It already served these packages before the fix, and the fix gives it a graph it has not seen before (an ESM index importing a CommonJS loader whose JSON arrives by literal `require`), so the proof for it is the geoalgeria.com preview build released in the same batch, which loads `@geoalgeria/gares-routieres` through its index on a live page.

## 2.0.4

### Patch Changes

- e056b8d: Reform-stale wilaya corrections (yasserstudio/geoalgeria.com#209): records whose source still files them under the wilaya their commune belonged to before the 2026 reform (law 26-06, JO 25; presidential decree 26-206, JO 40) now carry the current wilaya, with the commune the correction was derived from. Each is a reviewed decision in `quality/overrides/emploi.json`, so a regeneration reapplies it and stops if the source's own value has moved. No id changes.

## 2.0.3

### Patch Changes

- 4deabd3: Replace em dashes in source names and citations with plain separators.

  - Every source `name` reads `Operator: descriptor`, where it used to carry a
    U+2014 em dash, in `data/metadata.json` and in the `dataset-metadata.json`
    descriptor built from it.
  - The schema.org/DCAT `citation` entries join a source name and its licence with
    a comma: `OpenStreetMap: schools & kindergartens in Algeria, ODbL 1.0 (© OpenStreetMap contributors)`.
  - Coverage notes, package `description`s, the `types/index.d.ts` documentation and
    the `index.js` headers carry a colon, comma or semicolon in place of the dash.

  No count, coordinate, licence or date changes. Consumers that match a source name
  or a citation string literally need to update the separator; anything keyed on
  `sources[].key` is unaffected. `pnpm validate` now fails on an em dash in
  published metadata, so it cannot come back through a generator.

## 2.0.2

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.0.1

### Patch Changes

- 586c0cc: Refresh the public OSM, ANEM, and mobile-operator sources through 2026-08-31,
  including updated records, opening hours, labels, and canonical Mobilis wilaya
  assignments.

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

- Bundle TypeScript type definitions. `Awem`, `Alem`, and `Metadata` interfaces plus typed loaders (`awem()`, `alem()`, `agencies()`, `metadata()`) now ship with the package and resolve automatically via the `types` export condition. No runtime or data changes.

## 1.0.0

### Added

- 58 AWEM (wilaya employment agencies) and 273 ALEM (local employment agencies)
  sourced from ANEM (anem.dz) — address, phone, fax, email, manager, communes
  served, and coordinates
- Stable synthesized `id` (`{wilaya_code}-{seq}`) and `wilaya_code` linkage to
  the GeoAlgeria divisions
- Export formats: JSON, CSV, GeoJSON
- npm package with helper accessors (`awem`, `alem`, `agencies`, `metadata`)
