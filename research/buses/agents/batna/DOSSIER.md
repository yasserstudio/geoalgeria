# Batna (wilaya 05) - ETUB dossier

Retrieved 2026-09-03. Web and official-site sources only.

## Findings

- ETUB exists and is active: awras.net, 24 August 2026, reports it receiving 35
  new 100-passenger buses under the national 10,000-bus renewal programme. The
  article names **no line, no route and no line count**.
- A tender directory (rhinotenders.com) lists the legal name as *"Etablissement
  public de Transport Urbain et Suburbain de la wilaya de Batna"* and abbreviates
  it **ETUSB**. **Abbreviation collision worth recording:** ETUSB is also Bechar's
  abbreviation. Press uses ETUB for Batna; prefer ETUB and store the full legal
  name.
- **No ETUB website was found.** No official Facebook page was identified either;
  a third-party "Batna Bus App" page (id `61550685430150`) exists and was not
  read.
- A Play Store app **`com.deeper.etus.batna` ("Etus Batna")** exists, published by
  **Deeper Tech**, a third-party vendor that ships the same shell for Setif,
  Blida, Ain Defla, Souk Ahras and others. Version 1.0.0, updated 2024-12-25. The
  direct Play URL 404s; the apkcombo mirror shows the entire description is one
  sentence: *"BATNA Urban Transport App"*. This is a **live-tracking lead, not a
  line source**, and the same audit conclusion already reached for the Ain Defla
  and Setif apps applies here (see `AIN-DEFLA-APP-AUDIT.md`,
  `SETIFIS-APP-AUDIT.md`).
- `fr.wikipedia` "Transport a Batna" is a stub. Its whole urban-bus content is a
  10-15 DZD fare sourced to Lonely Planet p.124 (2011). It names no operator and
  no line.
- OSM has one route, `ref=03`, no name, no operator, **and all 16 stop members
  unnamed**. Details in `osm-match.md`.

## Best identity source

**awras.net 2026-08-24**, for the operator's existence and current fleet renewal
only. Press tier. There is no line-identity source at any tier.

## Gaps

1. No line list, no refs, no termini.
2. Batna is the weakest of the three on OSM data quality: zero named stops means
   there is nothing to reconcile against a future official list except the two
   end labels and the geometry.
3. The Bouzourane <-> Hamla tramway project shares this corridor, which is an
   active false-attribution risk. Flagged in `osm-match.md`.

## Recommended decision

**Do not add Batna. Keep the existing "exclude" verdict in `EXPANSION.md`.**

Batna is the lowest-yield of the three despite being the largest city, because
even a future official list would land on OSM geometry with no usable stop names.
Two leads are worth keeping: a static audit of `com.deeper.etus.batna` in the same
manner as the Ain Defla audit, which would establish whether Deeper Tech exposes a
static line endpoint for Batna; and a Direction des transports de la wilaya de
Batna publication. Neither should be pursued ahead of the already-structured
Sidi Bel Abbes and M'Sila geometry gaps.
