# Changelog

## 3.1.0

### Minor Changes

- 3dd6c4f: **Migration.** `commune` and `daira` are now `string | null`. 21 records published a placeholder commune `":"` (3 of them also a placeholder daira), which is the SIG leaving its commune referential unset, and they now publish `null`. Guard a display or a join: `r.commune ?? r.commune_code ?? ""`, and `r.daira ?? ""`. Every record now also carries **`refs.mjs`**, the SIG's own per-record UUID, and ids are carried on it from now on, so an establishment the ministry renames, re-addresses or re-places keeps its id. In `data/csv/institutions.csv` the new `refs` column (a JSON string) sits after `source`, which shifts every later column one place to the right for a reader that indexes columns by position. No id changes.

  Refresh jeunesse from the Ministry of Youth and Sports SIG, layer `etablissements_de_jeunes` (sig.mjs.gov.dz), retrieved 2026-10-27 over an Algerian connection and committed as `sources/jeunesse/sig-etablissements.json`: 2,334 establishments, unchanged (previous pull 2026-06-23). The SIG returned 2,337 features; the 3 it added since June are unfinished entries with no type, which the fetcher drops as before.

  **The register is unchanged, and so are the ids.** For this one transition every published id is carried on the establishment itself (type, point, names and address) rather than on its sort position, which the committed capture would otherwise have reshuffled for 213 records; from the next refresh on, ids carry on `refs.mjs`. No id is retired and none is minted.

  **What changes.**

  - The 21 placeholder communes and 3 placeholder dairas now publish `null` (see Migration), as the fetcher already did for every other unset field.
  - `00728`, a maison de jeunes at Serguine (wilaya 64, Ksar Chellala), no longer carries a review receipt: the build now places it in wilaya 64 / commune 1439 itself, from the dataset's 2026-09-24 Serghine to Serguine rename (JORA n 25 of 2026, loi 26-06), so the reviewed correction it carried had nothing left to correct and was retired (Owner decision, 2026-10-28). Its place, wilaya and commune are unchanged; it now carries `source_wilaya_code: "14"`, like every other record the 2026 reform reconciled.
  - 2 addresses that carried an en dash as a separator (`01134`, `01544`) are folded to `-`, as sports now folds its addresses.
  - The shared reconciler reads a commune's former JORA spelling, so the 6 records that would otherwise have fallen back to their pre-reform wilaya keep the 2026 wilaya they are published under.

  `retrieved` and `updated` move to 2026-10-27, the date of the capture.

### Patch Changes

- f1a05b8: These packages now work in a bundled app: esbuild and Vite can follow the data path.

  Before this release, `import { stations } from "@geoalgeria/ferroviaire"` (and the same for every package here) built fine and then threw `ENOENT ... /data/stations.json` on the first call. The JSON was read at run time from a path joined off `import.meta.url`; esbuild and Vite inline the module without relocating that read, so it went looking for the data next to the generated bundle. Node and Next.js with Turbopack were never affected, which is why this took until now to surface.

  Each package now reaches its data through a generated `loaders.cjs`: one `require` of a literal path per data file, inside a function. A bundler can trace a literal path, and the `require` stays lazy, so importing the package still parses nothing until you call a loader. Every call still answers with a fresh copy, as it always did, so a caller that sorts what it gets cannot reorder another caller's records.

  Nothing is different for you: same exports, same arguments, same return values, same TypeScript types, and not one record of data changed. Verified by packing each real tarball and running it three ways, under plain Node, an esbuild bundle and a Vite 8 SSR bundle (rolldown), with the three required to agree. Those are the three that are checked, and the only ones claimed.

  Turbopack is the one bundler that cannot be checked that way, because it needs a `next build`. It already served these packages before the fix, and the fix gives it a graph it has not seen before (an ESM index importing a CommonJS loader whose JSON arrives by literal `require`), so the proof for it is the geoalgeria.com preview build released in the same batch, which loads `@geoalgeria/gares-routieres` through its index on a live page.

## 3.0.4

### Patch Changes

- e056b8d: Reform-stale wilaya corrections (yasserstudio/geoalgeria.com#209): records whose source still files them under the wilaya their commune belonged to before the 2026 reform (law 26-06, JO 25; presidential decree 26-206, JO 40) now carry the current wilaya, with the commune the correction was derived from. Each is a reviewed decision in `quality/overrides/jeunesse.json`, so a regeneration reapplies it and stops if the source's own value has moved. No id changes.

## 3.0.3

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

## 3.0.2

### Patch Changes

- 68a06ac: Correct reviewed current-Wilaya assignments for the Annaba airport, Algérie Poste offices and ATMs, and Ministry of Youth and Sports establishments while preserving differing Source codes and keeping the flagship Poste mirror synchronized.

## 3.0.1

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 3.0.0

### Major Changes

- e84384a: Data v2 — one canonical record contract across every sector package (breaking schema overhaul).

  Every sector package now shares a single record shape defined by the new `@geoalgeria/schema` dependency, replacing the hand-written, drifted `types/index.d.ts` per package. Read [`packages/schema/MIGRATING.md`](https://github.com/yasserstudio/geoalgeria/blob/main/packages/schema/MIGRATING.md) before adopting `2.0.0`.

  - **Breaking record shape**: `wilaya_code` is a zero-padded **string** (`"16"`, not `16`); commune linkage is `commune_code` (string ONS code) + `commune`; coordinates are `lat`/`lng`; external ids collapse into `refs: { osm, wikidata, … }`; `id` is an opaque string unique within its file (no more global `{sector}:{WW}-{seq}` form). Every record ships in **JSON, CSV and GeoJSON**.
  - **Breaking `geo_precision`**: strictly `exact | approximate | null`, **null if and only if** the record has no coordinate; the old method vocabulary moved to a new `geo_method` field under the same null-iff rule. `exact` now requires ≥3 decimals and a point unique within its file — 409 records that could not carry that claim were downgraded to `approximate`.
  - **Honest metadata**: real per-source `retrieved` dates; licence URLs only where the source is genuinely open, `conditionsOfAccess` prose otherwise. A root `index.json` catalog and a `schema.org/Dataset` descriptor ship alongside the data.
  - **Data fixes**: the capital-coordinate 9-cycle swap repaired; 30+11 mislinked records relinked; emploi communes recovered; 972 previously-dropped tourisme values restored.

  Not part of this release: the core `geoalgeria` dataset and `@geoalgeria/telecom` predate this contract and stay on their current v1 versions until migrated.

## 2.0.0

Algeria's youth establishments — 2,334 from the official Ministry of Youth and Sports GIS, typed and geocoded.

### Added

- `name_ar` (Arabic name, backfilled from the legacy ministry map by type-checked
  nearest-neighbour geo-match, ~59% of records)
- New per-record fields: address, capacity, year of reception, operational status,
  PMR accessibility, and built / land area
- Sister package to `@geoalgeria/sports` — both from the same official Ministry of Youth and Sports GIS (sig.mjs.gov.dz)

### Improved

- Rebuilt from the official Ministry of Youth and Sports GIS — 2,334
  establishments (was 2,076), spanning 58 wilayas
- Primary names are now French, with stable type codes (`MJ`, `CSP`, `SPA`, `AJ`,
  `CJ`, `CLS`, `FJ`, `CC`, `BA`) and sequential integer ids

### Dropped

- Arabic as the primary `name` (now French — read `name_ar` for the Arabic name)
  and the legacy youthconnect source; old type codes and ids. Join `wilaya_code`
  against `geoalgeria` for French commune/wilaya names

## 1.0.0

### Added

- 2,076 youth & sports institutions sourced from the Ministry of Youth and Sports
  (youthconnect.mjeunesse.gov.dz) — official Arabic names, institution type,
  commune / daïra / wilaya, and GPS coordinates
- Nine institution types: maisons de jeunes, complexes sportifs de proximité,
  salles polyvalentes, auberges de jeunes, centres culturels, camps de jeunes,
  centres de loisirs scientifiques, clubs de jeunes, and piscines de proximité
- Wilaya linkage (`wilaya_code`) joining the geoalgeria wilaya model
- Export formats: JSON, CSV, GeoJSON
- npm package with typed helper accessors (`institutions()`, `institutionById()`,
  `institutionsByWilaya()`, `institutionsByType()`, `metadata()`)
