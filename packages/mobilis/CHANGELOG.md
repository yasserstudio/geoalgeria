# Changelog

## 2.1.3

### Patch Changes

- 05a1ffb: Re-pull the Mobilis store locator, retrieved 2026-10-25: 164 agencies + 12,180 points of sale, identical.

  Source: Mobilis (mobilis.dz) store locator, all 69 wilayas walked for both categories. Previous pull 2026-08-31; the locator had been unreachable from outside Algeria since, and this one ran over an Algerian connection.

  **The directory came back byte-identical.** `data/agences.json` and `data/pdv.json`, and their CSV and GeoJSON mirrors, are the same bytes that shipped on 2026-08-31: 164 agencies and 12,180 approved points of sale, nothing added, nothing removed, no name changed in either script, no coordinate moved, no `geo_precision`, `geo_method`, wilaya or commune changed, and no id changed hands.

  The only field that moves is `retrieved` in `data/metadata.json`, and that is what the pull is worth: the directory is confirmed current as of 2026-10-25 rather than merely unrefuted since August.

  Worth reading as a property of the source rather than of the network: two months of a commercial retail estate with not one opening, closure, move or rename says the locator is a static export republished unchanged, so a later pull that is also identical is not independent confirmation. The 12,180 points of sale still carry no coordinates at source, so commune-level density remains the ceiling for them and nothing was geocoded from an address to pretend otherwise.

- f1a05b8: These packages now work in a bundled app: esbuild and Vite can follow the data path.

  Before this release, `import { stations } from "@geoalgeria/ferroviaire"` (and the same for every package here) built fine and then threw `ENOENT ... /data/stations.json` on the first call. The JSON was read at run time from a path joined off `import.meta.url`; esbuild and Vite inline the module without relocating that read, so it went looking for the data next to the generated bundle. Node and Next.js with Turbopack were never affected, which is why this took until now to surface.

  Each package now reaches its data through a generated `loaders.cjs`: one `require` of a literal path per data file, inside a function. A bundler can trace a literal path, and the `require` stays lazy, so importing the package still parses nothing until you call a loader. Every call still answers with a fresh copy, as it always did, so a caller that sorts what it gets cannot reorder another caller's records.

  Nothing is different for you: same exports, same arguments, same return values, same TypeScript types, and not one record of data changed. Verified by packing each real tarball and running it three ways, under plain Node, an esbuild bundle and a Vite 8 SSR bundle (rolldown), with the three required to agree. Those are the three that are checked, and the only ones claimed.

  Turbopack is the one bundler that cannot be checked that way, because it needs a `next build`. It already served these packages before the fix, and the fix gives it a graph it has not seen before (an ESM index importing a CommonJS loader whose JSON arrives by literal `require`), so the proof for it is the geoalgeria.com preview build released in the same batch, which loads `@geoalgeria/gares-routieres` through its index on a live page.

## 2.1.2

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

## 2.1.1

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.1.0

### Minor Changes

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

- Bundle TypeScript type definitions. `Agence`, `Pdv`, and `Metadata` interfaces plus typed loaders (`agences()`, `pdv()`, `all()`, `metadata()`) now ship with the package and resolve automatically via the `types` export condition. No runtime or data changes.

## 1.0.0

### Added

- The Mobilis sales network — 165 geocoded agencies + 12,180 approved points of sale across Algeria.
- 165 commercial agencies (_Agence Mobilis_): bilingual FR/AR name and address, with coordinates, in JSON, CSV, and GeoJSON.
- 12,180 approved points of sale (_points de vente agréés_): FR name, address, and commune, in JSON and CSV (the source carries no coordinates).
- Stable synthesized `id` (`{wilaya_code}-{seq}`); the Mobilis source id is kept as `code`; `wilaya_code` links to the GeoAlgeria divisions.
- JS API: `agences()`, `pdv()`, `all()`, `metadata()`.
- Source: Mobilis — ATM Mobilis (mobilis.dz/mapagence).
