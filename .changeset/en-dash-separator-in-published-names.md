---
"geoalgeria": patch
"@geoalgeria/aviation": patch
"@geoalgeria/cliniques": patch
"@geoalgeria/culture": patch
"@geoalgeria/enseignement-superieur": patch
"@geoalgeria/ferroviaire": patch
"@geoalgeria/poste": patch
"@geoalgeria/sante": patch
---

No published name uses an en dash as a separator any more.

482 name values carried one, and each now reads with a spaced hyphen: `Université
de Blida 1 - Saad Dahlab`, `Dar El Baroud - musée de site de Ténès`, `Aéroport de
Constantine - Mohamed Boudiaf`. It is the same substitution the em dash already
took, for the same reason: the character is a typographic habit of the page the
name was read from, not a fact about the place, and someone keying or searching
the name has no way to type it. Nothing else about any name changes, and no claim
is made about a house separator.

Where they were: 315 in `@geoalgeria/culture`, 106 in
`@geoalgeria/enseignement-superieur`, 29 in `@geoalgeria/aviation` (14 airport
names and 15 route endpoints, which the route GeoJSON resolves `from_name` and
`to_name` from), 23 in `@geoalgeria/sante`, 3 in `@geoalgeria/poste` and the same
3 in the `geoalgeria` postal mirror, 2 in `@geoalgeria/cliniques` and 1 in
`@geoalgeria/ferroviaire`. Ids, coordinates, codes, counts and every `name_ar`
that did not carry one are unchanged.

A dash between two digits is a range rather than a separator, so it is left
exactly as it stands: three `@geoalgeria/sports` facilities name an eponym's
years, `Stade Mohammed Dahbi Chraa (1933 – 2020)`, and that package is not
touched here.

Neither dash can come back. The shared writer folds every name it emits, the
fetchers that read raw OpenStreetMap names fold them as they clean them, and the
gate `pnpm validate` runs over every published record now reports both
characters, `@geoalgeria/livraison` included, which was outside it.
