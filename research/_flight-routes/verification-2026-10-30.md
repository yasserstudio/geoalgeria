# Flight-route verification, 2026-10-30

The winter-launch pass. The 2026-10-26 and 2026-10-28 passes promoted three outbounds
and left every return planned, because nothing published says which day an aircraft
leaves the far end of a new line, and left four Nigeria sectors planned for want of
anyone reporting a flight between two foreign airports. This pass answers nine of
those questions, under the Owner's decision of 30 October 2026 that a flight tracker's
own flight **history** is a dated report that a leg flew (`collection-rules.md`
section 36).

Counts after this pass: **177 rows, 169 operating and 8 planned, 78 endpoints**
(was 160 operating and 17 planned). No row is added or removed; nine move from
`planned` to operating. What is left planned is Seoul, Moscow, the Kuwait-Amman
rotation and N'Djamena, eight rows, none of which has an observed operation.

`as_of` stays **2026-10-09**, and that corrects the plan the 28 Oct note wrote down.
That note said the stamp would move today together with the Douala and Libreville
NW26 numbers. This pass read first-flight questions only, so the winter schedule is
still unread and a 2026-10-30 stamp would claim otherwise. The stamp moves with the
pass that actually re-reads the network.

## 1. The three returns of the 26 and 28 Oct promotions, operating

Every observation below was read off the flight's own history page on Flightradar24
on **30 October 2026**. Times are each airport's local time and dates are local
departure dates. The free history window is about seven days, so these pages will
stop showing what is written here: section 36 is why the dates, landing times and
registrations are recorded rather than only the links.

### `pvg-alg`, Shanghai Pudong to Algiers, AH 3083

<https://www.flightradar24.com/data/flights/ah3083>

| Date | PVG dep | ALG arr | Aircraft | Reg |
| --- | --- | --- | --- | --- |
| Tue 27 Oct 2026 | 06:32 | Landed 13:28 | A330-900 | 7T-VJF |
| Thu 29 Oct 2026 | 06:22 | Landed 13:26 | A330-900 | 7T-VJE |

Scheduled and not yet flown: 1, 3 and 5 November (Sun, Tue, Thu). The row already
carried tue/thu/sun off the 15 Aug 2026 China report, so **`days` is confirmed, not
changed**: two of the three days are now observed and the Sunday stays on the
published schedule's authority, not on a claim that it flew.

`pvg-alg` moves to the operating collection, `verified`, `flight` `AH 3083`
unchanged. The history is the `source`; the 15 Aug China report and the carrier's
24 Oct statement follow it in `sources`.

### `cky-alg`, Conakry to Algiers, AH 5359

<https://www.flightradar24.com/data/flights/ah5359>

| Date | CKY dep | ALG arr | Aircraft | Reg |
| --- | --- | --- | --- | --- |
| Mon 26 Oct 2026 | 01:11 | Landed 06:54 | 737 MAX 8 | 7T-VLR |
| Wed 28 Oct 2026 | 00:58 | Landed 06:22 | 737-600 | 7T-VJU |
| Fri 30 Oct 2026 | 01:19 | Landed 06:41 | 737-700 | 7T-VKS |

Scheduled and not yet flown: 2, 4, 6 and 9 November.

This is the row the rule earns its keep on. **`days` was null**, because the 26 Sep
programme report dates the Algiers departure and says nothing about the Conakry one,
and section 1 forbids mirroring the outbound. Three observed nights give it:
**mon/wed/fri**. They are not the outbound's tue/thu/sun, which is the whole reason
mirroring was never allowed: the aircraft arrives at Ahmed Sékou Touré late and comes
home in the small hours of the next day. Three different registrations on three
nights also rule out reading a greyed-out scheduled row as an operation.

`cky-alg` moves to the operating collection, `verified`, `flight` `AH 5359`
unchanged. The history is the `source`; the 21 Aug 2026 sale-inventory report and the
24 Oct statement follow it.

### `mji-alg`, Tripoli Mitiga to Algiers, AH 4007

<https://www.flightradar24.com/data/flights/ah4007>

| Date | MJI dep | ALG arr | Aircraft | Reg |
| --- | --- | --- | --- | --- |
| Wed 28 Oct 2026 | 14:21 | Landed 15:06 | 737 | 7T-VKT |

Scheduled and not yet flown: 30 Oct (not yet operated at the time of reading), 4 and
6 November.

The 28 October return is the **same day** as the inaugural outbound, so Tripoli is a
same-day turnaround and the wed/fri the 1 Oct 2026 economic daily gives the direction
("les vols au départ de Tripoli vers Alger seront également programmés les mêmes
jours") is what the observation supports. The history is also the **first source of
any kind to give this direction a flight number**, `AH 4007`; no press report read in
the 28 or 30 Oct passes carries one.

The outbound's own history was read in the same pass as a cross-check and is recorded
here, changing nothing: AH 4006 landed at Mitiga on 28 Oct at 11:51 (7T-VKT) and on
30 Oct at 12:58 (7T-VKS). The 30 Oct landing is the second operation of a leg already
promoted on 28 Oct.

`mji-alg` moves to the operating collection, `verified`, `flight` `AH 4007` (new),
`days` wed/fri unchanged. The history is the `source`; the 1 Oct report and the
24 Oct statement follow it.

## 2. Brazzaville, both ways, operating

Same pass, same kind of page, same rule.

### `alg-bzv`, Algiers to Brazzaville Maya-Maya, AH 5390

<https://www.flightradar24.com/data/flights/ah5390>

| Date | ALG dep | BZV arr | Aircraft | Reg |
| --- | --- | --- | --- | --- |
| Mon 26 Oct 2026 | 19:49 | Landed 01:45 (+1) | 737-800 | 7T-VKJ |
| Wed 28 Oct 2026 | 19:18 | Landed 01:19 (+1) | 737-800 | 7T-VKJ |

Scheduled and not yet flown: 31 Oct (Sat) and 2, 4, 7, 9 November. The row already
carried **mon/wed/sat** off the 26 Sep programme report ("premier vol le lundi 26
octobre 2026, puis trois vols par semaine, les lundis, mercredis et samedis"), so two
of the three days are observed and the Saturday stays on the report's authority.

`alg-bzv` moves to the operating collection, `verified`, `flight` `AH 5390`
unchanged. The history is the `source`; the 26 Sep programme report, the 21 Aug sale
inventory and the 24 Oct statement follow it.

### `bzv-alg`, Brazzaville Maya-Maya to Algiers, AH 5391

<https://www.flightradar24.com/data/flights/ah5391>

| Date | BZV dep | ALG arr | Aircraft | Reg |
| --- | --- | --- | --- | --- |
| Sat 25 Oct 2026 | - | **CANCELED** | - | - |
| Tue 27 Oct 2026 | 03:45 | Landed 09:31 | 737-800 | 7T-VKJ |
| Thu 29 Oct 2026 | 02:16 | Landed 08:08 | 737-800 | 7T-VKJ |

Scheduled and not yet flown: 1, 3, 5 and 8 November.

**`days` was null** here, for the same reason Conakry's was, and the observations give
**tue/thu/sun**: a day after the outbound's mon/wed/sat, because the aircraft reaches
Maya-Maya after midnight and leaves again before dawn. The Sunday is the published
pattern's third day, scheduled for 1 November, and is not claimed as flown.

The **25 October row reads CANCELED**, and it is recorded rather than acted on. It is
the one shape these pages carry that is neither an operation nor a schedule, and it
tells us nothing about whether the leg operates: section 7's rule that a silence is
never a negative covers a cancelled rotation too. The two that flew settle the
question the row was asking.

`bzv-alg` moves to the operating collection, `verified`, `flight` `AH 5391`
unchanged. The history is the `source`; the 21 Aug sale inventory and the 24 Oct
statement follow it.

## 3. The two Nigeria triangles complete, and two days corrected

Both rotations fly as **AH 5354**, so one history carries all six sectors, the four
that were planned and the two that were already operating.

<https://www.flightradar24.com/data/flights/ah5354>

| Leg | Date | Dep | Arr | Reg | In the data |
| --- | --- | --- | --- | --- | --- |
| `alg-abv` | Mon 26 Oct 2026 | ALG 20:10 | Landed ABV 00:06 (+1) | 7T-VKS | already operating, mon agrees, untouched |
| `abv-los` | Tue 27 Oct 2026 | ABV 01:21 | Landed LOS 02:11 | 7T-VKS | **promoted**, `flight` AH 5354 (new), `days` mon to **tue** |
| `los-alg` | Tue 27 Oct 2026 | LOS 03:04 | Landed ALG 07:24 | 7T-VKS | **promoted**, tue unchanged |
| `alg-los` | Thu 29 Oct 2026 | ALG 19:56 | Landed LOS 23:59 | 7T-VKT | **promoted**, thu unchanged |
| `los-abv` | Fri 30 Oct 2026 | LOS 01:13 | Landed ABV 02:02 | 7T-VKT | **promoted**, `flight` AH 5354 (new), `days` thu to **fri** |
| `abv-alg` | Fri 30 Oct 2026 | ABV 02:48 | Landed ALG 06:59 | 7T-VKT | already operating, fri agrees, untouched |

Scheduled and not yet flown: `abv-los` and `los-alg` on 3 and 10 Nov (Tue), `alg-los`
on 5 Nov (Thu), `los-abv` on 6 Nov (Fri), `alg-abv` on 2 and 9 Nov (Mon), `abv-alg` on
6 Nov (Fri).

**The two corrected days are the finding here.** Both middle sectors carried the day
the AeroRoutes filing gives the ROTATION, `abv-los` mon and `los-abv` thu, because
that was the only day anything published stated. A sector's `days` is its own local
departure day, and the observations show both middle sectors departing after midnight
on the following day. So `abv-los` is **tue** and `los-abv` is **fri**. Read down the
table and each triangle closes on consecutive local days: mon, tue, tue out via Abuja,
and thu, fri, fri out via Lagos.

**The Lagos trap, closed by observation.** The 26 Oct pass wrote down at length that
every report of "Air Algérie opening Lagos on Monday 26 October" was evidence for the
Monday rotation's sectors and never for the nonstop `alg-los`, which belongs to the
Thursday rotation filed eff 29OCT26. The 29 October departure is what finally answers
it, and it answers it the way the pass predicted. The city-pair reading would have
promoted the wrong row three days early.

**Two airframes, cleanly split.** 7T-VKS flies the whole Monday rotation and 7T-VKT
the whole Thursday one, which is a second check that these are two rotations and not
six loose arcs.

**One oddity, ignored.** The page carries a **duplicate 29 October row for `alg-los`
with status Unknown**, no times and no registration. It is not a second operation and
not a schedule; nothing is read off it.

## 4. Kuwait and Amman: the tracker has no data at all

`AH 4064` and `AH 4065` were both looked up on Flightradar24 on 30 October and
**neither number has any data**: no history and no schedule. The three legs
`alg-kwi`, `kwi-amm` and `amm-alg` stay **planned**, exactly as they are, on the
AeroRoutes NW26 filing of 29 Jun 2026 that gave them `AH 4064` and their days.

This is a silence and not a negative (section 7). An empty tracker page is
compatible with a one-weekly Monday rotation that has not started, with one that
operates under a number the filing does not give, and with a tracker that simply
carries nothing for it. Nothing in it contradicts the filing, and nothing in it
supports a promotion. The 28 Oct observation still stands too: the carrier's 24 Oct
communique lists five new lines and Kuwait is not among them, while no page says it
is cancelled. **Re-check after 2026-11-03.**

## 5. Moscow: a schedule appeared, nothing flew

Flightradar24's Sheremetyevo page lists **AH 3000**, Algiers to SVO, as scheduled,
arriving SVO **2 Nov 03:10** (73H), **4 Nov 03:10** (73H) and **6 Nov 15:05** (73W).
No history, no operation.

Two things follow, and neither moves a row.

- It **contradicts the "early 2027" report** this dataset cited on 28 Oct, the Russian
  ambassador's RIA interview relayed by omertamedia and ratanews. A filed schedule
  three days out is not an early-2027 resumption. The interview stays in `sources` as
  the dated statement it is; nothing is withdrawn, because section 7 cuts both ways
  and a schedule is not a correction of an interview.
- The arrival times read the **departures as Sunday, Tuesday and Thursday**, where the
  rows carry mon/wed/fri off the 6 Sep report. That is a question, not an answer: a
  schedule never sets `days` under section 36.

`alg-svo` and `svo-alg` stay **planned**, unchanged. **Re-check AH 3000's history
after 2026-11-03**, and if it flew, read `days` off the observations rather than off
the schedule.

## 6. Still planned, and what the press did not have

A press-side check on 30 October found **no dated landing report** for Brazzaville,
Lagos or Abuja, the Kuwait-Amman rotation, or Seoul. **The press is not what promoted
the nine legs above; the trackers are.** That contrast is the pass's other finding:
nobody reports a sector between two foreign airports, and nobody reports a routine
return, which is precisely the gap section 36 was opened to close.

Eight rows are still planned after this pass, and none of them has an observed
operation.

| Leg | Why it stays | Re-check |
| --- | --- | --- |
| `alg-kwi`, `kwi-amm`, `amm-alg` | Nothing in the Kuwaiti, Jordanian or Algerian press, and no tracker data at all for `AH 4064` or `AH 4065` (section 4). The filed NW26 rotation is still the only evidence, and a filed schedule is not an operation. | 2026-11-03 |
| `alg-svo`, `svo-alg` | A filed schedule appeared and nothing flew (section 5). | 2026-11-03 |
| `alg-ndj` | Only the 22 Jun network list, and a lead that the row may be stale in the other direction (section 7). | batch 2026-16 |
| `alg-icn`, `icn-alg` | No date announced; not in this pass's scope. | - |

## 7. `alg-ndj`: a lead that the row may be stale, flagged not acted on

Recorded for batch 2026-16, with **no change today**:

- Algiers to N'Djamena **first flew on 21 October 2025**, reported by APS. The planned
  row rests on the 22 Jun 2026 737 MAX 8 network post filing "Algiers - N'djamena -
  Addis Ababa" effective 28 Oct 2026, which may be an **extension of a line already
  operating** rather than a launch. If it is, the row is stale in the other direction:
  the leg should be operating, not planned.
- The winter 2026-27 reports pull the other way. Observalgerie, 22 Oct 2026, has the
  N'Djamena stop **dropped from the Douala routing**, which matches the Cameroonian
  regulator's 14 Oct winter approval noted in the 28 Oct pass.

Both facts need a pass that reads the network rather than one first-flight question,
which is the same pass that moves `as_of`. It is on the batch 2026-16 list.

## 8. Method and scope

Nine flight histories and one airport page on Flightradar24, read in a real browser on
30 October 2026, plus a French, Arabic and English press check across the Algerian
outlets and the Guinean, Congolese, Nigerian, Libyan, Kuwaiti, Jordanian and Russian
destination-side press. Histories read: `AH 3083`, `AH 5359`, `AH 4007`, `AH 4006`,
`AH 5390`, `AH 5391`, `AH 5354`, `AH 4064`, `AH 4065`, plus the Sheremetyevo airport
page for `AH 3000`.

No schedule page, route map or booking result was used as evidence for anything: every
promotion rests on a leg the history marks Landed, with its date, its landing time and
its airframe written out above. Scheduled rows are listed only to show which published
days are still unobserved, and a CANCELED row and an Unknown row were each recorded
and read as nothing.

The winter-programme items held over from 28 October (Berlin's day, Doha going daily,
the Douala and Libreville NW26 numbers) were **not re-read** and are unchanged, which
is why `as_of` does not move.
