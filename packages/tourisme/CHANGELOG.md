# @geoalgeria/tourisme

## 2.1.0

### Minor Changes

- 47b15f3: **Migration.** Twenty-two records leave the package and their ids are retired for good, never reused and with no forward, because the places were removed rather than merged: `attraction-136`, `attraction-1193`, `attraction-1212`, `historic-251`, `historic-267`, `historic-385`, `historic-396`, `lodging-48`, `lodging-251`, `lodging-286`, `lodging-532`, `lodging-605`, `lodging-721`, `lodging-973`, `lodging-1028`, `lodging-1097`, `lodging-1113`, `lodging-1154`, `lodging-1155`, `lodging-1236`, `lodging-1544` and `lodging-1561`. The reserved set ships as `data/retired-ids.json`, which this package did not have before. If you hold one of these ids, it is gone and resolves to nothing by design.

  **Military places are out of scope for GeoAlgeria.** Owner decision of 2026-10-29: the project publishes no military location, so the military and gendarmerie facilities OpenStreetMap had mapped as tourism points are no longer published.

  Fifteen were on the lodging layer: eleven military hotels (Laghouat, Bechar, Blida, Alger, Djelfa, Constantine, Ouargla, Oran twice, Djanet and Barika), the national army rest centre in Boumerdes, the Cercle National de l'Armée in Alger, the military housing block in Mascara and the military residential quarter in Oran. Four were on the historic layer, none of them historic: military housing in Chelghoum Laid tagged as a castle, the Naval Forces Command in Alger tagged as an area, the Oued Athmania gendarmerie brigade tagged as a building, and a named army base in Tindouf tagged as a castle. Three more were gendarmerie nationale units the attractions layer had picked up, one as an artwork (Annaba) and two as viewpoints (El Oued, Touggourt).

  Records that only mention a military place are kept, and colonial-era military heritage is kept as heritage: `historic-4` (the former French army camp), `historic-707` (Bastion 18), `historic-252` (Caserne Bab Lakouas), `historic-818` (the old barracks) and `historic-1015` with `historic-1016` (two French colonial watchtowers) all stay, as do the other forts and city walls. `attraction-906` stays as well, because the Army Museum is a museum. So does `lodging-1528`, since a "base de vie" is a worker camp and not a military base.

  Counts: 4,326 records, down from 4,348. Lodging 1,587 from 1,602, attractions 1,245 from 1,248, historic sites 1,180 from 1,184. Wilaya coverage is unchanged at 69 and every record is still geocoded.

  **The exclusion lives in a build, so a refresh cannot undo it.** This package never had a fetcher, which is why hand-edited data files would have been the only way to remove a record. `packages/tourisme/scripts/build.mjs` is new: it re-emits the whole package offline from its committed records through the shared writer, applies `quality/overrides/tourisme.json` as every other package's build does, and holds the exclusion keyed on the OpenStreetMap element rather than on the published id, so a future pull that re-mints ids still keeps these places out.

- 895faea: **Migration.** Five park records leave the package because each one duplicated a national park the package already ships from OpenStreetMap. Their ids are retired for good and forward to the record that carries the park, in the `migrations` map of `packages/tourisme/data/retired-ids.json`: `park-25` to `park-2` (Belezma), `park-26` to `park-7` (Gouraya), `park-27` to `park-3` (Chréa), `park-29` to `park-6` (Djurdjura) and `park-31` to `park-1` (El Kala). If you hold one of the old ids, follow `merged_into`.

  **Why.** Each park came in twice: once as its OpenStreetMap boundary, with a measured point, and once as its Wikidata item, with a degree-minute point 0.7 to 7.7 km from the boundary's centre. Owner decision of 2026-10-29: the Wikidata copy merges into the OpenStreetMap record. The merge lives in `packages/tourisme/scripts/build.mjs` (`MERGED_WIKIDATA`), keyed on the Wikidata item, so a rebuild keeps it. Each OpenStreetMap record now also carries the Wikidata item in `refs.wikidata`.

  **One cave now exact.** `attraction-842` (grotte du Macchabée, Tizi Ouzou) moves 199 m, from the degree-minute Wikidata point (36.5, 4.3333333) to the cave entrance OpenStreetMap maps as node 3832451091 (36.4990808, 4.3314177), and ships `exact` / `osm`. Two independent sources place it there (ADR 0001): that node and the Wikidata item Q23805261. The correction is recorded in `quality/overrides/tourisme.json` with both sources as its evidence, and the record carries `review_status: "corrected"`.

  **Two thermal springs now exact.** `thermal-spring-61` (Hammam Beni Salah) and `thermal-spring-64` (Hammam Zatout), both El Tarf, leave ASAL's two-decimal points for the OpenStreetMap node named after each spring (nodes 1291639449 and 5579190621), 118 m and 468 m away; one open source each, recorded in `quality/overrides/tourisme.json`.

  Counts: 4,321 records, down from 4,326; parks 27 from 32. Precision: 4,286 exact, 35 approximate.

### Patch Changes

- f1a05b8: These packages now work in a bundled app: esbuild and Vite can follow the data path.

  Before this release, `import { stations } from "@geoalgeria/ferroviaire"` (and the same for every package here) built fine and then threw `ENOENT ... /data/stations.json` on the first call. The JSON was read at run time from a path joined off `import.meta.url`; esbuild and Vite inline the module without relocating that read, so it went looking for the data next to the generated bundle. Node and Next.js with Turbopack were never affected, which is why this took until now to surface.

  Each package now reaches its data through a generated `loaders.cjs`: one `require` of a literal path per data file, inside a function. A bundler can trace a literal path, and the `require` stays lazy, so importing the package still parses nothing until you call a loader. Every call still answers with a fresh copy, as it always did, so a caller that sorts what it gets cannot reorder another caller's records.

  Nothing is different for you: same exports, same arguments, same return values, same TypeScript types, and not one record of data changed. Verified by packing each real tarball and running it three ways, under plain Node, an esbuild bundle and a Vite 8 SSR bundle (rolldown), with the three required to agree. Those are the three that are checked, and the only ones claimed.

  Turbopack is the one bundler that cannot be checked that way, because it needs a `next build`. It already served these packages before the fix, and the fix gives it a graph it has not seen before (an ESM index importing a CommonJS loader whose JSON arrives by literal `require`), so the proof for it is the geoalgeria.com preview build released in the same batch, which loads `@geoalgeria/gares-routieres` through its index on a live page.

## 2.0.4

### Patch Changes

- f70ce29: Ten sites stop claiming `exact` on a coordinate the number itself disproves.

  A **rounded placeholder** is a coordinate a source rounded instead of measuring. One kind is easy to spot (35, 8 locates a degree square), and the other hides inside it: degrees and whole arcminutes with the seconds dropped, which survives a decimal-digit count because minutes divided by 60 leave a long tail. 36.6166667, 6.8833333 is 36°37'N 6°53'E, a cell about 1.5 km across, and it cannot be a per-site point.

  Ten tourisme sites carried such a value as `geo_precision: "exact"`: the caves `attraction-846` and `attraction-848`, the sites `historic-91`, `historic-144`, `historic-487`, `historic-746` and `historic-837`, and the national parks `park-25`, `park-29` and `park-31`. All ten now read `"approximate"`. The three parks are areas in any case, so a single point for them was never a facility point.

  Not one coordinate moves, and no record, field or id changes: `geo_precision` goes from 4,315 `exact` / 33 `approximate` to 4,305 / 43 over the same 4,348 geocoded sites. The claim is what was wrong, and the honest claim is the correction.

  The writer now applies this rule to every package on every emit, beside the shared-point rule it already applied, so a point on the whole-arcminute grid cannot be published as `exact` again.

## 2.0.3

### Patch Changes

- e056b8d: Reform-stale wilaya corrections (yasserstudio/geoalgeria.com#209): records whose source still files them under the wilaya their commune belonged to before the 2026 reform (law 26-06, JO 25; presidential decree 26-206, JO 40) now carry the current wilaya, with the commune the correction was derived from. Each is a reviewed decision in `quality/overrides/tourisme.json`, so a regeneration reapplies it and stops if the source's own value has moved. No id changes.

## 2.0.2

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

## 2.0.1

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.0.0

### Major Changes

- e84384a: Data v2 — one canonical record contract across every sector package (breaking schema overhaul).

  Every sector package now shares a single record shape defined by the new `@geoalgeria/schema` dependency, replacing the hand-written, drifted `types/index.d.ts` per package. Read [`packages/schema/MIGRATING.md`](https://github.com/yasserstudio/geoalgeria/blob/main/packages/schema/MIGRATING.md) before adopting `2.0.0`.

  - **Breaking record shape**: `wilaya_code` is a zero-padded **string** (`"16"`, not `16`); commune linkage is `commune_code` (string ONS code) + `commune`; coordinates are `lat`/`lng`; external ids collapse into `refs: { osm, wikidata, … }`; `id` is an opaque string unique within its file (no more global `{sector}:{WW}-{seq}` form). Every record ships in **JSON, CSV and GeoJSON**.
  - **Breaking `geo_precision`**: strictly `exact | approximate | null`, **null if and only if** the record has no coordinate; the old method vocabulary moved to a new `geo_method` field under the same null-iff rule. `exact` now requires ≥3 decimals and a point unique within its file — 409 records that could not carry that claim were downgraded to `approximate`.
  - **Honest metadata**: real per-source `retrieved` dates; licence URLs only where the source is genuinely open, `conditionsOfAccess` prose otherwise. A root `index.json` catalog and a `schema.org/Dataset` descriptor ship alongside the data.
  - **Data fixes**: the capital-coordinate 9-cycle swap repaired; 30+11 mislinked records relinked; emploi communes recovered; 972 previously-dropped tourisme values restored.

  Not part of this release: the core `geoalgeria` dataset and `@geoalgeria/telecom` predate this contract and stay on their current v1 versions until migrated.
