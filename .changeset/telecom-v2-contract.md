---
"@geoalgeria/telecom": major
---

Data v2: telecom adopts the canonical contract, closing out the last v1 holdout. This supersedes the "not part of this release" note in the sibling packages' 2.0.0 changelogs; see `packages/schema/MIGRATING.md` for the contract.

**Breaking layout.** `data/coverage/5g/{sites,djezzy,mobilis,ooredoo}.json` becomes `data/5g-{djezzy,mobilis,ooredoo}.json`, each with its own CSV and GeoJSON mirror. The `sites.json` union file is gone: it was a pure concatenation of the three operator files; use `coverage()` or concatenate the per-operator files (ids are operator-prefixed, collision-free).

**Breaking record shape.** `source` is now a short key into `metadata.sources[]` (was the operator map URL). Records gain `geo_precision`/`geo_method`: Ooredoo's commune-level points are `approximate` (`operator_commune_point`), and a handful of coarse or coincident Djezzy points are demoted to `approximate`; the rest are `exact` (`operator_map`).

**Breaking metadata.** `data/metadata.json` is the canonical v2 shape: `schema_version`, `sources[]` with per-source licence, retrieval date and pinned official evidence, `record_count`/`entities[]`/`precision`/`bbox`, and `by_operator`/`by_technology` stats replacing the old `coverage["5G"]` block. `updated` keeps the honest 2026-06-13 operator-map snapshot date.

JS API signatures are unchanged: `coverage(technology?)`, `coverageByOperator(operator, technology?)`, `technologies()`, `metadata()`.
