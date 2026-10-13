---
"@geoalgeria/banques": patch
"@geoalgeria/ecoles": patch
---

No published name carries an em dash (U+2014) any more. Three records had one as
a separator, four name strings between them: CNEP's bank name in both `name` and
`name_fr` (`Caisse Nationale d'Épargne et de Prévoyance - CNEP-Banque`) and two
OpenStreetMap school names in Ouamri (`École primaire - Khaldi Mohammed`,
`École primaire - Chouakri Ali`). Each now reads ` - `, the separator its own
package's names already use: 97 `ecoles` name strings carry it and none an en
dash, and of the 21 bank names the 10 that take a separator at all now all read
` - `, CNEP having been the only exception. Ids, coordinates, codes and counts
are unchanged; `name_ar` was never affected.

The bank registry is hand-curated, so it is corrected in `banks.json`. The
school names came straight from the OpenStreetMap tag, so `packages/ecoles`
now folds the separator as it reads a raw name, and the em-dash gate covers
every published `name` field rather than metadata alone, so neither can return.
