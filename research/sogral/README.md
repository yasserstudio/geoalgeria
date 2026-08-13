# SOGRAL / MAHATATI departure research

Local research material for the public MAHATATI live-departure page operated by
EPE SOGRAL Spa. This is deliberately **not** an `@geoalgeria` package and does
not feed the public Atlas or npm. The web app may read the ignored receipt only
for its development-only `/departures` preview; the route and its API return
404 in production. The research lets us inspect the public surface, compare its
stations to `@geoalgeria/gares-routieres`, and prepare a properly licensed
integration if SOGRAL provides one.

## What the public page exposes

`https://mahatati.sogral.com/` is a no-login live-departure page. Its HTML
contains the SOGRAL departure-station list. The page's own JavaScript calls
these unauthenticated endpoints:

| Surface | Endpoint | Data observed | Volatility |
| --- | --- | --- | --- |
| Network counter | `/api/live/summary` | planned, open, completed and cancelled departures; reservations | live |
| Station counter | `/api/live/summary/{agencyId}` | the same counters for one departure station | live |
| Served destinations | `/api/live/destinations/{agencyId}` | destination identifier, name and Wilaya | changes with service |
| Route detail | `/api/live/departures/infos/route/{agencyId}/{headOfLineId}/{routeId}` | ordered stops, commune, Wilaya, fare, segment distance (`P4`) and estimated segment duration (`P5`, H.MM) | changes with service |

The search results themselves are submitted through the HTML form and include
departure date/time, head of line, operator, zone, seat availability and state.
The local collector first proves the anti-forgery form flow against one known
pair, then visits the station/destination matrix sequentially with a delay. It
is research tooling, not a public integration or a promise that the source will
remain stable.

## Source terminology

Use these source labels consistently in research notes and translate them
plainly in user-facing copy. The brand wording is `SOGRAL — Le plaisir de
voyager`.

| SOGRAL label | Meaning / use |
| --- | --- |
| `Départs en temps réel` | The live-departures service. A captured result is always a dated snapshot, never a timetable. |
| `Gare routière de départ` | Departure station search field. |
| `Destination` | Destination search field. |
| `Date de départ` / `Période` | Departure-date and day-period filters. `Indéterminée` means no period filter. |
| `Tête de ligne` | The service table's source field; retain the French term when quoting it instead of guessing a broader meaning. |
| `Transporteur` | Transporter/operator field. |
| `Date/Heure de départ` | Scheduled departure date and time in a returned observation. |
| `N° Zone` | Departure-zone number. |
| `Disponible / Total` | Available places over vehicle total; not a booking guarantee. |
| `État` | Departure state. Observed values include `Ouvert` (Open), `Assuré` (Confirmed) and `Annulé` (Cancelled). Preserve unrecognised values verbatim. |
| `Prix billet` | Stop-level fare in Algerian dinars (DA). |
| `Estimer la distance et la durée du parcours` | Google Maps road-driving estimate, not a published coach duration. |

## Capture policy

- Run `node scrape-mahatati.mjs --write` to save a fresh local snapshot as
  `mahatati-live.json`. It captures the station list and global live summary.
- Add `--destinations` to also collect the station-to-destination matrix. The
  script uses a small sequential delay and captures no passenger-level data.
- Run `node scrape-mahatati.mjs --status` to validate the saved matrix without
  making a network request. It reports the retrieval time, age, station count
  and pair count; the same seven-day freshness rule used by the collectors
  applies unless `--allow-stale-matrix` is explicit.
- `mahatati-search-latest.json` is a separate local point-in-time search
  snapshot. It holds the selected origin/destination/date and the returned
  departures, including status and seat availability. Do not merge it into the
  station snapshot: it is much more volatile.
- `collect-schedules.mjs` is resumable collection for a single service date.
  First run `node collect-schedules.mjs --date YYYY-MM-DD --probe`; it must
  successfully return the known ADRAR → ALGER example before the matrix is
  allowed. Then use `--run` (or `--run --limit N`) to visit the station-
  destination matrix one request at a time. Both its data and checkpoints are
  local and ignored by git. Failed requests are logged as failures, never
  interpreted as no scheduled service.
- Run `node collect-schedules.mjs --date YYYY-MM-DD --status` at any time to
  audit matrix freshness, completed and pending pairs, unresolved failures,
  the last successful check and whether an interrupted capture has stalled.
  The collector refuses a destination matrix older than seven days unless the
  research-only `--allow-stale-matrix` override is supplied explicitly.
- After schedule capture, run `node collect-itineraries.mjs --date YYYY-MM-DD
  --probe`, then `node collect-itineraries.mjs --date YYYY-MM-DD --run`. It
  visits each unique observed `(agency, head of line, route variant)` once and
  stores the ordered route detail in a separate ignored checkpoint. `--limit N`
  supports bounded runs; `--key agency:headOfLine:route` targets one observed
  variant for verification.
- `node collect-itineraries.mjs --date YYYY-MM-DD --status` reports captured,
  pending and failed route variants without making a network request. Recovered
  failures are removed from the checkpoint, and a collector lock prevents two
  processes from replacing the same checkpoint concurrently.
- Checkpoints are replaced atomically so local readers see either the previous
  complete observation or the next complete observation, never a half-written
  JSON document. Readers retain their last valid snapshot for compatibility
  with checkpoints produced by an older collector process.
- Collector arguments, matrix keys, checkpoint keys and check timestamps are
  validated before a resumed run can write. A malformed, duplicate or
  internally inconsistent checkpoint fails loud rather than being treated as
  a partial or empty service result.
- `mahatati-live.json` is local working material, ignored by git. It must not
  be copied into a public package, CDN asset, or app response.
- A capture is a timestamped observation, **not a timetable**. Availability,
  fares, cancellation status and summary counters can change at any time.
- The page footer says `Copyright © 2021 EPE SOGRAL Spa — Tous droits
  réservés`. Until SOGRAL grants reuse rights or provides a licensed API/GTFS
  feed, we may use this only for research and an outbound link to MAHATATI.

## Time and duration boundary

MAHATATI shows scheduled **departure times** in its search results. Its
"Distance et durée de parcours" panel is calculated client-side with Google
Maps in `DRIVING` mode. That is a road-driving estimate, not a published bus
arrival time, so it must never be displayed as a timetable claim. Separately,
the official route-detail response carries per-segment distance (`P4`) and an
estimated duration (`P5`, encoded as H.MM). The app may accumulate those
source estimates through the searched destination and label the result
**Estimated duration**. It omits the value if a segment is zero/missing and
never derives an arrival time. It also suppresses totals over 48 hours or paths
over 3,000 km: the audit found Google place-name mismatches that sent nearby
stops thousands of kilometres away (for example Guelma → Oum El Bouaghi).
The source estimate may differ from the Google value MAHATATI recalculates in
the browser.

## Approved user-facing copy contract

Use two distinct modes. Never let a cached operational observation read like a
permanent timetable.

| Data type | Label | Required freshness copy |
| --- | --- | --- |
| Stable network information | `Route information` | `Source: SOGRAL. Last reviewed {date}.` |
| Live departure time, status or fare | `Live departure snapshot` | `Recorded {date}.` (Algiers calendar date) followed by the state line below |

For a route result, one provenance banner leads the card and carries the
MAHATATI handoff as the card's primary action. The observation date is shown
without a clock time: the state line already says times will have changed,
and the exact check timestamp stays in the private capture.

> Recorded {date}.  
> Within the freshness window: Departure times and states can change.  
> Past it: Departure times and states will have changed since then.  
> [Check current departures on MAHATATI]

Under the departure table:

> Source: SOGRAL MAHATATI. For the latest departures, fares, and booking,
> check MAHATATI.

The observation date (Algiers calendar day) is mandatory; the exact check
time stays in the private capture. The map/network layer remains separate
from live booking information. Although the private
capture retains `Disponible / Total` for source research, the app must not show
that value: a dated snapshot cannot guarantee current seat availability.

## Current local receipt (2026-08-12)

The completed ignored receipt is useful for development verification only:

| Stage | Complete | Pending | Unresolved failures |
| --- | ---: | ---: | ---: |
| Station/destination searches | 9,077 / 9,077 | 0 | 0 |
| Observed itinerary variants | 1,268 / 1,268 | 0 | 0 |

Of the 9,077 searches, 3,990 returned at least one departure, for 25,959
captured departure rows. These counts describe what the public form returned
for that date and check window. They do not establish a complete timetable,
permanent route coverage, current availability or permission to redistribute.

## Relation to the transport work

- `@geoalgeria/buses` is for urban/suburban network geometry, starting with
  ETUSA in Algiers. Its OSM-based rebuild can show lines and stops, but has no
  timetable/frequency data.
- SOGRAL is intercity bus infrastructure and service. Its stations already
  belong in `@geoalgeria/gares-routieres`; live departures belong here until
  an explicit licence exists.
- The useful product link is: a station or route panel can direct a traveller
  to MAHATATI for current departures and booking, while making no cached
  schedule promise.

## Next legitimate step

Ask SOGRAL (`contact@sogral.dz`) for a documented, redistributable feed,
preferably GTFS or GTFS-Realtime. The page already proves their back end has
the underlying station, route, stop, fare and live-status data; the missing
piece is permission and a stable public contract.
