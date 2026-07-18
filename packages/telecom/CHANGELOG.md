# Changelog

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
