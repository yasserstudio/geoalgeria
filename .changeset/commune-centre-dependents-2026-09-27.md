---
"@geoalgeria/agriculture": patch
"@geoalgeria/cliniques": patch
"@geoalgeria/culture": patch
"@geoalgeria/djezzy": patch
"@geoalgeria/ecoles": patch
"@geoalgeria/enseignement-superieur": patch
"@geoalgeria/formation-professionnelle": patch
"@geoalgeria/industrie-pharmaceutique": patch
"@geoalgeria/mosquees": patch
"@geoalgeria/ooredoo": patch
"@geoalgeria/pharmacies": patch
"@geoalgeria/protection-civile": patch
"@geoalgeria/sante": patch
---

Rebuild 13 sector packages on the corrected commune centres: 45 coordinates moved, 1,178 commune links re-derived.

`geoalgeria` corrects 56 commune centres in this same release, by 0.75 km to 217 km. Every package here derives from those values, so none of it was right until they were rebuilt against them. Two separate things were stale.

**45 coordinates were a repudiated commune centre.** These records have no point of their own: they borrow their commune's centre and say so in `geo_method`. The copy does not follow the original. `@geoalgeria/sante`'s *EPH El Harrach (Hassan Badi)* shipped at the old El Harrach value, 51.5 km from the hospital and inside wilaya 35; the 23 Algiers institutions of `@geoalgeria/agriculture` sat on the Alger Centre point that was in the sea. Moved: sante 7, agriculture 23, formation-professionnelle 10 (including the CFPAs of Melbou, Mazagran, Marsa Ben M'Hidi and Chelghoum Laid), enseignement-superieur 3 (ENP, ENSA and EPAU, all at El Harrach) and industrie-pharmaceutique 2 (SAIDAL El Harrach, BIO OSTEO). Precision is unchanged and still honest: these are commune-level placements, they now name the commune's current centre.

**1,178 `commune_code` links moved, and 270 `wilaya_code` with them.** `commune` and `commune_code` are stamped by nearest commune centroid, so a centre that moves 25 km stops being the nearest for everything around where it was and starts being it around where it is. Re-derived: mosquees 720, ecoles 266, pharmacies 105, cliniques 39, culture 29, ooredoo 13, djezzy 3 and protection-civile 3. Wilaya moved for 254 mosques, 10 cultural places and 6 pharmacies.

**Record counts, names, types, contacts and ids are untouched in every package.** Only `lat`/`lng`, `commune`, `commune_code` and `wilaya_code` changed, plus the `metadata.json` fields derived from them (sante's bbox reaches 37.065 now that Chetaibi is on the coast). Ten of the thirteen were rebuilt by re-running their own generator against its committed capture, offline; the other three cannot replay offline and were patched by `scripts/sync-commune-centroid-dependents.mjs`, which reproduces the same reads of the flagship and nothing else.

**This release is also the first rebuild since the JORA name corrections of 2.1.0**, which no dependent had picked up either. That accounts for a further 3,031 `commune` labels now matching the flagship spelling (`Ain Madhi` to `Aïn Madhi`, `Hassi R'mel` to `Hassi R'Mel`), 258 `commune_code` and 47 `wilaya_code` from the same earlier pass, and one vocational centre in Ouamri that is placed for the first time because its commune name now resolves.

**A guard keeps the class out.** `pnpm validate` now checks every record that declares a commune-level placement against the flagship: 1,151 of them, and a coordinate that is not the current centre of the commune it names fails the build. It is a table of the bound `geo_method` values, not a guess, because three commune-flavoured methods in this repository are deliberately not a flagship centre (the Ooredoo 5G per-commune points, and the wilaya-mean placements of industrie-pharmaceutique and enseignement-superieur).

Closes yasserstudio/geoalgeria.com#169.
