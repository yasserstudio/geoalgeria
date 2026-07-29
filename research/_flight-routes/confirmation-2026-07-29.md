# Air Algérie return-legs confirmation (2026-07-29)

Soar/airlabs hypotheses are NOT citable; each claim below required an independent citable
source. Acceptance bar per brief: airport's own site, aeroroutes.com, or airalgerie.dz.
Wikipedia/OTA/tracker sites (FlightAware, Trip.com, Flightsfrom, Skyscanner, etc.) do NOT count
as confirmation — used only as background context, never as the cited evidence.

---

## 1. LYS -> TLM (hypothesis AH1099, ~17:30 -> 18:40)

**Verdict: CONFIRMED (route exists) — but NOT for schedule/day/time detail.**

- URL: https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie
- What it literally shows: "Air Algérie serves nine cities: Algiers, Batna, Biskra, Oran,
  Tlemcen, Annaba, Béjaïa, Constantine and Sétif." Tlemcen is listed with "2h10 flight time,
  from €138" alongside the other 8 destinations, all served from Lyon Saint-Exupéry T1.
- Scheduled days/times: NOT shown on this page. It is a destinations/pricing page, not a
  timetable. I looked for a Lyon flight-schedule/departures-board page and hit a 404 at the
  guessed URL (`/en/practical-information/flight-schedules`); did not locate the live
  departures-board tool before time ran out.
- So: the LYS<->TLM route itself is confirmed as an operated Air Algérie destination pair from
  a citable, airport-owned source. The specific flight number AH1099 and the 17:30/18:40 times
  are NOT confirmed by this source (it names the city pair, not individual flights/times) —
  treat those specifics as still resting on the Soar hypothesis only.

---

## 2. IST -> ORN (hypothesis AH3025, ~17:20 -> 19:55)

**Verdict: UNRESOLVED.**

What I tried:
- istairport.com (English flight-info/departures pages): the site loaded once far enough to
  show tab UI ("Departure"/"Arrival", a flight-number/city search box) via `agent-browser`, but
  every attempt to load the actual departures page or run the search hung and timed out
  (60-90s) without returning a result; had to kill the browser session repeatedly. Never got a
  row of data back — no confirm, no refute.
- aeroroutes.com: checked the tag archive (https://www.aeroroutes.com/eng/tag/Air+Algerie,
  18 articles back to Jan 2026) plus the two most relevant network-change posts
  (260629-ahnw26 "NW26 Africa/Mid-East Network Expansion" and 260622-ahnw267m8 "NW26
  Preliminary 737 MAX Network"). Neither mentions Oran-Istanbul; the only Istanbul route named
  in AeroRoutes' 2026 coverage is "Algiers – Istanbul eff 26OCT26, 3 weekly" (Algiers hub, not
  Oran). No AeroRoutes article about an Istanbul-Oran service was found.
  URL checked: https://www.aeroroutes.com/eng/260629-ahnw26 ,
  https://www.aeroroutes.com/eng/260622-ahnw267m8
- airalgerie.dz: the official schedule page
  (https://airalgerie.dz/en/plan-your-trip/flight-schedule/) is a generic timetable-tool
  landing page listing example routes (Algiers-Paris, Algiers-Marseille, Paris-Djanet,
  Algiers-Istanbul, Algiers-Dubai) — Oran-Istanbul is not among the examples shown, and I could
  not drive its interactive search tool (not JS-executed via WebFetch; did not get to it with
  agent-browser before time ran out).

Background-only (not citable, do not use as the confirming source): trackers (FlightAware,
Trip.com "AH3025 ... Istanbul (IST) ... to Oran (ORN) ... landed 19:14 local") and a
FlightsFrom-style summary claiming a *different* flight number, AH3024, ORN->IST 10:05->15:55
daily "effective 16-Sep-2026" — note this is the outbound direction and a different flight
number than the hypothesis, and is itself from a non-citable aggregator, so it neither confirms
nor refutes AH3025 IST->ORN.

Net: no citable source (airport site, aeroroutes, or airalgerie.dz) was reached that names the
Istanbul-Oran leg. Genuinely unresolved, not refuted.

---

## 3. Paris -> Batna flies from ORY, not CDG (hypothesis AH1121 ORY -> BLJ)

**Verdict: UNRESOLVED via the required source classes; suggestive-but-not-citable evidence points to ORY.**

What I tried:
- parisaeroport.fr: every page I fetched (destinations, all-departures, Orly flight-tracking)
  returned an Incapsula bot-detection interstitial ("Pardon Our Interruption... your browser
  made us think you were a bot") both via WebFetch and via `agent-browser` (real headless
  Chrome) — e.g. https://www.parisaeroport.fr/en/passengers/flights/destinations/ory and
  https://www.parisaeroport.fr/en/passengers/flights/ory both blocked with an Incapsula
  incident ID. Never got page content.
- aeroroutes.com: no current (2026) AeroRoutes article names the Paris airport for the Batna
  route. The only AeroRoutes-attributed detail I could find (via secondary summaries, not a
  page I could open directly) is from 2023: "Air Algerie relaunched the Batna-Paris-CDG route
  ... 1 weekly ... starting 03MAY23" — i.e. CDG, not ORY, and three years stale. I could not
  locate/open the actual aeroroutes.com article URL to confirm that quote first-hand (search
  engines surface only third-party paraphrases of it, e.g. Air Journal/Algerie360 coverage of
  the 2023 relaunch), so I'm not treating it as a citable hit either way.
- airalgerie.dz schedule landing page lists "Algiers – Paris / Paris – Algiers" as its Paris
  example, not Batna, and its interactive tool wasn't reachable in time.

Background-only, not citable: multiple 2026 OTA pages (Kayak, GoVoyages, Opodo,
aeroports-voyages.fr, Skyscanner) consistently describe the current Batna-Paris service as
"Paris-Orly" (e.g. Kayak's dedicated ORY-BLJ route page), and airalgerie.info (third-party,
not the airline's own .dz domain) has a "Agence Aéroport Paris Orly Air Algérie" page — all
directionally consistent with ORY today, contradicting the stale 2023 CDG detail, but none of
these meet the brief's citable bar.

Net: could not confirm from an acceptable source before the WAF/timeout blocks. The
weight of (non-citable) evidence leans ORY for 2026, but I'm flagging this UNRESOLVED per the
acceptance bar, not confirming it.

---

## 4. Recorded BLJ -> CDG leg is wrong; AH1120 actually lands ORY

**Verdict: UNRESOLVED — same blockers as #3; existing dataset citation is also unverified, not just the correction.**

- Could not reach parisaeroport.fr arrivals-from-Batna (same Incapsula block as above).
- Could not open a specific aeroroutes.com post naming AH1120/AH1121's Paris airport (only the
  generic https://www.aeroroutes.com/eng/eng/tag/Air+Algerie archive and the 2023 secondhand
  "CDG" mention noted in #3 — I could not open that 2023 article's actual URL to read it
  first-hand).
- Note on the existing dataset citation: the brief says the current record cites
  "https://www.aeroroutes.com/eng/" generically for blj-cdg. That generic root URL does not
  itself name Batna, CDG, or ORY on the page (it's aeroroutes' homepage/index) — so the
  existing citation looks weak/unverifiable as-is, independent of whether the leg is CDG or
  ORY. This is worth flagging back to whoever owns the dataset record regardless of how #3/#4
  resolve.

Net: I cannot state plainly which Paris airport a citable source names for either direction —
neither confirmed nor refuted from an acceptable source in the time available.

---

## Summary table

| # | Claim | Verdict | Citable source reached? |
|---|-------|---------|--------------------------|
| 1 | LYS <-> TLM route operates | CONFIRMED (route only, not flight#/time) | Yes — lyonaeroports.com |
| 2 | IST -> ORN (AH3025) | UNRESOLVED | No — istairport.com hung/timed out; aeroroutes/airalgerie.dz silent on this pair |
| 3 | Paris -> Batna is ORY not CDG | UNRESOLVED | No — parisaeroport.fr WAF-blocked; aeroroutes 2023 mention (CDG) not independently opened |
| 4 | BLJ -> CDG leg wrong, actually ORY | UNRESOLVED | No — same blockers; existing dataset citation is also unverifiably generic |

## What blocked the rest
- istairport.com: page partially rendered (tab UI visible) but every full navigation/search
  attempt via `agent-browser` timed out (60-90s) and had to be killed; likely anti-automation
  measures or a genuinely slow SPA.
- parisaeroport.fr: Incapsula WAF returns a bot-check interstitial to both WebFetch and a real
  headless Chrome session (`agent-browser`) — did not get past it in the time available. A
  non-headless / residential-IP browser might fare better; out of scope for what I could try
  here.
- aeroroutes.com: has no 2026 article specifically naming the Istanbul-Oran or Batna-Paris
  (CDG vs ORY) routes; the one CDG data point is from 2023 and I could only find it via
  secondary paraphrase, not by opening the AeroRoutes page itself, so I'm not presenting it as
  a page's claim.

No repo files were edited; this is a research-only pass.
