# Flight-route verification, 2026-11-21

The Owner's Flightradar24 pass of 21 November 2026 (a Saturday). Each leg below was
read on its own flight's history page under `collection-rules.md` section 36: a
dated row marked "Landed" is a report that the leg flew. Scheduled rows confirm a
weekly pattern; on their own they never count.

Counts after this pass: **184 rows, 175 operating and 9 planned, 79 endpoints**
(was 179 rows, 169 operating and 10 planned, after the Delhi change of the same
day, section 37). Five rows are new, one leaves `planned`, five move from `listed`
to `verified`, and two Strasbourg rows change their days or status.

`as_of` stays **2026-10-09**. This pass read thirteen flights, not the network, so
the stamp does not move (the same reasoning as the 2026-10-30 note).

## Owed: landing times and registrations

Section 36 asks the note to keep each Landed row's landing time and registration,
because the free history window is about seven days and the pages will stop
showing what is written here. The pages refuse automated reads (HTTP 403), so
these come from the Owner's screenshots of 21 November. They are recorded for
AH 1078, AH 1198, AH 1452 and AH 486. **For AH 5370, AH 5371, AH 1190, AH 1453,
AH 3022, AH 1136, AH 1108 and AH 1084 the times and registrations are still owed
by the Owner**; those sections carry dates and status only.

Dates are local departure dates. Landed times are FR24's, local at the
destination.

## 1. Promotions and new rows

### `alg-ndj`, Algiers to N'Djamena, AH 5370 (leaves `planned`)

<https://www.flightradar24.com/data/flights/ah5370>

| Date | Status |
| --- | --- |
| Sat 14 Nov 2026 | Landed |
| Wed 18 Nov 2026 | Landed |

`days` wed/sat. The 22 Jun 2026 AeroRoutes filing that kept the row planned stays
in `sources` after the history. AH 5370 continues from N'Djamena to Addis Ababa,
which is not a nonstop Algiers to Addis Ababa sector, so **`alg-add` is unchanged**.

### `ndj-alg`, N'Djamena to Algiers, AH 5371 (new)

<https://www.flightradar24.com/data/flights/ah5371>

| Date | Status |
| --- | --- |
| Sun 15 Nov 2026 | Landed |
| Thu 19 Nov 2026 | Landed |
| Sun 22 Nov 2026 | Scheduled |
| Thu 26 Nov 2026 | Scheduled |

`days` thu/sun, read off the return's own nights. AH 5371 starts in Addis Ababa;
its **Addis Ababa to N'Djamena leg does not touch Algeria** and is not carried.

### `aae-jed`, Annaba to Jeddah, AH 486 (new)

<https://www.flightradar24.com/data/flights/ah486>

| Date | Status |
| --- | --- |
| Mon 16 Nov 2026 | Landed |
| Wed 18 Nov 2026 | Landed |
| Mon 23 Nov 2026 | Scheduled |
| Wed 25 Nov 2026 | Scheduled |

`days` mon/wed.

| Date | Reg | Landed (JED) |
| --- | --- | --- |
| Mon 16 Nov 2026 | 7T-VKK | 03:26 Tue 17 Nov |
| Wed 18 Nov 2026 | 7T-VKF | 03:17 Thu 19 Nov |

The same flight number shows an Algiers to Jeddah sector on Sat 21
Nov that is **only Scheduled**, so it is not a Landed row and **no `alg-jed` row is
added**. `ALG-JED` stays in `OPERATED_BY_OTHERS` (Saudia); `AAE-JED` is a different
pair.

### `alg-bod`, Algiers to Bordeaux, AH 1190 (new)

<https://www.flightradar24.com/data/flights/ah1190>

| Date | Status |
| --- | --- |
| Sat 14 Nov 2026 | Landed |
| Sun 15 Nov 2026 | Landed |

`days` null: two nights with nothing scheduled reported are not a weekly pattern.

### `qsf-ory` and `qsf-cdg`, Setif to Paris, AH 1108

<https://www.flightradar24.com/data/flights/ah1108>

One flight number into both Paris airports. The page's "About" box says that in
the last seven days the flight flew Setif to Orly and Setif to Charles de Gaulle,
so the two airports are two rows with their own days.

| Date | Arrives | Status |
| --- | --- | --- |
| Sat 14 Nov 2026 | ORY | Landed |
| Sun 15 Nov 2026 | ORY | Landed |
| Mon 16 Nov 2026 | CDG | Landed |
| Tue 17 Nov 2026 | ORY | Landed |
| Sun 22 Nov 2026 | ORY | Scheduled |
| Mon 23 Nov 2026 | CDG | Scheduled |
| Tue 24 Nov 2026 | ORY | Scheduled |
| Sat 28 Nov 2026 | ORY | Scheduled |

`qsf-ory` moves from `listed` to `verified` with `days` sat/sun/tue, the Ain Arnat
Wikipedia article kept behind the history. `qsf-cdg` is new with `days` mon.

### `orn-cdg`, Oran to Paris CDG, AH 1084 (new)

<https://www.flightradar24.com/data/flights/ah1084>

Landed every day from Sat 14 to Thu 19 Nov; no flight on Fri 20 Nov. Scheduled 21
to 26 Nov and 28 Nov, none on Fri 27 Nov. `days` every day but Friday. It adds the
direction `cdg-orn` already had.

### `czl-ist`, Constantine to Istanbul, AH 3022

<https://www.flightradar24.com/data/flights/ah3022>

Landed Sat 14, Mon 16, Tue 17, Thu 19 and Fri 20 Nov. Scheduled 21, 23, 24, 26, 27
and 28 Nov. `days` mon/tue/thu/fri/sat. Moves from `listed` to `verified`; the
Constantine Wikipedia article stays behind the history.

### `czl-nce`, Constantine to Nice, AH 1198

<https://www.flightradar24.com/data/flights/ah1198>

| Date | Reg | Landed (NCE) |
| --- | --- | --- |
| Sat 14 Nov 2026 | 7T-VKJ | 15:53 |
| Mon 16 Nov 2026 | 7T-VKE | 09:47 |
| Thu 19 Nov 2026 | 7T-VKE | 16:25 |

Scheduled 21, 23, 26 and 28 Nov. `days` mon/thu/sat. Moves from `listed` to
`verified`, Wikipedia article kept.

### `cfk-mrs`, Chlef to Marseille, AH 1136

<https://www.flightradar24.com/data/flights/ah1136>

Landed Sat 14 and Wed 18 Nov. Scheduled 21, 25 and 28 Nov. `days` wed/sat. Moves
from `listed` to `verified`, Chlef Wikipedia article kept.

### `orn-lil`, Oran to Lille, AH 1078

<https://www.flightradar24.com/data/flights/ah1078>

| Date | Reg | Landed (LIL) |
| --- | --- | --- |
| Sat 14 Nov 2026 | 7T-VJK | 17:04 |
| Mon 16 Nov 2026 | 7T-VKG | 10:25 |
| Wed 18 Nov 2026 | 7T-VJK | 20:03 |

Scheduled 21, 23, 25 and 28 Nov. `days` mon/wed/sat. Moves from `listed` to
`verified`, Oran Wikipedia article kept.

## 2. Strasbourg, both directions

### `sxb-alg`, AH 1453: `seasonal` to `active`

<https://www.flightradar24.com/data/flights/ah1453>

Landed Sat 14 Nov, flew Tue 17 and Sat 21 Nov, scheduled Tue 24 and Sat 28 Nov.
`days` tue/sat. The row's old citation was the bare observalgerie.com homepage,
which named no route; it is dropped. The airport's announcement follows the
history.

### `alg-sxb`, AH 1452: days corrected to tue/sat

<https://www.flightradar24.com/data/flights/ah1452>

| Date | Reg | Landed (SXB) |
| --- | --- | --- |
| Sat 14 Nov 2026 | 7T-VJM | 10:24 |
| Tue 17 Nov 2026 | 7T-VKG | 11:44 |
| Sat 21 Nov 2026 | 7T-VCE | 10:45 |

Scheduled Tue 24 and Sat 28 Nov. The row
carried mon/thu off Strasbourg airport's announcement, which was the **launch
schedule**; the history shows the current days, so `days` is tue/sat, the flight
number AH 1452 is added, and the announcement follows the history. Status and
evidence are unchanged. This closes the SXB-ALG seasonal mismatch flagged in
`verification-2026-10-09.md`.

## 3. Read and not carried

- **AH 3200**: its Landed rows were Algiers to Istanbul Airport (IST), not
  Istanbul Atatürk (ISL). No ISL row is added; `alg-ist` already carries the leg.
- **AH 5371's Addis Ababa to N'Djamena leg**: two foreign airports on a rotation
  out of Algeria that no read source makes an Algerian service; out of scope.
- **`alg-add`**: unchanged. AH 5370 reaches Addis Ababa through N'Djamena, so it
  is no evidence for a nonstop sector.
- **`alg-jed` on AH 486**: Scheduled only on 21 Nov; see `aae-jed`.
