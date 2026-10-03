# ETUSA MOB (`dz.etusa.etusa_mob`) static audit

Date: 2026-09-03. Static inspection only; not executed, no credential used, no
login performed.

## Answer

**No bundled line or stop data** - assets are icons, images and fonts only. But this
is the **official ETUSA Algiers client**, and its `libapp.so` names a complete,
purpose-built network API including a line-drawing endpoint. That API is the single
best lead for authoritative Algiers line geometry, better than the OSM-derived
Algiers files in `dz.etu.bus`.

## Fingerprint

- **seen:** `dz.etusa.etusa_mob`, label `ETUSA MOB`, version `1.0.0`, code `24`.
  XAPK SHA-256 `5f035f073cc62cd544d1c22e9f6b664d3045304d36ae4d7d9e2fec3069c5c78d`
  (22,404,006 bytes), fetched 2026-09-03 from `d.apkpure.net`.
- **seen:** Framework **Flutter**, `lib/armeabi-v7a/libapp.so` 8.3 MB.
- **seen:** Official social/identity strings: `https://etusa.dz/`,
  `facebook.com/etusa.alger.bus`, `instagram.com/etusanavigui`. **inferred:** genuine
  operator app, so anything its API returns carries real `evidence_type: official`
  weight - unlike the third-party apps above.
- **seen:** `assets/flutter_assets/assets/` holds only `icons/`, `images/`
  (including `Consignes De Sécurité1.jpg`) and `fonts/`. No data directory.

## Tier 1 - endpoint inventory

All host `etusaapi.streamsystem.com`, all **seen** as full URLs in `libapp.so`.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/signin`, `/auth/signup` | none -> token | not touched |
| GET | `/reseau/arret` | ? | **stop list** - the static-data endpoint |
| GET | `/reseau/arretwithligne` | ? | **stops joined to lines** - the highest-value one |
| GET | `/reseau/drawofligne2` | ? | **line geometry** ("draw of ligne") |
| GET | `/reseau/horaire` | ? | timetables |
| GET | `/recherche/arret`, `/recherche/search`, `/recherche/closestarret`, `/recherche/searchposarret` | ? | search |
| POST | `/favori/itinerary`, `/reclamation/add`, `/notification`, `/client/delete/` | bearer | user data, not touched |
| GET | `https://bomarecompany.com/ETUSAAPIII/pub.jpg` | none | in-app ad image |

Dart model names seen: `Arret`, `Arret.fromJson`, `arret1`/`arret2`, `ligne`,
`lignes`, `Arrets from GetStation`.

### Network request log

| URL | Time (UTC) | Status | Note |
|---|---|---|---|
| `https://etusaapi.streamsystem.com/reseau/arret` | 2026-09-03T16:08:12Z | **failed** | `curl (60)`: server TLS **certificate has expired**. Verification was **not** disabled and the request was not retried insecurely. |

## Follow-up owed

`/reseau/arret`, `/reseau/arretwithligne` and `/reseau/drawofligne2` are exactly the
static line/stop/shape surface `@geoalgeria/buses` wants, from the actual operator.
Blocked only by an expired certificate on the operator's side. Worth (a) retrying
later, and (b) mentioning the expired cert if ETUSA is ever contacted - it is a real
bug in their production API, and a useful opening.

## Licence / terms

None seen covering transit data.
