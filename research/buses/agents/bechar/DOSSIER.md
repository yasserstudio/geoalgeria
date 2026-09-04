# Bechar (wilaya 08) - ETUSB dossier

Retrieved 2026-09-03. Web and official-site sources only. No live vehicle or
position endpoint was called and no token was used.

## Findings

- The operator is real and its identity is now independently receipted. The
  Google Play developer account **"ETUS Bechar"** carries the tagline
  *"entreprise transport urbain et suburbain bechar"* and declares the website
  **https://www.etus-bechar.dz**. That is the first non-press confirmation that
  the domain is the operator's own, not a third-party fan site.
- **The official site is still dead.** `etus-bechar.dz` and `www.etus-bechar.dz`
  both returned `getaddrinfo ENOTFOUND` on 2026-09-03, for the second check in a
  row (the first is recorded in `research/buses/EXPANSION.md`). Search engines
  still hold an index entry titled
  *"ETUSB | مؤسسة النقل الحضري وشبه الحضري بشار"*, so the site existed and was
  crawled at some point; no cached line list surfaced.
- The operator Facebook page (id `100042790543167`) and the Direction des
  transports de la wilaya de Bechar page (id `100063984100351`) both exist and are
  login-walled to a fetcher. Nothing but titles is exposed.
- There is **no Deeper Tech `com.deeper.etus.*` app for Bechar**. That family
  covers Setif, Blida, Batna, El Taref, Djelfa, Ain Defla, Souk Ahras, Mascara,
  Tipaza and Sidi Bel Abbes, but not Bechar.
- No press article naming a Bechar urban line was found in French or Arabic.
- OSM has exactly one route identity, `ref=1` Bechar <-> Kenadsa, split across two
  relations with no operator and no network tag. Details in `osm-match.md`.

## Best identity source

**The Google Play developer profile**, for the operator's name and official
domain only. It gives zero line-level information.

For *line identity* there is currently **no source at any tier** - not official,
not press, not Wikipedia.

## Gaps

1. No line list, no refs, no termini from any operator-owned source.
2. The two `ref=1` relations are not a clean directional pair (19 vs 7 stop
   members) and would need reconciliation even if the identity were confirmed.
3. No licence or reuse statement anywhere, since there is no reachable site.

## Recommended decision

**Do not add Bechar. Keep the existing "not yet" verdict in `EXPANSION.md`.**

The one thing that changed on 2026-09-03 is the strength of the *lead*: the domain
is now confirmed operator-owned rather than merely plausible. Set a recheck on
`etus-bechar.dz` DNS; a returning site is the single event that would unblock this
wilaya, because the OSM geometry (23 km, 19 named stops in Arabic and French) is
already good enough to promote the moment a ref and a terminus pair can be
sourced.
