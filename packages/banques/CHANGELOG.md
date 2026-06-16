# Changelog

## 1.1.1

### Patch Changes

- 8cc1bc4: Add a clear disclaimer and a code-vs-data licensing note to the package — independent / not affiliated with the Banque d'Algérie or any bank, no warranty, verify `bank_code`/SWIFT-BIC against the official source before financial use, plus a trademark and corrections/takedown notice.

## 1.1.0

### Minor Changes

- Every licensed bank in Algeria now has branch locations — all 21.
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
