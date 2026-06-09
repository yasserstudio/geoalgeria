<div align="center">

# GeoAlgeria

**The open dataset for Algeria — install it, don't scrape it.**

[![CI](https://github.com/yasserstudio/geoalgeria/actions/workflows/ci.yml/badge.svg)](https://github.com/yasserstudio/geoalgeria/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/geoalgeria)](https://www.npmjs.com/package/geoalgeria)
[![npm downloads](https://img.shields.io/npm/dm/geoalgeria)](https://www.npmjs.com/package/geoalgeria)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

Every Algeria dataset on the internet still lists **48 wilayas**. Algeria has had **69 since 2025**. GeoAlgeria is the one that's current — with real Algérie Poste postal codes, GPS coordinates, bilingual names, and post offices & ATMs — shipped as JSON, CSV, GeoJSON, SQL, and TypeScript. One `npm install`, MIT, validated on every commit.

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
| **Wilayas** | 69 | provinces (2019 + 2025 reforms) |
| **Dairas** | 564 | districts, as first-class entities |
| **Communes** | 1,541 | bilingual FR/AR, postal codes, coordinates |
| **Post offices** | 3,908 | real Algérie Poste codes, coordinates |
| **ATMs** | 2,026 | Algérie Poste GAB network |

Formats: **JSON · CSV · GeoJSON · SQL · TypeScript**. The npm package ships JSON to stay light; CSV/GeoJSON/SQL ride in every [GitHub Release](https://github.com/yasserstudio/geoalgeria/releases).

## Why not the others?

| | geoalgeria | leblad | algeria-cities |
|---|:---:|:---:|:---:|
| All 69 wilayas (2025 reform) | ✅ | ❌ (58) | ✅ |
| Dairas as first-class entities | ✅ | ❌ | ❌ |
| Real Algérie Poste postal codes | ✅ | ~ | ❌ |
| Coordinates per commune | ✅ | ❌ | ✅ |
| Post offices & ATMs | ✅ | ❌ | ❌ |
| E-commerce ready (flat) | ✅ | ❌ | ❌ |
| npm + TypeScript types | ✅ | ✅ | ❌ |
| GeoJSON / SQL exports | ✅ | ❌ | ✅ |
| CI-validated every commit | ✅ | ❌ | ❌ |
| Last updated | **2025** | 2021 | 2023 |

[See the full comparison →](https://geoalgeria.com/compare)

## Who it's for

- **E-commerce / COD** — wilaya → daira → commune address cascades, postal-code validation, and shipping-zone config that matches what carriers actually use.
- **Maps & GIS** — drop-in GeoJSON with 1,541 commune features, modeled correctly through both reforms.
- **Civic, research & data** — clean, structured, sourced, and versioned reference data instead of PDFs.
- **Anything that touches Algeria** — one install, types included.

## Packages

| Package | npm | What |
| --- | --- | --- |
| [`packages/dataset`](packages/dataset) | [`geoalgeria`](https://www.npmjs.com/package/geoalgeria) | Wilayas, dairas, communes + mirrored postal data |
| [`packages/poste`](packages/poste) | [`@geoalgeria/poste`](https://www.npmjs.com/package/@geoalgeria/poste) | Standalone post offices & ATMs from Algérie Poste |

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

GeoAlgeria isn't a one-off dump. The goal is to be **the** canonical, continuously-updated open source for Algeria's data — kept current through every administrative reform, and **expanding to more kinds of Algeria data as sources become available**. Administrative divisions and postal/banking are the start, not the end.

Watch or ⭐ the repo to follow along, and [open a discussion](https://github.com/yasserstudio/geoalgeria/discussions) to request a dataset.

## Contributing

Corrections and additions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Good first issues usually just need a source link or a missing commune coordinate. Found wrong data? [Open an issue](https://github.com/yasserstudio/geoalgeria/issues/new/choose).

## Versioning & releases

Semantic versioning per package, automated with [Changesets](https://github.com/changesets/changesets). See [`RELEASING.md`](RELEASING.md) and each package's `CHANGELOG.md`.

## Sponsor

GeoAlgeria is free and MIT. If it saves you time, [**sponsor its maintenance**](https://github.com/sponsors/yasserstudio) — it funds keeping the data current and expanding the coverage.

## License

[MIT](LICENSE). Postal data is © [Algérie Poste](https://baridimap.poste.dz), redistributed for reference — verify against the source for authoritative, real-time information.

---

<div align="center">

If GeoAlgeria saved you from copy-pasting wilayas out of a PDF, **[give it a ⭐](https://github.com/yasserstudio/geoalgeria)** — it helps the next Algerian developer find clean data.

Made by [Yasser's Studio](https://yasser.studio) · [geoalgeria.com](https://geoalgeria.com)

</div>
