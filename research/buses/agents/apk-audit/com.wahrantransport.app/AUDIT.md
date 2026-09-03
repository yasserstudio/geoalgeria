# Wahran Transport (`com.wahrantransport.app`) static audit

Date: 2026-09-03
Method: `android-reverse-engineering` skill, Phase 0 fingerprint -> asset extraction
-> Phase 5 dex string sweep. Not executed; no credential used; no login; no
vehicle-position endpoint called.

## Answer

Second-best find of this sweep and the **only Oran source with a real stop
sequence**. The app bundles a four-file relational route catalogue as plain JSON in
`assets/`: 42 lines, 66 directional patterns, 376 stations with Arabic names, and
952 ordered pattern-stop rows. Extracted verbatim to `extracted/`, normalised to
`lines.json`.

The catch: **stations carry no coordinates.** Fields are exactly
`{stationId, name, arabicName}`. So this gives identity and ordering, not geometry -
it is the ideal join key for an OSM or survey-based geocoding pass, not a
drop-in geospatial dataset.

## Fingerprint

- **seen:** `com.wahrantransport.app`, label `Wahran Transport`, version `1.0.5`,
  version code `14`.
- **seen:** XAPK SHA-256 `372dab3c6d4572d2e525c8b714528088baf529767b1c1a87db9d0c0471a35b15`
  (17,042,948 bytes), fetched 2026-09-03 from
  `https://d.apkpure.net/b/XAPK/com.wahrantransport.app?version=latest`.
- **seen:** Framework **native Android, Kotlin + Jetpack Compose**. HTTP stack
  OkHttp, serialisation Gson, obfuscation low, Google Play Services present.
- **seen:** Social links `instagram.com/wahrantransport`,
  `web.facebook.com/profile.php?id=61591594018804`; an outbound link to
  `https://www.transtev.dz/setram` (the official Setram tram operator site).
  **inferred:** community/third-party built, endorsed-adjacent, not an operator
  publication.

## Bundled static data

`assets/` - copied verbatim to `extracted/`.

| file | rows | shape |
|---|---:|---|
| `public_lines.json` | 42 | `{lineId, name, shortName, color, mode}` |
| `public_patterns.json` | 66 | `{patternId, lineId, name, direction}` |
| `public_pattern_stops.json` | 952 | `{patternId, stationId, sequence}` |
| `public_stations.json` | 376 | `{stationId, name, arabicName}` |

- **seen:** `mode` splits 63 bus patterns / 1 tram / 2 gondola (the Oran
  téléphérique). Filter on `mode == "bus"` before importing.
- **seen:** ids are readable slugs (`ln_ligne-10`, `pt_ligne-101_place-mokrani-ex-valero-cnl-millenium`,
  `st_place-mokrani-ex-valero`), so line/pattern/stop joins are exact, not fuzzy.
- **seen:** pattern names encode both termini but the separator arrow is stored as a
  literal `?` (mojibake of an en-dash/arrow):
  `"Place Mokrani (ex Valero) ? CNL Millenium"`. `lines.json` normalises it to `->`
  and splits termini on it.
- **seen:** `direction` is `outbound`/`inbound`, so both directions of a line are
  present as separate patterns.
- **seen:** some station names are self-flagged as imprecise, e.g.
  `"AADL Ain Beida (approx)"`.

## Tier 1 - endpoint inventory

| Host | Method | Path | Auth | Source |
|---|---|---|---|---|
| `wahran-route-api.wahrantransport.workers.dev` | GET | `/catalog` | **required** (401 without) | `classes.dex` |
| `wahran-route-api.wahrantransport.workers.dev` | GET | `/config` | ? | `classes.dex` |
| `wahran-route-api.wahrantransport.workers.dev` | GET | `/public/active-vehicles` | ? | `classes.dex` |
| `wahran-route-api.wahrantransport.workers.dev` | POST | `/analytics`, `/stop-feedback` | ? | `classes.dex` |
| `wahran-receveur-api.wahrantransport.workers.dev` | ? | ? | ? | `classes.dex` (conductor app backend) |
| `tiles.openfreemap.org` | GET | `/styles/bright` | none | basemap |

`/public/active-vehicles` is live vehicle positions - **not called**.

### Network request log

One read-only unauthenticated GET, to the endpoint that clearly serves the static
catalogue:

| URL | Time (UTC) | Status | Bytes | Response SHA-256 |
|---|---|---|---:|---|
| `https://wahran-route-api.wahrantransport.workers.dev/catalog` | 2026-09-03T16:08:12Z | **401** | 25 | `32331e5e168b17fa39ee4fc997d649f4b2244a0c0ea72f0cde49aa526b3a5c0f` |

Body: `{"error":"Unauthorized."}`, saved at `extracted/response_catalog_401.json`.
The app ships a key for this; it was **not** used. The bundled `assets/public_*.json`
are presumably a snapshot of the same catalogue, which is why the 401 costs nothing.

## Licence / terms strings seen

- `https://www.openstreetmap.org/copyright`, Mapbox attribution URLs, OpenFreeMap
  tiles.
- **not seen:** any licence or redistribution statement covering the bundled route
  catalogue. Same conclusion as `dz.etu.bus`: identity established, redistribution
  rights not established.

## `lines.json`

66 records, one per **pattern** (direction), covering 42 distinct lines. Every record
has an ordered `stops[]` with `{stationId, name, name_ar, sequence}`.
`has_geometry: false` on all of them - there is no shape in this app.
