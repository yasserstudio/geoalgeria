# Changelog

## 2.1.1

### Patch Changes

- f1a05b8: These packages now work in a bundled app: esbuild and Vite can follow the data path.

  Before this release, `import { stations } from "@geoalgeria/ferroviaire"` (and the same for every package here) built fine and then threw `ENOENT ... /data/stations.json` on the first call. The JSON was read at run time from a path joined off `import.meta.url`; esbuild and Vite inline the module without relocating that read, so it went looking for the data next to the generated bundle. Node and Next.js with Turbopack were never affected, which is why this took until now to surface.

  Each package now reaches its data through a generated `loaders.cjs`: one `require` of a literal path per data file, inside a function. A bundler can trace a literal path, and the `require` stays lazy, so importing the package still parses nothing until you call a loader. Every call still answers with a fresh copy, as it always did, so a caller that sorts what it gets cannot reorder another caller's records.

  Nothing is different for you: same exports, same arguments, same return values, same TypeScript types, and not one record of data changed. Verified by packing each real tarball and running it three ways, under plain Node, an esbuild bundle and a Vite 8 SSR bundle (rolldown), with the three required to agree. Those are the three that are checked, and the only ones claimed.

  Turbopack is the one bundler that cannot be checked that way, because it needs a `next build`. It already served these packages before the fix, and the fix gives it a graph it has not seen before (an ESM index importing a CommonJS loader whose JSON arrives by literal `require`), so the proof for it is the geoalgeria.com preview build released in the same batch, which loads `@geoalgeria/gares-routieres` through its index on a live page.

## 2.1.0

### Minor Changes

- 9efb6c0: Branch records widen their types, and six branches are re-placed off a rounded placeholder.

  **Read this first if you type the branch records.** Two fields and one union change shape, so a caret-range upgrade can need a code change:

  - `Branch.commune_code` and `Branch.commune` go from `null` to `string | null`. They were null on every branch because bank locators publish no commune; six branches now carry a real ONS code and commune name. A validator asserting null, or a type narrowing on it, has to widen.
  - `GeoMethod` gains `"commune_centroid"`, alongside `"bank_locator"`, `"osm_node"` and `"osm_way"`. An exhaustive switch over it gains a case.

  Nothing is renamed or removed, and no existing value changes meaning.

  **Why the six moved.** AGB Laghouat shipped 33.58333, 2.66667, which is 33°35'N 2°40'E written as a decimal: a whole-arcminute cell about 30.9 km southwest of the street its own address names, and it claimed `geo_precision: "exact"`. Five more branches carried the same kind of value: AGB Constantine, AGB Tébessa, BADR Kenadsa, BADR Taghit and BADR Aïn Témouchent.

  Four now carry a reviewed OpenStreetMap point for the same bank in the same commune: AGB Constantine, BADR Kenadsa and BADR Aïn Témouchent are `exact` on the branch's own node, AGB Tébessa `approximate` on its building outline. AGB Laghouat and BADR Taghit have no OpenStreetMap object of their bank within 25 km, so they carry their commune's centre as `approximate` with `geo_method: "commune_centroid"`. All six publish their review evidence URLs.

  `geo_precision` moves from 1,161 `exact` / 164 `approximate` to 1,160 / 165, and the ODbL attribution now covers twelve reviewed OpenStreetMap coordinates rather than eight. The record set itself is unchanged: still 1,704 branches, 1,325 of them geocoded, no id added or retired.

  Reported as yasserstudio/geoalgeria#267.

### Patch Changes

- 91055e8: The CNEP branch in Aïn Azel is named after its commune again.

  `cnep-156` shipped as `AIN –AZEL`: the commune name with a stray dash wedged into
  it, which the locator typed and nothing caught. Folding that dash to a spaced
  hyphen would have published `AIN - AZEL`, reading as a branch called Azel in a
  place called Ain, so the name is corrected rather than folded. It now reads `AIN
AZEL`, the spelling the dataset already carries: the flagship commune table reads
  Ain Azel, the BADR branch in the same commune publishes `AIN AZEL`, and all-caps
  is how CNEP writes 212 of its 230 branch names.

  The correction is a reviewed ledger entry, so it survives the next locator pull
  and ships its evidence with the record. Nothing else about the branch changes:
  same id, coordinate, address and telephone, and the branch, bank and institution
  counts are unchanged.

- 1604781: No published school or bank name carries an em dash any more.

  Three records had one as a separator, four name strings between them: CNEP's
  bank name in both `name` and `name_fr` (`Caisse Nationale d'Épargne et de
Prévoyance - CNEP-Banque`) and two OpenStreetMap school names in Ouamri
  (`École primaire - Khaldi Mohammed`, `École primaire - Chouakri Ali`). Each now
  reads with a spaced hyphen, which keeps the source's separation of the name
  without keeping the character. Nothing else about any name changed, no claim is
  made about a house separator, and the en dash is out of scope. Ids,
  coordinates, codes and counts are unchanged; `name_ar` was never affected.

  The bank registry is hand-curated, so it is corrected in `banks.json`. The
  school names came straight from the OpenStreetMap tag, so `packages/ecoles`
  now folds the separator as it reads a raw name, and the em-dash gate covers
  every published `name` field rather than metadata alone, so neither can return.

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

- d3194af: Publish reviewed BDL, Société Générale, BNA, BEA, and Al Baraka branch coordinate and Wilaya corrections, correct SGA's current Tizi Ouzou address, and keep every correction reproducible when canonical package files are rebuilt.
- 8d68f0e: Correct branch geocoding totals and document the current address-only coverage for BNH, HBTF, Fransabank, BEA, and SGA.

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

## 1.1.2

### Patch Changes

- Author credit in README
- Added a "Made by Yasser's studio · LinkedIn · X · email" footer to the package README.

## 1.1.1

### Patch Changes

- Disclaimer & licensing
- Added a disclaimer (independent / not affiliated, no warranty, verify against the official source before financial use), a trademark and corrections/takedown notice, and a code-vs-data license split.

## 1.1.0

### Minor Changes

- Branches for all 21 licensed banks
- Added the last two banks (HSBC, Ziraat) for full 21/21 coverage: 1,704 branches across 67/69 wilayas (1,213 geocoded) — RIB codes, SWIFT/BIC, ownership + parent group, addresses & coordinates, as JSON, CSV, GeoJSON.
- Source: each bank's official branch locator + the Banque d'Algérie agréé list (JO n° 9, 6 February 2026).

## 1.0.0

### Added

- Registry of the **21 banks** and **8 financial institutions** licensed by the
  Banque d'Algérie (Journal Officiel n° 9, 6 February 2026) — id, acronym,
  3-digit RIB `bank_code`, FR/AR names, type, ownership + `parent_company` +
  country, SWIFT/BIC, website, head-office address, and `wilaya_code` linked to
  the geoalgeria 69-wilaya model
- **1,702 branch locations** across 19 of 21 banks (BNA 287, BADR 283, CNEP 230,
  BDL 191, CPA 166, BEA 111, SGA 84, AGB 63, BNH 60, BNP Paribas 43, Al Baraka 36,
  Trust Bank 34, Natixis 25, ABC 25, Al Salam 24, Fransabank 23, HBTF 10,
  Arab Bank 6, Citibank 1) — name, address, phone, `wilaya_code`, and coordinates
  where the source publishes them; sourced from each bank's official locator.
  1,213 geocoded, **67/69 wilayas**. Only HSBC and Ziraat (single offices) remain.
- Export formats: JSON, CSV, GeoJSON (branches)
- npm package with typed accessors (`banks()`, `institutions()`, `all()`,
  `branches()`, `byId()`, `branchesByBank()`, `metadata()`)

_Remaining banks (single-office / no public locator) and ATMs (DAB/GAB) are
planned for the same package in later releases._
