**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/pharmacies

**Algeria's pharmacies, as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/pharmacies)](https://www.npmjs.com/package/@geoalgeria/pharmacies)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/pharmacies)](https://www.npmjs.com/package/@geoalgeria/pharmacies)
[![License: MIT AND ODbL-1.0](https://img.shields.io/badge/License-MIT%20AND%20ODbL--1.0-green.svg)](LICENSE)

</div>

# Overview

3,795 pharmacies (officines) across **67 wilayas**, from **OpenStreetMap**, every record geocoded, bilingual (FR/AR) where named, with phone, opening hours and a `dispensing` flag where OSM has them, plus wilaya/commune linkage.

## Installation

```bash
npm install @geoalgeria/pharmacies
```

## Quick start

```js
import {
  pharmacies,
  pharmacyById,
  pharmaciesByWilaya,
  metadata,
} from "@geoalgeria/pharmacies";

pharmacies().length; // 3795

// Everything in Alger (code 16)
pharmaciesByWilaya(16).length;

// A single record, and dataset metadata
pharmacyById("16-00001")?.commune;
metadata().wilayas_covered; // 67
```

## What you can build

- A pharmacy locator / map layer for Algeria
- A "pharmacie de garde" base layer (join with opening hours)
- Health-access analysis by wilaya/commune

## What's inside

| Dataset | Count | Coordinates | Notes |
| --- | --- | --- | --- |
| `pharmacies` | 3,795 | all 3,795 | OpenStreetMap, geocoded, wilaya/commune-linked |

- **Named:** 2,461 · **with phone:** 145 · **with opening hours:** 256 · **with address:** 1,161 · **with `dispensing`:** 530

## Formats

- `data/pharmacies.json` – full array (typed by `types/index.d.ts`)
- `data/csv/pharmacies.csv` – flat CSV
- `data/geojson/pharmacies.geojson` – `FeatureCollection` (all records)
- `data/metadata.json` – counts, sources, generated date
- `data/retired-ids.json` – ids no record may hold again, each forwarded to the id that carries the pharmacy now, citing the OpenStreetMap elements the merge stood for

```js
import data from "@geoalgeria/pharmacies/data/pharmacies.json" with { type: "json" };
```

```ts
import type { Pharmacy } from "@geoalgeria/pharmacies";
```

## How the data is built

Extracted from OpenStreetMap via Overpass (`amenity=pharmacy` across Algeria), then linked to wilaya/commune by nearest-centroid join against the geoalgeria commune set. Each name is kept as the tag writes it, with three exceptions: repeated spaces become one, spaces at either end are trimmed, and combining marks at the very start are dropped. No letter is added, deleted, reordered or transliterated. Names are then routed strictly by script so `name_ar` holds Arabic only and `name_fr` Latin only, even when OSM mis-tags them. A tag holding more than one language at once ("Pharmacie bouchekouf صيدلية بوشقوف") is cut at each script boundary, so each field keeps its own half and neither gains a word the source does not have. Tifinagh is one of the three scripts and belongs to neither field, so a Tamazight name stays on `name` rather than being dropped or filed as Arabic.

Where OpenStreetMap holds one pharmacy as two elements (a node and a building outline, or two spellings), the elements are merged into one record. Two elements are one pharmacy when they stand within 40 m and their names share a **Loose name key**: each half from the script split, folded through [`@geoalgeria/normalize`](../normalize) and compared as keys rather than as display text, with the words that only say "pharmacy" dropped. That is how "Pharmacie Bouchekouf صيدلية بوشقوف" and plain "بوشقوف" six metres away are read as one record. The kept element absorbs every field it lacks from the one it replaces, so no phone, address, opening hours or `dispensing` flag is lost in the merge; its own value stands wherever both state one, and no two values are ever joined into one. A bulk-import artifact, 1,769 unnamed, consecutive-id pharmacy *ways* dumped into one small area near Attatba (Tipaza), is detected and excluded (it is not real officines). Rebuild with `npm run fetch` (or `--cache` to rebuild from the cached pull). See `research/pharmacies/` in the monorepo.

## On accuracy & coverage

> **Coverage is partial.** 3,795 pharmacies are mapped in OpenStreetMap against an estimated **~11,000 officines** nationally (an order-of-magnitude reference, there is no open official registry; the Ordre National des Pharmaciens portal is down). Coverage is uneven by wilaya and denser in the north, this is a community-maintained extract, **not an official registry**.
>
> Coordinates are OSM node points (surveyed) or building-outline centroids (`geo_method`). Commune is a nearest-centroid best-effort; wilaya is effectively exact. Names, phones and hours are only present where an OSM contributor tagged them.

## Source & license

Data © **OpenStreetMap contributors**, licensed **ODbL 1.0**. Any distribution of this data (or derived DB) must credit OpenStreetMap and keep it under ODbL. Wilaya/commune linkage uses the geoalgeria base dataset. Package code under MIT (see [LICENSE](LICENSE)).

## Questions?

Open an issue: https://github.com/yasserstudio/geoalgeria/issues
