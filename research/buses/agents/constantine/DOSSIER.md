# Constantine - ETUSC bus network research dossier

Wilaya 25. Operator `etusc-constantine` in
[`operator-registry.json`](../../operator-registry.json).
Research date **2026-09-03**. Web search and fetch only; no live vehicle or
position endpoint was called, no token was used.

## Findings

- **[seen]** ETUSC is the Entreprise publique de transport urbain et suburbain de
  Constantine. It has **no website**: no result in any search, and `etus25.dz`
  does not resolve in DNS, although the same pattern serves a real line-and-times
  page for other wilayas (`etus22.dz/CF/Horaires.php`, Sidi Bel Abbès).
- **[seen]** The operator's Facebook page exists at
  `facebook.com/p/...-100026160044690` (page id **100026160044690**). It is
  **login-walled to a fetcher**: only the page title returned, no posts.
  This is a new id, not previously in the registry.
- **[seen]** ETUSC put GPS identification codes on its buses and publishes them in
  the **CirtaBus / سيرتا بيس** app: press describes **12 tracked lines**, made of
  **10 lines** linking the city centre to neighbourhoods and housing poles across
  **4 communes**, plus **2 lines inside the Ali Mendjeli administrative district**.
  A second press piece states the operator was running 12 lines with 46 buses
  before the 150-bus reinforcement took the fleet to 196.
- **[seen]** **Six line codes with termini** are published by El Massa (2022-12-05):
  L02, L05, L08, L15, L16, L19. This is the only line-code list found anywhere.
- **[seen]** **Three further lines** opened 2025-06-17 from Zamouche (Bab El Kantara)
  station, 06:00-19:30 (Assayahi, 2025-06-16). Press gives their termini but **no refs**.
- **[seen]** The An Nasr article that carries the "12 lines" headline returns **HTTP 403**
  to a fetcher on both attempts. Its full line list was never obtained.
- **[seen]** OSM has nothing usable: one interwilaya relation pair
  (Harrouch <-> Constantine), no ref, no operator, no stops. See
  [`osm-match.md`](./osm-match.md).
- **[seen]** App package ids recorded as leads: **`org.buscirta.manager`**
  (registry's existing lead) and **`org.cirtabus.manager`** (a second Play/APK
  listing, developer معاليم عادل, last updated 2022-12-23). Both are the same
  "Cirta Bus" product; press attributes it to ETUSC itself, so the registry's
  `third_party_app_claim` classification for Constantine is probably too weak -
  but the developer name is an individual, so do not upgrade it to
  `official_app` without a statement from ETUSC.

## Best identity source

**El Massa 2022-12-05**, for now. It is press, not official, but it is the only
source that pairs a **ref** with **termini**, and refs are what the package keys
Lines on. Everything else gives either a count (12) or unnumbered termini.

The real best source is unopened: the **ETUSC Facebook page (100026160044690)**.
Aïn Defla was unblocked exactly this way - the project owner logged in, read the
operator's own route artwork, and 16 Lines were transcribed from it.

## Gaps

1. Six of twelve line codes are missing (L01, L03, L04, L06, L07, L09-L14, L17, L18
   are all unknown; the codes seen are not contiguous, so even the numbering scheme
   is unconfirmed).
2. The three 2025 lines have no refs, so they cannot be reconciled against the 12.
   They may be new lines beyond the 12, or the 2025 renumbering of existing ones.
3. Arabic termini for L15/L16/L19 were reconstructed from Arabic search summaries,
   not read verbatim off the page (the page renders, the summary was translated).
   Verify before promotion.
4. No geometry, no stop lists, no headways, no fares.
5. An Nasr (403) and the Université Constantine 3 thesis (host refused connection)
   are both unread and both plausibly carry the full table.

## Recommended decision

**Do not promote yet. Hold as a directory-only candidate, and ask the project owner
for one Facebook read.**

Concretely:
- Add page id **100026160044690** and package id **`org.cirtabus.manager`** to
  `etusc-constantine` in `operator-registry.json` as discovery leads.
- Request the same owner action that unblocked Aïn Defla: open the ETUSC page while
  logged in and capture any route list or line artwork. That single step probably
  closes the 12-line gap.
- If the owner supplies nothing, the fallback is publishing **6 press-attested Lines**
  with `evidence_type: derived` - a third of a network whose size we can state (12).
  That is thinner than what Sidi Bel Abbès and M'Sila shipped, and it would put a
  partial network on the map under an operator name the source does not fully cover.
  Recommend waiting.
- Never call the CirtaBus position endpoints; they are live vehicle data with no
  reuse grant.
