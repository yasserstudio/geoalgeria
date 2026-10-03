---
"@geoalgeria/agriculture": patch
"@geoalgeria/formation-professionnelle": patch
"@geoalgeria/sante": patch
---

Three sector packages follow the 68 commune centres the coordinate review corrected.

52 borrowed coordinates move: 39 in `@geoalgeria/formation-professionnelle`, 11 in `@geoalgeria/sante` and 2 in `@geoalgeria/agriculture`. These records have no point of their own. They borrow their commune's centre and say so in `geo_method` (`commune`, `commune_centroid`, `wilaya_centroid`), and the copy does not follow the original on its own. Precision is unchanged and still honest: they are commune-level placements, and they now name their commune's current centre.

`@geoalgeria/formation-professionnelle` was rebuilt by re-running its own generator against its committed capture, offline; the other two were patched by `scripts/sync-commune-centroid-dependents.mjs`, which reads the flagship ledgers and nothing else. `@geoalgeria/industrie-pharmaceutique` and `@geoalgeria/djezzy` report 0 rows to move.

**No commune link and no `wilaya_code` moved anywhere.** Every one of the 68 centres stays inside its own commune's OpenStreetMap outline, and `scripts/lib/commune-resolver.mjs` asks that outline first, so a centre moving within its own commune cannot re-attribute a record. `test/record-in-declared-wilaya.test.mjs` finds the same exception set as before, with none created.

Record counts, ids, names, types, contacts and hours are untouched in all three: only `lat`/`lng` changed.

Refs yasserstudio/geoalgeria.com#243.
