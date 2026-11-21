---
"geoalgeria": minor
---

Add three fields to every row of `data/dairas.json`: `audit`, how far the daira's commune list is checked against the Journal officiel, and `name_ar` with `name_ar_source`. 210 dairas are `decree_table`, read from a whole-wilaya table of decree 26-253 (2026) or 21-198 (2021); 275 are `agrees_1991`, agreeing with decree 91-306 (1991) as amended by 92-66 where it applies, with later amendments not exhaustively searched; 66 are not yet audited (`status` null): 56 disagree with the 1991 table with no amending text found, all 13 Algiers dairas among them, and 10 match it only weakly. Each graded daira cites the decree, article, page and the joradp.dz PDF. `name_ar` is set on 494 dairas, from the decree's Arabic table or the seat commune's Arabic name, and null on the other 57. No daira, commune or membership changed. The `Daira` type gains the same fields.
