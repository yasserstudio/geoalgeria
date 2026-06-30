**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/agriculture

**Algeria's agriculture-sector institutions — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/agriculture)](https://www.npmjs.com/package/@geoalgeria/agriculture)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/agriculture)](https://www.npmjs.com/package/@geoalgeria/agriculture)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

# Overview

196 agriculture-sector institutions from the **Ministry of Agriculture, Rural Development and Fisheries (MADR)** institutional directory — agricultural-services directorates, forest conservations, technical & research institutes, training centres, chambers of agriculture, public offices and groups — bilingual (FR/AR), typed, with wilaya/commune linkage and coordinates.

## Installation

```bash
npm install @geoalgeria/agriculture
```

## Quick start

```js
import {
  agriculture,
  institutionById,
  institutionsByWilaya,
  institutionsByType,
  metadata,
} from "@geoalgeria/agriculture";

agriculture().length; // 196

// All agricultural-services directorates (one per wilaya)
institutionsByType("dsa").length; // 58

// Everything in Alger (code 16)
institutionsByWilaya(16).map((r) => r.name);

// A single record, and dataset metadata
institutionById("16-office_public-01")?.abbreviation; // "OAIC"
metadata().wilayas_covered; // 58
```

## What you can build

- A directory/locator for agricultural institutions by wilaya
- A contact book of the national institutes, offices and groups (phone/fax)
- A map layer of the agriculture sector's administrative footprint

## What's inside

| Dataset | Count | Coordinates | Notes |
| --- | --- | --- | --- |
| `agriculture` | 196 | all 196 | MADR directory, geocoded to commune/wilaya centroid |

**By network (`type`)**

| Type | Count | Meaning |
| --- | --- | --- |
| `dsa` | 58 | Directions des Services Agricoles (one per wilaya) |
| `conservation_forets` | 48 | Conservations des Forêts |
| `chambre_agriculture` | 49 | Chambres d'Agriculture (+ national chamber) |
| `institut_recherche` | 16 | Technical & research institutes (INRAA, INRF, ITGC, ITDAS…) |
| `centre_formation` | 11 | Training institutes & centres (ITMAS/CFATSF/CFVA) |
| `groupe_public` | 10 | Public groups (GVAPRO, AGROLOG, GIPLAIT…) |
| `office_public` | 4 | Public offices (OAIC, ONIL, ONILEV, ONTA) |

**By coordinate precision** (`geo_precision`)

| Value | Count | Meaning |
| --- | --- | --- |
| `commune_centroid` | 89 | Address matched a commune; centroid of that commune |
| `wilaya_centroid` | 107 | No commune in the address; centroid of the wilaya chief town |

> DSA covers all **58 wilayas**. Conservations des Forêts (48) and Chambres d'Agriculture (49) use the pre-2019 **48-wilaya** division — the southern wilayas fold into their parents there.

## Formats

- `data/agriculture.json` — full array (typed by `types/index.d.ts`)
- `data/csv/agriculture.csv` — flat CSV
- `data/geojson/agriculture.geojson` — `FeatureCollection` (all records)
- `data/metadata.json` — counts, sources, generated date

```js
import data from "@geoalgeria/agriculture/data/agriculture.json" with { type: "json" };
```

```ts
import type { AgricultureInstitution } from "@geoalgeria/agriculture";
```

## How the data is built

Extracted from the MADR directory (`madr.gov.dz/contact/دليل-الهاتف/`, Arabic — the up-to-date side; `fr.madr.gov.dz/contact/annuaire/` for the bilingual category labels), normalized to official wilaya codes, then geocoded against the geoalgeria commune set. See `research/agriculture/` in the monorepo for the full pipeline (`parse.py` → `normalize.py` → `geocode.py`).

## On accuracy

> Names, wilaya, address and phone/fax are **official** (from the MADR directory). The directory carries **no coordinates**: each record is placed at the centroid of the commune named in its address, or — when the address has no recognizable commune — at the centroid of the wilaya chief town (see `geo_precision`). These are approximate locations for the *wilaya/commune*, not surveyed building points. Some source rows have minor typos that have been normalized.

## Source & license

Data from the **Ministry of Agriculture, Rural Development and Fisheries (MADR)** — a factual public-sector listing, redistributed for reference. Wilaya/commune linkage uses the geoalgeria base dataset. Package code under MIT (see [LICENSE](LICENSE)).

## Questions?

Open an issue: https://github.com/yasserstudio/geoalgeria/issues
