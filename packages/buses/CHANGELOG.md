# @geoalgeria/buses

## 1.0.0

Algeria's urban bus networks — line-level data, starting with ETUSA (Alger).

### Added

- 50 ETUSA (Établissement de transport urbain et suburbain d'Alger) bus lines from
  fr.wikipedia — termini, stop counts (44/50), communes served, and metro/tram/gare
  stations served en route
- Multi-operator design: `operator`/`network` on every line; more cities/operators
  to be added under the same schema
- `wilaya_code` (16, Alger) joins the geoalgeria model
- Export formats: JSON, CSV, with TypeScript types and helper accessors
- Scope note: **line-level attributes only** — per-stop and per-line geometry
  (OSM `route=bus`) is deferred to v1.1 (ETUSA-tagged OSM route coverage is thin).
  Covers 50 of ~122 ETUSA passenger lines.
