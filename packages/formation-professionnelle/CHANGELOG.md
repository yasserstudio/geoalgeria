# @geoalgeria/formation-professionnelle

## 2.1.4

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

- 2310783: `@geoalgeria/sante` comes from its own generator again, with every published id intact: 695 records, 62 corrected, 0 retired, 0 minted, 0 renumbered, and thirteen locations verified by hand.

  The previous release moved sante's coordinates with `scripts/sync-commune-centroid-dependents.mjs` because replaying its generator retired two published ids (`05-epsp-07`, `16-ehs-14`) and minted one (`05-epsp-13`). Ids are public join keys, so the release stopped rather than churn them. Replaying it now, on the corrected commune centres, would have retired sixteen. Four separate things were wrong, and none of them was a fact about the establishments.

  **The carry key followed the geocoding match, not the place.** `carryOverIds` pinned each record back to the id it shipped under, keyed on its OpenStreetMap id and only falling back to the Ministry of Health post id. The OSM id is the outcome of a proximity match, so a facility that merely matched a different OSM way looked like a different facility: fifteen of the sixteen retirements were one establishment under one MSP post id whose OSM match had moved, including all three the previous batch reported. The key now reads the MSP registry id first, which is the establishment's own identity in the source of record and survives a re-pairing or a new OSM match. OSM and Wikidata stay as fallbacks for the records the MSP pull never named.

  **A commune reached on a fragment of its name was treated as proof that two posts are one facility.** The registry publishes each establishment twice, once in French and once in Arabic, and the two are paired on a shared commune when nothing stronger matches. The weakest commune tier matches a single long token, so `EHS Chirurgie Cardiaque Clinique Mohamed Abderrahmani` lands in the commune Mohamed Belouzdad on the given name alone, as does the Arabic post of `EHS Dr Maouche Mohand Amokrane`. They were paired: the sixteenth retirement was a real Algiers cardiology hospital deleted, its Arabic name reattached to a different one. The pairing now refuses a commune that only two such fragments agree on, and `matchCommune` reports whether the match covered the whole commune name or part of it. A partial match still places and geocodes the record; it no longer identifies it.

  **A shared facility-class word counted as a name match.** The generator upgrades a commune centroid to a real point by matching the establishment against OpenStreetMap and Wikidata facilities in the same commune on shared name tokens. Words that say what kind of place this is were among them, and every health facility carries some: sharing only `عيادة`, clinic, was enough to stamp the polyclinic `way/1171998839`, tagged `amenity=clinic` and `name:fr=Polyclinique Hai El Badr`, onto the Arabic record of the cardiac-surgery Clinique Abderrahmani. Because `@geoalgeria/cliniques` may not republish an OSM element sante ships, that one wrong stamp also evicted a cliniques record and would have retired `16-00227`, a public id, for a place that still exists. The facility-class vocabulary is now dropped in both languages before the match, alongside the wilaya and commune names it already dropped. The specialty signal is not part of it: a specialty discriminates and is kept.

  **A lone establishment and a lone facility in one commune were matched even when their names contradicted each other.** With no other candidate in the commune, the commune itself is the evidence and no shared name token is required, which is right for a facility OpenStreetMap names only `Polyclinique`, or by its commune, or not at all. It is wrong when both names do say something specific and none of it agrees: reaching that fallback means the ordinary matcher found nothing in common, so two specific names that disagree are evidence against one place. It put the Setif anti-cancer centre on the city's tuberculosis and respiratory-disease service, the Texenna rehabilitation hospital on an EPSP named after someone else, and the Saida EPH on an unrelated Arabic-named clinic. The fallback now declines when both sides still carry a specific token. Two related corrections came out of the same case: the words that make a facility a _service for a class of disease_ (`service`, `controle`, `maladies`, `مصلحة`, `مكافحة`, `الأمراض` and the rest) join the class vocabulary, and the Arabic specialty table now tests the chest patterns before the psychiatric one, because `التنفسيه`, respiratory, literally contains `نفسيه`, mental, so every Arabic chest facility was reading as psychiatric.

  **Thirteen locations are verified by hand** and recorded as data, in `quality/overrides/sante.json`, the reviewed-correction ledger `writePackageV2` applies on every build, so a replay keeps them. Each decision carries its evidence URL, its check date and the old value it expects, and each corrected record publishes `review_status`, `reviewed_at`, `reviewed_by` and `review_evidence`. `02-eph-03` moves to Chlef, the commune it names, from Oued Fodda, which the generator reached on the token `OULED`. `16-ehs-03` moves to Bir Mourad Rais from Mohamed Belouzdad, reached on the given name Mohamed; its Arabic half-record `16-ehs-13` joins it at the same point, and the two stay separate records until the merge is decided. `07-ehs-03`, `07-eph-01`, `23-ehs-03`, `41-epsp-01`, `42-ehs-03` and `43-epsp-01` get their real building, `42-ehs-03` moving out of Cherchell to Nador. `52-epsp-03` is placed for the first time, in Tabelbala. `19-ehs-01`, the Setif anti-cancer centre, gets its building; its commune stays Setif, decided by point in polygon against the committed OpenStreetMap commune outlines rather than by the nearer centre, which is Ain Arnat's. `16-ehs-04` and `16-ehs-14`, the two half-records of the CNMS Dr Maouche Mohand Amokrane, both move to Dely Ibrahim, also confirmed by point in polygon; `16-ehs-04` had no coordinate at all. New vocabulary: `geo_method` `owner_verified`, declared in the package types.

  **What else moved in the 695 records**, each checked against the published file field by field: 29 `commune` labels now read the flagship's own spelling (`Tebessa` to `Tébessa`, `N Gaous` to `N'Gaous`); 2 gained the `commune_code` their commune has since been given; 8 upgraded from a commune centroid to an OpenStreetMap point and 9 came back down to a centroid, the facility they had matched resting on a class word alone, or contradicting the name outright, or no longer being nearest their commune; and 1 re-matched to the Bechar facility whose name it actually shares. Names, types, sectors, slugs, wilaya codes and the record count are untouched. Precision: 124 `exact`, the same count as before, and now honest about which records earn it.

  Two Wikidata points are among the nine that fall back, and both were on the wrong record of a pair of twins. `Q18785599` is `hôpital d'Adrar`, `Adrar Hospital`, inception 1975, and it sat on `01-eph-03`, the **Nouveau** Hopital d'Adrar, beside the plain `01-eph-01` EPH Adrar it belongs to. `Q7894776` is `centre hospitalier universitaire d'Oran` / `المركز الإستشفائي الجامعي وهران`, and it sat on `31-chu-02`, the **EHU** Oran, while the registry separately lists `31-chu-01` Centre Hospitalo Universitaire Oran and `31-chu-04` `المركز الإستشفائي الجامعي لوهران`, which is that label almost verbatim. Neither point is restored: a class word (`hopital`, `universitaire`) was the whole of the evidence that picked the twin, and re-asserting it would publish a coordinate for the wrong establishment. Attaching each item to the right twin needs the twins resolved first.

  `@geoalgeria/cliniques` follows sante, which it reads to exclude the hospital tier: 1,918 care facilities, up five, **no id retired and no record changed**. The OSM elements sante released come back to the community tier as `08-00007`, `16-00077`, `19-00004`, `20-00001` and `42-00036`.

  **Generators no longer write an empty `retired-ids.json`.** Every file under a package's `data/` enters its npm tarball, and an empty ledger states nothing, so `writePackageV2` and `writeRetiredIds` now skip it and delete an empty one already on disk. The eight empty ledgers the last release committed are removed from `agriculture`, `culture`, `djezzy`, `ferroviaire`, `formation-professionnelle`, `industrie-pharmaceutique`, `mosquees` and `ooredoo`; their data is unchanged. A package that has retired an id still ships its ledger, unchanged.

## 2.1.3

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

## 2.1.2

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.1.1

### Patch Changes

- 64b10a1: Map establishments from the source's pre-reform directorates to the current 69-wilaya division through exact coordinate containment and commune resolution.

## 2.1.0

### Minor Changes

- 682f0cd: Place the 557 establishments takwin.dz publishes without coordinates, taking the dataset from 1,375 of 1,932 geocoded (71%) to 1,920 (99%).

  The portal stores a coordinate pair per establishment but leaves one or both axes at the sentinel `0.000000000000000000000000000000` for 557 records: 304 have neither axis, 192 lost only the latitude, 60 only the longitude, and 3 fall outside Algeria. Those are gaps in the ministry's own database rather than in our capture, so no re-pull can close them.

  Each is now placed on the centroid of the commune its own record names, joined against the flagship geoalgeria commune set by normalized Arabic name within the record's own wilaya: 510 records, `geo_precision` `"approximate"` and `geo_method` `"commune"`. Where the commune field repeats the wilaya name and no commune of that name exists (31 Algiers records reading `الجزائر`, plus 4 whose seat commune is spelled differently upstream), only the wilaya centroid is claimed: 35 records, `geo_method` `"wilaya"`. Twelve records whose commune name could not be resolved confidently keep their null coordinates rather than being guessed at.

  The join is scoped to each record's own wilaya plus the wilayas carved out of it by the 2026 reform, because takwin.dz still publishes the pre-reform 58-wilaya scheme while the flagship commune set uses the 69-wilaya one. Same territory under both schemes, so no match crosses a real boundary.

  Independently checked against the source: 241 of the placed records still carry one real axis upstream, and the assigned centroid agrees with it to a median of 0.7 km (p90 6.8 km). The twelve disagreements above 25 km are all bad values in the portal's own surviving axis, including a sign-flipped Oran longitude and Ouargla and Hassi Messaoud holding each other's.

  Every existing id and every coordinate the portal did supply is unchanged; 545 records differ, each only by gaining `lat`, `lng`, `geo_precision` and `geo_method`. `geo_method` gains `"commune"` and `"wilaya"` alongside `"takwin"` in the published types.

  The package also moves onto the source-store convention: its raw pull is now committed at `sources/formation-professionnelle/takwin-etab.json` and the build replays it offline, since takwin.dz and its ibtikar mirror both answer a non-browser client with a WAF block page.

## 2.0.0

### Major Changes

- e84384a: Data v2 — one canonical record contract across every sector package (breaking schema overhaul).

  Every sector package now shares a single record shape defined by the new `@geoalgeria/schema` dependency, replacing the hand-written, drifted `types/index.d.ts` per package. Read [`packages/schema/MIGRATING.md`](https://github.com/yasserstudio/geoalgeria/blob/main/packages/schema/MIGRATING.md) before adopting `2.0.0`.

  - **Breaking record shape**: `wilaya_code` is a zero-padded **string** (`"16"`, not `16`); commune linkage is `commune_code` (string ONS code) + `commune`; coordinates are `lat`/`lng`; external ids collapse into `refs: { osm, wikidata, … }`; `id` is an opaque string unique within its file (no more global `{sector}:{WW}-{seq}` form). Every record ships in **JSON, CSV and GeoJSON**.
  - **Breaking `geo_precision`**: strictly `exact | approximate | null`, **null if and only if** the record has no coordinate; the old method vocabulary moved to a new `geo_method` field under the same null-iff rule. `exact` now requires ≥3 decimals and a point unique within its file — 409 records that could not carry that claim were downgraded to `approximate`.
  - **Honest metadata**: real per-source `retrieved` dates; licence URLs only where the source is genuinely open, `conditionsOfAccess` prose otherwise. A root `index.json` catalog and a `schema.org/Dataset` descriptor ship alongside the data.
  - **Data fixes**: the capital-coordinate 9-cycle swap repaired; 30+11 mislinked records relinked; emploi communes recovered; 972 previously-dropped tourisme values restored.

  Not part of this release: the core `geoalgeria` dataset and `@geoalgeria/telecom` predate this contract and stay on their current v1 versions until migrated.

## 1.1.0

### Minor Changes

- c384525: Algeria's 1,932 vocational training establishments from takwin.dz (MFEP) — CFPA, INSFP, IFEP, IEP, DFEPs and private accredited centers across 58 wilayas, with type, capacity, boarding, contacts and GPS coordinates. JSON, CSV, GeoJSON, TypeScript.
