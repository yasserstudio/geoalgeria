---
"geoalgeria": minor
---

Add three fields to every row of `data/dairas.json`: `communes`, the member commune codes in ascending order (the same membership as each commune's `daira`); `seat_commune_code`, the member commune the daira is named after, set on 550 of 551 (null on Beni Maouche, whose one member is Beni-Mallikeche); and `kind`, `circonscription` for the 13 circonscriptions administratives of Algiers and `daira` for the other 538. No daira, commune or membership changed. The `Daira` type gains the same fields.
