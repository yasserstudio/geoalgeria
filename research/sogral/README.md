# SOGRAL / MAHATATI departure research

Local research material for the public MAHATATI live-departure page operated by
EPE SOGRAL Spa. This is deliberately **not** an `@geoalgeria` package and never
feeds npm.

Since 2026-08-13 one derivation of it is public: the **observed network**, on
the app's `/departures` map. Read [What we publish, and what we do
not](#what-we-publish-and-what-we-do-not) before touching anything here; the
line it draws is the whole point of this directory. Everything in the capture
itself, including every clock time, stays local, and the app's timetable
endpoint returns 404 in production.

The research also lets us inspect the public surface, compare its stations to
`@geoalgeria/gares-routieres`, and prepare a properly licensed integration if
SOGRAL ever provides one.

## Latest station-directory audit

The 2026-08-28 refresh found **73 unique departure agencies** and **9,077 unique
agency/destination pairs** on MAHATATI. The agency ids are an exact set match
for the 73 populated `refs.mahatati_agency` values in the 74-station
`@geoalgeria/gares-routieres` package. Station `53-01 IN SALEH` remains the one
intentional exception because it is not offered as a MAHATATI departure agency.

The package still passes its 74/74 geocoding and station-link integrity test,
with no out-of-country or mislinked station. The audit therefore produced no
semantic data change: it confirmed the shipped references rather than replacing
them.

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
  successfully return at least one of the pinned, previously high-volume
  examples before the matrix is allowed. Then use `--run` (or `--run --limit N`) to visit the station-
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
- The captures are local working material, ignored by git. No capture file is
  ever copied into a package, a CDN asset or an app response. What the app
  serves is a derivation, described below, generated on a machine holding the
  capture and committed to the app repository.
- A capture is a timestamped observation, **not a timetable**. Availability,
  fares, cancellation status and summary counters can change at any time.

## What we publish, and what we do not

The page footer says `Copyright © 2021 EPE SOGRAL Spa, Tous droits réservés`,
and SOGRAL has granted no reuse rights. That settles the timetable and it does
not settle the network, so the two are treated differently.

**Published** (app-served, with attribution, at `/departures`): the observed
connection graph. Which departure station was seen serving which destination,
how many departure observations the sampled dates held, the dates on which a
connection appeared, and the estimated duration derived from SOGRAL's own
segment figures per the boundary below. It ships as one
committed file in the app repository
(`apps/web/public/geodata/sogral-network.json`), generated by
`pnpm prepare-sogral-network`, carrying its observation dates, a source sentence
and **no licence claim of any kind**. It is not an `@geoalgeria` package,
because a package would have to state a licence we do not have. The reasoning
is that which towns a public bus service connects, and how long it takes, are
observation-grade facts about a public service, reported with attribution, the
same posture as the app serving NASA FIRMS hotspots on `/fires`.

**Not published, ever**: the timetable. Clock times, per-departure states,
zones, terminus rows, fares and seat availability stay in this directory. They
are the part we could neither keep true nor justify republishing: they change
daily, a stale departure time leaves a traveller standing at a station, and
MAHATATI is the only place they are correct. The app renders them only under
`NODE_ENV=development`, its `?id=` endpoint 404s in production, and the
production bundle does not contain the code that would draw them.

The practical test for anything new: could a reader mistake it for a schedule,
and would it be wrong tomorrow? Then it stays here.

## Time and duration boundary

MAHATATI shows scheduled **departure times** in its search results. Its
"Distance et durée de parcours" panel is calculated client-side with Google
Maps in `DRIVING` mode. That is a road-driving estimate, not a published bus
arrival time, so it must never be displayed as a timetable claim. Separately,
the official route-detail response carries per-segment distance (`P4`) and an
estimated duration (`P5`, encoded as H.MM). The app may accumulate those
source estimates through the searched destination and label the result
**Estimated duration**. Each unique route variant contributes one value, so a
frequently repeated departure cannot move the median by itself. The app omits
the value if a segment is zero/missing and never derives an arrival time. It
also suppresses totals over 30 hours or paths over 2,200 km: the audit found
Google place-name mismatches that sent nearby
stops thousands of kilometres away (for example Guelma → Oum El Bouaghi).
The source estimate may differ from the Google value MAHATATI recalculates in
the browser.

## Approved user-facing copy contract

Only one mode reaches the public now, because only the network is published.
Never let it read like a timetable.

| Data type | Where it appears | Required copy |
| --- | --- | --- |
| Observed network: connection, departure count, estimated duration | Public `/departures` | `Observed on sampled dates: {dates}.` (Algiers calendar days) plus the no-times line below |
| Departure time, state, zone, fare, seats | Development only | Not published; no public copy exists for it |

One provenance block leads the card and carries the MAHATATI handoff as its
primary action. Observation dates are calendar days with no clock time: an hour
beside a bus route reads as a departure time, which is the one
thing this page must never appear to state.

> Observed on sampled dates: {dates}.
>
> This map carries no departure times. They change daily, and MAHATATI is the
> only place to read them.
>
> [Check current departures on MAHATATI]

Under the card:

> Source: SOGRAL MAHATATI. For departure times, fares and booking, use
> MAHATATI.

The observation dates are mandatory. A departure **count** is publishable and
labelled as observed (`12 departure observations`), because it describes what
the sampled captures held, not what runs today. An individual departure is not
publishable in any form. Although the private capture retains
`Disponible / Total` for source research, no surface may show it: a dated
observation cannot support a seat-availability claim.

## Current local receipts

The completed ignored receipt, and what the published derivation kept of it:

| Service date | Searches | Active searches | Departure rows | Itinerary variants | Failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2026-08-12 | 9,077 / 9,077 | 3,990 | 25,959 | 1,268 / 1,268 | 0 |
| 2026-08-21 | 9,077 / 9,077 | 3,446 | 19,472 | 1,027 / 1,027 | 0 |

These counts describe what the public form returned for each date and check
window. They do not establish a complete timetable,
permanent route coverage, current availability or permission to redistribute.

The merged public network carries **4,287** connections from **60** origin
stations to **796** distinct destination places, holding **42,627** departure
observations, with a duration on 73% of connections. Of those connections,
3,084 appeared on both sampled dates and 1,203 appeared on one. Not one raw
departure row is copied into it.

## Relation to the transport work

- `@geoalgeria/buses` is for urban/suburban network geometry, starting with
  ETUSA in Algiers. Its OSM-based rebuild can show lines and stops, but has no
  timetable/frequency data.
- SOGRAL is intercity bus infrastructure and service. Its stations already
  belong in `@geoalgeria/gares-routieres`; the observed network is app-served
  data with attribution; individual departures belong here, and would need an
  explicit licence to go anywhere else.
- The useful product link is: a station or route panel can direct a traveller
  to MAHATATI for current departures and booking, while making no cached
  schedule promise.

## The step that would unlock the timetable

Only SOGRAL can. A documented, redistributable feed (`contact@sogral.dz`),
preferably GTFS or GTFS-Realtime, is what would let departure times ship. The
page already proves their back end holds the station, route, stop, fare and
live-status data; the missing piece is permission and a stable public contract.

**We are not making that ask**, by project decision. So treat the timetable as
permanently unpublishable rather than as pending: nothing here is waiting on an
answer, and no future edit should describe it as blocked on one. If SOGRAL
publishes a feed of their own accord, this whole directory gets replaced by it.
