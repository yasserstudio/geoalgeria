# @geoalgeria/sports

## 2.1.0

### Minor Changes

- 54287cf: **Migration.** 187 published ids are retired and 280 facilities are new. 5 of the retired ids were a second entry the source made for one facility (a Repeat post) and now forward to the record that carries their data: `04035`, `04036` and `04065` to `04052`, `04663` to `04676`, `04915` to `04916`. The other 182 belong to facilities the source no longer holds, or holds changed beyond what the id evidence can vouch for, and are reserved for good without a forward. The 182 reserved without a forward: `00111`, `00127`, `00144`, `00405`, `00420`, `00452`, `00463`, `00472`, `00476`, `00477`, `00534`, `00536`, `00570`, `00579`, `00586`, `00587`, `00611`, `00616`, `00882`, `00898`, `01097`, `01107`, `01287`, `01835`, `01841`, `01844`, `01845`, `01846`, `01848`, `01849`, `01850`, `01852`, `01854`, `01855`, `01859`, `01861`, `01862`, `01863`, `01864`, `01865`, `01867`, `01868`, `01870`, `01875`, `01876`, `01882`, `01883`, `01884`, `01887`, `01888`, `01889`, `01892`, `01893`, `01894`, `01895`, `01897`, `01901`, `01904`, `01905`, `01906`, `01908`, `01909`, `01914`, `01916`, `01921`, `01923`, `01926`, `01932`, `01934`, `01935`, `02101`, `02102`, `02118`, `02163`, `02623`, `02630`, `02631`, `02635`, `02637`, `02677`, `02871`, `02941`, `03240`, `03321`, `03351`, `03728`, `03739`, `03753`, `03790`, `03926`, `03941`, `03977`, `03978`, `03979`, `03980`, `03981`, `03989`, `03990`, `03995`, `03996`, `03997`, `03999`, `04000`, `04005`, `04008`, `04015`, `04017`, `04018`, `04030`, `04033`, `04034`, `04041`, `04042`, `04049`, `04053`, `04059`, `04068`, `04069`, `04072`, `04075`, `04076`, `04077`, `04080`, `04084`, `04089`, `04096`, `04097`, `04101`, `04102`, `04105`, `04110`, `04122`, `04125`, `04127`, `04128`, `04130`, `04132`, `04133`, `04134`, `04135`, `04137`, `04589`, `04590`, `04593`, `04597`, `04598`, `04600`, `04601`, `04615`, `04620`, `04626`, `04629`, `04632`, `04633`, `04636`, `04640`, `04641`, `04644`, `04645`, `04646`, `04649`, `04652`, `04655`, `04661`, `04666`, `04669`, `04677`, `04682`, `04687`, `04688`, `04689`, `04691`, `04694`, `04698`, `04812`, `04813`, `04821`, `04827`, `05015`, `05017`, `05022`, `05023`. All 187 are in `data/retired-ids.json`, whose `migrations` map carries the five forwards. Every record now carries **`refs.mjs`**, the Ministry of Youth and Sports SIG's own per-record UUID, and ids are carried on it from now on, so a facility the ministry renames, re-addresses or re-places keeps its id. In `data/csv/facilities.csv` the new `refs` column (a JSON string) sits after `source`, which shifts every later column one place to the right for a reader that indexes columns by position.

  Refresh sports from the Ministry of Youth and Sports SIG, layer `infrastructures_sportives` (sig.mjs.gov.dz), retrieved 2026-10-27 over an Algerian connection and committed as `sources/sports/sig-infrastructures.json`: 5,234 facilities, up from 5,141 (previous pull 2026-06-23).

  **How the ids were carried.** 4,954 of the 5,141 published ids carry over: 4,694 on the facility's place, as before, and 260 through a one-time transition for records the ministry edited during its September and October campaign: an `Inclus dans le` prefix added to an address, a point re-saved at 4 decimals, a respelled or corrected commune, an honorific added to a name. A pairing needs the same facility type, the same point (or the published point rounded to 4 decimals), and either the same name and commune, or one of the two changed with most of the facility's attributes agreeing; a real move up to 300 m is accepted only on an address no other record shares. No pairing had a rival. Three were refused because the address is shared by several identical records (`00570`, `04646`, `04649`). Every decision is in `research/sports/id-transition.json`.

  **Wilayas.** 270 records are reconciled to their 2026 wilaya (was 267), now also from a commune's former JORA spelling: without it, 14 facilities the SIG still labels BOUIHI, AZIL ABEDELKADER, ZMALET EL EMIR ABDELKADE or OULED EMAARAF would have returned to the mother wilaya. `01663` and `01666` (Serguine) now reconcile by name to wilaya 64 / commune 1439, so they carry `source_wilaya_code: "14"` in place of a review receipt. `01115` (Oued El Alleug, Blida), which the SIG relabelled Ouled Djellal (wilaya 51) at an unmoved point, is corrected back to wilaya 09 / commune 0904 by a reviewed decision in `quality/overrides/sports.json`.

  **Also.** One new facility type, `PCA` (Parcours d'athlétisme, 1 record), in the `TypeCode` union. An address that carries a dash as a separator is folded to `-` like a name: 2 records, the new `05187` (an em dash) and one carried record (an en dash). 5,106 points are `exact` and 128 `approximate`.

### Patch Changes

- f1a05b8: These packages now work in a bundled app: esbuild and Vite can follow the data path.

  Before this release, `import { stations } from "@geoalgeria/ferroviaire"` (and the same for every package here) built fine and then threw `ENOENT ... /data/stations.json` on the first call. The JSON was read at run time from a path joined off `import.meta.url`; esbuild and Vite inline the module without relocating that read, so it went looking for the data next to the generated bundle. Node and Next.js with Turbopack were never affected, which is why this took until now to surface.

  Each package now reaches its data through a generated `loaders.cjs`: one `require` of a literal path per data file, inside a function. A bundler can trace a literal path, and the `require` stays lazy, so importing the package still parses nothing until you call a loader. Every call still answers with a fresh copy, as it always did, so a caller that sorts what it gets cannot reorder another caller's records.

  Nothing is different for you: same exports, same arguments, same return values, same TypeScript types, and not one record of data changed. Verified by packing each real tarball and running it three ways, under plain Node, an esbuild bundle and a Vite 8 SSR bundle (rolldown), with the three required to agree. Those are the three that are checked, and the only ones claimed.

  Turbopack is the one bundler that cannot be checked that way, because it needs a `next build`. It already served these packages before the fix, and the fix gives it a graph it has not seen before (an ESM index importing a CommonJS loader whose JSON arrives by literal `require`), so the proof for it is the geoalgeria.com preview build released in the same batch, which loads `@geoalgeria/gares-routieres` through its index on a live page.

## 2.0.4

### Patch Changes

- e056b8d: Reform-stale wilaya corrections (yasserstudio/geoalgeria.com#209): records whose source still files them under the wilaya their commune belonged to before the 2026 reform (law 26-06, JO 25; presidential decree 26-206, JO 40) now carry the current wilaya, with the commune the correction was derived from. Each is a reviewed decision in `quality/overrides/sports.json`, so a regeneration reapplies it and stops if the source's own value has moved. No id changes.

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

- 68a06ac: Correct reviewed current-Wilaya assignments for the Annaba airport, Algérie Poste offices and ATMs, and Ministry of Youth and Sports establishments while preserving differing Source codes and keeping the flagship Poste mirror synchronized.

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

## 1.0.0

Algeria's sports facilities — 5,141 from the Ministry of Youth and Sports GIS, typed and geocoded.

### Added

- 5,141 sports facilities across 58 wilayas, sourced from the Ministry of Youth and Sports GIS (sig.mjs.gov.dz)
- 27 facility types: proximity fields, stadiums, swimming pools, halls, athletics
  tracks, tennis courts, equestrian centers, nautical bases and more
- Per-facility name, type, address, commune / daïra / wilaya, capacity, year of
  reception, operational status, PMR accessibility, built / land area, and GPS
  coordinates
- Wilaya linkage (`wilaya_code`) joining the geoalgeria wilaya model
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
