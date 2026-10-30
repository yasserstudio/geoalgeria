# Flight-route verification, 2026-10-28

The re-check of the sixteen legs the 2026-10-26 pass left planned, and of the four
winter-programme changes that pass deferred. Same single question per leg: is
there a dated report that the aircraft flew it? Every page cited below was opened
and read in full on 28 October 2026, and each one's publication date is taken from
its own byline or metadata.

Counts after this pass: **177 rows, 160 operating and 17 planned, 78 endpoints**
(was 159 operating and 18 planned). No row is added or removed; one moves from
`planned` to operating.

`as_of` does NOT move yet. By the Owner's decision of 2026-10-28 it moves with a
top-up re-check on Friday 30 October, before the batch cut-off, so the legs due
on the 29th and 30th (the Lagos Thursday rotation, the Tripoli return) are read
in the same pass that stamps the date, together with the winter flight numbers
in section 5.

## 1. Algiers to Tripoli (Mitiga), operating

- <https://www.visa-algerie.com/air-algerie-de-retour-en-libye-dans-un-contexte-favorable/>
  (**28 October 2026, 08:45 UTC**), read in full: "Le vol AH 4006 a decolle de
  l'aeroport d'Alger a 9 h ce mercredi et devait atterrir a l'aeroport
  international de Mitiga vers midi", and "La ligne sera assuree a raison de deux
  vols par semaine". Operator, direction, flight number and both ends' times.
- Sputnik Arabic, `sarabic.ae/20261028/...-1118210958.html` (**28 October 2026,
  14:53 GMT**), read in full: Mitiga International "received today, Wednesday, the
  first Air Algerie flights to Tripoli", and "two flights a week between Algiers
  and Tripoli, on Wednesdays and Fridays". The arrival end, and the days.
- Read as cross-checks, not cited: algerie-eco (28 Oct, 13:57 UTC, citing APS on
  "un vol inaugural au depart de l'aeroport international d'Alger"), alquds.com
  (28 Oct, 17:04, the official ceremony at Mitiga, citing the Libyan prime
  minister's media office), libyaakhbar.com and akhbarlibya24.net (28 Oct).

`alg-mji` moves to the operating collection, `verified`, with `flight` `AH 4006`
(new: no earlier source gave a number) and `days` wed/fri. The departure report is
the `source`; the Mitiga arrival report, the 1 Oct report that first named MITIGA
and the carrier's 24 Oct statement follow it in `sources`.

**`mji-alg` stays planned.** No report of the return. A 28 Sep report puts the
first return on Friday 30 October ("فيما تبرمج رحلة العودة يوم الجمعة 30
أكتوبر"), which is a schedule, not an operation. **Re-check on 2026-10-30.**

## 2. Algiers to Moscow, still planned, postponed

- <https://ratanews.ru/turindustriya/reisy-iz-rossii-v-alzir-mogut-vozobnovitsia-v-nacale-2027-goda>
  (**26 October 2026, 10:34 UTC**), read in full, quoting the Russian ambassador to
  Algeria's interview with RIA: "Мы надеемся возобновить прямые рейсы между
  Алжиром и Россией в начале следующего года" (we hope to resume direct flights
  between Algeria and Russia at the beginning of next year). It adds that
  Sheremetyevo's board once showed a resumption from 3 August, "но полеты так и
  не были восстановлены" (but the flights were never restored).
- The same interview in Kommersant's syndication on news.mail.ru (26 Oct, 08:09
  +03): "Он рассчитывает, что полеты возобновят в начале 2027 года." Read as a
  cross-check.

**Owner decision, 2026-10-28: both legs stay planned**, with the interview as an
extra entry in `sources`. A postponement is not a withdrawal, and only a stated
withdrawal removes a planned row (`WITHDRAWN`, the Delhi precedent). `source` and
`days` keep the 6 Sep report they rest on; nothing in the interview moves a field.

## 3. Still planned, nothing found

Silence is never a negative: each of these keeps its row unchanged.

| Leg | Why it stays | Re-check |
| --- | --- | --- |
| `cky-alg` | Both Guinean reports cover the arrival in Conakry only. The NW26 filing (`260629-ahnw26`) has AH5359 leaving at 00:50, so the first return was due on 26 Oct; nothing reports it. | 2026-10-30 |
| `pvg-alg` | Every report is of the outbound (below). Nothing reports AH3083 leaving Pudong or arriving in Algiers. | 2026-10-30 |
| `alg-bzv`, `bzv-alg` | Only the pre-flight announcements and the filing ("AH5390 ALG1900 - 0110+1BZV", "AH5391 BZV0210 - 0830ALG"). Nothing in the Congolese or Algerian press after 26 Oct. | 2026-10-30 |
| `abv-los`, `los-alg` | The only post-launch Nigerian item is BusinessDay's 27 Oct report that SAHCO won the Lagos and Abuja ground-handling contract, which is not a flight. | 2026-10-30 |
| `alg-los`, `los-abv` | The Thursday rotation, effective 29 Oct. Not yet due. | 2026-10-30 |
| `alg-kwi`, `kwi-amm`, `amm-alg` | Nothing in the Kuwaiti, Jordanian or Algerian press. Noted, not acted on: the five-route list in Air Algerie's 24 Oct communique, as observalgerie (26 Oct) and algerie-eco (28 Oct) relay it, names Shanghai, Conakry, Brazzaville, Lagos and Tripoli and not Kuwait. Neither page says Kuwait is cancelled. | 2026-10-30 |
| `alg-ndj` | Only the 22 Jun network list, "tentatively scheduled". The Cameroonian regulator's winter approval (14 Oct) removes the N'Djamena stop from the Douala routing, which is a different fact. | 2026-10-30 |
| `alg-icn`, `icn-alg` | No date announced; not in this pass's scope. | - |

## 4. Shanghai, the arrival end

The 26 Oct pass promoted `alg-pvg` on the departure from Algiers. The arrival is now
reported too, which changes no field and is recorded for the history:

- The Paper, `thepaper.cn/newsDetail_forward_34341347` (**27 October 2026, 12:29
  CST**), on the Shanghai Airport Group's information: AH3082 "平稳降落在上海浦东国际机场"
  at 03:37, and "当天浦东国际机场举行象征民航最高礼遇的"水门"仪式欢迎首航航班到来",
  the water-gate salute.
- APS, `aps.dz/en/economy/trade-services/mvqlwna4-new-bridge-for-algeria-china-economic-ties`
  (**27 October 2026, 12:33**, Shanghai dateline): "The arrival on Tuesday morning
  of Air Algerie's inaugural flight connecting Algiers directly to Shanghai".

**A timetable conflict, recorded and not acted on.** The airport group gives the
outbound as Algiers 07:00 Mon/Wed/Sat to Pudong 04:00 the next day, and the return
as Pudong 06:00 Tue/Thu/Sun to Algiers 14:00, where the Algerian press carried
13:00/10:00 and 12:00/20:00. The row ships no times, and the days agree, so nothing
moves; the 03:37 landing fits the airport group's timetable.

## 5. The winter-programme changes

| Change | Finding | In the data |
| --- | --- | --- |
| Berlin, Monday to Sunday | The filing (`260918-ahnw26ber`, 19 Sep) says from 25 Oct; Berlin Brandenburg's own news page (15 Sep) says "From 1 November, the flight will depart from Berlin Brandenburg Airport (BER) at 13:55". Nothing dated after either. | **Unchanged, Monday**, by the Owner's decision of 2026-10-28: the switch to Sunday waits for a report dated on or after a Sunday flight (1 Nov at the latest). |
| Doha, daily from 25 Oct | Everything read predates 25 Oct (jeune-independant and visa-algerie, 27 Sep; Air Journal, 24 Oct, "doit passer a un vol quotidien"). No correction either. | Unchanged, sun/tue/fri. Re-check after 2026-11-01. |
| Douala and Libreville, NW26 numbers | Re-read from `260629-ahnw26`: "Algiers - Douala eff 25OCT26 Nonstop terminator, 3 weekly", `AH5348 ALG1930 - 0035+1DLA`, `AH5349 DLA0135 - 0646ALG` (the filing prints "06460"); "Algiers - Libreville eff 25OCT26 Nonstop terminator, 3 weekly", `AH5040 ALG1900 - 0035+1LBV`, `AH5041 LBV0135 - 0715ALG`. The Cameroonian regulator approved three weekly Douala flights without the Abuja and N'Djamena stops (14 Oct); observalgerie and visa-algerie (19 Oct) read Tue/Fri/Sun Douala departures off the booking site. | Unchanged today. The numbers took effect on 25 Oct, after the current `as_of`; they go in with the `as_of` move on 30 Oct. |
| Nigeria restructure | Re-read from `260629-ahnw26`: Monday `AH5354 ALG1900 - 2325ABV0025+1 - 0140+1LOS0240+1 - 0730+1ALG` and Thursday `AH5354 ALG1900 - 2355LOS0055 - 0210+1ABV0310+1 - 0735+1ALG`. The only nonstop ALG-ABV is the Monday departure and the only nonstop ABV-ALG leaves on Friday at 03:10. | Unchanged: `alg-abv` already ships mon and `abv-alg` fri, which is what the restructure gives. |

## 6. What was searched and could not be read

French, Arabic, English, Chinese and Russian, across the Algerian outlets, the
destination-side press (Guinean, Congolese, Nigerian, Chadian, Cameroonian,
Gabonese, Kuwaiti, Jordanian, Libyan, Chinese and Russian) and the airport
operators. Flight-tracking feeds were not used. Not cited because they could not
be opened: lecourrier-dalgerie.com (did not resolve), alwasat.ly and punchng.com
(HTTP 403), acicongo.com (502), expressdz.dz and m24.ru (connection reset).
