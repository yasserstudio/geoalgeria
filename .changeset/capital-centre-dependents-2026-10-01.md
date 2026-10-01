---
"@geoalgeria/agriculture": patch
"@geoalgeria/formation-professionnelle": patch
"@geoalgeria/industrie-pharmaceutique": patch
"@geoalgeria/sante": patch
---

Four sector packages follow the five corrected capital commune centres, from Biskra to Beni-Abbes.

47 borrowed coordinates move. No commune link, no `wilaya_code` and no published id changes.

`geoalgeria` corrects those five commune centres in this same release. These records have no point of their own: they borrow their commune's centre and say so in `geo_method` (`commune_centroid`, `wilaya_centroid`, `commune`), and the copy does not follow the original. Moved: `@geoalgeria/formation-professionnelle` 15, `@geoalgeria/industrie-pharmaceutique` 14, `@geoalgeria/agriculture` 12 and `@geoalgeria/sante` 6. Precision is unchanged and still honest: these are commune-level placements, and they now name their commune's current centre.

**No commune link and no `wilaya_code` moved anywhere**, which the previous centre batch cannot be read as a precedent for. Every one of these five moves stays inside its own commune's OpenStreetMap outline, and `scripts/lib/commune-resolver.mjs` asks that outline first and globally, so a centre moving within its own commune cannot re-attribute anything. `@geoalgeria/djezzy`, the one package here that re-joins, reports 0 re-joins. `test/record-in-declared-wilaya.test.mjs` finds the same exception set as before, with 0 created.

`@geoalgeria/formation-professionnelle` was rebuilt by re-running its own generator against its committed capture, offline, and the diff is 15 coordinates and nothing else. The other three were patched by `scripts/sync-commune-centroid-dependents.mjs`, which reads the flagship and nothing else. `@geoalgeria/sante` is listed in that script again, for a reason the script now records: its generator indexes every OSM and Wikidata health facility by **nearest commune centroid**, so a replay here refined establishments the published file does not refine, and it would have overwritten EHS Mere et Enfant Biskra (`07-ehs-03`), a building point the Owner hand-verified on 2026-09-30 (`quality/overrides/sante.json`). Recentring the six borrowed coordinates is what this release is for; that nearest-centroid index is its own fix.

**Four of `@geoalgeria/industrie-pharmaceutique`'s 14 were a gap, not this batch's own work.** That package was registered in `sync-commune-centroid-dependents.mjs` for `geo_method: commune_centroid` only, so its `wilaya_centroid` rows, which carry `commune: null` by design and therefore have no anchor to be compared against, were invisible to the staleness check in `scripts/validate-packages.mjs` too. `07-dm-01`, `25-pp-06`, `25-pp-07` and `25-pp-14` were still sitting byte-exact on the Biskra and Constantine centres the **2026-09-27 and 2026-09-29** batches had already repudiated, 6.0 and 3.0 km out, while `@geoalgeria/agriculture` rows of the same `geo_method` moved in both. The `repudiated` anchor now reaches them, and it is exact: it moves a coordinate only where it is byte-equal to a value a corrections file repudiates, and only to that row's replacement.

Record counts, ids, names, types, contacts and hours are untouched in all four: only `lat`/`lng` changed.

Refs yasserstudio/geoalgeria.com#236.
