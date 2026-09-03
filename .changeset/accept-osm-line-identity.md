---
"@geoalgeria/buses": minor
---

Accept ETUSA Line identity from an evidenced OpenStreetMap operator match, not
only from the retained 50-Line registry. That registry is a single crowdsourced
list of Lines 1-99 and omits the 6xx/7xx suburban network entirely, so 23 Lines
that OSM carries with an operator or Wikidata tag were being dropped. Each
publishes with source "osm" and no termini, since a relation's from/to names one
direction's endpoints rather than the Line's published termini.

Also joins ETUSA refs on a canonical form, which restores geometry to published
Lines 3 and 6: OSM writes them zero-padded and the exact-string match silently
denied them their shapes.

Widens BusStation to the stops OSM maps as ways. Their coordinate is the way's
derived centre, so they publish geo_method "osm_way_center" and approximate
precision rather than claiming a node position they do not have.

Cross-wilaya routes remain excluded.
