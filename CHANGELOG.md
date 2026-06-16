# GeoAlgeria — project changelog

Project-level (umbrella) versions for GeoAlgeria as a whole. Each entry is the
state of the datasets at that tag (`vX.Y.Z`). Individual npm packages keep their
own SemVer in `packages/<pkg>/CHANGELOG.md`; this file tracks the project.

Bumps: **major** = breaking change to the project's shape (a package removed/renamed,
schema break) · **minor** = a new dataset/package or a substantial data expansion ·
**patch** = corrections and small refreshes.

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
