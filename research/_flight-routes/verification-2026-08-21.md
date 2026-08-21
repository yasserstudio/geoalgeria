# Flight-route verification — 2026-08-21

## Algiers–Berlin launch

Air Algérie booking results captured by the maintainer on 21 August 2026 show
both directions of the first Monday rotation on 14 September 2026:

| Route | Flight | Schedule shown | Duration | Finding |
| --- | --- | --- | --- | --- |
| `ALG-BER` | `AH 2072` | 14:00 ALG → 18:00 BER | 3h00 | direct, bookable |
| `BER-ALG` | `AH 2073` | 19:00 BER → 21:05 ALG | 3h05 | direct, bookable |

The screenshots are evidence from Air Algérie's own booking interface. They are
not committed because booking-session captures are working receipts, not package
content. The public corroborating source is:

- <https://www.visa-algerie.com/air-algerie-ouvre-les-ventes-sur-une-nouvelle-ligne-vers-leurope/>

That report records sales opening on 20 August, launch on 14 September, a Monday
weekly rotation through at least 19 October, and the same 14:00 outbound / 19:00
return schedule. It attributes the filed schedule to AeroRoutes.

An independent production search through the official Soar Flights MCP on
21 August returned one bookable nonstop Air Algérie offer in each direction for
14 September. The results matched the booking screenshots exactly:

| Route | Flight | Schedule returned | Duration |
| --- | --- | --- | --- |
| `ALG-BER` | `AH 2072` | 14:00 ALG → 18:00 BER | 3h00 |
| `BER-ALG` | `AH 2073` | 19:00 BER → 21:05 ALG | 3h05 |

Soar offer IDs, prices and expiry timestamps are intentionally not recorded:
they are transient shopping data rather than durable route evidence.

## Dataset decision

- Add `ALG-BER` and `BER-ALG` as two directional records.
- Keep both in `plannedRoutes()` on the 2026-08-21 snapshot: being bookable does
  not mean the first service has already operated.
- Mark both `verified`: the airline's booking interface establishes the
  operating carrier, direction, flight number and block time end to end.
- Record Monday in `days`; keep `status` as `unclear` because the source says
  the route may continue beyond the initial September–October inventory.

## Korea traffic-rights announcement

Visa Algérie's 20 July report frames a future Air Algérie link to South Korea:

- <https://www.visa-algerie.com/air-algerie-une-ligne-directe-vers-la-coree-du-sud-se-precise/>

The report cites two Korean accounts of the transport ministry announcement:

- <https://biz.chosun.com/en/en-policy/2026/07/20/YFB4YV7KUVDFZDA6WJULHXYQI4/>
- <https://www.koreatimes.co.kr/southkorea/20260720/korea-algeria-agree-to-establish-direct-air-route>

The bilateral agreement establishes traffic rights for up to four weekly
passenger and cargo flights. Coverage describes the expected link as
Algiers–Incheon, although the agreement allows departures and arrivals at any
airport in either country. No launch date, flight numbers or operating days are
published.

## Korea dataset decision

- Add `ALG-ICN` and `ICN-ALG` as two directional planned records so the map
  renders the announced route as a dashed line.
- Keep `evidence` as `listed` and `status` as `unclear`; the route is announced,
  not bookable or schedule-verified.
- Leave `flight` and `days` unset. Re-check the carrier and exact airport pair
  when an operator schedule or booking result appears.

## Newer schedule sweep

The same-day news scan found four additional sources with route-level changes:

- [Four international routes opened for sale](https://www.visa-algerie.com/air-algerie-les-ventes-sont-ouvertes-pour-quatre-nouvelles-lignes-internationales/),
  corroborated by [AeroRoutes' Africa filing](https://www.aeroroutes.com/eng/260820-ahnw26af).
- [Shanghai bookings, flight numbers and operating days](https://www.visa-algerie.com/air-algerie-ouvre-une-nouvelle-ligne-vers-la-chine-dates-horaires-et-prix/),
  corroborated by [AeroRoutes' booking update](https://www.aeroroutes.com/eng/260814-ahnw26pvg).
- [Delhi launch confirmation](https://www.visa-algerie.com/air-algerie-louverture-dune-nouvelle-ligne-internationale-confirmee/),
  with both directional schedules in [AeroRoutes' filing](https://www.aeroroutes.com/eng/260619-ahnw26as).
- [Doha booking resumption](https://www.visa-algerie.com/apres-des-mois-de-suspension-air-algerie-de-retour-vers-ce-pays-du-golfe/)
  from 29 September.

Production Soar searches returned the following bookable nonstop Air Algérie
segments. Times are deliberately omitted because the route package stores
direction, carrier, flight, days and lifecycle rather than becoming a departure
board.

| Route | Flight | Date checked | Duration | Dataset result |
| --- | --- | --- | --- | --- |
| `ALG-PVG` | `AH 3082` | 26, 28, 31 Oct | 14h00 | planned, verified; Mon/Wed/Sat |
| `PVG-ALG` | `AH 3083` | 27, 29 Oct; 1 Nov | 15h00 | planned, verified; Tue/Thu/Sun |
| `ALG-BZV` | `AH 5390` | 26 Oct | 6h10 | planned, verified |
| `BZV-ALG` | `AH 5391` | 27 Oct | 6h20 | planned, verified |
| `ALG-CKY` | `AH 5358` | 25 Oct | 5h15 | planned, verified |
| `CKY-ALG` | `AH 5359` | 26 Oct | 4h45 | planned, verified |
| `ALG-LOS` | `AH 5354` | 29 Oct | 4h55 | planned, verified; Thu |
| `LOS-ALG` | `AH 5354` | 27 Oct | 4h50 | planned, verified; Tue |
| `ALG-ABV` | `AH 5354` | 26 Oct | 4h25 | operating route upgraded; Mon |
| `ABV-ALG` | `AH 5354` | 30 Oct | 4h25 | planned, verified; Fri |
| `ALG-DOH` | `AH 4078` | 29 Sep | 6h05 | planned resumption, verified; Tue/Fri |
| `DOH-ALG` | `AH 4079` | 29 Sep | 6h35 | planned resumption, verified; Tue/Fri |

Delhi did not return a Soar offer for the filed launch rotation, so `ALG-DEL`
and `DEL-ALG` remain `listed`. The AeroRoutes filing still supplies the
directional flight numbers and days: `AH3104` Tue/Thu/Sun and `AH3105`
Mon/Wed/Fri.

## Operating summer routes

Two July reports improve the operating collection without inventing a return
direction:

- [`ALG-DJE`](https://www.visa-algerie.com/air-algerie-relance-ses-vols-saisonniers-vers-la-destination-la-plus-prisee-de-tunisie/)
  resumed on 17 July as `AH4708`; add it as seasonal and verified.
- [`CZL-SSH`](https://www.visa-algerie.com/apres-djerba-en-tunisie-air-algerie-se-pose-a-charm-el-cheikh-en-egypte/)
  operated its first 2026 service on 29 July; promote it to seasonal and
  verified.

Tripoli remains out. Recent reporting calls it a year-end objective, but no
filed schedule, sale inventory or operator booking result was found.
