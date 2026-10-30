# Changelog

## 2.1.0

### Minor Changes

- ebb96b4: Add HHD Express: 69 agencies, 650 stop-desks from 581, retrieved 2026-10-25.

  HHD Express was not in the registry at all. It is a domestic COD carrier (SARL HHD Express, Béni Tamou, Blida) that publishes its whole agency network on `hhd.dz`, each agency with its wilaya, commune, phones, address and its own Google Maps link. The registry gains an eighteenth carrier, `hhd-express`, at `open_agency_data: "geocoded"`. It is a different company from `dhd` (dhd-dz.com), which stays as it was.

  **The list is read where the page compiles it, not where it shows it.** hhd.dz renders six agencies server-side behind an "Afficher les 80 agences" button, so the markup is a preview and reading it would ship six of eighty. The eighty live in a static array inside the client chunk that draws the section, and the chunk's hash changes on every deploy, so it is never hardcoded: the page names its own client components in the flight payload (`:I[<module>,["…/chunks/<hash>.js", …],"AgencyDirectory"]`), the directory's own bundle is the last chunk of its own list, and that chunk is fetched. One ordinary GET of the page, one of the chunk. The array is a JS object literal rather than JSON, with bare keys and a single-quoted value wherever one holds a double quote, so it is converted and parsed; nothing from the network is evaluated.

  **80 agencies published, 69 shipped, 11 left out.** All eleven link a Google Maps _place_ that states no coordinate anywhere: no `!3d!4d` in the redirect URL, no DMS, no static-map pin and no `cid=` for `maps-cid-pins.json` to answer. The place is named by a plus code, by HHD's own business listing or by an address, which is a label and not a published pin, so they are logged and omitted rather than handed to a geocoder: Batna, Béjaïa, Boufarik, Lakhdaria, Tlemcen, Bab Ezzouar, Ain Oussera, Sidi Bel Abbès, Ksar El Boukhari, Relizane, and Ain Fekroune, which publishes no Maps link at all. El Meniaa ships. HHD files it under Ghardaïa, the wilaya it was carved out of in 2021, so the carrier's own pin lands in wilaya 58 against a list that declares 47. The cross-check every carded carrier gets now reads that relationship out of the flagship registry's `mother_wilaya_code` instead of guessing it from a code range, recognises 58 as 47's child and keeps the desk; a pin in a wilaya that is not the declared one's reform child is still dropped. All 69 ship the pin HHD's own link resolves to, under `geo_method: carrier_relay`, every one `exact`.

  **HHD reaches 49 wilayas and ships 45.** The four it loses are the ones where the omitted agency was HHD's only one: Oum El Bouaghi, Batna, Béjaïa and Sidi Bel Abbès. Relizane keeps a desk. Package coverage stays at 64 wilayas; no wilaya here is new.

  **The site says "96 agences"; the list has 80.** That headline is marketing copy. The page's own button reads "Afficher les 80 agences", the array holds 80 entries with 79 distinct Maps links, there is no pagination and no second request, and the footer dates the list itself: "Liste publiée sur hhd.dz, relevée le 11 octobre 2026".

  **Ids come from the wilaya and the commune.** An entry carries no record key of any kind, only a display order, so ids are minted the way ZR Express's are. The two agencies sharing the commune of Sétif are told apart by a short digest of HHD's own name for each ("El Hidhab", "El Hidhab 2"), which is stable under a reorder. That published name is also what each record is named after, with only the brand prefix re-cased, because the commune alone would name both Sétif agencies the same. Phones are not shipped.

- ab71b4c: Add Swift Express: 55 agencies, 581 stop-desks from 526, retrieved 2026-10-25.

  Swift Express was not in the registry at all. It is a domestic COD carrier publishing its whole agency network at `swiftexpress.org/fr/offices`, with an address, phone numbers and its own Google Maps link per office. The registry gains a seventeenth carrier, `swift-express`, at `open_agency_data: "geocoded"`.

  **The list is read where the page itself reads it.** swiftexpress.org is a Next.js app that renders the offices server-side, so one ordinary request to `/fr/offices` returns the entire network as a JSON array inside the streamed RSC payload (`self.__next_f.push([1,"…\"offices\":[{…}]…"])`). Nothing is paged, no API has to be found, and the two card layouts the page renders from that array are not scraped: the array is parsed directly. The payload is JSON inside a JS string literal, so the parser finds the array quote-aware and unescapes it, which matters because `phoneNumbers` puts a real bracket inside every office.

  **60 offices published, 55 shipped, 5 omitted.** The five are Béjaïa (`swift-express-207`), Bouira (`182`), Jijel/Djemaa (`231`), Ghardaïa (`172`) and El M'Ghair/Djamaa (`225`). Each links a real `maps.app.goo.gl` shortlink, and each resolves to a Google Maps _place_ that states no coordinate anywhere: no `!3d!4d` in the redirect URL, no DMS, no static-map pin in the body, and no `cid=` for `maps-cid-pins.json` to answer. The place is named by a plus code or by a neighbouring business, which is a label, not a published pin, so these are carried through and logged rather than handed to a geocoder. The other 55 ship the pin Swift Express's own link resolves to, under `geo_method: carrier_relay` like every other record here, all 55 `exact`. Losing those five costs two wilayas, Ghardaïa and El M'Ghair, where the omitted office was the carrier's only one: Swift Express reaches 47 wilayas and ships 45. Package coverage stays at 64 wilayas; no wilaya here is new.

  **The page says "68 agences"; the list has 60.** That headline is not computed. It sits in the site's own French copy dictionary, in the same block as the tag "Encore plus bientôt..." (more coming soon), and is repeated verbatim in four marketing strings. The `offices` array is the page's data, and it holds 60 entries with 60 distinct Maps links and no pagination, no "load more" and no second request. There is no sixty-first office anywhere in the payload or in the rendered markup, so the eight-office gap is a copy claim this package cannot itemise, not eight agencies it failed to read.

  **Ids come from the office's own record key.** Each office carries an `id` ("236" for Adrar, "185" for Chlef) that is a database key, not the display order, so `swift-express-236` survives Swift reordering, inserting or dropping a row, the same way Noest's ids come from its branch codes. The `number` field looks like a branch code and is not one: it restates `city.id`, the wilaya, so an id built from it would collide for Alger's four offices. `city.id` is the wilaya the office declares and is what the pin is cross-checked against in the build; `village` is the commune, and it is what names the office.

- 08c449d: Add ZR Express: 77 offices, 526 stop-desks from 449, retrieved 2026-10-25.

  ZR Express has been in the registry since the package shipped, at `open_agency_data: "none"`, on a note that read "public site is Cloudflare-blocked. No open agency list." That note pointed at `zrexpress.com`. The carrier's live site is `zrexpress.net`, a different domain, and it answers an ordinary request and publishes an open office list at `/en/offices`. The registry entry now carries the `.net` website, `geocoded`, and a note that says which domain is which so the next pass does not re-learn it.

  **80 offices published, 77 shipped, 3 omitted.** The three are Dellys (Boumerdes), El Tarf and Touggourt, whose rows link `query=Hub Dellys Dellys Boumerdès Algerie` and the like: a place-name search, not a coordinate. That is an address, and this dataset does not geocode a stop-desk from an address, so each is carried through to the carry-over step and logged with that reason rather than handed to Google. The other 77 each ship the pin ZR Express itself publishes, under `geo_method: carrier_relay` like every other record here. Two of them are not `exact`: see below. 524 of the 526 records are `exact` and 2 are `approximate`, so this is the release where the sector stops being single-precision, and `StopDesk.geo_precision` widens from the literal `"exact"` to `"exact" | "approximate"`. ZR Express's 77 offices span 53 wilayas, one of which, In Guezzam (54), no other carrier here reaches: package coverage goes from 63 wilayas to 64.

  **The pin is inside the link, so nothing is resolved over the network.** ZR Express links `google.com/maps/search/?api=1&query=<lat>,<lng>` per row, which already states the coordinate. The link resolver now reads the link itself before it fetches anything, and only falls through to the redirect when the link carries no coordinate. That is 77 requests to Google not made on this pull, and it costs the other carriers nothing: Anderson's and Noest's shortlinks carry no coordinate and resolve exactly as before.

  **Ids are not built from the row number.** The number down the left of the page (001..080) is the index of the list as rendered, straight down a sort by wilaya: inserting one office in Adrar would renumber every office after it. So ids come from the wilaya and the office's own commune, `zr-express-01-adrar`. The wilaya column is Latin, mapped to a code against the flagship registry, which also gives ZR Express the same card-wilaya cross-check Anderson and Noest get: none of the 77 pins failed it.

  **Four offices sit in the commune of Constantine and three in Oran**, so wilaya and commune do not name an office there. The only field that tells them apart is the Arabic office name (`مكتب زواغي`, `مكتب كاناستال`), which slugs to nothing in Latin, so where a commune holds more than one office each id carries a four-character digest of that name. The digest depends on the office's own name and nothing else, so reordering, adding or dropping a row never moves an existing id; a commune that goes from one office to two hands its old id back through `carryRenamedIds`, the same path a rename takes. Stop-desk records also carry `name_ar` now, which is where that name is published.

  **Two of ZR Express's Constantine offices, the sorting centre and the Zouaghi bureau, link the identical coordinate.** Both are the operator's own pin and both fall inside the wilaya their row declares, so neither is dropped on a guess about which one is right: the wilaya cross-check has nothing to object to, and guessing would unpublish a real office. But a coordinate two records share is not a per-record point, which is the repository-wide rule `demoteSharedPoints` applies on every emit, so both ship `approximate`. They are the only two approximate records in the package.

- 4a61dbf: Refresh livraison from all five carrier sources, retrieved 2026-10-25: 411 stop-desks to 449.

  Previous pull 2026-06-18. Yalidine 199 rows, Guepex 162, Anderson 104 of 116 cards, Noest 102 of 114, Maystro 38 of 44. 16 carriers, 9 with open desks, 63 wilayas from 61. Every one of the 449 records is `geo_precision: exact` / `geo_method: carrier_relay`, as all 411 were: nothing here is approximate, so the sector stays single-precision.

  **40 added, 2 removed.** The additions are four months of sources that publish continuously, plus three desks the fetcher had been unable to read at all (below). Both removals were checked against the live page rather than inferred from the diff: `470201` (speedmail, Bounoura) is gone from the Yalidine table and `anderson-33-in-amenas` is gone from Anderson's directory.

  **Ids follow places.** A carded id is minted from the card's own title, so when Anderson retitled "Sidi Abdellah" to "Sidi Abdellah - Zeralda" the same desk, 24 m away, would have retired `anderson-16-sidi-abdellah` and minted a new id. A new id that lands within 100 m of a disappeared one, same operator and same declared wilaya, now takes that id back, nearest pairing first so the outcome never depends on the order a carrier lists its cards in. A committed desk carries the wilaya its coordinate resolved to, so for the nine carded desks in wilayas a reform created (`anderson-5-barika` ships `60` against a card still printing 05) "same declared wilaya" reads the card that prints the wilaya the reform one was carved out of, taken from the flagship registry's own `mother_wilaya_code`, as agreeing; comparing the two literally would retire exactly those nine ids on a rename, and accepting any reform code would let an unrelated wilaya claim one. A card that prints no wilaya badge at all (Maystro prints one only inside its own coverage list) is matched on the 100 m radius alone, which was the test deciding in any case. `anderson-16-sidi-abdellah` keeps its id, and no id in this release changed hands.

  **Three desks the fetcher could not previously read are now published.** `noest-14c` (Ksar Chellala) links `google.com/maps?q=35.2121,2.3166` directly, a form the link matcher did not recognise, so the card was skipped entirely. `anderson-8-bechar` links a Maps place by cid alone (`?cid=6725298475309267754`), which names a place without stating where it is; that place's pin is committed with its provenance in `scripts/maps-cid-pins.json` and consulted only as a fallback, so a live resolution always wins. Both are the operator's own pin, so both are `exact`.

  **Two desks kept the coordinate they already shipped** because their Maps link would not resolve: `anderson-25-ali-mendjeli`, whose link is now a Plus Code place carrying no coordinate, and `noest-19b` (El Eulma). Before this change they were dropped, which deletes a stop-desk that is still published and retires its id over one failed request. **Neither is dated as read this refresh.** `metadata.sources[].retrieved` says when each carrier's list was read, which for a fresh pin is also when the coordinate was read and for a carried one is not, so the new `metadata.carried_pins` lists every desk shipping a coordinate this run did not read, with its id, its name and the date of the run that did: both of these were last read on 2026-06-18, the pull their coordinate has been unchanged since. The list is always present and empty when every link resolves, it joins the records by id, and a pin carried across several refreshes keeps the one run that read it rather than ageing forward a refresh at a time. It is metadata rather than a field on the record because a declared record field that no record carries fails this repository's own types-versus-data gate, so an optional per-record date would break the build on the first refresh where nothing is carried. The run log now names the carried desks rather than only their ids.

  **Four Noest cards link a pin in the wrong wilaya, and all four are omitted.** Each one's Maps link resolves into the area of a _different_ Noest desk, so the wilaya cross-check refuses it, and none of the four has an earlier committed coordinate to fall back on. 27B (Mostaganem) links the identical URL to 30B (Ouargla), which can only be right for one of them: the check keeps it for 30B, whose card wilaya matches the pin, and refuses it for 27B. 15C (Tizi Ouzou, Draa Ben Khedda) resolves to 27.8775, -0.2902, which is 1.1 km from `noest-01a` in Adrar. 26A (Medea) resolves to 36.3514, 6.6038, which is in Constantine, 4.5 km from `noest-25a`. 55A (Touggourt) resolves to 27.1980, 2.4787, which is in In Salah, 420 m from `noest-53a`. The run log now names every one of them with the wilaya it declared, the wilaya its pin fell in and that pin's coordinate, and no longer truncates the list at six. A card whose pin lands in a wilaya other than the one it declares is now dropped outright: the card and the link contradict each other, the run cannot tell which is right, and re-shipping the point the desk published last quarter would present a stale coordinate as this run's verified one. The desk comes back by itself on the run after the link is fixed.

  The remaining omissions are cards this run could not place at all, and the log now separates the two reasons, because the fix for each is different. Four Noest cards publish no Maps link whatsoever (03B Aflou, 21B Azzaba, 31D Arzew, 43B Chelghoum Laid): those can only come back when Noest adds a link. Four more link a pin that would not resolve this minute (05C Batna, 12C Bir El Ater, 19RE Guidjel, 51A Ouled Djellal), as do 12 Anderson cards and 6 Maystro ones, and those may resolve on the next run. All of them reach the carry-over step and are logged rather than silently skipped; none has an earlier coordinate, so all are omitted and none is geocoded from its address.

  15 names and 16 addresses are updated upstream, and 3 Yalidine rows that had lost the brackets around their operator tag parse again (two of them also read as a name change, on top of those 15). No desk changed wilaya or commune, and the accuracy review reports 0 of 449 outside their wilaya and 0 in a non-adjacent one. 45 coordinates moved, 39 under a kilometre and the carded ones to a median of about 13 m. The six over a kilometre are the carriers' own pins, the largest `anderson-56-djanet` at 10,039 m, resolved from Anderson's current link for the same card in the same wilaya and commune and published as the operator states it.

  Also fixes `coverage.json`: its `wilayas[]` are zero-padded `"01".."69"` again, the key `stopdesks.json` carries. The v2 migration moved stop-desks to padded codes and the 2026-07-20 fix converted the committed file by hand without changing the generator, so this refresh would otherwise have put the integers back and broken the join between the two files inside the package.

  **Retired ids are now reserved.** `data/retired-ids.json` lists the ids no stop-desk may ever hold again, seeded with this release's two removals, `470201` and `anderson-33-in-amenas`, both checked against the live sources. A stop-desk id is a public join key and a carded id is minted from the card's own title, so the same title returning later would hand a cached reference to a different place. Neither a fresh mint nor a card rename can take a retired id back.

  **Retirement now waits one refresh.** An id missing from a single run is not proof the desk is gone: a card the carrier retitles in the same run its Maps link fails mints a new id and leaves the old one unclaimed, so the old id used to be retired over one failed request and the desk would return later as a different place. An id a refresh stops carrying is now parked in the ledger's new `pending` map with the date it was first missed, and retires only when the next refresh misses it again. While it waits it is reserved exactly as a retired id is, so no other desk can be minted onto it, but its own desk may claim it back: the entry keeps the last position the package published for that id, and a returning card within 100 m, same operator and same declared wilaya, takes the id back through the rename rule. The ledger has to keep that position because by then the record is gone from the committed data and nothing else remembers where the desk stood. An id published again simply leaves the map. Two runs on one date are one refresh, so an offline `--cache` replay reproduces the ledger instead of retiring what the live run parked, and a desk dropped for a bad pin is still held, neither retired nor parked.

### Patch Changes

- e09088c: Rebuild livraison offline: every carrier pull is now a committed capture.

  The package was the last carded dataset whose build existed only as a live run. Its eight sources (Yalidine, Guepex, Anderson, Noest, Maystro, ZR Express, Swift Express, HHD Express) now write through the repository's source store into `sources/livraison/`, and `node scripts/fetch.mjs --cache` re-emits the whole package from there with no network at all. A dead, moved or WAF-blocked carrier can no longer block a re-emission, and a refresh arrives as a reviewable git diff of the capture rather than only as a diff of the output.

  **What is stored is the parsed projection, not the carrier's page.** Each capture holds the rows the build consumes (id, name, commune, the wilaya the card declares, address and the operator's own Maps link), which is what the package already publishes, so no all-rights-reserved page is relicensed into the repository. It is also what keeps the store at 387 KB instead of several MB: HHD's home page alone is ~530 KB and Swift's RSC payload ~2.7 MB. This is the rights-safe shape the Bus Operator captures already use.

  **The Maps resolutions are captured too, because they decide the coordinates.** A stop-desk's pin comes from resolving a shortlink that carries no coordinate of its own, so a capture of the cards alone would still have to ask Google and could not reproduce the same pins. `maps-resolutions.json` records all 484 links, keyed by the link the carrier printed: the final URL, the coordinate extracted from it and the tier that produced it (inline, redirect, place-dms, static-map, cid-pin, unresolved). Google's per-request parameters are stripped from the stored URL, which would otherwise churn the entire capture on every re-fetch with no changed fact in it.

  Dates follow the repository's rule: a live run stamps its own, a `--cache` replay reuses the committed ones, so the rebuild is reproducible on any later day. Verified against the published build: both a live run and a zero-network `--cache` rebuild reproduce `stopdesks.json`, `carriers.json`, `coverage.json`, `metadata.json`, `retired-ids.json`, both CSVs and the GeoJSON byte for byte. No data, id, carry rule or retirement logic changed.

- f1a05b8: These packages now work in a bundled app: esbuild and Vite can follow the data path.

  Before this release, `import { stations } from "@geoalgeria/ferroviaire"` (and the same for every package here) built fine and then threw `ENOENT ... /data/stations.json` on the first call. The JSON was read at run time from a path joined off `import.meta.url`; esbuild and Vite inline the module without relocating that read, so it went looking for the data next to the generated bundle. Node and Next.js with Turbopack were never affected, which is why this took until now to surface.

  Each package now reaches its data through a generated `loaders.cjs`: one `require` of a literal path per data file, inside a function. A bundler can trace a literal path, and the `require` stays lazy, so importing the package still parses nothing until you call a loader. Every call still answers with a fresh copy, as it always did, so a caller that sorts what it gets cannot reorder another caller's records.

  Nothing is different for you: same exports, same arguments, same return values, same TypeScript types, and not one record of data changed. Verified by packing each real tarball and running it three ways, under plain Node, an esbuild bundle and a Vite 8 SSR bundle (rolldown), with the three required to agree. Those are the three that are checked, and the only ones claimed.

  Turbopack is the one bundler that cannot be checked that way, because it needs a `next build`. It already served these packages before the fix, and the fix gives it a graph it has not seen before (an ESM index importing a CommonJS loader whose JSON arrives by literal `require`), so the proof for it is the geoalgeria.com preview build released in the same batch, which loads `@geoalgeria/gares-routieres` through its index on a live page.

## 2.0.2

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

## 2.0.1

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.0.0

### Major Changes

- e84384a: Data v2 — one canonical record contract across every sector package (breaking schema overhaul).

  Every sector package now shares a single record shape defined by the new `@geoalgeria/schema` dependency, replacing the hand-written, drifted `types/index.d.ts` per package. Read [`packages/schema/MIGRATING.md`](https://github.com/yasserstudio/geoalgeria/blob/main/packages/schema/MIGRATING.md) before adopting `2.0.0`.

  - **Breaking record shape**: `wilaya_code` is a zero-padded **string** (`"16"`, not `16`); commune linkage is `commune_code` (string ONS code) + `commune`; coordinates are `lat`/`lng`; external ids collapse into `refs: { osm, wikidata, … }`; `id` is an opaque string unique within its file (no more global `{sector}:{WW}-{seq}` form). Every record ships in **JSON, CSV and GeoJSON**.
  - **Breaking `geo_precision`**: strictly `exact | approximate | null`, **null if and only if** the record has no coordinate; the old method vocabulary moved to a new `geo_method` field under the same null-iff rule. `exact` now requires ≥3 decimals and a point unique within its file — 409 records that could not carry that claim were downgraded to `approximate`.
  - **Honest metadata**: real per-source `retrieved` dates; licence URLs only where the source is genuinely open, `conditionsOfAccess` prose otherwise. A root `index.json` catalog and a `schema.org/Dataset` descriptor ship alongside the data.
  - **Data fixes**: the capital-coordinate 9-cycle swap repaired; 30+11 mislinked records relinked; emploi communes recovered; 972 previously-dropped tourisme values restored.

  Not part of this release: the core `geoalgeria` dataset and `@geoalgeria/telecom` predate this contract and stay on their current v1 versions until migrated.

## 1.0.1

### Patch Changes

- Metadata: complete the package description and keywords to name the Anderson, Noest and Maystro networks alongside Yalidine and Guepex (data unchanged).

## 1.0.0

### Added

- Algeria's COD / e-commerce delivery layer, as installable data: a 16-carrier registry,
  411 geocoded stop-desks across 61 wilayas, and per-carrier coverage, in JSON, CSV and GeoJSON
- Carrier registry — 16 Algerian COD / e-commerce delivery companies, each with
  website, service model (stop-desk / home / both), cash-on-delivery support, scope,
  how openly it publishes agency data, and public-API availability
- 411 geocoded stop-desk points across 61 wilayas, from the carriers that publish open
  agency data: the **Yalidine + Guepex** federated relay (merged and de-duplicated by
  shared stop-desk id; operators Yalidine, Guepex, EasyAndSpeed, WeCanServices, SpeedMail,
  Zimou Express) plus three independent networks — **Anderson** (89), **Noest** (94) and
  **Maystro** (38) — geocoded from the Google Maps link on each agency card
- Per-carrier coverage — wilaya/commune stop-desk presence for the 9 carriers with open data
- Wilaya linkage (`wilaya_code`) resolved against the geoalgeria 69-wilaya model
  (Law n° 26-06, Journal Officiel n° 25 of 5 April 2026)
- Export formats: JSON, CSV, GeoJSON
- npm package with typed helper accessors (`carriers()`, `stopdesks()`, `coverage()`,
  `carrierById()`, `stopdesksByWilaya()`, `stopdesksByCarrier()`, `coverageByCarrier()`,
  `metadata()`)
