**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/transport

**Algeria's transport sector — one install for every mode.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/transport)](https://www.npmjs.com/package/@geoalgeria/transport)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

An umbrella package that re-exports every GeoAlgeria transport dataset, so you can install
one thing and get them all. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/transport
```

```js
import transport from "@geoalgeria/transport";

transport.aviation.airports();          // civil airports (ANAC)
transport.ferroviaire.stations();       // rail / tram / metro (SNTF / SETRAM / SEMA)
transport.garesRoutieres.stations();    // intercity bus stations (SOGRAL)
transport.buses.lines();                // urban bus networks (ETUSA)

// or import a member directly:
import { ferroviaire } from "@geoalgeria/transport";
```

## Members

| Namespace | Package | What |
| --- | --- | --- |
| `aviation` | [`@geoalgeria/aviation`](https://www.npmjs.com/package/@geoalgeria/aviation) | Civil airports (ANAC) |
| `ferroviaire` | [`@geoalgeria/ferroviaire`](https://www.npmjs.com/package/@geoalgeria/ferroviaire) | Rail, tram & metro (SNTF / SETRAM / SEMA) |
| `garesRoutieres` | [`@geoalgeria/gares-routieres`](https://www.npmjs.com/package/@geoalgeria/gares-routieres) | Intercity bus stations (SOGRAL) |
| `buses` | [`@geoalgeria/buses`](https://www.npmjs.com/package/@geoalgeria/buses) | Urban bus networks (ETUSA) |

Prefer a single dataset? Install just that member. This umbrella is for when you want the
whole sector.

## License

Code is [MIT](LICENSE). Each member carries its own data license and attribution — see the
respective package READMEs.

[Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
