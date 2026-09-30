# @geoalgeria/gares-routieres

## 2.2.6

### Patch Changes

- 924b092: Rebuild 14 sector packages on the 189 corrected commune centres, and join the commune by containment in its OpenStreetMap outline instead of by distance: 46 coordinates moved, 8,036 commune links re-derived, 697 wilaya moves, and not one published id changed.

  `geoalgeria` corrects 189 commune centres in this same release. Every package here derives from those values, so none of it was right until it was rebuilt against them. Three separate things were wrong.

  **46 coordinates were a repudiated commune centre.** These records have no point of their own: they borrow their commune's centre and say so in `geo_method`. The copy does not follow the original. Moved: `@geoalgeria/sante` 19, `@geoalgeria/formation-professionnelle` 15, `@geoalgeria/industrie-pharmaceutique` 8, `@geoalgeria/enseignement-superieur` 2 and `@geoalgeria/agriculture` 2. Precision is unchanged and still honest: these are commune-level placements, and they now name the commune's current centre.

  **The join itself was wrong, not just its inputs, and it took two passes to fix.** `commune`, `commune_code` and `wilaya_code` were stamped by **unrestricted nearest commune centroid**, which makes every commune centre an attractor for everything around it, so moving 189 centres pushed 58 published records into a wilaya whose polygon does not contain them at all: mosque `31-0390`, at `[-0.414678, 35.547628]`, is inside OpenStreetMap's commune 3111 Oued Tlelat in wilaya 31 and read Zahana in wilaya 29.

  The first replacement pinned the candidate communes to the wilaya whose **shipped polygon** contains the point. That is wrong wherever a shipped polygon is, and the shipped wilaya 55 polygon was about 50 km short of the decree boundary (`yasserstudio/geoalgeria.com#171`, which rebuilds it in this same release): it moved 79 records out of El-Hadjira (5507) and El Alia (5513) into N'goussa (3003) in wilaya 30. Mosque `55-0051` at `[5.513943, 32.615544]` is inside OpenStreetMap's El-Hadjira relation 6542937 and read N'goussa, 56.1 km from the centre it was given; pharmacy `55-00012`, whose address says الحجيرة, and library `55-library-02`, whose name ends "El Alia", went the same way.

  The rule is now `scripts/lib/commune-resolver.mjs`, the commune outline decides first and globally, and the wilaya comes from the commune registry rather than from a polygon this repository already knows is wrong:

  1. a coordinate with fewer than three decimals is too coarse to re-join, so the published commune stands (`kept_low_precision`, 42 records). The patrimoine portal's whole-degree placeholders are why `19-bcp-08` at `[6, 36]` stays in wilaya 19 instead of being re-attributed to wilaya 43.
  2. a commune OpenStreetMap ships no relation for cannot be contradicted by geometry, so the published commune stands (`kept_no_outline`, 186 records): Souk Oufella (630), Bir Touta (1634), Collo (2110) and Dhayet Bendhahoua (4703), whose territory is still inside the commune they were split out of, so containment says the neighbour and containment is wrong. School `16-01308` is 1.85 km from Bir Touta's centre and 6.14 km from Douira's.
  3. any commune whose OpenStreetMap `admin_level=8` outline contains the point wins outright (`commune_outline`, 40,623 records), with an overlap resolved in favour of the commune the record already named.
  4. only where no outline holds the point does distance decide, among the communes of the wilaya whose shipped polygon does, plus any outline-less commune within 10 km (`wilaya_nearest`, 34 records).
  5. a point no wilaya polygon holds keeps its published commune (`kept_outside_wilaya_polygons`, 1 record). The national fallback that used to run there while reporting `published_wilaya_nearest` is deleted.

  A record moves commune only where containment supports the move or the point has demonstrably left its old commune's outline.

  **8,036 `commune` links moved and 697 `wilaya_code` with them**, and this time every package that relabels is named. Per package, links and wilaya moves: mosquees 4,931 and 624, ecoles 1,931 and 28, pharmacies 500 and 11, cliniques 295 and 1, ferroviaire 189 and 18, culture 123 and 10, ooredoo 51 and 3, djezzy 12 and 0, gares-routieres 4 and 0. `@geoalgeria/formation-professionnelle` relabels no commune but moves 2 wilayas, and it is the one package the rebuilt wilaya 55 and 47 polygons change: CFPA El Mansoura (`01818`, commune المنصورة) reads 47 instead of 58 and CFPA El Hadjira (`01905`, commune الحجيرة) reads 55 instead of 30. Neither carries a `commune_code`, so the clause that decides them is the wilaya-polygon fallback, which is exactly the clause #171 corrects. Across those nine packages, records inside the OpenStreetMap outline of the commune they name go from **80.2% to 99.9%** (40,654 of the 40,695 rows whose commune has an outline); per package: djezzy and gares-routieres 100%, cliniques, ecoles and mosquees 99.9%, culture, ooredoo and pharmacies 99.8%, ferroviaire 99.7%. The 41 still outside are the rows clauses 1, 2 and 5 keep plus a handful inside the reduced outline's own error at a commune seam, and each is listed in `research/_wilaya-containment/record-exceptions.json`. `test/record-in-declared-wilaya.test.mjs` now holds every published record to its commune outline first and to the wilaya polygon only where there is no outline to ask; it finds 360 violations, all 360 pre-existing and **0 created by this release**. It was 396 before #171 rebuilt the wilaya 55 and 47 polygons from their member communes: 36 rows in packages this release does not touch stop being violations, 28 of them declaring wilaya 55 and 8 declaring wilaya 47, and not one row was added. Several records agree with their own source address where the nearest centre never did: Djezzy's "Barika-centre, Barika, Batna" and SOGRAL's "Commune El Hadjeb Biskra".

  Two warning counts fall, both measured per tree rather than quoted. `scripts/validate-packages.mjs` warns when a point is outside the display-grade polygon of the wilaya it declares, which `quality/accuracy-review` counts as `outside_declared_wilaya`: **1,159 on `main`, 572 before #171, 447 here**. Its neighbour `inside_adjacent_wilaya` reads **960, 373, 248**. 127 of the 572 were wilaya 55 and 47 rows this repository drew in the wrong wilaya, and #171 ends every one of them without creating a new warning. Of the 447 left, 118 are inside the OpenStreetMap outline of the commune they name, so it is the shipped polygon that is wrong about them and not the record, and every one of those is a display-grade seam on a border #171 does not redraw.

  **No published id was retired, renumbered or minted.** Ids are public join keys, so a coordinate correction is not the release that churns them, and it was verified per package before and after with a fresh recomputed diff: 196, 1,913, 1,083, 128, 11,858, 177, 692, 1,932, 74, 171, 20,759, 572, 3,807 and 695, each the same set in the same order. Three packages would have churned and did not. `@geoalgeria/sante` replays, but its MSP capture re-pairs FR/AR posts once corrected commune names land and retires published ids, so its coordinates moved through `scripts/sync-commune-centroid-dependents.mjs` instead, as in the previous batch. `@geoalgeria/ooredoo` and `@geoalgeria/ferroviaire` had no carry-over at all: their ids are `{wilaya}-{seq}` assigned from the commune join, so the stores and stations that changed wilaya re-sequenced 43 and 18 published ids and retired `20-004`, `31-034` and eighteen station ids on the first replay. Both generators now pin each record back to the id it shipped under, keyed on the operator's own store id and on the station's Wikidata or OSM id; it is the pattern nine other packages here already used. A record that re-joins therefore keeps its id, which is why a mosque id can read `26-0114` while its `wilaya_code` reads `10`.

  **Record counts, names, types, contacts and hours are untouched in every package**, checked field by field against `main`: only `lat`/`lng`, `commune`, `commune_code` and `wilaya_code` changed, plus the `metadata.json` fields derived from them. Ten of the fourteen were rebuilt by re-running their own generator against its committed capture, offline (`sante` before `cliniques`, which reads sante's data to exclude the hospital tier); the four that cannot replay offline were patched by `scripts/sync-commune-centroid-dependents.mjs`, which reproduces the same reads of the flagship and nothing else.

  `@geoalgeria/protection-civile` and `@geoalgeria/buses` are not in this release: neither has a stale borrowed centre and neither moved a commune link.

  This release depends on the wilaya-membership correction in the same batch (`yasserstudio/geoalgeria.com#171`), which rebuilds the wilaya 30/55 and 47/58 polygons from their own member communes. Every generator here was replayed on top of it, so the fallback clause that reads those polygons answers from the corrected geometry.

  Refs yasserstudio/geoalgeria.com#170.

## 2.2.5

### Patch Changes

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

## 2.2.4

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.2.3

### Patch Changes

- ef41100: Keep retired public record IDs permanently reserved across data refreshes and
  exclude the internal retirement ledger from catalog distributions.

## 2.2.2

### Patch Changes

- 64b10a1: Replace duplicated and missing `code_commune` values with the 1,541 unique codes from the official ONS 2021 Code Géographique National. Cascade the corrected foreign keys through every linked dataset, preserve Algérie Poste's differing provider-native values, enforce the SQL and repository-wide FK contracts, retain the 2021 mother-wilaya prefix for communes promoted in later reforms, and document the code contract.

## 2.2.1

### Patch Changes

- 21fcaa1: Four stations get their commune corrected. Their coordinates were always right.

  GHERDAIA is the new gare at Bouhraoua, the northern entrance of Ghardaïa on
  the RN1, and it published as "Dhayet Bendhahoua". EL OUED published as
  "Bayadha", BLIDA as "Ouled Yaich", DJAMAA as "Sidi Amrane". None is a
  corrupted coordinate: this is the commune join's own failure mode. Communes
  carry no polygons in this repo, so `attachCommune` assigns the nearest commune
  centre within the containing wilaya, and a station sitting between two centres
  can land on the wrong one. GHERDAIA's point is 6.46 km from Dhayet
  Bendhahoua's centre and 6.57 km from Ghardaïa's; a 110 m margin renamed the
  wilaya capital's station. EL OUED's margin was 200 m, BLIDA's 200 m.

  Every correction is confirmed twice over: OSM's admin_level-8 boundary places
  each point in the corrected commune, and each source record already said so
  itself (GHERDAIA's address reads "Bouheraoua commune de ghardaia", BLIDA's
  "Cité Ramoul Blida", DJAMAA's "cité 19 Mars 1962 Djamaa", and every city
  field names the corrected commune). An OSM sweep of every knife-edge join
  found four more disputes (BISKRA, ALGER, ALI MENDJILI, BOUHNIFIFIA), but
  there OSM contradicts the source's own city field too, so they stay as
  joined until better evidence exists.

  GHERDAIA was reader-reported on r/algeria the day the departures map went
  public, by someone who knows the geography: the station was being offered to
  travellers under the name of a commune whose town sits 8 km away.

  All four stations keep their wilaya, so all four ids (`47-01`, `39-01`,
  `09-01`, `57-01`) are unchanged. Coverage stays at 74 stations and 52 wilayas.

## 2.2.0

### Minor Changes

- 3d183a8: Six more stations come home.

  Tindouf was not alone. SEBDOU, MAGHENIA, EL OUED, AIN SEFRA, NAAMA and
  RELIZANE all shipped with a corrupted source longitude, and because wilaya and
  commune are derived from the point, each was published from the wrong wilaya
  under the name of whatever commune it landed in. SOGRAL's EL OUED was 542 km
  away and labelled "Krakda"; RELIZANE was "Marsat El Hadjadj"; MAGHENIA was
  "Faidja". In every case the record's own `refs.sogral`, `official_name` and
  `address` already said where the station is, and only the coordinate disagreed.

  Four are the Tindouf defect exactly: a longitude that lost its sign. Where OSM
  has the gare mapped it sits at the source's own latitude with the longitude
  negated, which is what confirms the diagnosis rather than merely fitting it:
  MAGHENIA (way 1214562347), AIN SEFRA (way 307745928), NAAMA (way 304431817).
  SEBDOU is the same flip, uncorroborated only because no gare is mapped at
  Sebdou at all. The other two carry a longitude unrelated to the station:
  EL OUED resolves to OSM way 433835302, whose Arabic name is this record's own
  `official_name`, and RELIZANE to way 293130423 "Gare routière Ouest Relizane",
  600 m from the Bendaoud its address names.

  Every corrected station's derived wilaya now agrees with the wilaya encoded in
  its `refs.sogral`, which was not used to make the fix.

  Because the id encodes the wilaya, six records are re-identified:
  `14-01` → `13-02` (SEBDOU), `14-03` → `13-03` (MAGHENIA), `32-02` → `39-01`
  (EL OUED), `69-01` → `45-02` (AIN SEFRA), `69-02` → `45-03` (NAAMA), and
  `31-01` → `48-01` (RELIZANE). All six old ids are retired and can never be
  reassigned. No other station's id changes. Coverage stays at 74 stations and
  52 wilayas: wilayas 39 and 48 gain their first station, 31 and 69 lose theirs.

## 2.1.0

### Minor Changes

- 78886d3: Tindouf comes home, and every station gains its MAHATATI agency id.

  Station 33-01 TINDOUF shipped with a sign-flipped source longitude (+8.125
  for a station at 8.13°W), which also derived the wrong wilaya and commune
  (33/Illizi) from the wrong point. The coordinate is now OSM-verified (node
  4593158192), the station sits in Tindouf (wilaya 37, commune 3701) as its own
  refs and address always said, and coverage grows to 52 wilayas. Because the
  id encodes the wilaya, the record is re-identified as 37-01; 33-01 is retired
  in the new data/retired-ids.json and can never be reassigned. No other id
  changes: the generator now pins committed ids through carryOverIds.

  New: refs.mahatati_agency, the per-station MAHATATI departure-agency id
  (73 of 74 stations; In Saleh is not a departure agency), staged from the
  public MAHATATI departure-station list. refs.sogral is now documented as a
  town-level id shared by twin stations (Annaba and Sidi Brahim, the three
  Constantine gares): never treat it as a station key.

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

Algeria's intercity bus stations — 74 SOGRAL gares routières, geocoded and typed.

### Added

- 74 intercity bus stations across 51 wilayas from **SOGRAL** (EPE SOGRAL Spa),
  the state operator of Algeria's gares routières, via its live registry
  (`live.sogral.com/api/live/agencies`)
- Official name, gare name, postal address, coordinates (74/74 geocoded),
  and total/built surface areas per station
- `wilaya_code`/`commune`/`commune_code` attached by nearest-centroid join
  against the geoalgeria commune model — which also reconciles SOGRAL's legacy
  48-wilaya codes to the 58/69 model (e.g. Touggourt, Djanet)
- 3 broken upstream coordinates fixed: Touggourt & Djanet from OpenStreetMap,
  Guelma from its commune centroid (`geo_precision: "approx"`)
- `sogral_id` + `sogral_code` cross-links kept for provenance
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
