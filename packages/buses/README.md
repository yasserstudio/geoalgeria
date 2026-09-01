**English** | [Français](README.fr.md) | [العربية](README.ar.md)

# @geoalgeria/buses

Reviewed urban and suburban bus data for Algeria. This release contains **61 Lines**
from four Operators, **44 drawable shapes**, **79 Directions**, and **1,061 Stations**.

```bash
npm install @geoalgeria/buses
```

```js
import buses from "@geoalgeria/buses";

const lines = buses.lines();                  // 61
const shape = buses.shapeForLine("etusa-1");
const stops = buses.stationsByLine("etusa-1");
const directions = buses.directionsByLine("etusa-1");
```

## Coverage

| Operator | Lines | Shapes |
| --- | ---: | ---: |
| ETUSA (Alger) | 50 | 33 |
| ETUS Tiaret | 7 | 7 |
| ETUSTO (Tizi Ouzou) | 3 | 3 |
| ETUS Mostaganem | 1 | 1 |

The 50 existing ETUSA Line ids are preserved (`etusa-1`, etc.). New ids use
`{operator-id}-{ref}`. Shapes are reconciled only where a reusable candidate matches
a reviewed Line identity. Tiaret ref 33 is excluded because the current official page
lists refs 26–32. Unresolved, taxi, cross/inter-wilaya, Sétif, ETUAD, and
validation-only official geometry are not published.

## Files

- `data/lines.json` and `data/csv/lines.csv` — 61 Lines
- `data/shapes.json` and `data/geojson/shapes.geojson` — 44 MultiLineString shapes
- `data/directions.json` — 79 source OSM Direction relations
- `data/stations.json`, CSV and GeoJSON — 1,061 Station nodes
- `data/station-memberships.json` — 1,869 ordered relation memberships
- `data/operators.json` — four Operators

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

Package code is MIT. Data licences and attribution requirements are detailed in
[NOTICE](NOTICE); verify current service with the relevant Operator.

[Browse all packages →](https://geoalgeria.com/data)
