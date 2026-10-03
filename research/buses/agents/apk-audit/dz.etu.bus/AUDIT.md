# ETUS Bus (`dz.etu.bus`) static audit

Date: 2026-09-03
Method: `android-reverse-engineering` skill, Phase 0 fingerprint -> Flutter path
(`strings` on `libapp.so`) -> asset extraction. The app was never executed, no
embedded token or credential was used, no login was performed, and no
tracking/position endpoint was called.

`seen` = directly observed in the package. `inferred` = a conclusion drawn from it.

## Answer

This is the one Algerian bus app found so far that **ships a bundled line and stop
dataset**. 13 cities of line geometry and stop lists sit in
`assets/flutter_assets/assets/data/` as plain GeoJSON/JSON: 215 line features
(LineString geometry on every one) and 2,377 stop features. They are extracted
verbatim under `extracted/data/` and normalised into `lines.json`.

Two caveats that matter for the open-data package:

- **inferred:** the data looks OSM-derived, not operator-authored. Line names are in
  OpenStreetMap route-relation form (`"Bus: Chevalley -> Souidania"`), refs match OSM
  `ref` values including the messy ones (`3018`, `26/412`, `خط رقم`), and the app
  credits `OpenStreetMap contributors` with `tile.openstreetmap.org` as its basemap.
  So `evidence_type: official` records **where it was published**, not that an
  operator authored it. Treat it as a strong cross-check against our own OSM pull
  rather than as an independent authority.
- **seen:** the publisher is `Ambs Inc` (`findapply.com`, `admin@findapply.com`),
  not an ETUS operator. No ETUS entity is named as publisher, and no licence or
  terms-of-use string appears anywhere in the package beyond the Flutter/OSS
  `NOTICES.Z` and the OSM attribution.

## Fingerprint

- **seen:** `dz.etu.bus`, label `ETU Bus` / Play title `ETUS Bus`, version `1.6.1`,
  version code `24`, min SDK 32, target SDK 36.
- **seen:** XAPK SHA-256 `e546049b17011f81f3bdb85fff1d10ca08657d3b91523d20da04b3a4e79dacdc`
  (`ETUS Bus_1.6.1_APKPure.xapk`, 34,683,268 bytes), fetched 2026-09-03 from
  `https://d.apkpure.net/b/XAPK/dz.etu.bus?version=latest`. Splits: `base`,
  `config.arm64_v8a`, `config.en`, `config.mdpi`, `config.zh`.
- **seen:** Framework **Flutter** (`libflutter.so` + AOT `libapp.so`, 8.4 MB).
  Obfuscation low. Firebase + Google Play Services present. Java side is the
  standard Flutter shim; no `BuildConfig` constants and no host strings in the dex.
- **seen:** Permissions include `INTERNET`, fine/coarse location, `CAMERA`,
  notifications, `CHECK_LICENSE`.
- **seen:** The Dart package name inside `libapp.so` is **`cirta_bus`** (every source
  path is `package:cirta_bus/...`). **inferred:** ETUS Bus is the multi-city rebuild
  of a Constantine-first codebase, which is why Constantine appears in the asset set.
- **seen:** A `config.zh` (Chinese) split ships. Unremarkable in itself, but noted:
  no Arabic or French split, while the UI strings and fonts (DroidKufi) are AR/FR.

## Bundled static data (the actual prize)

`assets/flutter_assets/assets/data/` - copied verbatim to `extracted/data/`.

| city_id | lines.geojson | lines.json | stops.geojson | stops.json |
|---|---:|---:|---:|---:|
| algiers | 55 | 55 | 1219 | 1219 |
| biskra | 9 | 9 | 116 | - |
| blida | 13 | - | 157 | - |
| constantine | 9 | - | 0 (empty FeatureCollection) | - |
| ghardaia | 4 | - | 3 | - |
| jijel | 18 | - | 59 | - |
| mila | 21 | - | 0 (empty FeatureCollection) | - |
| oran | 13 | 2 | 5 | - |
| ouargla | 12 | - | 224 | - |
| saida | 7 | - | 92 | - |
| taref (El Tarf) | 9 | - | 96 | - |
| tiaret | 37 | 9 | 288 | - |
| tlemcen | 8 | - | 118 | - |
| **total** | **215** | **75** | **2377** | **1219** |

Shapes:

- `<city>_lines.geojson` - `FeatureCollection` of `LineString`s. Properties:
  `city_id`, `ref`, `name`, `name_ar`, `color`, `stop_ids[]`.
  `stop_ids` are synthetic coordinate keys, `"<city>:stop:<lat.5f>:<lon.5f>"`.
- `<city>_lines.json` (only algiers/biskra/oran/tiaret) - array of
  `{ref, colour, directions[{name, name_ar, from, to, colour, stops[{lat,lon,name,name_ar}]}]}`.
  This is where explicit `from`/`to` termini live.
- `<city>_stops.geojson` - `Point` features, properties `city_id`, `name_fr`,
  `name_ar`, `route_ids[]` (always empty in this build), `active`.
- `algiers_stops.json` - richer: `{nom, nom_ar, commune, commune_ar, lat, lon}`,
  i.e. the only file that carries a commune per stop.

Quality notes, all **seen**:

- `stop_ids` resolve against the same city's `stops.geojson` at 5-decimal precision
  for **1,686 of 1,989** references (85%). Algiers is the worst offender (749/995).
  Five cities (constantine, jijel, mila, oran, tiaret) carry **no** `stop_ids` at all,
  so their lines have geometry but no stop sequence.
- `constantine_stops.geojson` and `mila_stops.geojson` are literally
  `{"type":"FeatureCollection","features":[]}` - 43 bytes.
- `name` and `name_ar` are frequently identical (the Latin name copied into the
  Arabic field), and many `stops[].name` in `*_lines.json` are empty strings.
- Refs are unnormalised: Algiers mixes `03`, `1241`, `3018`, `1600`; Tiaret uses
  `26/412`-style OSM relation refs; El Tarf/Ouargla/Mila refs are raw Arabic
  fragments (`خط رقم`, `43-01 ال`). Any import needs a per-city ref cleanup.

## Tier 1 - endpoint inventory

Extracted from `libapp.so` strings. `/lines`, `/settings`, `/wallet`, `/alerts`,
`/splash`, `/admin/*` are **in-app go_router paths, not HTTP paths** - do not mistake
them for an API.

| Host | Method | Path | Auth | Source |
|---|---|---|---|---|
| `api-etus.findapply.com` | POST | `/auth/login` | none -> token | `libapp.so` |
| `api-etus.findapply.com` | POST | `/auth/google` | Google idToken | `libapp.so` |
| `api-etus.findapply.com` | POST | `/user/login` | none -> token | `libapp.so` |
| `api-etus.findapply.com` | POST | `/user/register` | none | `libapp.so` |
| `api-etus.findapply.com` | ? | `/trip/track` | bearer | `libapp.so` |
| `api-etus.findapply.com` | ? | `/trip/eta` | bearer | `libapp.so` |
| `api-etus.findapply.com` | ? | `/trip/assign` | bearer | `libapp.so` |
| `api-etus.findapply.com` | ? | `/replay/start` `/replay/status` `/replay/stop` | bearer | `libapp.so` |
| `api-etus.findapply.com` | POST | `/analytics/events` | ? | `libapp.so` |
| `*.malimspotter.dz` (see below) | GET | `/api/devices`, `/api/positions`, `/api/geofences`, `/api/session` | Traccar session/basic | `traccar_api_client.dart`, `traccar_ws_client.dart` |
| `gps.etusoran.dz` | " | " | " | `libapp.so` |
| `gps.etus-tiaret.dz` | " | " | " | `libapp.so` |
| `173.212.241.70` | GET | `/maps/`, `:7789` | none | `libapp.so` |
| `tile.openstreetmap.org` | GET | `/{z}/{x}/{y}.png` | none | basemap |

Per-wilaya Traccar backends, all **seen** verbatim in `libapp.so` - this is the most
reusable finding in the package, it names the live-GPS host for 15 networks:

```
bus.malimspotter.dz        gps.malimspotter.dz        epic.malimspotter.dz
setifbus.malimspotter.dz   bejaiabus.malimspotter.dz  djelfabus.malimspotter.dz
msilabus.malimspotter.dz   tipazabus.malimspotter.dz
bus-annaba.malimspotter.dz bus-chlef.malimspotter.dz  bus-guelma.malimspotter.dz
bus-mascara.malimspotter.dz bus-medea.malimspotter.dz bus-relizane.malimspotter.dz
gps.etusoran.dz            gps.etus-tiaret.dz
```

**No request was made to any of these.** They are Traccar (`/api/devices`,
`/api/positions`, `/api/session`) - vehicle-tracking, explicitly out of scope.

**No HTTP endpoint in this app serves a static line or stop list**, so the one
permitted read-only GET was not spent here. Everything static is already bundled.

## Dart source map (from `libapp.so`)

Useful for a later pass. `core/config/city_config.dart` + `city_repository.dart`
hold the city -> backend mapping; `core/constants/line_names.dart` holds line
labels; `domain/usecases/build_network.dart` + `plan_journey.dart` build the graph
from the bundled assets; `data/sources/remote/` holds `traccar_api_client`,
`traccar_ws_client`, `cirtabus_positions_client`, `monitor_api_client`,
`pay_api_client`. There is a full wallet/QR fare path
(`pay_wallet_screen`, `pay_qr_generator`, `/pay/conductor/scan`,
`/pay/wallet/sync`) - payments, not touched.

## Licence / terms strings seen

- `OpenStreetMap contributors` + `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
  (basemap attribution).
- `https://www.findapply.com` (publisher site), `https://etus.findapply.com`.
- Flutter/Dart OSS licence blob `NOTICES.Z`.
- **not seen:** any licence, terms-of-use, or redistribution statement covering the
  bundled route/stop data itself. Publishing it in `@geoalgeria/buses` needs either
  an OSM-provenance argument (ODbL, if the derivation is confirmed) or operator
  permission. Do not assume it is free to redistribute.

## `lines.json`

215 records, one per line feature. 89 have both termini resolved (from
`*_lines.json` `from`/`to`, else parsed out of the `"Bus: A -> B"` name); 113 carry a
stop sequence. Unresolvable `stop_ids` are kept as
`{"stop_id": ..., "unresolved": true}` rather than dropped, so the loss is visible.
