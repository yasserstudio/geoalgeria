# Changelog

## 2.3.0

### Minor Changes

- de04d27: Refresh poste from baridimap.poste.dz, retrieved 2026-10-25, remove three military locations and place three ATMs at their post office: 3,907 post offices and 2,023 ATMs.

  **Migration.** Three ids are retired and reserved forever in
  `packages/poste/data/retired-ids.json`. They forward nowhere: the records are
  removed, not merged, so a consumer holding one of these keys finds it gone by
  design.

  | Retired id | File               | Record                                                                                                  |
  | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
  | `2532`     | `postoffices.json` | HOPITAL CENTRAL ANP, inside the Ain Naadja central military hospital                                    |
  | `13519`    | `atms.json`        | ECOLE NAVAL, inside the naval school at Mostaganem                                                      |
  | `13104`    | `atms.json`        | CRF SIDI FREDJ, inside the army's family rest centre (Centre de Repos Familial) at Sidi Fredj, Staoueli |

  The project publishes no military location. The exclusion lives in the build
  (`packages/poste/scripts/fetch.mjs`, `MILITARY_IDS`), keyed on the operator's own
  id, which is the published id too, so every later refresh drops them again. An
  office whose ADDRESS merely names the ANP or the gendarmerie is unaffected, and
  so is `404` ("AHCENE ASKRI"), whose name is a person's.

  `distinct_postal_codes` reads 3,999 from 4,000 because `16105` was carried by
  that one office and by nothing else.

  **The refresh itself.** Previous pull 2026-06-08, and the source has been geo-blocked from outside Algeria since; this one ran over an Algerian connection. The office table came back byte-identical, so every change on the refresh side is on the ATM side: 2,025 ATMs from 2,026.

  **One removal.** `13950` ("LA DG", Dar El Beida) is absent from the live `/atms` response rather than behind a failed link, so it is delisted rather than carried over. It predates the retired-id ledger this release introduces for the package and is not reserved in it.

  **One move.** `1230` ("GUTTARA", Ghardaïa) moved 702 m, to (33.1618011, 4.6927056). Algérie Poste publishes its own pins, so the new point ships `exact` / `baridimap` exactly as the old one did.

  **One wilaya pinned by review.** `10848` ("ZMALET EL EMIR AEK") publishes wilaya 64 and commune 1409. The rebuild would have returned it to 14 with no commune: the shared current-wilaya reconciliation needs an exact current or official ONS commune label, and the operator's "Z'MALET EL EMIR AEK" is not one. Containment still places the point inside 64, whose mother wilaya is the 14 the operator states, so the correction is recorded in `quality/overrides/poste.json` against baridimap and the two Journal officiel reform issues. As with the ledger's other reform corrections, that record now carries `review_status` rather than `source_wilaya_code`, so the derived reconciliation set reads 89 instead of 90.

  **Three ATMs placed at their post office.** BaridiMap lists `1513` ("BARAKI 2"), `1772` ("AHMER EL AIN") and `2335` ("AIN TAYA") with no coordinate. Each one now carries its host post office's own BaridiMap point (offices `748`, `234` and `206`: same postal code, and the same name or, for "BARAKI 2", the office's second machine beside ATM `1512`). They ship `exact` with `geo_method: "baridimap_host_office"`, which says the point is the office building's and not a survey of the machine. An ATM that later gains its own coordinate upstream keeps it. The mapping is `ATM_HOST_OFFICE` in `packages/poste/scripts/fetch.mjs`. ATMs with no coordinate go from 5 to 1 (`15792`, closed, with no office on file for its postal code).

  **Three post offices placed on OpenStreetMap.** BaridiMap lists `2905` (EL BIAR ALI KHODJA), `2458` (KRIM BELKACEM, Tizi Ouzou) and `3062` (CLUB DES PINS) with no coordinate. Each now carries its own OpenStreetMap post office node, read at a recorded version (`OFFICE_OSM_POINT` in `packages/poste/scripts/fetch.mjs`), `exact` / `osm_node`: El Biar on its address, house number, postal code and class; Krim Belkacem on two Votes, the node and BaridiMap's own point for ATM `2139`, 17 m away; Club des Pins on its name. Club des Pins is a suburb of Chéraga and its node lies inside Chéraga's outline, so its commune is corrected from STAOUELI (1645) to CHERAGA (1650) in `quality/overrides/poste.json`. Offices with no coordinate go from 16 to 13; the rest are mobile post units and two port offices with no open source.

  **Offline replay.** `node scripts/fetch.mjs --cache` now re-emits the package from
  the records it already ships, with no network, which is how the removal above was
  applied: BaridiMap is geo-blocked from outside Algeria and this package has no
  raw capture under `sources/`. A replay with nothing excluded reproduces what it
  read byte for byte, and it reuses the committed dates rather than stamping a
  `retrieved` no request was made on.

### Patch Changes

- f1a05b8: These packages now work in a bundled app: esbuild and Vite can follow the data path.

  Before this release, `import { stations } from "@geoalgeria/ferroviaire"` (and the same for every package here) built fine and then threw `ENOENT ... /data/stations.json` on the first call. The JSON was read at run time from a path joined off `import.meta.url`; esbuild and Vite inline the module without relocating that read, so it went looking for the data next to the generated bundle. Node and Next.js with Turbopack were never affected, which is why this took until now to surface.

  Each package now reaches its data through a generated `loaders.cjs`: one `require` of a literal path per data file, inside a function. A bundler can trace a literal path, and the `require` stays lazy, so importing the package still parses nothing until you call a loader. Every call still answers with a fresh copy, as it always did, so a caller that sorts what it gets cannot reorder another caller's records.

  Nothing is different for you: same exports, same arguments, same return values, same TypeScript types, and not one record of data changed. Verified by packing each real tarball and running it three ways, under plain Node, an esbuild bundle and a Vite 8 SSR bundle (rolldown), with the three required to agree. Those are the three that are checked, and the only ones claimed.

  Turbopack is the one bundler that cannot be checked that way, because it needs a `next build`. It already served these packages before the fix, and the fix gives it a graph it has not seen before (an ESM index importing a CommonJS loader whose JSON arrives by literal `require`), so the proof for it is the geoalgeria.com preview build released in the same batch, which loads `@geoalgeria/gares-routieres` through its index on a live page.

## 2.2.0

### Minor Changes

- e744d65: Three post offices are named after the places their own fields name.

  BaridiMap glued a dash to a word inside the Arabic name instead of separating two
  halves of it, so folding the dash would have published a separator that was never
  there:

  - `2298` read `عين –الزانة`, with the dash inside the commune name itself, and
    now reads `عين الزانة`, which is its own `commune_ar` and its Latin `AIN ZANA`.
  - `3935` read `برج –بو-عريريج - أخروف`, which split the wilaya name in two, and
    now reads `برج بوعريريج - أخروف`: `commune_ar` is `برج بوعريريج` and the Latin
    name `BORDJ BOU ARRERIDJ AKHROUF`, so the farm is the only real separator.
  - `725` read `سوق أهراس –درايعية أحمد-`, where the separator is real and the
    glued dash and the trailing hyphen are not, and now reads
    `سوق أهراس - درايعية أحمد`.

  The source word order is kept in all three, the Latin `name` was always correct
  and is unchanged, and so are ids, coordinates, codes, postal codes and counts.
  The `geoalgeria` postal mirror follows, byte-identical as always.

  Each correction is a reviewed entry in `quality/overrides/poste.json`, so it
  survives the next BaridiMap pull and declines to apply if the upstream name
  moves. That gives `postoffices.json` the four review fields `atms.json` already
  carries, `review_status`, `reviewed_at`, `reviewed_by` and `review_evidence`,
  declared optional on `PostOffice` as they are on `Atm`. **`csv/postoffices.csv`
  gains those four columns**, which is why this is a minor rather than a patch: the
  columns are appended, every existing column keeps its position, and no value
  changes. A consumer reading the CSV by header name is unaffected; one reading a
  fixed column count is not.

## 2.1.4

### Patch Changes

- e056b8d: Reform-stale wilaya corrections (yasserstudio/geoalgeria.com#209): records whose source still files them under the wilaya their commune belonged to before the 2026 reform (law 26-06, JO 25; presidential decree 26-206, JO 40) now carry the current wilaya, with the commune the correction was derived from. Each is a reviewed decision in `quality/overrides/poste.json`, so a regeneration reapplies it and stops if the source's own value has moved. No id changes.

## 2.1.3

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

## 2.1.2

### Patch Changes

- 68a06ac: Correct reviewed current-Wilaya assignments for the Annaba airport, Algérie Poste offices and ATMs, and Ministry of Youth and Sports establishments while preserving differing Source codes and keeping the flagship Poste mirror synchronized.

## 2.1.1

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.1.0

### Minor Changes

- 64b10a1: Replace duplicated and missing `code_commune` values with the 1,541 unique codes from the official ONS 2021 Code Géographique National. Cascade the corrected foreign keys through every linked dataset, preserve Algérie Poste's differing provider-native values, enforce the SQL and repository-wide FK contracts, retain the 2021 mother-wilaya prefix for communes promoted in later reforms, and document the code contract.

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

- Bundle TypeScript type definitions. `PostOffice`, `Atm`, and `Metadata` interfaces plus typed loaders (`postOffices()`, `atms()`, `metadata()`) now ship with the package and resolve automatically via the `types` export condition. No runtime or data changes.

## 1.0.2

### Patch Changes

- Docs: value-led READMEs, official source citation for the 69-wilaya reform (Law n° 26-06, Journal Officiel n° 25 of 5 April 2026), and fixed post-restructure links/badges. No data changes.

## 1.0.1

### Changed

- Corrected `repository`/`bugs` links to the package's real home,
  `github.com/yasserstudio/geoalgeria` (the data monorepo). No data changes.

## 1.0.0

### Added

- 3,908 post offices sourced from Algérie Poste (baridimap.poste.dz) — real
  postal codes, bilingual (FR/AR) names, coordinates, commune/wilaya linkage
- 2,026 ATMs (DAB) with the same linkage
- Export formats: JSON, CSV, GeoJSON
- npm package with helper accessors
