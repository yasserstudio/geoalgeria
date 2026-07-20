**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/buses

**Algeria's urban bus networks — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

Urban bus **lines** across Algeria — termini, stop counts, and the communes and transit
stations each line serves. A **multi-operator** dataset; v1 ships **50 ETUSA lines**
(Alger). Shipped as JSON and CSV. Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> **Operator (source):** ETUSA — Établissement de transport urbain et suburbain d'Alger.
> More cities/operators will be added under the same schema. For intercity coach stations
> see [`@geoalgeria/gares-routieres`](https://www.npmjs.com/package/@geoalgeria/gares-routieres);
> for rail/tram/metro see [`@geoalgeria/ferroviaire`](https://www.npmjs.com/package/@geoalgeria/ferroviaire).

```bash
npm install @geoalgeria/buses
```

```js
import buses from "@geoalgeria/buses";

const all = buses.lines();                    // 50
const etusa = buses.linesByOperator("ETUSA"); // 50
const l1 = buses.lineById("etusa-1");          // El Harrach ↔ Place Aïssat Idir
```

## What's inside

| Dataset | Count | Notes |
| --- | --- | --- |
| Urban bus lines | **50** | ETUSA (Alger) — termini, stop count, communes & stations served |

> **Scope (v1):** line-level attributes only. Per-stop and per-line **geometry**
> (OSM `route=bus`) is deferred to **v1.1** — ETUSA-tagged OSM route coverage is
> currently thin. This covers 50 of ~122 ETUSA passenger lines. `wilaya_code` is `16`
> (Alger) and joins the [`geoalgeria`](https://www.npmjs.com/package/geoalgeria) model.

## Record shape

```json
{
  "id": "etusa-1",
  "name": "Ligne 1 — El Harrach ↔ Place Aïssat Idir, via Haï El Badr",
  "operator": "ETUSA",
  "network": "Alger",
  "line": "1",
  "terminus1": "El Harrach",
  "terminus2": "Place Aïssat Idir, via Haï El Badr",
  "stops": 16,
  "communes_served": ["El Harrach", "Bachdjerrah", "Hussein Dey", "..."],
  "stations_served": ["El Harrach Centre", "Haï El Badr", "Les Fusillés", "..."],
  "wilaya_code": "16",
  "lat": null,
  "lng": null,
  "geo_precision": null,
  "geo_method": null,
  "source": "wikipedia",
  "source_url": "https://fr.wikipedia.org/wiki/Lignes_de_bus_ETUSA_de_1_à_99"
}
```

## Source & license

Line data comes from **fr.wikipedia** (the ETUSA line articles) — licensed
**CC BY-SA 4.0** (attribution + share-alike). Operator: **ETUSA**. Package code is
[MIT](LICENSE); the line data inherits Wikipedia's CC BY-SA — keep attribution and
share-alike if you redistribute. Verify with ETUSA for authoritative, current lines.

[Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
