# GeoAlgeria — project changelog

Project-level (umbrella) versions for GeoAlgeria as a whole. Each entry is the
state of the datasets at that tag (`vX.Y.Z`). Individual npm packages keep their
own SemVer in `packages/<pkg>/CHANGELOG.md`; this file tracks the project.

Bumps: **major** = breaking change to the project's shape (a package removed/renamed,
schema break) · **minor** = a new dataset/package or a substantial data expansion ·
**patch** = corrections and small refreshes.

## 1.4.0 — 2026-06-25

Added two new datasets: Algeria's mosques (a Wikidata + OpenStreetMap composite) and the Djezzy boutique network.

- **Mosques** (`@geoalgeria/mosquees`, new): 20,759 mosques across all 69 wilayas — a Wikidata (CC0) + OpenStreetMap (ODbL) composite giving near-complete national coverage against the ~18,449 counted by the Ministère des Affaires Religieuses. Per-record provenance (`source`, `wikidata` QID, `osm_id`): 13,200 Wikidata-only, 5,897 matched in both, 1,662 OpenStreetMap-only; 15,138 Arabic and 7,874 French names, denomination where known, and commune/wilaya linkage.
- **Djezzy boutiques** (`@geoalgeria/djezzy`, new): 128 Djezzy (Optimum Telecom Algérie) boutiques across 63 wilayas from the Djezzy store locator — each geocoded, with store code, category, address, opening hours, opening code and commune/wilaya linkage.

Packages: `geoalgeria`, `@geoalgeria/poste`, `/emploi`, `/mobilis`, `/telecom`, `/aviation`, `/banques`, `/livraison`, `/jeunesse`, `/sports`, `/enseignement-superieur`, `/tourisme`, `/formation-professionnelle`, `/djezzy`, `/mosquees`.

## 1.3.0 — 2026-06-23

Added a new sports dataset and substantially expanded two existing ones, all from official ministries.

- **Sports facilities** (`@geoalgeria/sports`, new): 5,141 facilities across 58 wilayas — stadiums, pools, proximity fields, athletics tracks, courts and more (27 types) from the Ministère de la Jeunesse et des Sports GIS, each with capacity, PMR accessibility, operational status, built/land area and coordinates.
- **Youth establishments** (`@geoalgeria/jeunesse` 2.0.0): rebuilt from that same official GIS — 2,334 establishments (was 2,076) across 58 wilayas, now with French and Arabic names plus capacity, address, surfaces, year and operational status. Breaking: names are now French (read `name_ar` for the Arabic name).
- **Higher education** (`@geoalgeria/enseignement-superieur` 1.1.0): 110 → 177 institutions — added the 19 licensed private and 48 other-ministry establishments MESRS supervises pedagogically (from the ministry's Arabic listing), with new `name_ar`, `sector` and `supervisory_ministry` fields.

Packages: `geoalgeria`, `@geoalgeria/poste`, `/emploi`, `/mobilis`, `/telecom`, `/aviation`, `/banques`, `/livraison`, `/jeunesse`, `/sports`, `/enseignement-superieur`, `/tourisme`, `/formation-professionnelle`.

## 1.2.0 — 2026-06-20

Added two new datasets/packages since 1.1.0.

- **Youth & sports institutions** (`@geoalgeria/jeunesse`): 2,076 institutions across 50 wilayas — maisons de jeunes, complexes sportifs, salles polyvalentes, auberges de jeunes, cultural centers and more (Ministère de la Jeunesse), each with its Arabic name, type, commune/daïra/wilaya and coordinates.
- **Higher education** (`@geoalgeria/enseignement-superieur`): 110 institutions across 51 wilayas — 58 universities, 35 grandes écoles, 12 écoles normales supérieures and 5 centres universitaires (MESRS), each with its official website, type, and wilaya/commune linkage. Coordinates are OpenStreetMap-derived (ODbL) and labelled per record (`geo_precision`).

Packages: `geoalgeria`, `@geoalgeria/poste`, `/emploi`, `/mobilis`, `/telecom`, `/aviation`, `/banques`, `/livraison`, `/jeunesse`, `/enseignement-superieur`.

## 1.1.0 — 2026-06-18

Added a new dataset/package since 1.0.0.

- **Delivery carriers** (`@geoalgeria/livraison`): a 16-carrier registry, 411 geocoded stop-desks across 61 wilayas, and per-carrier coverage. Stop-desks come from the carriers that publish open agency data — the Yalidine + Guepex relay plus the Anderson, Noest and Maystro networks (each geocoded from its agency cards' Google Maps links).

Packages: `geoalgeria`, `@geoalgeria/poste`, `/emploi`, `/mobilis`, `/telecom`, `/aviation`, `/banques`, `/livraison`.

## 1.0.0 — 2026-06-16

First tagged release of the project as a whole — the state of every dataset today.

- Administrative divisions: 69 wilayas, 564 dairas, 1,541 communes (bilingual FR/AR, postal codes, coordinates), current to Law 26-06 (JO n° 25, 5 April 2026) and the 2019 reform (Law 19-12).
- Algérie Poste: 3,908 post offices, 2,026 ATMs.
- Employment (ANEM): 331 agencies (58 AWEM + 273 ALEM).
- Mobilis network: 165 agencies + 12,180 points of sale.
- Telecom 5G: 1,681 sites (Djezzy, Mobilis, Ooredoo).
- Civil airports: 33 (ANAC).
- Banks: 21 licensed banks + 8 financial institutions + 1,704 branches across 67/69 wilayas.

Packages: `geoalgeria`, `@geoalgeria/poste`, `/emploi`, `/mobilis`, `/telecom`, `/aviation`, `/banques`.
