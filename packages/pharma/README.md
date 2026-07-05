**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/pharma

**Algeria's pharmaceutical sector — one install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/pharma)](https://www.npmjs.com/package/@geoalgeria/pharma)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

An umbrella package that re-exports GeoAlgeria's pharmaceutical datasets, so you can install
one thing and get them all. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/pharma
```

```js
import pharma from "@geoalgeria/pharma";

pharma.industrie.manufacturers();   // approved medicine & device makers (MIP register)
pharma.pharmacies.pharmacies();     // pharmacies / officines (OpenStreetMap)

// or import a member directly:
import { pharmacies } from "@geoalgeria/pharma";
```

## Members

| Namespace | Package | What |
| --- | --- | --- |
| `industrie` | [`@geoalgeria/industrie-pharmaceutique`](https://www.npmjs.com/package/@geoalgeria/industrie-pharmaceutique) | Approved pharmaceutical manufacturers — medicine (PP) & medical-device (DM) makers (Ministry of Pharmaceutical Industry) |
| `pharmacies` | [`@geoalgeria/pharmacies`](https://www.npmjs.com/package/@geoalgeria/pharmacies) | Pharmacies / officines (OpenStreetMap) |

> More of the sector may join over time (e.g. a medical-laboratories layer once open coverage is adequate). Installing `@geoalgeria/pharma` keeps you on the full set.

## Source & license

Each member carries its own source and attribution (see its README) — MIP register for `industrie`, OpenStreetMap (ODbL) for `pharmacies`. Package code under MIT (see [LICENSE](LICENSE)).

## Questions?

Open an issue: https://github.com/yasserstudio/geoalgeria/issues
