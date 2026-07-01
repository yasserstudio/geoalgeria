# @geoalgeria/gares-routieres — sources (intercity bus stations)

> **Canonical package:** `@geoalgeria/gares-routieres` (domain-named, per
> `.agents/NAMING.md`). **Source/operator:** SOGRAL — credited in `metadata.source`
> + README, discoverable via **keywords** (`sogral`, `gare-routiere`, `bus`,
> `autocar`, `interurbain`). *Not* named `@geoalgeria/sogral` — same reason ANAC's
> airports ship as `aviation`, not `anac`.

Transport sector, domain-named sibling to `aviation` and `ferroviaire`. **SOGRAL**
— *EPE SOGRAL Spa, Société de Gestion des Gares Routières d'Algérie* — is the state
company that operates Algeria's intercity road-bus stations (the authoritative
*source*). Surfaced by the user 2026-07-01 (live departures board + Arabic agency
listing).

Two sources: a **working JSON API** (the anchor) and the **Joomla website**
(bilingual names + detail pages). Note `www.sogral.com` currently 500s across the
board; the live subdomain and the `.dz` site are up.

## 1. Primary source — `live.sogral.com` JSON API (authoritative anchor)

Public, **unauthenticated** REST API behind the real-time departures board at
`https://live.sogral.com/`. No key, no token, CORS-open. Values in the
summary/departures endpoints are live (change through the day); the agency
registry is effectively static.

### Endpoints
- **`GET /api/live/agencies`** — the registry. **74 stations**, full attributes
  (`P1..P91`, see dictionary). Coordinates present on 71/74. *This is the dataset.*
- `GET /api/live/summary` — national real-time totals
  (`numberOfSchedulesDepartures`, `…Opened`, `…Closed`, `…Canceled`,
  `numberOfPassengers`, `rateOfOccupancy`). `…/summary/{agencyId}` per station.
- `GET /api/live/destinations/{agencyId}` — reachable destinations from a station:
  `[{P1: routeKey "213-000CCCTTT", P2: commune, P4: wilayaCode, P5: wilayaName,
  S1: "commune, wilaya"}]`. Alger alone returns **458** destinations.
- `GET /api/live/departures/infos/route/{agencyId}/{headOfLineId}/{routeId}` —
  per-route itinerary legs with commune / wilaya / **ticket price** (`S6` in DA).

Saved artifacts: `sogral-agencies-raw.json` (registry, verbatim),
`sample-destinations-alger.json` (route-network example).

## 2. Secondary source — `sogral.dz` (Joomla) — bilingual names + detail pages

- FR listing: `https://sogral.dz/index.php/fr/nos-agences`
- AR listing: `https://sogral.dz/index.php/ar/وكالاتنا`
- Per-station detail: `…/nos-agences/28-nos-agences/{joomlaId}-{slug}` (FR),
  `…/وكالاتنا/35-وكالاتنا/{joomlaId}-{slug}` (AR).

Used only for **Arabic (and confirming French) station names**. Caveats: FR and AR
use **separate `joomla_id` spaces** (no shared join key), and the CMS has data
errors (e.g. the `219-skikda` slug is labelled *ADRAR*). Detail pages render most
metrics via AJAX, so the static HTML is sparse. Names captured in
`sogral-dz-names.json` (FR ×66, AR ×53) as a reference for build-time matching.

## Field dictionary — `/api/live/agencies`

**Confirmed** (verified against records + the public detail pages):

| Key | Meaning | Example |
| --- | --- | --- |
| `P1`  | Station id (primary key; = `AgencyId` in the search form) | `1` |
| `P2`  | Station **display name** — distinguishes multiple stations per city | `CONSTANTINE - ALI MENDJILI` |
| `P3`  | Official gare name | `Gare routière Ali Mendjeli` |
| `P4`  | Postal address | `Avenue de L'ALN B.P n°412 – 16040 – Hussein Dey (Alger)` |
| `P8`  | Wilaya code — **legacy 48-wilaya scheme** (see reconciliation) | `16` |
| `P9`  | Total surface area (string) | `13000 M²` |
| `P10` | Built / covered surface (string) | `8000 M²` |
| `P23` / `P24` | Two dates — creation & commissioning (order is inconsistent) | `1994-08-16` |
| `P26` / `P27` | Latitude / longitude (WGS84) | `36.7425`, `3.108` |
| `P46` | Administrative contacts (wilaya / transport directorate) | free text |
| `P47` | Emergency / hospital contacts | free text |
| `P84` | SOGRAL location code `213-000{wilaya:2}{commune:3}` | `213-000016000` |
| `P90` | City name (uppercase Latin; **not** unique) | `CONSTANTINE` |
| `P91` | **Parent wilaya** name, accented (not the station!) | `Djelfa` for Aïn Oussera |

**Candidate — operational metrics** (`P11`–`P22`, `P25`). Numeric counts. The
public agency pages label this family as: *nombre de quais* (platforms),
*guichets* (ticket windows), *boutiques*, *bureaux*, *grande / moyenne / petite
ligne* (long/medium/short-distance lines), *taxi inter-wilaya*, *taxi collectif*,
*nombre de départs par jour*, *nombre de voyageurs par jour*. Exact per-index
mapping is **unconfirmed** (2019 archive values no longer match the live API and
`sogral.com` is down). Preserved verbatim under `metrics`; some values are dirty
(e.g. a negative). Resolve at build time via a live browser session on `sogral.dz`.

**Candidate — amenity flags** (`P28`–`P44`, excluding contacts `P46`/`P47`).
Booleans = per-station facilities (parking, mosque, café, restaurant, ATM, wifi,
etc.); exact per-index labels **TBD**. Preserved under `amenities` (true-only).

## Cleaned dataset — `sogral-stations-clean.json` (74)

Transform: `scripts/clean-sogral.mjs` (kept in scratchpad; local research only).
High-confidence fields promoted to named keys; uncertain fields grouped and
preserved. Shape:

```jsonc
{
  "id": 1,
  "sogral_code": "213-000016000",
  "name": "ALGER",                       // P2 — station display name
  "city": "ALGER",                       // P90
  "official_name": "La gare routière des Grands Invalides…", // P3
  "address": "Avenue de L'ALN…",         // P4
  "wilaya_code": "16",                   // P8 (SOGRAL legacy — needs remap)
  "wilaya_name": "Alger",                // P91
  "lat": 36.7425, "lng": 3.108, "geo_precision": "exact", // P26/P27, null if invalid
  "surface_total_m2": 13000, "surface_built_m2": 8000,    // parsed P9/P10
  "dates": { "p23": "1994-08-16", "p24": "1994-03-31" },
  "metrics": { "P11": 120, … },          // raw operational counts
  "amenities": { "P28": true, … },       // raw facility flags (true-only)
  "contacts": { "administrative": "…", "emergency": "…" },
  "data_flags": [],                      // e.g. coords_invalid / coords_missing / P17_negative
  "source": "https://live.sogral.com/api/live/agencies"
}
```

Coverage: **74 stations across 42 of 58 wilayas** (some cities have 2–3 stations,
e.g. Constantine ×3, Aïn Témouchent ×2). Every station has surfaces + a code.

## Data-quality notes

- **Bad/missing coordinates (3):** `GUELMA` (lat 0.215, no lng), `TOUGGOURT`
  (1.545, 21.0 — clearly wrong), `DJANET` (none). Geocode from OSM / the sogral.dz
  Google-Maps embeds at build time.
- **Legacy wilaya coding (`P8`):** pre-2019 48-wilaya scheme. Stations in the 10
  post-2019 wilayas are filed under their **old parents** — e.g. Touggourt →
  Ouargla (30, now 55), Djanet → Illizi (33, now 56), In Amenas → Illizi (33),
  Ouled Djellal → Biskra (7, now 51), Timimoun/Adrar (now 49). Remap to the
  geoalgeria 58/69 model and spatial-join the commune at build time.
- **No Arabic in the API** (`Accept-Language` ignored) — see bilingual plan.
- **CMS name errors** on sogral.dz (mismatched slugs/labels) — don't trust blindly.

## Bilingual plan

The live API is French/Latin only. For `name_fr` / `name_ar` (geoalgeria
convention): take `name_fr` from the API (`P2`/`P90`); derive `name_ar` by
matching the API set to `sogral-dz-names.json` by normalized Latin name, and for
capital stations reuse the **geoalgeria wilaya Arabic names** (already in the base
package). Flag the handful of non-capital towns for manual confirmation.

## Licensing

Data © **EPE SOGRAL Spa** (sogral.dz); redistributed for reference, same posture
as the other packages. Endpoints are public and unauthenticated. Credit SOGRAL.

## Build pipeline (proposed — when greenlit; do **not** build yet)

1. Pull `/api/live/agencies` → 74 records.
2. Map `P*` → clean schema (mirror `sogral-stations-clean.json`).
3. Geocode the 3 bad/missing coords (OSM / sogral.dz map embeds).
4. Reconcile `P8` → geoalgeria 58/69 wilaya; spatial-join commune (centroid,
   `mosquees` pattern); keep raw + flagship codes.
5. Add `name_ar` (bilingual plan). Decode `metrics`/`amenities` labels via a live
   `sogral.dz` session; rename or drop the unmapped ones.
6. Emit JSON / CSV / GeoJSON + `metadata.json`; mirror the `@geoalgeria/aviation`
   shape (operator-named, single authoritative owner).
7. *Optional second layer* — the **route network** (`destinations` per station,
   with fares from `departures`). Rich, but partly dynamic; likely document the
   API rather than freeze it into a static dataset.

Roadmap home: new **Transport** sector, alongside `@geoalgeria/ferroviaire`
(rail), `ports`, `frontieres`.
