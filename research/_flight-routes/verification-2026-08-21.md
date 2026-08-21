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
  renders the announced connection as a dashed line.
- Keep `evidence` as `listed` and `status` as `unclear`; the route is announced,
  not bookable or schedule-verified.
- Leave `flight` and `days` unset. Re-check the carrier and exact airport pair
  when an operator schedule or booking result appears.
