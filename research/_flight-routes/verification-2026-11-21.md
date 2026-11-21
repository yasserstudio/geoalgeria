# Flight-route verification, 2026-11-21

The Owner's Flightradar24 pass of 21 November 2026 (a Saturday). Each leg below was
read on its own flight's history page under `collection-rules.md` section 36: a
dated row marked "Landed" is a report that the leg flew. Scheduled rows confirm a
weekly pattern; on their own they never count.

Counts after this pass: **187 rows, 178 operating and 9 planned, 80 endpoints**
(was 179 rows, 169 operating and 10 planned, after the Delhi change of the same
day, section 37). The first read made five rows new, took one out of `planned`,
moved five from `listed` to `verified` and changed the two Strasbourg rows; it
left 184 rows, 175 operating, 79 endpoints. The second read, section 4, adds
three rows and one endpoint (Geneva) and moves two more rows to `verified`.

`as_of` stays **2026-10-09**. This pass read eighteen flights, not the network, so
the stamp does not move (the same reasoning as the 2026-10-30 note).

## Landing times and registrations

Section 36 asks the note to keep each Landed row's landing time and registration,
because the free history window is about seven days and the pages will stop
showing what is written here. The pages refuse automated reads (HTTP 403), so
these come from the Owner's screenshots of 21 November, taken in two reads. Every
flight carried below now has them; nothing is owed.

Dates are local departure dates. Landed times are FR24's, local at the
destination; a landing after midnight names its own date.

Two Landed rows flew on a foreign-registered aircraft under the AH number: TS-INK
(Tunisia) on AH 1074 and AH 1075, LZ-FSA (Bulgaria) on AH 1190, both A320s. That
is a wet lease, the same case section 34 records for Rome, and the leg is still
Air Algérie's.

## 1. Promotions and new rows

### `alg-ndj`, Algiers to N'Djamena, AH 5370 (leaves `planned`)

<https://www.flightradar24.com/data/flights/ah5370>

| Date | Reg | Landed (NDJ) |
| --- | --- | --- |
| Sat 14 Nov 2026 | 7T-VKS | 02:40 Sun 15 Nov |
| Wed 18 Nov 2026 | 7T-VKT | 03:01 Thu 19 Nov |

Scheduled Sat 21, Wed 25 and Sat 28 Nov. `days` wed/sat. The 22 Jun 2026 AeroRoutes filing that kept the row planned stays
in `sources` after the history. AH 5370 continues from N'Djamena to Addis Ababa,
which is not a nonstop Algiers to Addis Ababa sector, so **`alg-add` is unchanged**.

### `ndj-alg`, N'Djamena to Algiers, AH 5371 (new)

<https://www.flightradar24.com/data/flights/ah5371>

| Date | Reg | Landed (ALG) |
| --- | --- | --- |
| Sun 15 Nov 2026 | 7T-VKS | 16:53 |
| Thu 19 Nov 2026 | 7T-VKT | 17:35 |

Scheduled Sun 22 and Thu 26 Nov.

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

| Date | Reg | Landed (BOD) |
| --- | --- | --- |
| Sat 14 Nov 2026 | 7T-VKK | 15:15 |
| Sun 15 Nov 2026 | LZ-FSA | 17:17 |

Sat 21 Nov was due out on 7T-VJU when read; Sun 22 and Sat 28 Nov are scheduled.
`days` sat/sun. The first read left `days` null because no schedule was reported;
the second read's scheduled rows repeat both weekdays, which makes it a pattern.

### `qsf-ory` and `qsf-cdg`, Setif to Paris, AH 1108

<https://www.flightradar24.com/data/flights/ah1108>

One flight number into both Paris airports. The page's "About" box says that in
the last seven days the flight flew Setif to Orly and Setif to Charles de Gaulle,
so the two airports are two rows with their own days.

| Date | Arrives | Reg | Landed |
| --- | --- | --- | --- |
| Sat 14 Nov 2026 | ORY | 7T-VKP | 15:42 |
| Sun 15 Nov 2026 | ORY | 7T-VKI | 16:35 |
| Mon 16 Nov 2026 | CDG | 7T-VKB | 17:26 |
| Tue 17 Nov 2026 | ORY | 7T-VJO | 16:23 |

Sat 21 Nov was airborne for Orly on 7T-VKD when read. Scheduled: Sun 22 ORY,
Mon 23 CDG, Tue 24 ORY, Sat 28 ORY.

`qsf-ory` moves from `listed` to `verified` with `days` sat/sun/tue, the Ain Arnat
Wikipedia article kept behind the history. `qsf-cdg` is new with `days` mon.

### `orn-cdg`, Oran to Paris CDG, AH 1084 (new)

<https://www.flightradar24.com/data/flights/ah1084>

| Date | Reg | Landed (CDG) |
| --- | --- | --- |
| Sat 14 Nov 2026 | 7T-VKA | 17:08 |
| Sun 15 Nov 2026 | 7T-VKG | 17:10 |
| Mon 16 Nov 2026 | 7T-VKM | 17:31 |
| Tue 17 Nov 2026 | 7T-VKJ | 17:44 |
| Wed 18 Nov 2026 | 7T-VKL | 17:41 |
| Thu 19 Nov 2026 | 7T-VKG | 18:00 |

No flight on Fri 20 Nov. Scheduled 21
to 26 Nov and 28 Nov, none on Fri 27 Nov. `days` every day but Friday. It adds the
direction `cdg-orn` already had.

### `czl-ist`, Constantine to Istanbul, AH 3022

<https://www.flightradar24.com/data/flights/ah3022>

| Date | Reg | Landed (IST) |
| --- | --- | --- |
| Sat 14 Nov 2026 | 7T-VKC | 00:56 Sun 15 Nov |
| Mon 16 Nov 2026 | 7T-VKC | 01:06 Tue 17 Nov |
| Tue 17 Nov 2026 | 7T-VKD | 01:20 Wed 18 Nov |
| Thu 19 Nov 2026 | 7T-VKE | 00:54 Fri 20 Nov |
| Fri 20 Nov 2026 | 7T-VKE | 00:48 Sat 21 Nov |

Scheduled 21, 23, 24, 26, 27
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

| Date | Reg | Landed (MRS) |
| --- | --- | --- |
| Sat 14 Nov 2026 | 7T-VKQ | 19:18 |
| Wed 18 Nov 2026 | 7T-VKD | 20:00 |

Scheduled 21, 25 and 28 Nov. `days` wed/sat. Moves
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

| Date | Reg | Status |
| --- | --- | --- |
| Sat 14 Nov 2026 | 7T-VJM | Landed 14:14 |
| Tue 17 Nov 2026 | 7T-VKG | departed 13:05, no Landed status |
| Sat 21 Nov 2026 | 7T-VCE | airborne when read, departed 12:04 |

Scheduled Tue 24 and Sat 28 Nov. One Landed row and two departures on the
outbound's days; `days` tue/sat. The row's old citation was the bare observalgerie.com homepage,
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
- **AH 2047 on Fri 20 Nov**: departed Geneva, but the page shows only an estimated
  arrival, so it is not a Landed row.

## 4. Second read: Orly, Lille and Geneva

### `alg-ory`, Algiers to Orly, AH 1008: `listed` to `verified`

<https://www.flightradar24.com/data/flights/ah1008>

| Date | Reg | Landed (ORY) |
| --- | --- | --- |
| Sat 14 Nov 2026 | 7T-VJP | 20:21 |
| Sun 15 Nov 2026 | 7T-VKR | 21:32 |
| Mon 16 Nov 2026 | 7T-VKR | 20:43 |
| Tue 17 Nov 2026 | 7T-VKN | 20:46 |
| Wed 18 Nov 2026 | 7T-VKO | 20:48 |
| Thu 19 Nov 2026 | 7T-VJO | 20:51 |
| Fri 20 Nov 2026 | 7T-VJM | 20:48 |

Scheduled every day 22 to 28 Nov. `days` every day. The Paris airports page the
Wikipedia table cited stays behind the history.

### `alg-lil` and `lil-alg`, Algiers and Lille, AH 1074 and AH 1075

<https://www.flightradar24.com/data/flights/ah1074>
<https://www.flightradar24.com/data/flights/ah1075>

| Date | Reg | Landed (LIL), AH 1074 | Landed (ALG), AH 1075 |
| --- | --- | --- | --- |
| Sat 14 Nov 2026 | 7T-VCE | 14:32 | 18:05 |
| Mon 16 Nov 2026 | TS-INK | 12:27 | 15:52 |
| Tue 17 Nov 2026 | TS-INK | 14:59 | 18:29 |
| Wed 18 Nov 2026 | 7T-VJK | 12:01 | 23:35 |

Sat 21 Nov was airborne to Lille on 7T-VLS when read. Both directions scheduled
Mon 23, Tue 24, Wed 25 and Sat 28 Nov. `days` mon/tue/wed/sat both ways.
`alg-lil` moves from `listed` to `verified`, its TSA citation kept; `lil-alg` is
new.

### `alg-gva` and `gva-alg`, Algiers and Geneva, AH 2046 and AH 2047 (new)

<https://www.flightradar24.com/data/flights/ah2046>
<https://www.flightradar24.com/data/flights/ah2047>

| Date | Reg | Landed (GVA), AH 2046 | Landed (ALG), AH 2047 |
| --- | --- | --- | --- |
| Sat 14 Nov 2026 | 7T-VKD | 13:42 | 17:07 |
| Mon 16 Nov 2026 | 7T-VKT | 14:29 | 17:20 |
| Thu 19 Nov 2026 | 7T-VKD | 14:21 | 17:21 |
| Fri 20 Nov 2026 | 7T-VJO | 13:32 | no Landed status |
| Sat 21 Nov 2026 | 7T-VJM | 13:51 | not yet flown |

Both directions scheduled Mon 23, Thu 26, Fri 27 and Sat 28 Nov. `days`
mon/thu/fri/sat both ways: the return's three Landed days and its schedule agree
with the outbound's. Geneva is a new endpoint; its names were already in
`endpoint-names.json`.

### Still to recheck

- **AH 486, Algiers to Jeddah**: Sat 21 Nov was still Scheduled (21:15) when read.
  Recheck after 22 Nov; a Landed row would add `alg-jed` as Air Algérie's own leg.

## 5. Kuwait-Amman: planned, the filing's detail withdrawn

The three AH 4064 legs (`alg-kwi`, `kwi-amm`, `amm-alg`) were filed for 26 Oct
2026 and did not start. Observ'Algérie (5 Nov 2026) quotes Algeria's ambassador
in Kuwait: preparations in their final phase, no date. Algérie360 (11 Nov 2026):
Air Algérie resumes Algiers-Amman from 1 Jan 2027. The legs stay planned;
`evidence` moves `verified` to `listed` and `days` to null, per the Owner's
decision recorded in `collection-rules.md` section 38.
