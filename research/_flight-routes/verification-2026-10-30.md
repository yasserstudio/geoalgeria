# Flight-route verification, 2026-10-30

The return pass. The 2026-10-26 and 2026-10-28 passes each promoted an outbound and
left its return planned, because nothing published says which day an aircraft leaves
the far end of a new line. This pass answers that for three of them, under the
Owner's decision of 30 October 2026 that a flight tracker's own flight **history** is
a dated report that a leg flew (`collection-rules.md` section 36).

Counts after this pass: **177 rows, 163 operating and 14 planned, 78 endpoints**
(was 160 operating and 17 planned). No row is added or removed; three move from
`planned` to operating.

`as_of` stays **2026-10-09**, and that corrects the plan the 28 Oct note wrote down.
That note said the stamp would move today together with the Douala and Libreville
NW26 numbers. This pass read first-flight questions only, so the winter schedule is
still unread and a 2026-10-30 stamp would claim otherwise. The stamp moves with the
pass that actually re-reads the network.

## 1. The three returns, operating

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

## 2. Moscow: a schedule appeared, nothing flew

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

## 3. Still planned, nothing found

A press-side check on 30 October found **no dated landing report** for Brazzaville,
Lagos or Abuja, the Kuwait-Amman rotation, or Seoul. Silence is never a negative; each
row stays as it is.

| Leg | Why it stays | Re-check |
| --- | --- | --- |
| `alg-bzv`, `bzv-alg` | The outbound has not flown. Nothing dated in the Congolese or Algerian press. | 2026-11-02 |
| `alg-los`, `los-abv`, `abv-los`, `los-alg` | Nothing dated for the Thursday rotation or the Monday rotation's sectors. | 2026-11-03 |
| `alg-kwi`, `kwi-amm`, `amm-alg` | Nothing in the Kuwaiti, Jordanian or Algerian press. The filed NW26 rotation is still the only evidence, and a filed schedule is not an operation. | 2026-11-03 |
| `alg-icn`, `icn-alg` | No date announced; not in this pass's scope. | - |

## 4. `alg-ndj`: a lead that the row may be stale, flagged not acted on

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

## 5. Method and scope

Three flight histories and one airport page on Flightradar24, read in a real browser
on 30 October 2026, plus a French, Arabic and English press check across the Algerian
outlets and the Guinean, Congolese, Nigerian, Libyan, Kuwaiti, Jordanian and Russian
destination-side press. No schedule page, route map or booking result was used as
evidence for anything. The winter-programme items held over from 28 October (Berlin's
day, Doha going daily, the Douala and Libreville NW26 numbers) were **not re-read**
and are unchanged, which is why `as_of` does not move.
