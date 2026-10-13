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

- **Named:** 2,455 · **with phone:** 145 · **with opening hours:** 256 · **with address:** 1,161 · **with `dispensing`:** 530

## Formats

- `data/pharmacies.json` – full array (typed by `types/index.d.ts`)
- `data/csv/pharmacies.csv` – flat CSV
- `data/geojson/pharmacies.geojson` – `FeatureCollection` (all records)
- `data/metadata.json` – counts, sources, generated date
- `data/retired-ids.json` – ids no record may hold again, each forwarded to the id that carries the pharmacy now

```js
import data from "@geoalgeria/pharmacies/data/pharmacies.json" with { type: "json" };
```

```ts
import type { Pharmacy } from "@geoalgeria/pharmacies";
```

## How the data is built

Extracted from OpenStreetMap via Overpass (`amenity=pharmacy` across Algeria), de-duplicated (same name within 40 m, and coincident points), then linked to wilaya/commune by nearest-centroid join against the geoalgeria commune set. Names are routed strictly by script so `name_ar` is always Arabic and `name_fr` always Latin, even when OSM mis-tags them: a tag holding both languages at once ("Pharmacie bouchekouf صيدلية بوشقوف") is cut at the script boundary, so each field keeps its own half and neither gains a word the source does not have. De-duplication compares those halves as [`@geoalgeria/normalize`](../normalize) Loose keys rather than as text, with the words that only say "pharmacy" dropped, which is how one pharmacy written "Pharmacie Bouchekouf صيدلية بوشقوف" and plain "بوشقوف" six metres away is read as one record. A bulk-import artifact, 1,769 unnamed, consecutive-id pharmacy *ways* dumped into one small area near Attatba (Tipaza), is detected and excluded (it is not real officines). Rebuild with `npm run fetch` (or `--cache` to rebuild from the cached pull). See `research/pharmacies/` in the monorepo.

## On accuracy & coverage

> **Coverage is partial.** 3,795 pharmacies are mapped in OpenStreetMap against an estimated **~11,000 officines** nationally (an order-of-magnitude reference, there is no open official registry; the Ordre National des Pharmaciens portal is down). Coverage is uneven by wilaya and denser in the north, this is a community-maintained extract, **not an official registry**.
>
> Coordinates are OSM node points (surveyed) or building-outline centroids (`geo_method`). Commune is a nearest-centroid best-effort; wilaya is effectively exact. Names, phones and hours are only present where an OSM contributor tagged them.

## Source & license

Data © **OpenStreetMap contributors**, licensed **ODbL 1.0**. Any distribution of this data (or derived DB) must credit OpenStreetMap and keep it under ODbL. Wilaya/commune linkage uses the geoalgeria base dataset. Package code under MIT (see [LICENSE](LICENSE)).

## Questions?

Open an issue: https://github.com/yasserstudio/geoalgeria/issues
