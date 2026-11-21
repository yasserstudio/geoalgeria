---
"geoalgeria": minor
---

Add three fields to every row of `data/dairas.json`: `audit`, how far the daira's commune list is checked against the Journal officiel, and `name_ar` with `name_ar_source`. 210 dairas are `decree_table`, read from a whole-wilaya table of decree 26-253 (2026) or 21-198 (2021); 275 are `agrees_1991`, agreeing with decree 91-306 (1991) as amended by 92-66 where it applies, with later amendments not exhaustively searched; 66 are not graded (`status` null): the 13 Algiers dairas, reorganized by texts of 1997 to 2000 that this audit has not read, 43 that disagree with the 1991 table with no amending text found, and 10 that match it only weakly. Each graded daira cites the decree, article, page and the joradp.dz PDF. `name_ar` is set on 494 dairas, from the decree's Arabic table or the seat commune's Arabic name, and null on the other 57. No daira, commune or membership changed. The `Daira` type gains the same fields.
