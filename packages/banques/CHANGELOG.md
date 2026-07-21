# Changelog

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
- Added a "Made by Yasser's Studio · LinkedIn · X · email" footer to the package README.

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
