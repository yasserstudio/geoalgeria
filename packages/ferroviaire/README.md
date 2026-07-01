**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/ferroviaire

**Algeria's rail & urban transit — every station and stop, as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/ferroviaire)](https://www.npmjs.com/package/@geoalgeria/ferroviaire)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/ferroviaire)](https://www.npmjs.com/package/@geoalgeria/ferroviaire)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

692 rail and urban-transit nodes across Algeria — **train stations, tram stops, metro
stations, aerial tramways and gondolas** — with bilingual FR/AR names, operator
(SNTF / SETRAM / SEMA), line membership, GPS coordinates, and wilaya/commune linkage.
A Wikidata + OpenStreetMap composite, shipped as JSON, CSV, and GeoJSON. Part of
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> **Operators (sources):** SNTF (rail), SETRAM (tramways), SEMA/EMA (Métro d'Alger).
> Intercity **bus stations** live in [`@geoalgeria/gares-routieres`](https://www.npmjs.com/package/@geoalgeria/gares-routieres).

```bash
npm install @geoalgeria/ferroviaire
```

```js
import ferroviaire from "@geoalgeria/ferroviaire";

const all = ferroviaire.stations();               // 692
const trams = ferroviaire.stationsByType("tram");  // 190 tram stops
const inAlger = ferroviaire.stationsByWilaya(16);  // rail + metro + tram in Algiers
```

## What you can build

- **Multimodal maps** — one GeoJSON layer with train, tram, metro, and cable-transit nodes.
- **Nearest-station lookups** — coordinates on every record.
- **Network views** — filter by `type`, `operator`, or `network` (tram cities, Métro d'Alger).
- **Bilingual UIs** — French and Arabic names on most records.

## What's inside

| Type | Count | Operator |
| --- | --- | --- |
| Rail (train) | **427** | SNTF |
| Tram | **190** | SETRAM (7 city networks) |
| Metro | **41** | SEMA — Métro d'Alger |
| Aerial tramway | **24** | — |
| Gondola | **10** | — |

Spanning **50 wilayas**, every node geocoded. `wilaya_code` is linked against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) 69-wilaya model.

> Coverage note: this is the **node universe** from Wikidata + OSM. SETRAM operates
> 172 tram stations across 7 networks; SEMA's Métro d'Alger has **19 operational**
> stations (Wikidata lists more metro nodes, incl. entrances/extensions). Heavy-rail
> per-line status (SNTF) is not yet modelled.

## Formats

```js
import stations from "@geoalgeria/ferroviaire/data/stations.json" with { type: "json" };
// or via CDN: https://cdn.jsdelivr.net/npm/@geoalgeria/ferroviaire/data/stations.json
```

```ts
import ferroviaire, { type Station } from "@geoalgeria/ferroviaire";
const stations: Station[] = ferroviaire.stations();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  stations.json            # 692 nodes (array)
  metadata.json            # source, counts, generated_at
  csv/stations.csv
  geojson/stations.geojson # Point features (all geocoded)
```

## Record shape

```json
{
  "id": "16-021",
  "name": "Place des Martyrs",
  "name_fr": "Place des Martyrs",
  "name_ar": "ساحة الشهداء",
  "type": "metro",
  "line": "ligne 1 du métro d'Alger",
  "operator": "SEMA",
  "network": "Métro d'Alger",
  "wilaya_code": "16",
  "commune": "Casbah",
  "commune_code": 1605,
  "lat": 36.7887,
  "lng": 3.0603,
  "geo_precision": "exact",
  "source": "wikidata+osm",
  "wikidata": "Q...",
  "osm_id": "node/..."
}
```

`type` is one of `rail | tram | metro | aerial_tram | gondola`. `source`
is `wikidata`, `osm`, or `wikidata+osm` (matched within ~150 m). `name` may be `null`
for a few OSM-only stops. `wilaya_code`/`commune` come from a nearest-centroid join
against `geoalgeria`.

## Source & license

A composite of **Wikidata** (CC0) and **OpenStreetMap** (© OpenStreetMap contributors,
ODbL 1.0), with operators from **SNTF**, **SETRAM**, and **SEMA/EMA**. Code is
[MIT](LICENSE); OSM-derived data remains under ODbL — keep attribution. Run
`npm run fetch` to regenerate. For authoritative, real-time information, verify with the
operators.

[Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
