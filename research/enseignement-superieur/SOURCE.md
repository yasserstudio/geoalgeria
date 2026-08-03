# @geoalgeria/enseignement-superieur — sources & reconciliation

> **Canonical package:** `@geoalgeria/enseignement-superieur`.
> **Sources:** MESRS university-network listings (EN + AR), captured to
> `sources/enseignement-superieur/` (committed; `--cache` replays offline).
> Coordinates are an OSM/Nominatim enrichment, seeded in
> `scripts/seeds/coordinates.json` and cross-checked against the flagship
> wilaya (see `scripts/fetch.mjs` header).

## Sources

| Capture | URL | What it provides |
| --- | --- | --- |
| `mesrs-en` | mesrs.dz/en/university-network/ | the public MESRS network: official FR name + own website per institution (110 anchors as of 2026-08-03) |
| `mesrs-ar` | mesrs.dz/reseau-universitaire-ar/ | Arabic names for the network, plus the institutions the EN page omits: licensed **private** institutions and higher-education establishments under **other ministries** (Défense, Santé, Culture, Poste/Télécoms, Travail) that MESRS supervises pedagogically |

Both are plain WordPress HTML, no WAF. Fetched 2026-08-03: the listings are
**unchanged since the 2026-06-23 collection** — the regenerated dataset was
byte-identical apart from the retrieved stamp.

## What the 177 is (vs the ministry's "117 établissements")

mesrs.dz/fr/agregats-2/ (2024-2025 figures) says **117 établissements**:
55 universités + 13 centres universitaires + 40 ENS + 9 écoles nationales
supérieures. Our package ships **177**. The two numbers count different things:

| Slice of the package | Count | In the ministry's 117? |
| --- | --- | --- |
| Public MESRS network (EN listing) | 110 | yes — this is its universe |
| Private licensed institutions (AR listing) | 19 | no |
| Other-ministry establishments (AR listing): Santé 25, Défense 16, Culture 4, Poste/Télécoms 2, Travail 1 | 48 | no |

Within the public 110 vs their 117 the residual gap is **category accounting,
not missing records**: the agregats page's 40 "ENS" bucket folds in the écoles
normales that the network listing presents inside regional groupings we
classify by name (our split: 58 universités, 54 grandes écoles, 12 ENS, 5
centres universitaires). The ministry's own aggregates are not internally
consistent either (an older cut says 106), so the **enumerable network listing
is the source of truth we ship**, and the aggregate is used only as an
order-of-magnitude cross-check.

## Known gaps (tracked, deliberate)

- **67 records have no French name** (the AR-listing extras are published in
  Arabic only). `name` is null, `name_ar` carries the official name. Follow-up:
  source FR names per institution (their own sites / JORA licensing decrees).
- **Coordinate precision** is split (`geo_precision`): campus-geocoded vs
  commune/wilaya-centroid fallback; the AR-listing extras resolve from
  embedded location text and are centroid-precision by construction.
- **Résidences universitaires (ONOU)**: scouted 2026-08-03, NO-GO — ONOU
  publishes aggregates only (467 résidences, no directory). If mapped, it will
  be OSM-sourced with the 467 as the honest denominator, as a separate layer.
