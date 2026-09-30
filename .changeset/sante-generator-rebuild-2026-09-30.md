---
"@geoalgeria/agriculture": patch
"@geoalgeria/cliniques": patch
"@geoalgeria/culture": patch
"@geoalgeria/djezzy": patch
"@geoalgeria/ferroviaire": patch
"@geoalgeria/formation-professionnelle": patch
"@geoalgeria/industrie-pharmaceutique": patch
"@geoalgeria/mosquees": patch
"@geoalgeria/ooredoo": patch
"@geoalgeria/sante": patch
---

`@geoalgeria/sante` comes from its own generator again, with every published id intact: 49 records corrected, 0 retired, 0 minted, 0 renumbered.

The previous release moved sante's coordinates with `scripts/sync-commune-centroid-dependents.mjs` because replaying its generator retired two published ids (`05-epsp-07`, `16-ehs-14`) and minted one (`05-epsp-13`). Ids are public join keys, so the release stopped rather than churn them. Replaying it now, on the corrected commune centres, would have retired sixteen. Both causes were bugs in the generator, not facts about the establishments.

**The carry key followed the geocoding match, not the place.** `carryOverIds` pinned each record back to the id it shipped under, keyed on its OpenStreetMap id and only falling back to the Ministry of Health post id. The OSM id is the outcome of a proximity match, so a facility that merely matched a different OSM way looked like a different facility: fifteen of the sixteen retirements were one establishment under one MSP post id whose OSM match had moved, including all three the previous batch reported. The key now reads the MSP registry id first, which is the establishment's own identity in the source of record and survives a re-pairing or a new OSM match. OSM and Wikidata stay as fallbacks for the records the MSP pull never named.

**A commune reached on a fragment of its name was treated as proof that two posts are one facility.** The registry publishes each establishment twice, once in French and once in Arabic, and the two are paired on a shared commune when nothing stronger matches. The weakest commune tier matches a single long token, so `EHS Chirurgie Cardiaque Clinique Mohamed Abderrahmani` lands in the commune Mohamed Belouzdad on the given name alone, as does the Arabic post of `EHS Dr Maouche Mohand Amokrane`. They were paired: the sixteenth retirement was a real Algiers cardiology hospital deleted, its Arabic name reattached to a different one. The pairing now refuses a commune that only two such fragments agree on, and `matchCommune` reports whether the match covered the whole commune name or part of it. A partial match still places and geocodes the record; it no longer identifies it.

**What moved in the 695 records**, each checked against the published file field by field: 29 `commune` labels now read the flagship's own spelling (`Tebessa` to `Tébessa`, `N Gaous` to `N'Gaous`); 4 gained the `commune_code` their commune has since been given (`11-epsp-05`, `16-ehs-03`, `16-ehs-14`, `16-eph-02`); 8 upgraded from a commune centroid to an OpenStreetMap point and 6 came back down to a centroid, the facility they had matched now being nearest a different commune after the centre corrections; `16-ehs-13` re-matched to a different OpenStreetMap way inside its own commune Bachedjerah, 2.5 km from the node it had matched; and `52-epsp-03` is placed for the first time, in Tabelbala. Names, types, sectors, slugs, wilaya codes and the record count are untouched.

`@geoalgeria/cliniques` follows sante, which it reads to exclude the hospital tier: 1,914 care facilities, up one. `16-00227` retires because sante now carries that OSM way itself, and the two OSM elements sante released, `node/12912386452` and `node/3006447014`, come back to the community tier as `16-00077` and `42-00036`.

**Generators no longer write an empty `retired-ids.json`.** Every file under a package's `data/` enters its npm tarball, and an empty ledger states nothing, so `writePackageV2` and `writeRetiredIds` now skip it and delete an empty one already on disk. The eight empty ledgers the last release committed are removed from `agriculture`, `culture`, `djezzy`, `ferroviaire`, `formation-professionnelle`, `industrie-pharmaceutique`, `mosquees` and `ooredoo`; their data is unchanged. A package that has retired an id still ships its ledger, unchanged.
