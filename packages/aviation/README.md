**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/aviation

**Every civil airport in Algeria, as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/aviation)](https://www.npmjs.com/package/@geoalgeria/aviation)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/aviation)](https://www.npmjs.com/package/@geoalgeria/aviation)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

36 civil airports and Air Algérie's nonstop route network. Official names, **ICAO (OACI) and IATA codes**,
postal addresses, phone numbers, websites, GPS coordinates, and wilaya linkage. Sourced
from ANAC (the Autorité Nationale de l'Aviation Civile), with IATA codes and three
airports ANAC's map omits from OurAirports. Shipped as JSON, CSV, and GeoJSON.
Part of [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/aviation
```

```js
import aviation from "@geoalgeria/aviation";

const all = aviation.airports();                 // 36
const algiers = aviation.airportByIcao("DAAG");  // Houari Boumediene, iata "ALG"
const byIata = aviation.airportByIata("TLM");     // Tlemcen, from a flight feed
const inOran = aviation.airportsByWilaya(31);     // airports in wilaya 31

// Everything has lat/lng – distance-sort, map, or nearest-airport in a few lines.
```

## What you can build

- **Nearest-airport lookups** – coordinates on every record, ready for distance sorting.
- **ICAO/IATA ↔ airport resolution** – map either code from a flight feed, booking system, or
  timetable to a name, contacts, and a location.
- **Travel & logistics** – match a wilaya or a point to its serving airport.
- **Maps** – drop-in GeoJSON point layer for the whole civil-airport network.

## What's inside

| Dataset | Count | Notes |
| --- | --- | --- |
| Civil airports | **36** | official name, ICAO + IATA codes, address, phone, website, coordinates |
| Nonstop routes | **122** | directional legs with operator, status, evidence tier and a source |
| Planned routes | **2** | announced, not yet flying; a separate collection, never a status |

Spanning **33 wilayas**, every airport geocoded and every one carrying an IATA code.
`wilaya_code` is linked against the
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) 69-wilaya model.

Every route endpoint (both ends of every arc, foreign airports included) carries a
name in three languages: `name` (French; the Wikidata French label for foreign
airports, the ANAC house style for the Algerian ones), plus `name_en` and
`name_ar`, matched on Wikidata by IATA code and cross-checked against the
shipped coordinate. Routes
churn seasonally, so `metadata.routes_as_of` stamps the date the network was last
checked against schedules: treat it as a dated snapshot, not an evergreen fact.

33 of the 36 come from ANAC's own map. The other three, Hassi R'Mel (`HRM`), Mécheria
(`MZW`) and Laghouat (`LOO`), are absent from it and come from OurAirports, so they carry
`source: "ourairports"` and no contact fields.

## Formats

The npm package ships the **JSON** (importable directly):

```js
import airports from "@geoalgeria/aviation/data/airports.json" with { type: "json" };
// or via CDN, no install:
// https://cdn.jsdelivr.net/npm/@geoalgeria/aviation/data/airports.json
```

The loaders and record shapes are fully **typed**, TypeScript definitions ship in the package:

```ts
import aviation, { type Airport } from "@geoalgeria/aviation";
const airports: Airport[] = aviation.airports();
```

**CSV and GeoJSON** are in the repo under [`data/`](data) and bundled in every
[GitHub Release](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  airports.json            # 36 airports (array)
  metadata.json            # sources, counts, license, updated
  csv/airports.csv         # repo + Release bundle (not in npm tarball)
  geojson/airports.geojson # Point features (all 36 are geocoded)
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
  "refs": { "icao": "DAAG", "iata": "ALG" },
  "icao": "DAAG",
  "iata": "ALG",
  "address": "Alger BP 164 DAR EL BEIDA",
  "phone": "+21323199230",
  "website": "https://www.aeroportalger.dz/"
}
```

`id` is the ICAO code lowercased. `icao` always matches `DA[A-Z]{2}`. `iata` carries the IATA
code, populated on all 36 records but typed nullable so an airport without one is never a
breaking change. `wilaya_code` is zero-padded to two digits and joins GeoAlgeria's wilayas;
this dataset is wilaya-level only, so `commune_code` and `commune` are always `null`. Every
point comes straight from a source's own published coordinate, so `geo_precision` is always
`"exact"` and `geo_method` is always `"source_point"`, nothing here is a fallback or a
downgrade. `source` is a short key resolved in `metadata.sources[]`, `"anac"` or
`"ourairports"`, and `refs` duplicates the top-level `icao` and `iata`. One ANAC record
(`dabs`, Tébessa) has a `null` `phone` where ANAC lists none; the three OurAirports records
have `null` for `address`, `phone` and `website`, which OurAirports does not publish.

## Need the administrative divisions too?

If you also need wilayas, dairas, and communes to join against, use the main
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** package, it ships the full
69-wilaya division dataset that `wilaya_code` here links to. Use `@geoalgeria/aviation`
when you *only* need airport data.

## Source

Data comes from **ANAC – Autorité Nationale de l'Aviation Civile**, via the public
airports map (<https://www.anac.dz/en/carte-des-aeroports-3/>). Run `npm run fetch` to
regenerate every output from the live map; the build follows the map's iframe so an ANAC
version bump doesn't break it, and it fails loudly if the airport count or ICAO format
changes. `wilaya_code` is resolved by nearest commune centroid from the `geoalgeria`
dataset (the flagship ships centroids, not boundary polygons).

ANAC publishes only ICAO codes and omits three airports, so the same build also reads
**[OurAirports](https://ourairports.com/data/)**' public-domain `airports.csv`. IATA codes
are joined on ICAO, and because a matching code is not on its own evidence that two rows
describe the same place, every join is confirmed against ANAC's own coordinate and the
build fails on anything more than 5 km away. The observed spread is 0.31 to 2.15 km, the
far end being Ouargla (`DAUU`/`OGX`), whose OurAirports entry is named for the Ain Beida
aerodrome rather than the city.

Both upstreams are live documents, so each entry in `metadata.sources[]` carries a
`snapshot`: the URL actually fetched, the SHA-256 of its bytes, its size, and its
`Last-Modified` where the upstream publishes one. `retrieved` records when the build
asked; the snapshot records what it got. Check it yourself with
`curl -sL <snapshot.url> | shasum -a 256`. It attests rather than pins, so a changed
upstream never fails the build.

## License & attribution

Code is [MIT](LICENSE). The ANAC records are © **ANAC**, redistributed for reference and
to power [GeoAlgeria](https://geoalgeria.com); the IATA codes and the three supplementary
airports come from OurAirports, which places its data in the public domain. Verify against
ANAC for authoritative, real-time information.

[API docs & field reference →](https://geoalgeria.com/data/docs/aviation) · [Browse all packages →](https://geoalgeria.com/data)

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
