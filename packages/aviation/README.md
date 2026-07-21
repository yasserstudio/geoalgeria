**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/aviation

**Every civil airport in Algeria — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/aviation)](https://www.npmjs.com/package/@geoalgeria/aviation)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/aviation)](https://www.npmjs.com/package/@geoalgeria/aviation)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

33 civil airports across Algeria — with official names, **ICAO (OACI) codes**, postal
addresses, phone numbers, websites, GPS coordinates, and wilaya linkage. Sourced from
ANAC (the Autorité Nationale de l'Aviation Civile), shipped as JSON, CSV, and GeoJSON.
Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/aviation
```

```js
import aviation from "@geoalgeria/aviation";

const all = aviation.airports();                 // 33
const algiers = aviation.airportByIcao("DAAG");  // Houari Boumediene
const inOran = aviation.airportsByWilaya(31);     // airports in wilaya 31

// Everything has lat/lng — distance-sort, map, or nearest-airport in a few lines.
```

## What you can build

- **Nearest-airport lookups** — coordinates on every record, ready for distance sorting.
- **ICAO ↔ airport resolution** — map flight-data ICAO codes to names, contacts, and location.
- **Travel & logistics** — match a wilaya or a point to its serving airport.
- **Maps** — drop-in GeoJSON point layer for the whole civil-airport network.

## What's inside

| Dataset | Count | Notes |
| --- | --- | --- |
| Civil airports | **33** | official name, ICAO code, address, phone, website, coordinates |

Spanning **31 wilayas**, every airport geocoded. `wilaya_code` is linked against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) 69-wilaya model.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import airports from "@geoalgeria/aviation/data/airports.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/aviation/data/airports.json
```

The loaders and record shapes are fully **typed** — TypeScript definitions ship in the package:

```ts
import aviation, { type Airport } from "@geoalgeria/aviation";
const airports: Airport[] = aviation.airports();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  airports.json            # 33 airports (array)
  metadata.json            # sources, counts, license, updated
  csv/airports.csv         # repo + Release bundle (not in npm tarball)
  geojson/airports.geojson # Point features (all 33 are geocoded)
```

## Record shape

```json
{
  "id": "daag",
  "name": "Aéroport d’Alger – Houari Boumediene",
  "wilaya_code": "16",
  "commune_code": null,
  "commune": null,
  "lat": 36.69951171485545,
  "lng": 3.210846808533331,
  "geo_precision": "exact",
  "geo_method": "source_point",
  "source": "anac",
  "refs": { "icao": "DAAG" },
  "icao": "DAAG",
  "iata": null,
  "address": "Alger BP 164 DAR EL BEIDA",
  "phone": "+21323199230",
  "website": "https://www.aeroportalger.dz/"
}
```

`id` is the ICAO code lowercased. `icao` always matches `DA[A-Z]{2}`. `iata` is `null` — ANAC
publishes only ICAO codes (the slot is reserved for later enrichment). `wilaya_code` is
zero-padded to two digits and joins GeoAlgeria's wilayas; this dataset is wilaya-level only, so
`commune_code` and `commune` are always `null`. Every point comes straight from ANAC's own
published map, so `geo_precision` is always `"exact"` and `geo_method` is always
`"source_point"` — nothing here is a fallback or a downgrade. `source` is a short key resolved
in `metadata.sources[]` (always `"anac"`), and `refs.icao` duplicates the top-level `icao`. One
record (`dabs`, Tébessa) has a `null` `phone` where ANAC lists none.

## Need the administrative divisions too?

If you also need wilayas, dairas, and communes to join against, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package — it ships the full
69-wilaya division dataset that `wilaya_code` here links to. Use `@geoalgeria/aviation`
when you *only* need airport data.

## Source

Data comes from **ANAC — Autorité Nationale de l'Aviation Civile**, via the public
airports map (<https://www.anac.dz/en/carte-des-aeroports-3/>). Run `npm run fetch` to
regenerate every output from the live map; the build follows the map's iframe so an ANAC
version bump doesn't break it, and it fails loudly if the airport count or ICAO format
changes. `wilaya_code` is resolved by nearest commune centroid from the `geoalgeria`
dataset (the flagship ships centroids, not boundary polygons).

## License & attribution

Code is [MIT](LICENSE). The underlying data is © **ANAC**, redistributed for reference
and to power [GeoAlgeria](https://geoalgeria.com). Verify against ANAC for authoritative,
real-time information.

[API docs & field reference →](https://geoalgeria.com/data/docs/aviation) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
