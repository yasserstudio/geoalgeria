# Air Algérie nonstop route verification - findings

## GROUP A - ex-Tassili regional-France cluster

| # | Pair | Nonstop exists? | Operator | Status | Direction | Evidence tier | Source | Frequency | Note |
|---|------|-----------------|----------|--------|-----------|---------------|--------|-----------|------|
| 1 | Tlemcen (TLM) – Lyon (LYS) | Yes | Air Algérie | Active | Both | Official | lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie (Air Algérie listed as operator to Tlemcen among Lyon's 9 Algerian destinations) | ~2x/week (per secondary press, not on official page) | Official airport page names Air Algérie + Tlemcen but no schedule; frequency claim is aggregator-sourced, so treat frequency as unconfirmed |
| 2 | Tlemcen (TLM) – Marseille (MRS) | Unclear | Unclear - Air Algérie AND Volotea both claimed by aggregators | Unclear | - | Insufficient | marseille.aeroport.fr/vols-et-destinations/destinations/toutes-les-destinations/afrique/algerie/tlemcen (fetched: airline not named on the page itself) | Aggregator claims ~3/week split Air Algérie/Volotea - not citable | Official Marseille airport page does not name an operator; cannot confirm Air Algérie specifically operates this leg vs. Volotea only |
| 3 | Tlemcen (TLM) – Paris CDG | No / insufficient | - | Unclear | - | Insufficient | - | - | No official or press source found naming a Tlemcen–CDG nonstop specifically; only generic "Paris–Tlemcen" aggregator hits which don't disambiguate CDG vs Orly and name Transavia, not Air Algérie, as the Orly operator (see #4) |
| 4 | Tlemcen (TLM) – Paris Orly (ORY) | Likely no (Air Algérie) | Transavia (not Air Algérie) per aggregator search | N/A for this dataset's scope | - | Insufficient (for an Air Algérie leg) | search snippet: "Transavia Airlines operates flights from Paris Orly to Tlemcen" | 5x/week (Transavia, aggregator-sourced) | No evidence found of an Air Algérie Paris–Tlemcen nonstop in either direction; do not include as Air Algérie route without further confirmation |
| 5 | Oran (ORN) – Brussels (BRU) | Unclear - likely lapsed for Air Algérie | Currently TUI Fly per aggregators; Air Algérie described only as historical/pre-COVID operator | Unclear / possibly suspended for Air Algérie | - | Insufficient | brusselsairport.be/fr/passenger/destinations/oran - 403 Forbidden, could not access (WAF/geo-block) | Pre-COVID: 5x/week claimed | Official Brussels Airport destination page is blocked to this tool. Cannot confirm current Air Algérie operation independently; aggregator signal points to TUI Fly as current operator, Air Algérie status unclear |
| 6 | Oran (ORN) – Lisbon (LIS) | No (nonstop), on Air Algérie | Air Algérie flies this pair only via Algiers (connection) | N/A (not nonstop on AH) | - | Insufficient/Negative | Aggregator search explicitly states Air Algérie flights are "indirect ... with a stopover in Algiers" | - | Could not reach an official Lisbon airport (ANA/Aeroportos de Portugal) destinations page to cross-check. Working finding is negative for a nonstop AH leg, but only aggregator-sourced - flag as needing an official check before shipping either way |
| 7 | Oran (ORN) – Metz/Nancy Lorraine (ETZ) | Yes | Air Algérie | Active, seasonal, forward schedule published | Both (round-trip rotation) | Official | lorraineaeroport.com/vols-destinations/oran/ (official airport site, fetched directly) | 29 Mar–24 Oct 2026: Thu (29 Mar–13 Jun), Wed (14 Jun–12 Sep), Thu (13 Sep–24 Oct); ~2h20 flight time | Cleanest official confirmation in this whole cluster - forward schedule for the 2026 season, named operator, explicit days |
| 8 | Constantine (CZL) – Toulouse (TLS) | Yes (route exists) but operator unconfirmed on official page | Unconfirmed on official source (aggregators say Air Algérie) | Active per aggregators | - | Reported (not official) | toulouse.aeroport.fr/vols-et-destinations/constantine (fetched: confirms "Vol direct Toulouse → Constantine" but does NOT name the airline) | ~4x/week pre-COVID per aggregator, not confirmed current | Official Toulouse airport page confirms the nonstop route exists but is silent on operator; only aggregators attribute it to Air Algérie - treat operator attribution as reported, not official |
| 9 | Batna (BLJ) – Paris CDG | Conflicting airport designation | Air Algérie (only carrier cited) | Active | One-way-ish, ~1x/week | Reported, with an unresolved CDG-vs-Orly conflict | Aeroroutes-style aggregator citing CDG-BLJ; a separate search returned "Air Algérie offers direct flights from Paris-Orly (ORY) to Batna" | 1x/week, Sun ~14:55–15:35 CDG-side claim | Two aggregator-derived claims disagree on which Paris airport (CDG vs Orly) is actually used. Could not resolve with an official source (Paris aéroport / ADP site returned no on-point results). Flag this conflict explicitly - do not ship a CDG or Orly claim without resolving |

**Additional ex-Tassili-era regional France pairs found** (from press on Tassili's summer 2025 program, which is the actual documented set, not identical to the 9 named pairs above):
- Algiers (ALG) – Lyon (LYS): Tassili, 2x/week, 2 Jul–12 Sep 2025 (air-journal.fr, observalgerie.com, algerie360.com - cross-checked, reported tier)
- Béjaïa (BJA) – Paris CDG: Tassili, up to 2x/week, 4 Jul–14 Sep 2025 (same sources)
- Oran (ORN) – Paris CDG: Tassili, 2x/week, 2 Jul–13 Sep 2025 (same sources)
- Algiers (ALG) – Strasbourg (SXB): confirmed transferred to Air Algérie mainline, launched/relaunched 1 Dec 2025, 2x/week Mon/Thu through 26 Mar 2026, explicitly described in press as replacing a Tassili-operated route (observalgerie.com, 2025-11-02 and 2025-12-01; visa-algerie.com "Air Algérie absorbe Tassili Airlines")

**Important correction to the brief's framing:** the actual documented 2025 Tassili summer France network (ALG-LYS, BJA-CDG, ORN-CDG) does not overlap with 7 of the 9 named "doubtful" pairs (Tlemcen x4, Oran-Brussels, Oran-Lisbon, Constantine-Toulouse, Batna-CDG). Those latter routes read in the sources as long-standing/separate Air Algérie mainline routes rather than ex-Tassili absorptions - I could not find a single source tying Tlemcen, Constantine-Toulouse, or Batna-CDG to the Tassili rebrand/wind-down. Chlef, Sétif, Béjaïa (aside from the CDG summer route above), Annaba, and Mostaganem: no international nonstop pairs found in Tassili or Air Algérie press for the ex-Tassili category beyond what's listed above.

## GROUP B - candidate additions

| # | Pair | Nonstop exists? | Operator | Status | Direction | Evidence tier | Source | Frequency | Note |
|----|------|-----------------|----------|--------|-----------|---------------|--------|-----------|------|
| 10 | Algiers (ALG) – Zurich (ZRH) | No | - | N/A | - | Insufficient/Negative | Aggregator search: "no direct or non-stop flights from Zurich ... to ... ALG"; only SWISS/Air Algérie/Lufthansa/ITA/Iberia/Air France connections found | - | Negative finding - do not add. Could not reach an official confirming source but multiple booking engines agree there's no nonstop |
| 11 | Algiers (ALG) – Hurghada (HRG) | Yes | Air Algérie | Active - charter, newly launched | Round-trip charter | Reported (cross-checked, multiple independent Algerian press) | observalgerie.com/2026/07/26 "Air Algérie : le 1er vol charter Alger-Hurghada effectué"; maghrebemergent.com; voyagerdz.com (all same event, late July 2026) | First rotation only just flown (~24-26 July 2026); ongoing cadence not yet established | This is brand new (days old as of this research) - a single charter rotation is confirmed by 3 independent Algerian outlets, but there's no forward schedule yet, so "active" should be read as "inaugurated," not proven recurring |
| 12 | Algiers (ALG) – Sharm el-Sheikh (SSH) | Unclear | Air Algérie claimed | Unclear | - | Insufficient | Only source found: a travel-agency Facebook ad ("Village Des Voyages") claiming "vol direct charter Air Algérie" | - | Single non-independent promotional source (a tour operator's own ad), not citable as evidence of record. Do not ship without an airline/airport/press confirmation |
| 13 | Constantine (CZL) – Izmir (ADB) | Not established | - | Unclear | - | Insufficient | - | - | No source found confirming a Constantine–Izmir Air Algérie nonstop, direct or otherwise. Only generic Algiers–Izmir aggregator noise, itself unconfirmed as nonstop |
| 14 | Algiers (ALG) – Budapest (BUD) | Yes - genuine nonstop leg exists, in BOTH directions but on different days (triangle rotation) | Air Algérie | Active, resumed after 5-year gap | Direction-dependent (see note) | Official/cross-checked | aeroroutes.com/eng/250728-ahnw25bud (trade press aggregating airline schedule filings); air-journal.fr 2025-08-04 "Air Algérie reprend sa ligne vers Budapest après cinq ans d'interruption"; travelandtourworld.com | 2x/week total: Wed rotation = ALG→VIE→BUD→ALG; Sat rotation = ALG→BUD→VIE→ALG. Effective 29 Oct 2025 (Wed leg) / 1 Nov 2025 (Sat leg) | This resolves the "technical stop" question: it is a genuine triangle, not a single ALG-BUD-VIE tech stop. On the Wednesday rotation the ALG–BUD nonstop does NOT exist (that rotation goes ALG-VIE first, then VIE-BUD, then BUD-ALG nonstop on the return leg). On the Saturday rotation, ALG–BUD IS flown nonstop as the first leg. So: nonstop ALG→BUD exists on Saturdays; nonstop BUD→ALG exists on Wednesdays (as the return leg). Neither day offers a round-trip nonstop in both directions on the same day - a same-day traveler on either rotation experiences one nonstop leg and one one-stop leg per direction. State this precisely in the dataset rather than a flat "yes" |

**ALG-IST vs ISL check:** No source found using the ISL code/Atatürk framing for current Air Algérie service. All aggregator and press sources consistently reference Istanbul as IST (the current unified Istanbul Airport code), 10x/week claimed, both Air Algérie and Turkish Airlines named as nonstop operators. No evidence of a stale ISL/Atatürk reference in current listings. This does not rule out an internal dataset error but no external source reproduces it - likely the dataset's own artifact rather than a sourced claim.

## Sources blocked / inaccessible
- brusselsairport.be/fr/passenger/destinations/oran - HTTP 403 (WAF or bot-block). Could not independently verify current Oran–Brussels operator.
- No official Lisbon airport (ANA Aeroportos) destinations page could be located/fetched for Oran–Lisbon cross-check.
- No official Paris aéroport (ADP/parisaeroport.fr) destination page could be located for Tlemcen or Batna to resolve CDG-vs-Orly.
- airalgerie.dz/decouvrir/nos-destinations/ fetched twice: confirms the overall network size (44 international / 33 domestic routes) and destination city list, but the page structure does not expose explicit city-pair routes (e.g., does not say "Tlemcen–Lyon" as a discrete line item), so it could not be used to confirm or deny individual pairs beyond corroborating that Budapest, Vienna, Zurich, Istanbul appear somewhere in the network.

---

# Soar probe cross-check (added 2026-07-27, after the table above)

Two probe runs against the Soar/Duffel search API. Run 1 sampled 2026-08-12 and
2026-11-18; run 2 swept the full week Mon 2026-08-10 to Sun 2026-08-16. Every leg is
filtered to `stops: 0` with exactly one segment, then duration-checked against
`great_circle / 800 kph + 30 min`.

Soar is not a citable source and appears in no `source_url`. This section records what
it generated as hypotheses and which way it moved confidence.

## Merged verdicts

| Pair | Probe result | Merged verdict | Changed? |
| --- | --- | --- | --- |
| TLM-MRS | `AH 1092` nonstop 13, 15, 16 Aug (115 min vs 112 expected), alongside `V7 2679` | **Air Algerie DOES operate it.** Both carriers fly the pair | **Yes.** Upgraded from "unclear, probably Volotea" |
| TLM-LYS | `TO 7319` only across the August week; `AH 1098` only on 18 Nov | Air Algerie serves it, but not in the sampled August week. Operating pattern unresolved | **Yes.** Not the simple year-round confirmation first read |
| ETZ-ORN | `AH 1185` nonstop Wed 12 Aug (140 min vs 149 expected) | **Air Algerie confirmed on the Metz route.** ORN-ETZ direction silent all week, a coverage gap rather than absence | **Yes.** Operator now confirmed, not just the route |
| BLJ-CDG | `AH 1120` nonstop Wed 12 Aug (145 min vs 143 expected); BLJ-ORY silent all week | **CDG confirmed, Orly excluded.** Conflict closed | **Yes.** Was an unresolved CDG-vs-Orly conflict |
| TLM-ORY | `TO` only, 8 rotations across the week, no `AH` | Transavia. Excluded from an Air Algerie dataset | No, confirms |
| ALG-SXB | `TO 7315` on 11 and 15 Aug, no `AH` | Air Algerie absent in August. Consistent with the winter season having ended 26 Mar 2026. Needs its own check | New question |
| TLM-CDG, ORN-BRU, ORN-LIS, CZL-ADB, ALG-SSH, BLJ-ORY | silent all week | No change. Silence here is weak evidence, not a negative | No |
| CZL-TLS | silent all week | Toulouse airport confirms a direct route exists, so this is a coverage gap. Operator still unattributed | No |
| ALG-HRG | silent all week | Expected: charters are not normally sold through GDS. Not evidence against | No |

## ALG-BUD triangle: three of four legs directly observed

Aeroroutes describes Wed `ALG-VIE-BUD-ALG` and Sat `ALG-BUD-VIE-ALG`. Observed:

| Leg | Observed | Matches filing? |
| --- | --- | --- |
| Wed ALG to BUD | `AH 2028`, 280 min vs 163 expected, so via Vienna | Yes |
| Wed BUD to ALG | `AH 2028`, 180 min, nonstop (run 1 only) | Yes |
| Sat BUD to ALG | `AH 2028`, 285 min vs 163 expected, so via Vienna | Yes |
| Sat ALG to BUD | predicted nonstop, **not observed in either run** | Unconfirmed |

The same flight number covers both a nonstop and a one-stop routing depending on the
day, which is exactly why `stops: 0` cannot be trusted on its own.

## Offers are volatile between runs

Run 1 found the Wed BUD-ALG nonstop at 180 min. Run 2, roughly 30 minutes later and
covering the same date, did not return it at all. Nothing about the schedule changed
in between, so **a Soar silence is weak evidence and must never be recorded as a
negative finding.** Absence justifies leaving a pair `unclear`; it never justifies
deleting a route that a citable source supports.
