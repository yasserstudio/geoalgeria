# @geoalgeria/protection-civile

## 1.0.5

### Patch Changes

- dd6f409: **ooredoo: one store now exact.** `46-006` (EO Aïn Témouchent) leaves the operator's two-decimal point for the Ooredoo shop OpenStreetMap maps on its own street, Boulevard du 1er Novembre (node 5347870919, 20 m away), `exact` / `osm_node`. Recorded in the new `quality/overrides/ooredoo.json`.

  **protection-civile: two main units now exact.** `50-001` (Bordj Badji Mokhtar) and `51-001` (Ouled Djellal) each shared one DGPC point with their wilaya directorate (`50-003`, `51-003`). Each unit now ships its OpenStreetMap fire station (node 5647008622; way 307049829, on Rue de l'Indépendance, the unit's own address). The directorates keep the old point and stay `approximate` on purpose, since it was the unit's. Recorded in `quality/overrides/protection-civile.json`. Precision: 859 exact, 21 approximate.

- f166e11: Read the DGPC's own commune name through a one-character spelling difference, and otherwise join a unit's commune by the commune outline that contains it rather than by the nearest commune centre: 18 of the 880 units move to the commune they are actually in, and one more is pinned by a reviewed ledger row.

  The DGPC publishes a commune name per unit (`commune_1`). The old join matched it by exact equality on a folded Arabic key and sent everything else to the nearest commune centre inside the derived wilaya. Both halves were wrong. A centre is not a boundary, so a centre that sits closer than the commune whose outline holds the point won whenever two communes are unevenly shaped. And exact equality meant one missing alef demoted a unit to geometry, which then overruled the source that had named the commune correctly all along.

  The join now has five clauses, in `scripts/lib/protection-civile-commune.mjs` so they can be tested on fixtures rather than on the country: the DGPC's name exactly (782 units); that name across up to two edits when exactly one commune of the wilaya is that close (85); the commune whose OpenStreetMap outline contains the point (13); and the nearest centre, which no longer runs for any unit. Every clause reads the capture, the commune registry and the committed outline cache, and nothing the package itself has published, so a first build from an empty `data/` and a rebuild assign the same commune to all 880 units. Containment comes from the repository's shared resolver and is searched **globally**, with the derived wilaya filtering the answer rather than scoping the search, so an outline overlap that crosses a wilaya line cannot discard a good in-wilaya outline. A coordinate too rounded to be a point at all skips containment entirely, the same `MIN_EXACT_DECIMALS` rule the shared resolver applies.

  **18 units re-placed**, each into the commune whose outline contains it: `06-019` Smaoun to Fenaia Il Maten, `10-005` Djebahia to Aomar, `10-014` El Khabouzia to Bir Ghbalou, `10-026` Ath Mansour to Hanif, `14-002` Mechraa Sfa to Rahouia, `15-006` Ait Aggouacha to Larbaa Nath Irathen, `19-010` Beni Chebana to Beni Ourtilane, `31-010` Ben Freha to Boufatis, `32-009` Sidi Slimane to Kef El Ahmar, `34-003` El Annasseur to Bordj Bou Arreridj, `39-006` Oued El Alenda to Mih Ouansa, `42-003` Bou Haroun to Ain Tagourait, `49-003` Ksar Kaddour to Tinerkouk, `53-001` Foggaret Ezzoua to Ain Salah, `53-003` Ain Salah to Inghar, `55-005` and `55-006` Nezla to Touggourt, `68-001` Menaâ to Medjedel. Ids, coordinates, names, wilaya codes, precision and contact fields are untouched, and `wilaya_code` still comes from the boundary-plus-DGPC reconciliation: the containing outline only picks within the wilaya that reconciliation decided.

  **`23-017` is pinned by a reviewed ledger row, because the sources disagree with each other.** The DGPC files it under "وادي العنب", one edit from Oued El Aneb (2306), with its own unit name and address agreeing, so the tolerant name clause answers 2306. Yet the point sits 65 m outside Oued El Aneb's reduced outline and 86 m inside El Bouni's (2305). Nothing in the sources settles that, so the review did: `quality/overrides/protection-civile.json` now carries a `patch` decision for `23-017` from Oued El Aneb to El Bouni, citing both communes' OpenStreetMap relations (1616108, 1616122) and the DGPC file itself. That is where this disagreement lives from now on, durably and reviewably, and the published row carries its `review_status` and `review_evidence` like every other reviewed correction. The unit's old value came from the nearest-centre clause rather than from the outline, so the outline was never what kept it in El Bouni.

  **Two units the outline would have moved and the DGPC's own name keeps.** `16-048` (the Ben Aknoun zoo unit, "بن عكنون" against the registry's "ابن عكنون") and `33-007` ("إن أميناس" against "إن أمناس"): the source names the commune, a reduced outline next door disputes it, and the source decides, so they keep Ben Aknoun (1622) and In Amenas (3306).

  **14 disagreements deliberately left**, where the DGPC's own name and the containing outline name different communes and only the source can settle it: `13-015`, `16-022`, `16-036`, `16-048`, `19-015`, `31-001`, `31-022`, `31-025`, `32-011`, `33-007`, `39-010`, `47-009`, `48-003`, `48-011`. They stay in `research/_wilaya-containment/record-exceptions.json` under yasserstudio/geoalgeria.com#209, whose residual drops from 302 to 284 with nothing added.

  Rebuilt from the committed capture (`sources/protection-civile/dgpc-units.json`), so `retrieved` stays 2026-09-08: no new bytes were read. dgpc.dz drops TCP from outside Algeria, and the live pull is still owed.

- f1a05b8: These packages now work in a bundled app: esbuild and Vite can follow the data path.

  Before this release, `import { stations } from "@geoalgeria/ferroviaire"` (and the same for every package here) built fine and then threw `ENOENT ... /data/stations.json` on the first call. The JSON was read at run time from a path joined off `import.meta.url`; esbuild and Vite inline the module without relocating that read, so it went looking for the data next to the generated bundle. Node and Next.js with Turbopack were never affected, which is why this took until now to surface.

  Each package now reaches its data through a generated `loaders.cjs`: one `require` of a literal path per data file, inside a function. A bundler can trace a literal path, and the `require` stays lazy, so importing the package still parses nothing until you call a loader. Every call still answers with a fresh copy, as it always did, so a caller that sorts what it gets cannot reorder another caller's records.

  Nothing is different for you: same exports, same arguments, same return values, same TypeScript types, and not one record of data changed. Verified by packing each real tarball and running it three ways, under plain Node, an esbuild bundle and a Vite 8 SSR bundle (rolldown), with the three required to agree. Those are the three that are checked, and the only ones claimed.

  Turbopack is the one bundler that cannot be checked that way, because it needs a `next build`. It already served these packages before the fix, and the fix gives it a graph it has not seen before (an ESM index importing a CommonJS loader whose JSON arrives by literal `require`), so the proof for it is the geoalgeria.com preview build released in the same batch, which loads `@geoalgeria/gares-routieres` through its index on a live page.

## 1.0.4

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

## 1.0.3

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.
- fb222be: Refresh the official DGPC unit directory (metadata or generated artifacts updated).

## 1.0.2

### Patch Changes

- f27c543: Correct 107 unit records by replacing non-dialable telephone and fax placeholders with null.
- ef41100: Keep retired public record IDs permanently reserved across data refreshes and
  exclude the internal retirement ledger from catalog distributions.
- ee3956c: Cross-check Protection Civile location risks, correct six coarse unit points
  with public evidence, and publish review provenance while keeping unresolved
  coordinates approximate.

## Unreleased

- Cross-checked all 36 precision/boundary risk records against the current DGPC
  snapshot and OpenStreetMap unit evidence.
- Corrected six coarse unit coordinates with public review evidence, raising
  exact coverage from 853 to 857 while retaining 23 unresolved points as
  approximate.
- Added a reproducible review corpus and guarded correction ledger.

## 1.0.1

### Patch Changes

- 64b10a1: Replace duplicated and missing `code_commune` values with the 1,541 unique codes from the official ONS 2021 Code Géographique National. Cascade the corrected foreign keys through every linked dataset, preserve Algérie Poste's differing provider-native values, enforce the SQL and repository-wide FK contracts, retain the 2021 mother-wilaya prefix for communes promoted in later reforms, and document the code contract.

## 1.0.0

Algeria's Protection Civile (civil protection / fire & rescue) units — 880 units
nationwide from the DGPC's own dataset (dgpc.dz), official-primary, on the v2
record contract.

### Added

- **880 Protection Civile units** across all wilayas from the **DGPC** GeoJSON
  (`dgpc.dz/dgpc2/unite.geojson`), each with an Arabic name, address, phone, fax
  and a status tier (`statut`, 10 tiers). Evidence type **official**.
- Every unit geocoded from the DGPC's own decimal coordinate — 853 `exact`, 27
  `approximate` (coincident points honestly demoted).
- **Wilaya derived by point-in-polygon** against the 69 post-2026-reform
  boundaries, then cross-checked against the DGPC's own code: units in the 11 new
  wilayas carry their correct new code, and where geometry and the DGPC code
  disagree among pre-reform codes (a border unit misfiled by a simplified outline)
  the DGPC's official code wins. The DGPC's `cod_wilaya` is preserved in
  `refs.dgpc_wilaya`. Commune best-effort (Arabic name match, nearest-centroid
  fallback), stable `{wilaya}-{seq}` ids.
- JSON, CSV, GeoJSON, TypeScript types, and a `npm run fetch` rebuild script.
- Government content © DGPC — no open licence; published as a factual public
  listing with attribution (`conditionsOfAccess` in the discovery descriptor).
