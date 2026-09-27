# @geoalgeria/ecoles

## 2.2.2

### Patch Changes

- 0df7cb4: Rebuild 13 sector packages on the corrected commune centres: 45 coordinates moved, 1,178 commune links re-derived.

  `geoalgeria` corrects 56 commune centres in this same release, by 0.75 km to 217 km. Every package here derives from those values, so none of it was right until they were rebuilt against them. Two separate things were stale.

  **45 coordinates were a repudiated commune centre.** These records have no point of their own: they borrow their commune's centre and say so in `geo_method`. The copy does not follow the original. `@geoalgeria/sante`'s _EPH El Harrach (Hassan Badi)_ shipped at the old El Harrach value, 51.5 km from the hospital and inside wilaya 35; the 23 Algiers institutions of `@geoalgeria/agriculture` sat on the Alger Centre point that was in the sea. Moved: sante 7, agriculture 23, formation-professionnelle 10 (including the CFPAs of Melbou, Mazagran, Marsa Ben M'Hidi and Chelghoum Laid), enseignement-superieur 3 (ENP, ENSA and EPAU, all at El Harrach) and industrie-pharmaceutique 2 (SAIDAL El Harrach, BIO OSTEO). Precision is unchanged and still honest: these are commune-level placements, they now name the commune's current centre.

  **1,178 `commune_code` links moved, and 270 `wilaya_code` with them.** `commune` and `commune_code` are stamped by nearest commune centroid, so a centre that moves 25 km stops being the nearest for everything around where it was and starts being it around where it is. Re-derived: mosquees 720, ecoles 266, pharmacies 105, cliniques 39, culture 29, ooredoo 13, djezzy 3 and protection-civile 3. Wilaya moved for 254 mosques, 10 cultural places and 6 pharmacies.

  **Record counts, names, types, contacts and ids are untouched in every package.** Only `lat`/`lng`, `commune`, `commune_code` and `wilaya_code` changed, plus the `metadata.json` fields derived from them (sante's bbox reaches 37.065 now that Chetaibi is on the coast). Ten of the thirteen were rebuilt by re-running their own generator against its committed capture, offline; the other three cannot replay offline and were patched by `scripts/sync-commune-centroid-dependents.mjs`, which reproduces the same reads of the flagship and nothing else.

  **This release is also the first rebuild since the JORA name corrections of 2.1.0**, which no dependent had picked up either. That accounts for a further 3,031 `commune` labels now matching the flagship spelling (`Ain Madhi` to `Aïn Madhi`, `Hassi R'mel` to `Hassi R'Mel`), 258 `commune_code` and 47 `wilaya_code` from the same earlier pass, and one vocational centre in Ouamri that is placed for the first time because its commune name now resolves.

  **A guard keeps the class out.** `pnpm validate` now checks every record that declares a commune-level placement against the flagship: 1,151 of them, and a coordinate that is not the current centre of the commune it names fails the build. It is a table of the bound `geo_method` values, not a guess, because three commune-flavoured methods in this repository are deliberately not a flagship centre (the Ooredoo 5G per-commune points, and the wilaya-mean placements of industrie-pharmaceutique and enseignement-superieur).

  Closes yasserstudio/geoalgeria.com#169.

- 4deabd3: Replace em dashes in source names and citations with plain separators.

  - Every source `name` reads `Operator: descriptor`, where it used to carry a
    U+2014 em dash, in `data/metadata.json` and in the `dataset-metadata.json`
    descriptor built from it.
  - The schema.org/DCAT `citation` entries join a source name and its licence with
    a comma: `OpenStreetMap: schools & kindergartens in Algeria, ODbL 1.0 (© OpenStreetMap contributors)`.
  - Coverage notes, package `description`s, the `types/index.d.ts` documentation and
    the `index.js` headers carry a colon, comma or semicolon in place of the dash.

  No count, coordinate, licence or date changes. Consumers that match a source name
  or a citation string literally need to update the separator; anything keyed on
  `sources[].key` is unaffected. `pnpm validate` now fails on an em dash in
  published metadata, so it cannot come back through a generator.

## 2.2.1

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.2.0

### Minor Changes

- 586c0cc: Refresh the public OSM, ANEM, and mobile-operator sources through 2026-08-31,
  including updated records, opening hours, labels, and canonical Mobilis wilaya
  assignments.

### Patch Changes

- ef41100: Keep retired public record IDs permanently reserved across data refreshes and
  exclude the internal retirement ledger from catalog distributions.

## 2.1.1

### Patch Changes

- 64b10a1: Replace duplicated and missing `code_commune` values with the 1,541 unique codes from the official ONS 2021 Code Géographique National. Cascade the corrected foreign keys through every linked dataset, preserve Algérie Poste's differing provider-native values, enforce the SQL and repository-wide FK contracts, retain the 2021 mother-wilaya prefix for communes promoted in later reforms, and document the code contract.
- 64b10a1: Correct school wilaya and commune linkage by resolving the containing wilaya before choosing its nearest commune, while preserving public IDs across known OSM way-to-relation migrations.

## 2.1.0

### Minor Changes

- 2a141bc: Fresh OpenStreetMap re-extract for the 2026 rentrée (2026-08-06 pull, `timestamp_osm_base` 2026-08-06T14:37:32Z): 11,830 to **11,855** schools, **8,635** named, all 69 wilayas. Id churn is minimal, 11,829 of 11,830 ids carry over, 26 added and 1 dropped (`16-00454` in Ben Aknoun, gone upstream or absorbed by de-dup), so existing joins on `id` keep working. Precision 2,843 exact / 9,012 approximate; de-dup removed 41 same-name-within-40m pairs plus 3 exact-coincident points. Cycle tallies barely move: primaire 4,019, moyen 2,378, secondaire 1,576, préscolaire 268, autre 3,614 (most of the growth lands in `autre`, the unnamed/uncycled bucket).

  Coverage denominator is now the ministry's own number. `estimated_universe` moves from the round ~28,000 order-of-magnitude estimate to **29,702**, the aggregate the Ministry of National Education publishes on `education.gov.dz` ("Education in numbers", 2024-2025 school year). Same honest-denominator role, now an exact sourced figure: coverage reads **39.9%** instead of ~40% against a guess. `coverage_note` and the three READMEs cite the source.

  Commune join now runs under the point-in-polygon wilaya-containment guard, so a nearest-centroid commune match can no longer land across a wilaya boundary.

  No API or shape changes: record contract, file layout and loaders are exactly as before.

## 2.0.0

### Major Changes

- e84384a: Data v2 — one canonical record contract across every sector package (breaking schema overhaul).

  Every sector package now shares a single record shape defined by the new `@geoalgeria/schema` dependency, replacing the hand-written, drifted `types/index.d.ts` per package. Read [`packages/schema/MIGRATING.md`](https://github.com/yasserstudio/geoalgeria/blob/main/packages/schema/MIGRATING.md) before adopting `2.0.0`.

  - **Breaking record shape**: `wilaya_code` is a zero-padded **string** (`"16"`, not `16`); commune linkage is `commune_code` (string ONS code) + `commune`; coordinates are `lat`/`lng`; external ids collapse into `refs: { osm, wikidata, … }`; `id` is an opaque string unique within its file (no more global `{sector}:{WW}-{seq}` form). Every record ships in **JSON, CSV and GeoJSON**.
  - **Breaking `geo_precision`**: strictly `exact | approximate | null`, **null if and only if** the record has no coordinate; the old method vocabulary moved to a new `geo_method` field under the same null-iff rule. `exact` now requires ≥3 decimals and a point unique within its file — 409 records that could not carry that claim were downgraded to `approximate`.
  - **Honest metadata**: real per-source `retrieved` dates; licence URLs only where the source is genuinely open, `conditionsOfAccess` prose otherwise. A root `index.json` catalog and a `schema.org/Dataset` descriptor ship alongside the data.
  - **Data fixes**: the capital-coordinate 9-cycle swap repaired; 30+11 mislinked records relinked; emploi communes recovered; 972 previously-dropped tourisme values restored.

  Not part of this release: the core `geoalgeria` dataset and `@geoalgeria/telecom` predate this contract and stay on their current v1 versions until migrated.

## 1.0.0

Algeria's schools — 11,830 geocoded from OpenStreetMap, classified by cycle, bilingual, typed and ready to map.

### Added

- 11,830 schools and kindergartens across all 69 wilayas, extracted from
  OpenStreetMap (ODbL) — the largest openly-geocoded school layer for Algeria,
  framed honestly against the ~28,000 establishments of the national network
  (primaire + moyen + secondaire)
- Cycle classification on every record (`cycle`: primaire / moyen / secondaire /
  prescolaire / autre) inferred from `isced:level` and the French/Arabic name —
  4,020 primaire, 2,377 moyen (CEM), 1,574 secondaire (lycée), 268 préscolaire;
  93% of named schools resolve to a specific cycle, with FR/AR labels
- Establishment `kind` (regular / langues / coranique / conduite / formation /
  special) with FR/AR labels — orthogonal to cycle, so the special-purpose places
  OSM files under `amenity=school` (language institutes, Quranic & driving
  schools, training centres, special-needs schools) are a filterable category
  instead of being buried in `autre`: 11,640 regular + 190 special-purpose
- `isced_levels` (OSM `isced:level` normalized to a sorted list, e.g. `"1;2"`) on
  2,037 records, and a single-line `address` from OSM `addr:*` tags on 2,625
- Bilingual naming (`name`, `name_ar`, `name_fr`) — 8,640 named, strictly
  script-routed — and a `sector` flag (`public` / `private`) where the map signals it
- Commune/wilaya linkage (`wilaya`, `wilaya_ar`, `wilaya_code`, `commune`,
  `commune_code`) attached by nearest-centroid join against the geoalgeria
  commune model — wilaya exact, commune best-effort
- Per-record provenance (`source: osm`, `osm_id`) and `geo_precision`
  (`osm_node` / `osm_centroid`)
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
