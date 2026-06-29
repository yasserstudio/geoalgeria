<div align="center">

**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<a href="https://geoalgeria.com"><picture><source media="(prefers-color-scheme: dark)" srcset="./assets/brand/logo/geoalgeria-logo-horizontal-white.png"><img src="./assets/brand/logo/geoalgeria-logo-horizontal.png" alt="GeoAlgeria" width="280"></picture></a>

<sub>by</sub><br>
<a href="https://yasser.studio"><picture><source media="(prefers-color-scheme: dark)" srcset="./assets/yasser-studio-logo-white.svg"><img src="./assets/yasser-studio-logo.svg" alt="Yasser's Studio" height="28"></picture></a>

**The open dataset for Algeria — install it, don't scrape it.**

[![CI](https://github.com/yasserstudio/geoalgeria/actions/workflows/ci.yml/badge.svg)](https://github.com/yasserstudio/geoalgeria/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/geoalgeria)](https://www.npmjs.com/package/geoalgeria)
[![npm downloads](https://img.shields.io/npm/dm/geoalgeria)](https://www.npmjs.com/package/geoalgeria)
[![jsDelivr hits](https://img.shields.io/jsdelivr/npm/hm/geoalgeria)](https://www.jsdelivr.com/package/npm/geoalgeria)
[![GitHub stars](https://img.shields.io/github/stars/yasserstudio/geoalgeria?style=flat)](https://github.com/yasserstudio/geoalgeria)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

Most Algeria datasets online still list **48 wilayas**. Algeria has had **69 since April 2026**. GeoAlgeria is kept current — with real Algérie Poste postal codes, geographic coordinates, bilingual names, and post offices & ATMs — shipped as JSON, CSV, GeoJSON, SQL, and TypeScript. One `npm install`, MIT-licensed, and CI-validated on every commit.

```bash
npm install geoalgeria
```

```js
const dz = require("geoalgeria");

dz.wilayas;                       // all 69 wilayas
dz.getCommunesByWilaya(16);       // 57 communes in Algiers
dz.findByPostalCode("16000");     // → commune, daira, wilaya
dz.getPostOfficesByCommune(1731); // real Algérie Poste offices
```

## What's inside

| | Count | |
|---|---|---|
| **Wilayas** | 69 | provinces (2019 + 2026 reforms) |
| **Dairas** | 555 | districts, as first-class entities |
| **Communes** | 1,528 | bilingual FR/AR, postal codes, coordinates |
| **Post offices** | 3,908 | real Algérie Poste codes, coordinates |
| **ATMs** | 2,026 | Algérie Poste GAB network |
| **Employment agencies** | 331 | ANEM: 58 AWEM + 273 ALEM — [`@geoalgeria/emploi`](packages/emploi) |
| **Mobilis network** | 12,345 | 165 agencies + 12,180 points of sale — [`@geoalgeria/mobilis`](packages/mobilis) |
| **5G coverage** | 1,681 | Djezzy + Mobilis + Ooredoo 5G sites — [`@geoalgeria/telecom`](packages/telecom) |
| **Civil airports** | 33 | ANAC: names, ICAO codes, contacts, coordinates — [`@geoalgeria/aviation`](packages/aviation) |
| **Banks & branches** | 1,704 | all 21 licensed banks + 8 institutions; branches with RIB/SWIFT codes, ownership, coordinates — [`@geoalgeria/banques`](packages/banques) |
| **Delivery carriers** | 411 | 16-carrier registry + 411 geocoded stop-desks across 61 wilayas (Yalidine, Guepex, Anderson, Noest, Maystro) — [`@geoalgeria/livraison`](packages/livraison) |
| **Youth establishments** | 2,334 | maisons de jeunes, complexes sportifs de proximité, salles polyvalentes, auberges, cultural & science centers & more across 58 wilayas (Ministry of Youth and Sports) — [`@geoalgeria/jeunesse`](packages/jeunesse) |
| **Sports facilities** | 5,141 | stadiums, pools, proximity fields, athletics tracks, courts & more (27 types) across 58 wilayas (Ministry of Youth and Sports) — [`@geoalgeria/sports`](packages/sports) |
| **Higher education** | 177 | universities, grandes écoles, ENS, centres + 19 private & 48 other-ministry institutions across 51 wilayas, with official websites (MESRS) — [`@geoalgeria/enseignement-superieur`](packages/enseignement-superieur) |
| **Tourism** | 4,348 | 995 hotels, 1,248 attractions, 1,184 historic sites, 282 thermal springs (ASAL), 32 national parks — [`@geoalgeria/tourisme`](packages/tourisme) |
| **Vocational training** | 1,932 | 856 CFPA + 182 INSFP + 723 private accredited + 58 DFEPs + more across 58 wilayas (MFEP / takwin.dz) — [`@geoalgeria/formation-professionnelle`](packages/formation-professionnelle) |
| **Mosques** | 20,759 | Wikidata + OpenStreetMap composite — Arabic & French names, denomination, all 69 wilayas — [`@geoalgeria/mosquees`](packages/mosquees) |
| **Djezzy boutiques** | 128 | geocoded retail stores with category, hours & commune/wilaya linkage (djezzy.dz) — [`@geoalgeria/djezzy`](packages/djezzy) |
| **Health establishments** | 695 | EPH · EPSP · EHS · CHU from the Ministry of Health — bilingual, 600 geocoded via OSM + Wikidata — [`@geoalgeria/sante`](packages/sante) |
| **Cultural places** | 1,083 | Protected sites, museums, theatres, libraries + cultural establishments from the Ministry of Culture — bilingual, all geocoded, 66 wilayas — [`@geoalgeria/culture`](packages/culture) |

Formats: **JSON · CSV · GeoJSON · SQL · TypeScript**. The npm package ships JSON to stay light; CSV/GeoJSON/SQL ride in every [GitHub Release](https://github.com/yasserstudio/geoalgeria/releases).

> Current to **Law n° 26-06** (new territorial organization), [*Journal Officiel* n° 25 of 5 April 2026](https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf) — plus the 2019 reform (Law 19-12).

## Why GeoAlgeria?

| | geoalgeria | leblad | algeria-cities |
|---|:---:|:---:|:---:|
| All 69 wilayas (2026 reform) | ✅ | ❌ (58) | ✅ |
| Dairas as first-class entities | ✅ | ❌ | ❌ |
| Real Algérie Poste postal codes | ✅ | ~ | ❌ |
| Coordinates per commune | ✅ | ❌ | ✅ |
| Post offices & ATMs | ✅ | ❌ | ❌ |
| E-commerce ready | ✅ | ❌ | ❌ |
| npm + TypeScript types | ✅ | ✅ | ❌ |
| GeoJSON / SQL exports | ✅ | ❌ | ✅ |
| CI-validated on every commit | ✅ | ❌ | ❌ |
| Last updated | **2026** | 2021 | 2023 |

[See the full comparison →](https://geoalgeria.com/compare)

## Who it's for

- **E-commerce / COD** — wilaya → daira → commune address cascades, postal-code validation, and shipping-zone config that matches what carriers actually use.
- **Maps & GIS** — drop-in GeoJSON with 1,528 commune features, modeled correctly through both reforms.
- **Research, open data & civic projects** — clean, structured, sourced, and versioned reference data instead of PDFs.
- **Any project using Algerian data** — one install, types included.

## Packages

| Package | npm | What |
| --- | --- | --- |
| [`packages/dataset`](packages/dataset) | [`geoalgeria`](https://www.npmjs.com/package/geoalgeria) | Wilayas, dairas, communes + structured postal data |
| [`packages/poste`](packages/poste) | [`@geoalgeria/poste`](https://www.npmjs.com/package/@geoalgeria/poste) | Standalone post offices & ATMs from Algérie Poste |
| [`packages/emploi`](packages/emploi) | [`@geoalgeria/emploi`](https://www.npmjs.com/package/@geoalgeria/emploi) | Standalone employment agencies (AWEM + ALEM) from ANEM |
| [`packages/mobilis`](packages/mobilis) | [`@geoalgeria/mobilis`](https://www.npmjs.com/package/@geoalgeria/mobilis) | Standalone Mobilis agencies & approved points of sale |
| [`packages/telecom`](packages/telecom) | [`@geoalgeria/telecom`](https://www.npmjs.com/package/@geoalgeria/telecom) | Cross-operator 5G coverage (Djezzy + Mobilis + Ooredoo) |
| [`packages/aviation`](packages/aviation) | [`@geoalgeria/aviation`](https://www.npmjs.com/package/@geoalgeria/aviation) | Civil airports from ANAC — names, ICAO codes, coordinates |
| [`packages/banques`](packages/banques) | [`@geoalgeria/banques`](https://www.npmjs.com/package/@geoalgeria/banques) | All 21 licensed banks + financial institutions & 1,704 branches (RIB, SWIFT, ownership, coordinates) |
| [`packages/livraison`](packages/livraison) | [`@geoalgeria/livraison`](https://www.npmjs.com/package/@geoalgeria/livraison) | Delivery carrier registry + 411 geocoded stop-desks & per-carrier coverage (Yalidine, Guepex, Anderson, Noest, Maystro) |
| [`packages/jeunesse`](packages/jeunesse) | [`@geoalgeria/jeunesse`](https://www.npmjs.com/package/@geoalgeria/jeunesse) | Youth establishments from the Ministry of Youth and Sports (2,334 across 58 wilayas) |
| [`packages/sports`](packages/sports) | [`@geoalgeria/sports`](https://www.npmjs.com/package/@geoalgeria/sports) | Sports facilities from the Ministry of Youth and Sports — 5,141 across 58 wilayas, 27 types, with capacity, PMR access & coordinates |
| [`packages/enseignement-superieur`](packages/enseignement-superieur) | [`@geoalgeria/enseignement-superieur`](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur) | Higher-education network from MESRS — universities, grandes écoles, ENS, centres + private & other-ministry institutions (177), with official websites & coordinates |
| [`packages/tourisme`](packages/tourisme) | [`@geoalgeria/tourisme`](https://www.npmjs.com/package/@geoalgeria/tourisme) | Tourism infrastructure — 4,348 geocoded hotels, attractions, historic sites, thermal springs & parks from ASAL, OSM & Wikidata |
| [`packages/formation-professionnelle`](packages/formation-professionnelle) | [`@geoalgeria/formation-professionnelle`](https://www.npmjs.com/package/@geoalgeria/formation-professionnelle) | Vocational training — 1,932 CFPA, INSFP, IFEP, IEP, DFEPs & private centers from MFEP (takwin.dz), with capacity, boarding & coordinates |
| [`packages/djezzy`](packages/djezzy) | [`@geoalgeria/djezzy`](https://www.npmjs.com/package/@geoalgeria/djezzy) | Djezzy boutiques — 128 geocoded retail stores from djezzy.dz, with category, hours & commune/wilaya linkage |
| [`packages/mosquees`](packages/mosquees) | [`@geoalgeria/mosquees`](https://www.npmjs.com/package/@geoalgeria/mosquees) | Mosques of Algeria — 20,759 geocoded, a Wikidata + OpenStreetMap composite with Arabic & French names, denomination & commune/wilaya linkage |
| [`packages/sante`](packages/sante) | [`@geoalgeria/sante`](https://www.npmjs.com/package/@geoalgeria/sante) | Public health establishments — 695 from the Ministry of Health (EPH, EPSP, EHS, CHU), bilingual, geocoded via OSM + Wikidata with commune/wilaya linkage |
| [`packages/culture`](packages/culture) | [`@geoalgeria/culture`](https://www.npmjs.com/package/@geoalgeria/culture) | Cultural atlas — 1,083 places from the Ministry of Culture (protected sites, museums, theatres, libraries, cultural establishments), bilingual, fully geocoded with commune/wilaya linkage |

[Browse all packages →](https://geoalgeria.com/data) · [API docs & field reference →](https://geoalgeria.com/data/docs)

## Use without npm

```html
<!-- via jsDelivr CDN, no install -->
<script>
  fetch("https://cdn.jsdelivr.net/npm/geoalgeria/data/ecommerce/communes.json")
    .then((r) => r.json())
    .then((communes) => { /* build your dropdown */ });
</script>
```

Prefer files? Grab **CSV / GeoJSON / SQL** from the zipped bundle on any [GitHub Release](https://github.com/yasserstudio/geoalgeria/releases), or browse [`packages/dataset/data/`](packages/dataset/data).

## Where this is going

GeoAlgeria isn't a one-off dump. The goal is to be **the** open reference source, continuously updated, for Algeria's data — kept current through every administrative reform, and **expanding to more kinds of Algeria data as sources become available**. Administrative divisions and postal/banking are the start, not the end.

Watch or ⭐ the repo to follow along, and [open a discussion](https://github.com/yasserstudio/geoalgeria/discussions) to request a dataset.

## Contributing

Corrections and additions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Good first issues usually just need a source link or a missing commune coordinate. Found wrong data? [Open an issue](https://github.com/yasserstudio/geoalgeria/issues/new/choose).

## Versioning & releases

Semantic versioning per package, automated with [Changesets](https://github.com/changesets/changesets). See [`RELEASING.md`](RELEASING.md) and each package's `CHANGELOG.md`.

## Sponsor

GeoAlgeria is free and MIT. If it saves you time, [**sponsor its maintenance**](https://github.com/sponsors/yasserstudio) — it funds keeping the data current and expanding the coverage.

## License & disclaimer

**Code:** [MIT](LICENSE). **Data:** compiled from public official sources (the *Journal Officiel*, Algérie Poste, ANEM, ANAC, each operator's/institution's public site) and redistributed for reference.

GeoAlgeria is an **independent project — not affiliated with or endorsed by** any government body, regulator, operator, or institution it references; their names and marks belong to their respective owners. The data is provided **"as is", without warranty — verify against the official source** before relying on it, especially for financial, payment, KYC, or compliance use. Full terms: **[DISCLAIMER](DISCLAIMER.md)**.

---

<div align="center">

If GeoAlgeria saved you from copy-pasting wilayas out of a PDF, **[give it a ⭐](https://github.com/yasserstudio/geoalgeria)** — it helps the next Algerian developer find clean data.

<a href="https://yasser.studio"><picture><source media="(prefers-color-scheme: dark)" srcset="./assets/yasser-studio-logo-white.svg"><img src="./assets/yasser-studio-logo.svg" alt="Yasser's Studio" height="44"></picture></a>

Made by [Yasser's Studio](https://yasser.studio) · [geoalgeria.com](https://geoalgeria.com) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)

</div>
