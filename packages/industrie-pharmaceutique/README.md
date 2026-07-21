**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/industrie-pharmaceutique

**Algeria's approved pharmaceutical manufacturers — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/industrie-pharmaceutique)](https://www.npmjs.com/package/@geoalgeria/industrie-pharmaceutique)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/industrie-pharmaceutique)](https://www.npmjs.com/package/@geoalgeria/industrie-pharmaceutique)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

# Overview

171 approved pharmaceutical **manufacturers** from the **Ministry of Pharmaceutical Industry (MIP)** fabrication register (`agrément de fabrication`, updated 28/06/2026) — medicine makers (PP), medical-device makers (DM) and mixed producers — bilingual (FR/AR), typed by nature, with wilaya/commune linkage and coordinates.

## Installation

```bash
npm install @geoalgeria/industrie-pharmaceutique
```

## Quick start

```js
import {
  manufacturers,
  manufacturerById,
  manufacturersByWilaya,
  manufacturersByNature,
  metadata,
} from "@geoalgeria/industrie-pharmaceutique";

manufacturers().length; // 171

// Medicine (PP) makers only
manufacturersByNature("pp").length; // 120

// Everything in Alger (code 16)
manufacturersByWilaya(16).map((r) => r.name);

// A single record, and dataset metadata
manufacturerById("16-pp-01")?.name;
metadata().wilayas_covered; // 25
```

## What you can build

- A map of Algeria's pharmaceutical industrial footprint by wilaya
- A directory of medicine and medical-device makers, filterable by nature
- A base layer for supply-chain, industry or investment analysis

## What's inside

| Dataset | Count | Coordinates | Notes |
| --- | --- | --- | --- |
| `industrie-pharmaceutique` | 171 | all 171 | MIP fabrication register, geocoded to commune/wilaya centroid |

**By nature (`nature`)**

| Nature | Count | Meaning |
| --- | --- | --- |
| `pp` | 120 | Produits Pharmaceutiques — medicine manufacturers |
| `dm` | 48 | Dispositifs Médicaux — medical-device manufacturers |
| `mixte` | 3 | Both (PP + DM) |

**By geocoding method** (`geo_method`) — all 171 records carry `geo_precision: "approximate"`
(the register has no real coordinates; every point is a centroid, never exact):

| Value | Count | Meaning |
| --- | --- | --- |
| `commune_centroid` | 126 | Commune resolved; centroid of that commune |
| `wilaya_centroid` | 45 | Only the wilaya is known; wilaya centroid |

## Formats

- `data/industrie-pharmaceutique.json` — full array (typed by `types/index.d.ts`)
- `data/csv/industrie-pharmaceutique.csv` — flat CSV
- `data/geojson/industrie-pharmaceutique.geojson` — `FeatureCollection` (all records)
- `data/metadata.json` — counts, sources, generated date

```js
import data from "@geoalgeria/industrie-pharmaceutique/data/industrie-pharmaceutique.json" with { type: "json" };
```

```ts
import type { PharmaManufacturer } from "@geoalgeria/industrie-pharmaceutique";
```

## How the data is built

The operator names and PP/DM nature come from the current MIP fabrication register (`miph.gov.dz`), which carries **no coordinates**. Each maker's wilaya/commune is resolved from the MIP register's earlier (2023) edition — which did carry a wilaya column — a place token in the operator name, or a per-company research pass (company websites, the CACI/El Mouchir directory, press) for makers absent from the 2023 edition. Locations are then placed at the commune (or wilaya) centroid. See `research/_pharma-landscape/` in the monorepo for the full pipeline (`build.py`).

## On accuracy

> Operator names and the PP/DM nature are **official** (the MIP register). The register carries **no coordinates**: each record is placed at the centroid of its resolved commune, or — when only the wilaya is known — at the wilaya centroid (see `geo_method`; `geo_precision` is `"approximate"` for every record). These are approximate locations for the *wilaya/commune*, not surveyed factory points.
>
> **Coverage:** 171 of the ~186 approved manufacturing establishments are geocoded here. The rest are contract manufacturers listed as *sous-traitance* (no own site) or a few very small device makers with no locatable address — omitted rather than placed speculatively. **Importers, wholesalers, exploitation and promotion** are separate MIP registers, not part of this manufacturers layer.

## Source & license

Data from the **Ministry of Pharmaceutical Industry (MIP)** fabrication register — a factual public-sector listing, redistributed for reference. Wilaya/commune linkage uses the geoalgeria base dataset. Package code under MIT (see [LICENSE](LICENSE)).

## Questions?

Open an issue: https://github.com/yasserstudio/geoalgeria/issues
