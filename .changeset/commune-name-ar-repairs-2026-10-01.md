---
"geoalgeria": patch
---

23 commune `name_ar` spellings are repaired: 22 lose a justification kashida, and Souk El Tenine gets its definite article back.

**The kashida is typography, not orthography.** U+0640 ARABIC TATWEEL stretches a joined letter so a line can be justified; a reader never sees it as a letter, and every GeoAlgeria search key folds it away. 22 commune names carried it anyway, 21 in Tizi Ouzou (15) and Drean in El Tarf (36), and a name that carries it renders as broken type wherever the raw value is printed rather than typeset: the 2026-08-13 search-snippet audit is what found them. `أيت عقـواشة` is now `أيت عقواشة`, `بنــــي زمنزار` is `بني زمنزار`, and the other twenty read the same way.

**Souk El Tenine (608, Béjaïa) spelled `سوق لإثنين`**, which drops the alef of the definite article and moves the hamza onto the lam. It is not the Arabic for Monday and it is not what this repository says anywhere else: commune 1557 in Tizi Ouzou carries the same French name and has always spelled it `سوق الاثنين`, which 608 now does too. This package is its own witness here, so the repair needs no external text.

**Where they come from.** The Web app has carried all 23 in its own copy of this table since that audit, which is a fork with no sync path, and the ROADMAP has listed them as an upstream item ever since. They live here now, so the next regeneration cannot resurrect the old spellings.

Every carrier of a commune `name_ar` moves together. Nine files change: `data/communes_w1_w23.json` (22 rows), `data/communes_w24_w48.json` (1), `data/algeria.json`, `data/geojson/communes.geojson`, `data/csv/communes.csv`, `data/sql/full.sql`, `data/ecommerce/communes.json`, `data/ecommerce/communes.csv` and `data/ecommerce/communes.sql` (23 each). `data/communes_w49_w69.json` is checked and holds none of the 23, because wilayas 59 to 69 are not among the three affected. `scripts/fix-commune-name-ar.mjs` applies them from `scripts/lib/commune-name-ar-repairs.mjs` and refuses any stored value that is neither the recorded `from` nor the `to`, so a carrier that has drifted elsewhere fails rather than being overwritten; `--check` is the rerunnable guard. `test/commune-name-ar.test.mjs` reads every carrier through one shared reader, runs that `--check` itself, and holds two floors: every repaired name reads its repaired spelling, and no commune `name_ar` in any carrier carries a tatweel at all.

No id, coordinate, postal code, daira, French name or record count changes, and no folded search key moves, because the fold already removed the kashida.

Refs yasserstudio/geoalgeria.com#239.
