**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/ooredoo

**Ooredoo Algérie's retail network — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/ooredoo)](https://www.npmjs.com/package/@geoalgeria/ooredoo)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/ooredoo)](https://www.npmjs.com/package/@geoalgeria/ooredoo)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

# Overview

572 Ooredoo stores across **63 wilayas** — Espaces Ooredoo (EO), City Shops (CSO) and Espaces Services (ESO) — from the operator's own locator API, each with **real coordinates** and wilaya/commune linkage. Completes the telecom retail trio with [`@geoalgeria/mobilis`](https://www.npmjs.com/package/@geoalgeria/mobilis) and [`@geoalgeria/djezzy`](https://www.npmjs.com/package/@geoalgeria/djezzy).

## Installation

```bash
npm install @geoalgeria/ooredoo
```

## Quick start

```js
import {
  stores,
  storeById,
  storesByWilaya,
  storesByType,
  metadata,
} from "@geoalgeria/ooredoo";

stores().length; // 572

// Espaces Services only
storesByType("ESO").length; // 436

// Everything in Alger (code 16)
storesByWilaya(16).map((r) => r.name);

// A single record, and dataset metadata
storeById("16-001")?.type;
metadata().wilayas_covered; // 63
```

## What you can build

- An Ooredoo store locator / map layer
- A combined telecom-retail map (Ooredoo + Mobilis + Djezzy)
- Coverage / footprint analysis by wilaya and store type

## What's inside

| Dataset | Count | Coordinates | Notes |
| --- | --- | --- | --- |
| `stores` | 572 | all 572 (553 `exact`, 19 `approximate`) | Ooredoo locator API, wilaya/commune-linked |

**By type (`type`)**

| Type | Count | Meaning |
| --- | --- | --- |
| `EO` | 100 | Espace Ooredoo |
| `ESO` | 436 | Espace Services Ooredoo |
| `CSO` | 36 | City Shop Ooredoo |

## Formats

- `data/stores.json` — full array (typed by `types/index.d.ts`)
- `data/csv/stores.csv` — flat CSV
- `data/geojson/stores.geojson` — `FeatureCollection` (all records)
- `data/metadata.json` — counts, sources, generated date

```js
import data from "@geoalgeria/ooredoo/data/stores.json" with { type: "json" };
```

```ts
import type { OoredooStore } from "@geoalgeria/ooredoo";
```

## How the data is built

Pulled from Ooredoo Algérie's public *Trouvez-nous* locator API (a Liferay Headless "Objects" endpoint behind `ooredoo.dz`), which returns a real `latitude`/`longitude` per store. Because the API files stores under the legacy 48-wilaya scheme, wilaya/commune are re-derived from the coordinates by nearest-centroid join against the geoalgeria commune set (current 69-wilaya scheme) — the operator's own declared wilaya is kept as `operator_wilaya`. Rebuild with `npm run fetch` (or `--cache`). See `research/ooredoo/` in the monorepo.

## On accuracy

> Store names, types and coordinates are **from the operator** (`geo_method: "operator_api"`). Coordinates are `geo_precision: "exact"` for 553 stores and `"approximate"` for 19 whose source coordinate has fewer than 3 decimal places. Wilaya is effectively exact (from the operator point); commune is a nearest-centroid best-effort. A **few** operator points carry inaccurate coordinates in the source, so their derived wilaya/commune can be wrong — the `operator_wilaya` field preserves Ooredoo's own declared wilaya in those cases. This is Ooredoo's own store directory as exposed by its locator; a store may occasionally be a partner point rather than a company-owned space.

## Source & license

Data © **Ooredoo Algérie**, redistributed for reference (the same status as `@geoalgeria/mobilis` / `@geoalgeria/djezzy`). Wilaya/commune linkage uses the geoalgeria base dataset. Package code under MIT (see [LICENSE](LICENSE)).

## Questions?

Open an issue: https://github.com/yasserstudio/geoalgeria/issues
