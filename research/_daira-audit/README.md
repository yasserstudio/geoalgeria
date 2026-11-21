# research/_daira-audit: how far each daira list is checked

Tracked provenance for the `audit`, `name_ar` and `name_ar_source` fields of
`packages/dataset/data/dairas.json` (geoalgeria.com#360).
[`scripts/apply-daira-audit.mjs`](../../scripts/apply-daira-audit.mjs) writes
them from [`daira-audit.json`](daira-audit.json); `--check` fails when the two
drift, and `test/daira-audit.test.mjs` holds the counts below.

The audit adds fields only. It changed no daira, no commune list and no name:
`daira-audit.json` pins every daira's communes as they stood at `79c7206d`, the
commit it read, and the script refuses to grade a row whose communes moved.

## The grades

| `audit.status` | Dairas | Meaning |
|---|---:|---|
| `decree_table` | 210 | Read from a whole-wilaya table of the latest decree that tabulates the wilaya: 142 from 26-253 (2026), 68 from 21-198 (2021) |
| `agrees_1991` | 275 | Agrees with the 91-306 table (1991), as amended by 92-66 (1992) where it applies; 8 of them cite 92-66 under `amended_by` |
| `null` | 66 | Not graded; the data is unchanged |

The 66 open rows each carry an `open_reason` in `daira-audit.json`:

- **13 Algiers dairas** (wilaya 16, ids 177 to 189). Algiers was reorganized by
  ordonnance n° 97-14, décrets présidentiels n° 97-292 and 2000-45 and
  ordonnance n° 2000-01, which this audit did not read, and its dairas disagree
  with the 1991 table.
- **43 other disagreements**: the 1991 table, read again from the Journal
  officiel scan, disagrees with the dataset's communes, and no amending text was
  found. The difference may be a later change, a commune renamed since 1991 or a
  reading error.
- **10 weak matches** (ids 108, 158, 161, 164, 170, 171, 206, 306, 322, 359):
  the 1991 table agrees only through a weak name match or a reading that ran
  into the next daira's cell, so the agreement is not graded. `open_detail`
  names that reading for each, and `replay_citation` keeps the citation it
  would have had.

## Sources

Every citation points at the PDF on joradp.dz. The PDFs are not committed
(`.gitignore` excludes `research/**/*.pdf`); their SHA-256 sums are in the
`sources` block of `daira-audit.json`, and those `name_ar` is read from in its
`name_ar_sources` block:

| Key | Text | Journal officiel | Pages | Read from |
|---|---|---|---|---|
| `decret-26-253` | Décret exécutif n° 26-253 du 15 juillet 2026 | n° 52 du 21 juillet 2026 | Arabic edition pp. 10-18 (annex) | text layer, Arabic `A2026052.pdf` `440f9006…0077cbf` and the Owner's French copy `438d83be…d268` |
| `decret-21-198` | Décret exécutif n° 21-198 du 11 mai 2021 | n° 38 du 20 mai 2021 | pp. 8-11 | text layer, `F2021038.pdf` `87bb51e2…3068e6c`, `A2021038.pdf` `f620dd38…2ea2d3f` |
| `decret-91-306` | Décret exécutif n° 91-306 du 24 août 1991 | n° 41 du 4 septembre 1991 | pp. 1293-1318 | image scan by OCR, `F1991041.pdf` `5bfe8861…bf993edf` |
| `decret-92-66` | Décret exécutif n° 92-66 du 12 février 1992 | n° 13 du 19 février 1992 | pp. 276-278 | image scan by OCR with a visual check of p. 277, `F1992013.pdf` `ecb059d5…96dffd45a0` |
| `decree_26_112_ar` | Décret présidentiel n° 26-112 du 8 mars 2026 | n° 19 du 12 mars 2026, Arabic edition | p. 3 (annex) | page image, `A2026019.pdf` `c3869fc9…5bd5d081` |
| `decree_91_306_ar` | Décret exécutif n° 91-306 du 24 août 1991 | n° 41 du 4 septembre 1991, Arabic edition | pp. 1575-1602 (seats column) | image scan read visually, `A1991041.pdf` `a0b640a0…a92c20` |

A `decree_table` row cites the article and the wilaya table it was read from;
for 26-253 the page is the Arabic edition's, since that is the edition on
joradp.dz. Tlemcen (13) cites 26-253 rather than décret exécutif n° 25-87,
which re-tabled three of its dairas in 2025 and which 26-253 supersedes.

## What was not read

- Amendments of 91-306 between 1993 and 2020. None was found, but the Journal
  officiel issues of 1993 to 1999 are image scans and were not searched, so a
  later change the `agrees_1991` rows miss is possible.
- The Algiers texts of 1997 to 2000 named above.
- Décret présidentiel n° 15-140 on the circonscriptions administratives
  (n° 25-91 was seen). These attach dairas to walis délégués and are not daira
  lists.

## name_ar

| `name_ar_source` | Dairas | Read from |
|---|---|---|
| `decree_26_253_ar` | 142 | the Arabic table of 26-253, on `decree_table` rows |
| `decree_21_198_ar` | 51 | the Arabic table of 21-198, on `decree_table` rows |
| `decree_26_112_ar` | 13 | the annex of 26-112: the circonscriptions administratives of Algiers (177 to 189) |
| `decree_91_306_ar` | 31 | the seats column of the Arabic table of 91-306 |
| `seat_commune` | 311 | the `name_ar` of the seat commune the daira is named after |
| null | 3 | Bouinan (91), Houari Boumédiène (274), Aïn Smara (279) |

A decree source is used only where the decree prints the seat as our commune
record spells it, so `name_ar` always equals the seat commune's own `name_ar`.
The one exception is Beni Maouche (60), which has no seat commune: its name,
بني معوش, is read from its own row of 91-306 (p. 1578). A `decree_26_112_ar` or
`decree_91_306_ar` row gives its page in `name_ar_page`. 26-112 was read for the
names only; it grades no circonscription. Daia Ben Dahoua (474) was null before,
because its French name is spelled differently from its only commune, Dhayet
Bendhahoua (4703); 91-306 prints its seat as ضاية بن ضحوة, the commune's own
spelling, so it now carries that name.

The three null rows have no decree name that fits them today: 91-306 prints
Bouinan's communes under the Chebli daira, Houari Boumédiène's seat as
هيليو بوليس, and Aïn Smara as a commune of El Khroub.

26 of the `seat_commune` rows are rows whose decree spells the seat another way
(`name_ar_decree_spelling`, with the decree in `decree`):

- 16 are 21-198 rows. For six the text layer gives the printed form, such as
  تامنغست (112) for تمنراست and إن صالح (507) for عين صالح; for the other ten it
  did not yield one.
- 10 are 91-306 rows, read from the page image: عين الفكرون (27), مصطفى بن إبراهيم
  (250), قلعة بوسبع (270), خزارة (276), وادي زناتي (277), ترعي بينان (441),
  عين الأشياخ (443), برج الامير خالد (445), الخميس (453) and روينة (455).

By the Owner's decision these 26 keep the seat commune's spelling, so the
daira and commune records stay consistent; the decree spellings are recorded
only. Any respelling is made on the commune records in a follow-up, and the
daira's `name_ar` follows it.

Two member communes print differently in the Arabic tables than in our commune
records (`name_ar_mismatches`): Sidi Abdelli (1334) and Sidi Abderrahmane
(1438). They are recorded only; the commune records are unchanged.

## Seats

Each row records `seat_commune_code`, the member commune the daira is named
after; `dairas.json` publishes it (scripts/add-daira-fields.mjs), filling the
rows the audit left null by the same name rule and, for five, the same name
under another spelling. Beni Maouche (60) has no seat: its one member is
Beni-Mallikeche. Where a
decree prints the seat apart from that member, `seat_report` lists it: all 35
entries are `spelling_only` (the printed seat is that same commune under
another spelling, such as Abou El Hassane for Abou El Hassan). No decree seats
a daira on a different commune.

## Follow-ups

Deferred by the Owner from geoalgeria.com#360 (`kind`, `seat_commune_code` and
`communes` shipped in `dairas.json` on 21 Nov 2026):

- A test that each graded daira's communes equal the list the decree prints
  (only decree 26-253 has a machine-readable table, `research/_dairas/`).
- Respelling the 26 seat communes in `name_ar_decree_spelling`, at commune
  level.
- Grading the 13 circonscriptions administratives of Algiers from the annex of
  décret présidentiel 26-112, which was read for their names only.
