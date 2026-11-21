**English** | [Français](README.fr.md) | [العربية](README.ar.md)

# @geoalgeria/buses

Reviewed urban and suburban bus data for Algeria. This release contains **184 Lines**
from 16 Operators, **76 drawable shapes**, **128 Directions**, and **1,599 Stations**.

```bash
npm install @geoalgeria/buses
```

```js
import buses from "@geoalgeria/buses";

const lines = buses.lines();                  // 184
const shape = buses.shapeForLine("etusa-1");
const stops = buses.stationsByLine("etusa-1");
const directions = buses.directionsByLine("etusa-1");
```

## Coverage

| Operator | Lines | Shapes |
| --- | ---: | ---: |
| ETUSA (Alger) | 76 | 61 |
| ETUS-C Constantine | 25 | 0 |
| ETUS Aïn Defla | 16 | 1 |
| ETUS Tlemcen | 10 | 0 |
| ETUS Sidi Bel Abbès | 8 | 0 |
| ETUS Tiaret | 7 | 7 |
| ETUS Annaba | 6 | 0 |
| ETUS Skikda | 6 | 0 |
| ETUSTO (Tizi Ouzou) | 5 | 3 |
| ETUS Béjaïa | 5 | 0 |
| ETUS Setif | 5 | 3 |
| ETUS Oum El Bouaghi | 5 | 0 |
| ETUS M'Sila | 4 | 0 |
| ETUL Laghouat | 4 | 0 |
| ETUS Mostaganem | 1 | 1 |
| ETO Oran | 1 | 0 |

The 50 existing ETUSA Line ids are preserved (`etusa-1`, etc.). New ids use
`{operator-id}-{ref}`. Official-only Lines remain queryable even when no reusable
shape is available. Shapes are reconciled only where a reusable candidate matches a
reviewed Line identity. Tiaret ref 33 is excluded because the current official page
lists refs 26–32. Unresolved, taxi, cross/inter-wilaya, unmatched Sétif, ETUAD, and
validation-only official geometry are not published as shapes.

## Files

- `data/lines.json` and `data/csv/lines.csv`: 184 Lines
- `data/shapes.json` and `data/geojson/shapes.geojson`: 76 MultiLineString shapes
- `data/directions.json`: 128 source OSM Direction relations
- `data/stations.json`, CSV and GeoJSON: 1,599 Station nodes
- `data/station-memberships.json`: 2,682 ordered relation memberships
- `data/operators.json`: 16 Operators

Membership order is the raw OSM relation member order. It is **not** a validated
passenger stop sequence. Repeated members are retained, Direction order is never
reversed, and terminus roles are not inferred. OSM `from`, `to`, and `via` remain source
labels only.

Each Direction, and each of its Memberships, carries a `sequence_status` from geometric
checks of that order against the drawn path:

| `sequence_status` | Directions | Meaning |
| --- | ---: | --- |
| `osm_member_order_consistent` | 36 | Stations lie near the path, in order along it, with the first and last near its ends, and the path has no gap |
| `osm_member_order_inconsistent` | 69 | At least one of those checks fails; the Direction is published, flagged |
| `osm_member_order_unvalidated` | 23 | Fewer than two Stations, so the order cannot be checked |

Consistent means the OSM order agrees with the OSM path, not that an Operator confirms
it. More values may be added in a minor release, so a `switch` over `sequence_status`
needs a `default` branch.

A Line has no status of its own: read it from its Directions. A Line with no Direction
has no geometry yet (108 of 184: no OSM relation found, an OSM relation that matches the
Line but is not yet approved, or only an Operator stop list with no geometry). A Line
with Directions is as strong as the statuses they carry.

`last_confirmed` on each Line, copied onto its shape, is the date of the official
Operator source that states the Line: the document's own date when it carries one,
otherwise the day it was read or supplied. It is `null` for the 77 Lines that only
Wikipedia or OpenStreetMap name (ETUSA's and Mostaganem's). A null does not mean the Line
stopped running, and an OSM refresh never moves the date.

Unnamed OSM Stations keep `name`, `name_fr`, and `name_ar` as `null`. Twelve ETUSA
Station nodes without a spatial Wilaya assignment are explicitly derived to Wilaya 16
through the reviewed ETUSA Operator scope and marked `wilaya_method: "operator_scope"`.

## Sources and licences

ETUSA Line attributes come from French Wikipedia under **CC BY-SA 4.0**. Shapes,
Directions, Stations, and memberships come from a reviewed OpenStreetMap snapshot under
**ODbL 1.0** with attribution **© OpenStreetMap contributors**. The tracked source
includes the Overpass queries, retrieval interval, upstream response hashes, and a hash
of the promoted selection, so regeneration is offline and reproducible.

ETUS Tiaret, ETUSTO, ETUS Béjaïa, ETUS M'Sila, ETUS Sidi Bel Abbès, ETUS Setif,
ETUS Aïn Defla, ETUS Annaba, ETUS Tlemcen, ETO Oran, ETUS Oum El Bouaghi,
ETUS-C Constantine, ETUS Skikda, and ETUL Laghouat Line facts come from official
Operator pages, APIs, programs, and maps. Sidi Bel Abbès includes complete bidirectional
departure lists from owner-supplied official HTML; the page did not state their service
days, so `days` remains `null`. Constantine route identities and Arabic endpoints are transcribed from two
owner-supplied Operator graphics, a route list and a schematic network map; the 25
Lines are directory-only, with no shape, no intermediate Stations and no schedules.
Skikda identities, Arabic termini and complete ordered Arabic stop sequences come from
the Operator's own website, read in a browser by the project owner because the site
served an expired TLS certificate; all six Lines start at the city-centre square
ساحة الشهداء, `stops` carries the published sequence length, and the network-wide
06:00 to 19:00 service window is not published as per-Line service hours.
Béjaïa embedded maps, M'Sila route diagrams, Sidi Bel
Abbès route images, Setif announcement artwork and the Constantine graphics are
validation-only; their geometry is not redistributed.
The official source materials do not state an open reuse licence, so that **Line data is ©
the respective Operators and redistributed for reference**; no open licence is claimed over
it.

Package code is MIT. No SPDX expression covers this mix, so the manifest declares
`SEE LICENSE IN LICENSE` and the data terms are stated as prose in [LICENSE](LICENSE). Data
licences and attribution requirements are detailed in [NOTICE](NOTICE); verify current
service with the relevant Operator.

[Browse all packages →](https://geoalgeria.com/data)
