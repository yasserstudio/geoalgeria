**English** | [Français](README.fr.md) | [العربية](README.ar.md)

# @geoalgeria/buses

Reviewed urban and suburban bus data for Algeria. This release contains **153 Lines**
from 14 Operators, **76 drawable shapes**, **128 Directions**, and **1,603 Stations**.

```bash
npm install @geoalgeria/buses
```

```js
import buses from "@geoalgeria/buses";

const lines = buses.lines();                  // 153
const shape = buses.shapeForLine("etusa-1");
const stops = buses.stationsByLine("etusa-1");
const directions = buses.directionsByLine("etusa-1");
```

## Coverage

| Operator | Lines | Shapes |
| --- | ---: | ---: |
| ETUSA (Alger) | 76 | 61 |
| ETUS Aïn Defla | 16 | 1 |
| ETUS Tlemcen | 10 | 0 |
| ETUS Sidi Bel Abbès | 8 | 0 |
| ETUS Tiaret | 7 | 7 |
| ETUS Annaba | 6 | 0 |
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

- `data/lines.json` and `data/csv/lines.csv` — 153 Lines
- `data/shapes.json` and `data/geojson/shapes.geojson` — 76 MultiLineString shapes
- `data/directions.json` — 128 source OSM Direction relations
- `data/stations.json`, CSV and GeoJSON — 1,603 Station nodes
- `data/station-memberships.json` — 2,685 ordered relation memberships
- `data/operators.json` — 14 Operators

Membership order is the raw OSM relation member order and carries
`sequence_status: "osm_member_order_unvalidated"`. It is **not** a validated passenger
stop sequence. Repeated members are retained, Direction order is never reversed, and
terminus roles are not inferred. OSM `from`, `to`, and `via` remain source labels only.

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
ETUS Aïn Defla, ETUS Annaba, ETUS Tlemcen, ETO Oran, ETUS Oum El Bouaghi, and
ETUL Laghouat Line facts come from official Operator pages, APIs, programs, and
maps. Sidi Bel Abbès includes complete bidirectional
departure lists from owner-supplied official HTML; the page did not state their service
days, so `days` remains `null`. Béjaïa embedded maps, M'Sila route diagrams, and Sidi Bel
Abbès route images and Setif announcement artwork are validation-only; their geometry is not redistributed.
The official source materials do not state an open reuse licence.

Package code is MIT. Data licences and attribution requirements are detailed in
[NOTICE](NOTICE); verify current service with the relevant Operator.

[Browse all packages →](https://geoalgeria.com/data)
