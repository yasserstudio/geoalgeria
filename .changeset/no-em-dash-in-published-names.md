---
"@geoalgeria/banques": patch
"@geoalgeria/ecoles": patch
---

No published school or bank name carries an em dash any more.

Three records had one as a separator, four name strings between them: CNEP's
bank name in both `name` and `name_fr` (`Caisse Nationale d'Épargne et de
Prévoyance - CNEP-Banque`) and two OpenStreetMap school names in Ouamri
(`École primaire - Khaldi Mohammed`, `École primaire - Chouakri Ali`). Each now
reads with a spaced hyphen, which keeps the source's separation of the name
without keeping the character. Nothing else about any name changed, no claim is
made about a house separator, and the en dash is out of scope. Ids,
coordinates, codes and counts are unchanged; `name_ar` was never affected.

The bank registry is hand-curated, so it is corrected in `banks.json`. The
school names came straight from the OpenStreetMap tag, so `packages/ecoles`
now folds the separator as it reads a raw name, and the em-dash gate covers
every published `name` field rather than metadata alone, so neither can return.
