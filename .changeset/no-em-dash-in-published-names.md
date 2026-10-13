---
"@geoalgeria/banques": patch
"@geoalgeria/ecoles": patch
---

No published name carries an em dash (U+2014) any more. Three records had one as
a separator where every neighbouring record uses ` - `: CNEP's bank name
(`Caisse Nationale d'Épargne et de Prévoyance - CNEP-Banque`, the only one of
the 21 banks that differed) and two OpenStreetMap school names in Ouamri
(`École primaire - Khaldi Mohammed`, `École primaire - Chouakri Ali`). Ids,
coordinates, codes and counts are unchanged; `name_ar` was never affected.

The bank registry is hand-curated, so it is corrected in `banks.json`. The
school names came straight from the OpenStreetMap tag, so `packages/ecoles`
now folds the separator as it reads a raw name, and the em-dash gate covers
every published `name` field rather than metadata alone, so neither can return.
