# @geoalgeria/pharmacies

## 2.4.0

### Minor Changes

- b4cb4c9: **Migration.** `22-00057` (Pharmacie militaire, Sidi Bel-Abbes) is retired and reserved in `data/retired-ids.json`, which grows to 34 reserved ids. A project decision of 2026-10-29 keeps every military location out of GeoAlgeria, so the record leaves the package and its OpenStreetMap element `node/6954436786` is excluded by id in the generator, which keeps it out of every later rebuild. It gets no `migrations` entry, because nothing in the project carries it now. A civilian officine is never caught by that guard, which is keyed on the element id and not on a name: `02-00095` (MERBOUH Elhadi, Boukadir), whose `operator` only names the military insurance convention, still ships.

  This release therefore publishes **3,811** pharmacies, 3,508 `exact`, 2,474 named, 1,162 with an address, 34.6% of the ~11,000 estimate. The figures in the refresh note below are the refresh's own, measured before this retirement.

  Refresh pharmacies from OpenStreetMap, retrieved 2026-10-22: 3,795 records to 3,812.

  Source: OpenStreetMap (ODbL 1.0), `amenity=pharmacy` in Algeria, Overpass snapshot `2026-10-22T19:37:51Z`. Previous pull 2026-08-31.

  Nineteen pharmacies are added and two are removed. Of the additions, 12 are OpenStreetMap nodes placed exactly and 7 are building polygons placed at their centre, which is why `approximate` coordinates rise from 296 to 303 while `exact` rises from 3,499 to 3,509. Named records go from 2,461 to 2,475, `name_ar` from 1,030 to 1,032, phones from 145 to 146, opening hours from 256 to 259, addresses from 1,161 to 1,163 and `dispensing` flags from 530 to 536. Coverage against the ~11,000 estimate moves from 34.5% to 34.7%, still a partial community extract and not a registry. 67 wilayas, unchanged.

  **Two ids retire, neither is re-used.** `04-00007` (node/4261857892, Ain Beida) and `30-00015` (node/4423703990, Hassi Messaoud) were deleted upstream on 2026-10-16, which the OpenStreetMap API confirms independently of the Overpass pull the build reads: both elements answer 410 Gone with `visible:false`. `data/retired-ids.json` grows from 31 reserved ids to 33 so neither can ever be handed to another pharmacy, and neither gets a forward, because a deletion has no successor to point at. The 29 existing forwards are untouched. No id changed hands: every one of the 3,793 pharmacies present in both pulls keeps the id it shipped under.

  **No pharmacy moved more than 39 m.** Fourteen records have a new coordinate, the largest move 39 m and only three over 11 m. None changed wilaya or commune, and no `geo_precision` or `geo_method` changed. Checked against the repo's own wilaya boundary polygons rather than the tags that produced the coordinates: every geometric verdict in the accuracy review is unchanged record for record, so no point left the commune outline it is joined to.

  **Sixty-seven records are renamed, all of them upstream.** Mostly one mapper's cleanup pass over Algerian pharmacies: `name` rewritten as a `Latin;Arabic` pair, or `name:fr` added or case-corrected. One is a real change of name, `16-00372` (node/4344773997) from `Pharmarcie Kaci` to `Sorecal` / `سوريكال`, an edit dated 2026-10-19 in the OpenStreetMap API, still tagged `amenity=pharmacy`. The build code for names changed since the last pull, so this was settled by replaying this pull through the previous code: the two outputs are identical on every field of all 3,812 records, so nothing in this refresh is an artefact of the generator.

### Patch Changes

- f1a05b8: These packages now work in a bundled app: esbuild and Vite can follow the data path.

  Before this release, `import { stations } from "@geoalgeria/ferroviaire"` (and the same for every package here) built fine and then threw `ENOENT ... /data/stations.json` on the first call. The JSON was read at run time from a path joined off `import.meta.url`; esbuild and Vite inline the module without relocating that read, so it went looking for the data next to the generated bundle. Node and Next.js with Turbopack were never affected, which is why this took until now to surface.

  Each package now reaches its data through a generated `loaders.cjs`: one `require` of a literal path per data file, inside a function. A bundler can trace a literal path, and the `require` stays lazy, so importing the package still parses nothing until you call a loader. Every call still answers with a fresh copy, as it always did, so a caller that sorts what it gets cannot reorder another caller's records.

  Nothing is different for you: same exports, same arguments, same return values, same TypeScript types, and not one record of data changed. Verified by packing each real tarball and running it three ways, under plain Node, an esbuild bundle and a Vite 8 SSR bundle (rolldown), with the three required to agree. Those are the three that are checked, and the only ones claimed.

  Turbopack is the one bundler that cannot be checked that way, because it needs a `next build`. It already served these packages before the fix, and the fix gives it a graph it has not seen before (an ESM index importing a CommonJS loader whose JSON arrives by literal `require`), so the proof for it is the geoalgeria.com preview build released in the same batch, which loads `@geoalgeria/gares-routieres` through its index on a live page.

## 2.3.0

### Minor Changes

- 139eac7: Every pharmacy id now states its own wilaya, and one pharmacy is one record.

  **Migration.** Twenty-nine ids are retired, and `data/retired-ids.json` forwards every one of them to the id that carries that pharmacy today, so an old join key is followed rather than only found missing. Each forward is a single hop; none leads to another retired id, and each merge cites the OpenStreetMap elements it stood for in an `osm` list.

  Seventeen records carried a wilaya prefix their own `wilaya_code` contradicted, and are re-issued into the id space of the wilaya they are actually in: `02-00160` → `48-00142`, `07-00018` → `51-00040`, `13-00009` → `22-00080`, `13-00010` → `22-00081`, `16-00279` → `35-00091`, `21-00036` → `23-00061`, `21-00037` → `23-00062`, `21-00038` → `23-00063`, `22-00039` → `13-00089`, `22-00078` → `13-00090`, `22-00079` → `13-00088`, `25-00049` → `43-00111`, `40-00003` → `05-00072`, `61-00005` → `07-00055`, `65-00020` → `68-00023`, `65-00025` → `68-00024`, `68-00001` → `28-00049`.

  Twelve pharmacies were published twice, as a Double mapping OpenStreetMap holds twice over, and are now one record each, the retired id forwarding to the kept one: `02-00063` → `02-00062`, `07-00052` → `07-00002`, `10-00021` → `10-00019`, `14-00032` → `14-00031`, `16-00426` → `16-00178`, `19-00074` → `19-00073`, `23-00042` → `23-00044`, `39-00004` → `39-00003`, `43-00052` → `43-00051`, `43-00079` → `43-00004`, `51-00039` → `51-00036`, `55-00017` → `55-00018`. The record count falls from 3,807 to 3,795 and nothing was deleted.

  **The id's wilaya prefix is now always the record's own wilaya.** `types/index.d.ts` documents the id as `{wilaya_code}-{seq}`, which invites a consumer to read the wilaya off the prefix, and on 17 of 3,807 records that read gave the wrong wilaya. The cause was id stability working against the contract: a record is pinned back to the id it shipped under, keyed on its OpenStreetMap element, so that a new pharmacy does not re-sequence every later id in its wilaya. When the commune join later moved a record to another wilaya, the pin brought back the whole old id, prefix included, and the prefix stayed wrong for good. Several of the 17 are neighbours across a wilaya border and several are in the 2026-reform wilayas, which is where the join moved most. The generator now treats a prefix that no longer describes the record as a reason not to pin: the stale id retires, the record takes the id its own wilaya gives it, and the forward keeps the old key resolvable. A test fails the build if any id prefix and `wilaya_code` ever disagree again. Every one of the 17 new wilayas is the commune whose OpenStreetMap outline contains the point, not a claim read back off the id.

  **Names that hold more than one language are split, so each field holds one script and nothing else.** OpenStreetMap contributors routinely write two languages into one tag, `name=Pharmacie bouchekouf صيدلية بوشقوف`, and the old router asked only whether a value contained an Arabic letter, so 28 records shipped a `name_ar` that was mostly Latin. Such a value is now cut at each script boundary and every field keeps its own half; six records gain the `name_fr` that was sitting inside their Arabic tag. The cut only ever removes the separator between halves: nothing is transliterated, translated or reordered, and a name written in one script is not cut at all, so `24 ساعة` keeps its number. A name still goes through only the three steps the type now states: repeated spaces become one, spaces at either end are trimmed, and combining marks at the very start are dropped. Neo-Tifinagh is handled as the third script it is: two records tag Tifinagh running straight into Arabic with no separator, and it is filed as neither an Arabic nor a French name but kept on `name` rather than dropped. One record changes visibly because of it: `40-00017` is tagged `name=ⵜⴰⵃⴰⵏⵓⵜ ⵏ ⴷⴷⵡⴰ ⵎⴻⵃⴰⵎⴷⵉ ⵃⴰⴽⵉⵎⴰ` in OpenStreetMap, which the old name filter dropped as unnamed, so `name` fell back to the French label. `name` now carries the Tamazight name the source actually states, and `name_fr` still reads "Pharmacie Mehamdi Hakima" for a Latin-only label. 1,030 records carry an Arabic name and 2,416 a Latin one, 985 both.

  **A double mapping is found on a shared Loose name key, not on identical text.** The same string comparison that mis-routed the names also decided which records were one pharmacy, as lowercase text within 40 m, so `43-00004` "Pharmacie bouchekouf صيدلية بوشقوف" and `43-00079` "بوشقوف", 6.6 m apart in Oued Endja, never matched. Each half from the script split is now folded through [`@geoalgeria/normalize`](https://github.com/yasserstudio/geoalgeria/tree/main/packages/normalize) and compared as a Loose key, with the words that only say "pharmacy" dropped, which is what lets the Arabic half of one spelling meet the whole of the other. That found 12 double mappings dataset-wide, every one inside a single wilaya. Oued Endja is corroborated by the Mila wilaya pharmacy duty roster for October 2026, an official source outside OpenStreetMap, which lists exactly one بوشقوف among the commune's pharmacists. The element kept is the one already published, then the one carrying the most fields, then the lower OpenStreetMap id, so a merge never retires an id it could have kept and never depends on the order Overpass answered in. A test fails the build if two records within 40 m ever share a Loose name key again, or if a name field ever holds a letter of another script.

  **A merge costs no contact detail.** The kept element absorbs every field it lacks from the element it replaces, so phone, opening hours, address, operator and the `dispensing` flag all survive the merge. Three dispensing flags that only the retired side carried are now on the kept record: `07-00002`, `16-00178` and `51-00036`. Where both elements state a field, the kept element's own value stands; nothing is resolved or concatenated. Two such disagreements exist, both on `51-00036` over `51-00039`: opening hours `24/7` against `08:00-22:00`, and the address, which the kept record gives in Arabic with a postcode and the other in Latin without one. Every other field a retired element held was already on the kept one, either identically (`14-00031` phone, hours and address; `02-00062` and `55-00018` address) or as a spelling variant of a name.

  **Arabic names are complete again.** 1,029 records carried a name the generator had cut short, because the pattern that strips the combining marks a name may open with was written `[\u0610-\u064B]` and `[\u061A-\u0670]`, and each of those ranges spans the whole Arabic letter block. It was not stripping marks, it was stripping the first Arabic word. Most of the time that word was صيدلية, so the record read "الشفاء" where the source says "صيدلية الشفاء"; 156 records lost a real name word, among them a surname (`02-00095` shipped as "الهادي" where OpenStreetMap says "مربوح الهادي"), 182 lost their `name_ar` outright because nothing was left to keep, and three were cut mid-word at ڨ, which falls just outside the broken ranges (`02-00105` "ڨ شبرة الجيلالي", now "فلاڨ شبرة الجيلالي"). The class is now marks only, written out codepoint by codepoint with the trap named, and it lives in one shared place so the packages that copied it can take the corrected one. Six records regain a name they had lost entirely, so 2,461 are named rather than 2,455, and 1,030 carry an Arabic name rather than 848. Nothing about the id contract or the merges changes: the same 17 ids are re-issued, the same 12 double mappings merge, and no new pair appears or disappears. Private tracker #291.

  Counts move with the smaller, cleaner set: 2,461 named rather than 2,467, 145 with a phone rather than 146, 256 with opening hours rather than 257, 1,161 with an address rather than 1,164, 3,499 `exact` and 296 `approximate`, still across 67 wilayas. Those three drops are one value where two records used to state it, not information lost: in every case the pharmacy's one remaining record states the same phone, hours or address that both of its records used to state. `dispensing` rises to 530 from 529, because the carry-over also recovers a flag, an opening-hours string and an address from three elements an earlier release had already merged away silently.

## 2.2.3

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

## 2.1.0

### Minor Changes

- ec011f3: Fresh OpenStreetMap re-survey (2026-08-08 pull, `timestamp_osm_base` 2026-08-08T14:50:21Z): 3,790 to **3,797** pharmacies, **2,461** named, still **67** wilayas. 9 added and 2 dropped upstream (`44-00029` Barça Toufiq in Aïn Defla and `47-00001` in Ghardaïa). Precision 3,509 exact / 288 approximate. Enrichment moves a little: 146 with phone, 257 with opening hours (was 255), 1,163 with address (was 1,159), 526 with a `dispensing` flag (was 524). The 1,769-way bulk-import artifact near Attatba is still detected and excluded.

  **Ids of surviving records are stable.** All 3,788 records that survive the re-survey keep the id they shipped under, so existing joins on `id` keep working across re-surveys. The fetcher now runs `carryOverIds` keyed on the OSM id before writing, matching the other sector packages. Without it the positional `{wilaya_code}-{seq}` sequence re-homed 1,120 records, because a single pharmacy inserted upstream shifts every later record in its wilaya.

  Four records are re-linked against the current core set rather than against OSM: two points near Menaa move from Aïn Oussera (65) to Bou Saâda (68), and two near Bou Saâda re-link from Bou Saâda to Ouled Sidi Brahim. Since ids carry over, the id prefix on those records no longer matches their `wilaya_code`, which is expected under the v2 contract where `id` is opaque. Eleven records pick up upstream name edits, mostly generic "Pharmacie" placeholders being cleared or a bilingual name being split into `name_fr` / `name_ar`.

  `commune_code` nulls go 18 to **21**. The two re-linked Menaa records drop `"1709"` for null, and the new `16-00749` ships null. Both communes exist in the core set but carry no `code_commune` there (Menaa in wilaya 68, Bologhine Ibnou Ziri in wilaya 16), so this is an upstream gap in `packages/dataset`, not a regression in the join. `commune` names on those records are populated as usual.

  `metadata.json` keeps `evidence_type: "crowdsourced"` on the OpenStreetMap source. `buildMetadata` passes `sources[]` through verbatim, so the fetcher now pins the value instead of leaving it off and silently dropping the provenance claim on every rebuild.

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

Algeria's pharmacies — 3,790 officines from OpenStreetMap, geocoded, bilingual where named, wilaya/commune-linked.

### Added

- 3,790 pharmacies (`amenity=pharmacy`) across 67 wilayas from **OpenStreetMap**
  (ODbL), each geocoded, de-duplicated (same-name-within-40 m and coincident
  points), with FR/AR names routed by script where present.
- Contact tags where OSM has them: 2,459 named, 146 with phone, 255 with opening
  hours, 1,159 with address, 524 with a `dispensing` flag.
- Wilaya/commune linkage by nearest-centroid join against the geoalgeria base
  dataset (wilaya effectively exact, commune best-effort), stable `{wilaya}-{seq}`
  ids ordered by OSM id.
- Honest partial-coverage framing (~3.8k mapped vs an estimated ~11k officines
  nationally; no open official registry).
- JSON, CSV, GeoJSON, TypeScript types, and a `npm run fetch` rebuild script.
