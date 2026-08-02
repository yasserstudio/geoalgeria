# Changelog

## 2.1.0

### Minor Changes

- fcef34c: 5G coverage refreshed from the operators' maps (2026-08-02 capture): 2,798 to **3,096** points. Mobilis grew 1,621 to **1,919** after a bulk re-survey on their side (1,273 sites kept, 646 added, 348 removed or moved; ids are content-deterministic, so a moved coordinate counts as remove + add). First Mobilis 5G points in **Beni Abbes** and **In Guezzam**; largest gains in Tlemcen (+29), Constantine (+23) and Tiaret (+17). Djezzy (1,001) and Ooredoo (176) are unchanged, re-verified against their maps the same day.

  Feed hygiene: the new Mobilis export ships 77 exact duplicate rows (same coordinates + commune) and 4 out-of-Algeria points; the fetcher now drops duplicates explicitly and logs both counts separately. Per-source `retrieved` dates in `metadata.json` now track each fetch run instead of the frozen 2026-06-13 cutover date.

  No API or shape changes: record contract, file layout and loaders are exactly as in 2.0.0.

## 2.0.0

### Major Changes

- d88deab: Data v2: telecom adopts the canonical contract, closing out the last v1 holdout. This supersedes the "not part of this release" note in the sibling packages' 2.0.0 changelogs; see `packages/schema/MIGRATING.md` for the contract.

  **Breaking layout.** `data/coverage/5g/{sites,djezzy,mobilis,ooredoo}.json` becomes `data/5g-{djezzy,mobilis,ooredoo}.json`, each with its own CSV and GeoJSON mirror. The `sites.json` union file is gone: it was a pure concatenation of the three operator files; use `coverage()` or concatenate the per-operator files (ids are operator-prefixed, collision-free).

  **Breaking record shape.** `source` is now a short key into `metadata.sources[]` (was the operator map URL). Records gain `geo_precision`/`geo_method`: Ooredoo's commune-level points are `approximate` (`operator_commune_point`), and a handful of coarse or coincident Djezzy points are demoted to `approximate`; the rest are `exact` (`operator_map`).

  **Breaking metadata.** `data/metadata.json` is the canonical v2 shape: `schema_version`, `sources[]` with per-source licence, retrieval date and pinned official evidence, `record_count`/`entities[]`/`precision`/`bbox`, and `by_operator`/`by_technology` stats replacing the old `coverage["5G"]` block. `updated` keeps the honest 2026-06-13 operator-map snapshot date.

  JS API signatures are unchanged: `coverage(technology?)`, `coverageByOperator(operator, technology?)`, `technologies()`, `metadata()`.

## [Unreleased]

### Changed

- **5G coverage refreshed from the operators' maps** — 1,681 → **2,798** points across **58** wilayas (was 56). Mobilis grew 504 → 1,621 with the ongoing 5G rollout; Djezzy (1,001) and Ooredoo (176, commune-level) unchanged. Data only; not yet republished to npm. _(PR #104)_

### Fixed

- **Djezzy fetcher** — `fetchDjezzy` now drives a real browser (`agent-browser`) and reads the page's already-decrypted `wilayas`, because node `fetch` to djezzy5g.dz is blocked at the network layer (same pattern as the Ooredoo fetcher). Produces byte-identical output (1,001) to the previous XOR-decode path, so no key/version maintenance in the fetcher. _(PR #104)_

## 1.0.0

### Added

- Algeria mobile-network coverage — 1,681 5G coverage points across 56 wilayas, from the operators' own coverage maps.
- Djezzy (1,001) and Mobilis (504) at cell-site level; Ooredoo (176) at covered-commune level. Coordinates, wilaya/commune linkage, in JSON, CSV, and GeoJSON.
- Deterministic `id` (`{operator}-{coordinate-hash}`), stable across re-fetches; `wilaya_code` links to the GeoAlgeria divisions.
- Coverage is namespaced by technology (`coverage/5g/`) so future generations are additive.
- Bundled TypeScript types. JS API: `coverage()`, `coverageByOperator()`, `technologies()`, `metadata()`.
- Sources: Djezzy (djezzy5g.dz), Mobilis (mobilis.dz/map/5g), Ooredoo (ooredoo.dz).
