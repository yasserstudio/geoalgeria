---
"@geoalgeria/aviation": minor
---

Every route now ships `sources`, its citation list: an ordered, never-empty array
of plain urls, no url twice, whose first entry is the row's own `source`. The
single-citation field keeps its meaning and its value, and a reader gains the
rest of the provenance instead of losing it.

One row can rest on several documents, which is why the list exists. Air
Algérie's own statement of 24 October 2026 is the best evidence that Conakry,
Brazzaville, Lagos, Shanghai and Tripoli at Mitiga are coming, and when, and it
carries no flight number, no day name and no airport for Tripoli. It joins all
ten of those legs as an extra url, while each row's `source` stays the report
that covers the fields it ships. The statement alone moves nothing: a statement
that a line opens is an announcement, and a leg leaves `plannedRoutes()` only on
a dated report that the aircraft flew.

JSON and the GeoJSON `properties` carry the list as it is; the CSV, a flat table,
carries the urls space-separated in one column next to `source`, the same
encoding the `days` column uses. The decision is recorded in
`docs/adr/0002-per-row-citation-list-for-aviation-routes.md`.

**All ten of those legs now have that report**, and with the two Nigeria middle
sectors that never cited the statement, twelve rows left `plannedRoutes()` over
three passes. They are the only rows this release moves.

Two had it on 26 October. **Algiers to Conakry** is operating: two Guinean
outlets of 26 October 2026
have the inaugural aircraft on the tarmac at Ahmed Sékou Touré in the night of
Sunday 25 to Monday 26 October. **Algiers to Shanghai** is operating: APS, Algeria's
press agency, and a second report of 26 October carry the inaugural rotation's
departure from Houari Boumediene that day. Each promoted row cites the report of
the operation first and keeps the announcements behind it. The announced returns
from Conakry and Shanghai, Brazzaville, the Nigeria sectors, Tripoli and the
Kuwait-Amman rotation were all still `planned` on 26 October, each because no
dated report of its first flight existed yet, never because anything said a line
was cancelled.

A third leg had it on 28 October. **Algiers to Tripoli** is operating: the
inaugural `AH 4006` left Houari Boumediene at 09:00 on Wednesday 28 October 2026
for Mitiga, where its arrival was reported the same day, and the row gains the
flight number, the first any source has given for it.

**Six more legs followed on 30 October**, and they arrive on a kind of evidence
this dataset had never accepted: a flight's own history on a flight tracker,
showing a dated leg landed. The owner's rule of 30 October 2026 accepts that as a
report that the leg flew, and nothing more, so a tracker's schedules, route maps
and booking inventory still count for nothing, and nor does a cancelled rotation
or a row with no status.

It closes the gap no publisher was ever going to close. **Four returns** are now
operating, Shanghai to Algiers (`AH 3083`), Conakry to Algiers (`AH 5359`),
Mitiga to Algiers (`AH 4007`) and Brazzaville to Algiers (`AH 5391`), and so is
the Algiers to Brazzaville outbound (`AH 5390`). **Both Nigeria triangles are
complete**: all four remaining sectors flew in the 27 to 30 October window under
`AH 5354`, the number both rotations use, so `alg-los`, `los-alg`, `abv-los` and
`los-abv` join the two Abuja legs that were already operating. Each row cites its
own history first and keeps every report it already rested on behind it.

Five rows gain or correct a field no publisher supplied. The **Conakry and
Brazzaville returns** get operating days, Mondays, Wednesdays and Fridays and
Tuesdays, Thursdays and Sundays respectively, each read off observed nights and
each a day later than its outbound, which is why reading a return's day off its
outbound was never allowed. The **two Nigeria middle sectors** move from the day
their filing gives the whole rotation to their own local departure day, Abuja to
Lagos from Monday to Tuesday and Lagos to Abuja from Thursday to Friday, and both
gain the rotation's flight number. The **Tripoli return** gets the first flight
number any source has given it.

Because a tracker's free history covers only seven days, every observation behind
these rows, its date, its landing time and the aircraft's registration, is
written out in `research/_flight-routes/verification-2026-10-30.md` rather than
left to a link that will stop showing it.

What is still `planned` is eight rows: Seoul, Moscow, N'Djamena and the
Kuwait-Amman rotation. None of them has an observed operation, and none of them
is cancelled. The Moscow legs keep their rows and gain one citation: on 26
October the Russian ambassador to Algeria said he hopes direct flights resume
early in 2027, a postponement rather than a withdrawal.

The Kuwait rotation also gains the flight number and the two departure days the
AeroRoutes NW26 filing of 29 June 2026 states for it, `AH 4064` on all three legs
of one weekly Algiers-Kuwait-Amman-Algiers rotation. It stays `planned`: a filed
schedule is not an operation, and the tracker has no data at all for either of
the rotation's numbers, which is a silence and not a contradiction.

So the counts move by nine: 169 nonstop legs and 8 planned ones, 177 rows as
before, no row added or removed. `metadata.routes_as_of` stays at 2026-10-09,
because this release re-read the announced lines and not the winter schedule
the network turns over to on 25 October.
