---
"@geoalgeria/enseignement-superieur": patch
---

**OpenStreetMap is now listed as a source.** The campus points come from OpenStreetMap (the Nominatim geocodes in `scripts/seeds/coordinates.json` and the reviewed OSM objects behind the two-Vote and single-open-lead points), yet `metadata.sources[]` named only the two MESRS publications and Overture. It now carries `osm` (ODbL 1.0, © OpenStreetMap contributors, `evidence_type: crowdsourced`), dated from the older of its two committed captures (`osm-campuses`, 2026-08-03). The DCAT descriptor gains the matching citation. No record changes.

**Overture is `crowdsourced`, not `official`.** Its `evidence_type` had fallen through to the key default, which marks every unrecognised key `official`. Overture Places is a third-party map aggregate (the committed rows are Meta-sourced), not a ministry or an institution's own publication, so the entry now pins `crowdsourced`, the label every other open map source in this repository carries.
