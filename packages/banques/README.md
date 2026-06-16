<div align="center">

# @geoalgeria/banques

**Every bank in Algeria — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/banques)](https://www.npmjs.com/package/@geoalgeria/banques)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

The **21 banks** and **8 financial institutions** licensed (_agréés_) by the Banque
d'Algérie — with FR/AR names, the 3-digit RIB **`bank_code`**, ownership
(public / foreign / domestic) + controlling **parent group**, **SWIFT/BIC**,
website, head-office address, and wilaya linkage. Compiled from the
official Banque d'Algérie list (Journal Officiel n° 9, 6 February 2026) and each
institution's own site. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/banques
```

```js
import banques from "@geoalgeria/banques";

banques.banks();              // 21 agréé banks
banques.institutions();       // 8 financial institutions
banques.all();                // 29, banks first
banques.byId("BNA");          // → Banque Nationale d'Algérie (by id or acronym)
```

## What's inside

| Dataset | Count | Notes |
| --- | --- | --- |
| Banks | **21** | 7 public · 14 foreign-owned — RIB bank code, name FR/AR, ownership + parent, country, SWIFT/BIC, HQ |
| Financial institutions | **8** | leasing, refinancing & mutual-credit entities (non-deposit) |
| Branch locations | **1,704** | **all 21 banks** — name, address, phone, wilaya, coordinates; 1,213 geocoded; **67/69 wilayas** |

Every record carries `wilaya_code` (head office) linked to the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) 69-wilaya model.

## Provenance & honesty

- **Roster** is the current Banque d'Algérie _agréé_ list, verified at 21 banks + 8
  institutions (Ziraat Bankası, approved Jan 2025, is the newest bank).
- Fields that could not be confirmed from an official source are **`null`**, never
  guessed — most foreign banks publish no Arabic name; financial institutions carry
  no SWIFT/BIC; a few head-office addresses are best-effort and may be refined.
- SWIFT/BIC values are head-office (`…XXX`) variants.
- **Branch coordinates** are kept only when they fall inside Algeria (and, for
  banks whose locator merely geocodes addresses, agree with the branch's stated
  wilaya); otherwise the point is dropped and the wilaya kept — never a guessed
  coordinate. Locator pages are fetched with TLS verification disabled
  (`curl -k`) because several `.dz` bank hosts serve broken certificates.
- **Address-only banks** (BNH, HBTF, Fransabank, BEA, SGA) publish no coordinates,
  so those branches ship with `lat`/`lng` `null` and a wilaya read from the
  address's trailing locality. **AGB**'s locator sits behind a bot challenge, so
  its 63 branches are captured via a headless browser and refreshed manually;
  **Arab Bank** publishes only city-level points (name + coordinates, no address).
  **BDL** and **Trust Bank** come from each bank's published Google My Maps (KML);
  **Citibank**, **HSBC** and **Ziraat** are their single Algiers offices.
- **`bank_code`** is the 3-digit RIB _code banque_ (IBAN positions 5–7), verified
  against independent code-banque tables — no single official public register
  exists. BNH and Ziraat (both newly licensed) have no published code yet →
  `null`. Financial institutions are non-deposit, so they carry no `bank_code`.

## Roadmap (this package)

The registry is layer one; **branch locations** now cover **all 21 banks /
1,704 branches** (67/69 wilayas). Each bank publishes its network through a
different locator — Joomla `com_mymaplocations`, WordPress store-locator / map
plugins, a Vite SPA bundle, ASP.NET/TYPO3 pages, inline map JSON, Google My Maps
KML — so banks are added one extractor at a time (see `scripts/fetch.mjs`).
Address-only locators ship with `lat`/`lng` `null` (wilaya resolved from the
address); where a source's coordinates disagree with the branch's stated wilaya,
the coordinates are dropped rather than shipped wrong. Still to come behind the
same `@geoalgeria/banques`:

- **ATMs (DAB/GAB)** — where individual banks publish locators; honest about
  completeness, since Algeria has no single public ATM directory.

## Formats

`banks.json` and `institutions.json` import directly; **CSV** mirrors are under
[`data/csv/`](data/csv) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases). Loaders and
record shapes are fully **typed**.

## License

MIT for the package. The underlying facts are public regulatory/registry data,
redistributed for reference.
