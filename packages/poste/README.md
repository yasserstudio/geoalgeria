# @geoalgeria/poste

Algeria **post offices** and **ATMs** with real postal codes, bilingual
(French / Arabic) names, geographic coordinates, and commune/wilaya linkage.

| Dataset | Count | Notes |
| --- | --- | --- |
| Post offices | **3,908** | each with its own postal code (`cp`) |
| ATMs | **2,026** | Algérie Poste GAB network |
| Distinct postal codes | **3,908** | one per office |

## Source

Data is sourced from **Algérie Poste** via the public BaridiMap API
(<https://baridimap.poste.dz>):

- `GET https://baridimap-api.poste.dz/api/postoffices`
- `GET https://baridimap-api.poste.dz/api/atms`

Run `npm run fetch` (or `node scripts/fetch.mjs`) to regenerate every output
from the live API. The same run also mirrors the data into the sibling
`geoalgeria` package at `packages/dataset/data/poste/`, so the two never drift —
this package is the canonical source. Re-fetch periodically — Algérie Poste
updates offices and, eventually, the post-2025 wilaya reorganization (BaridiMap
currently still files offices under the 58-wilaya scheme, so new wilayas 59–69
appear under their mother wilaya).

## Files

```
data/
  postoffices.json          # 3908 offices (array)
  atms.json                 # 2026 ATMs (array)
  metadata.json             # source, counts, generated_at
  csv/postoffices.csv
  csv/atms.csv
  geojson/postoffices.geojson   # Point features (offices with coordinates)
  geojson/atms.geojson
```

> GeoJSON files include only records that have coordinates — a handful of
> offices and ATMs report no `lat`/`lng` and are omitted from the GeoJSON
> outputs (but remain in the JSON/CSV). ATM records have no `commune_code`
> (the source API does not provide one).

## Record shapes

**Post office**

```json
{
  "id": 1,
  "name": "ADRAR RP",
  "name_ar": "أدرار م ر",
  "class": "CE",
  "postal_code": "01000",
  "postal_code_old": null,
  "address": "ADRAR CENTRE RUE DES MARYTIM",
  "commune_code": "0101",
  "commune_fr": "ADRAR",
  "commune_ar": "أدرار",
  "wilaya_code": "01",
  "wilaya_fr": "ADRAR",
  "wilaya_ar": "أدرار",
  "lat": 27.8708439,
  "lng": -0.2871417
}
```

`class` is the office category (`CE`, `R1`–`R4`, `HC`, `GA`). `commune_code`
is Algérie Poste's 4-digit commune code, which joins to GeoAlgeria's
`code_commune` field.

**ATM**

```json
{
  "id": "1165",
  "name": "AOULEF",
  "status": "1",
  "postal_code": "01003",
  "postal_code_old": null,
  "address": null,
  "commune_fr": "AOULEF",
  "commune_ar": "أولف",
  "wilaya_code": "01",
  "wilaya_fr": "ADRAR",
  "wilaya_ar": "أدرار",
  "lat": 26.9728317,
  "lng": 1.07709
}
```

## Usage

```js
import poste from "@geoalgeria/poste";

const offices = poste.postOffices();      // 3908
const banks = poste.atms();               // 2026

// All post offices in a commune (joins GeoAlgeria code_commune -> commune_code)
const inCommune = offices.filter((o) => o.commune_code === "1731");
```

Or load a specific format directly: `@geoalgeria/poste/data/geojson/atms.geojson`.

## License & attribution

Code is MIT. The underlying data is © **Algérie Poste** and is redistributed
here for reference and to power [GeoAlgeria](https://geoalgeria.com). Verify
against Algérie Poste for authoritative, real-time information.
