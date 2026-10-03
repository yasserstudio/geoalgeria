# Bechar (08) - OSM to official line matching

Checked 2026-09-03. Rule applied: a route is attributed to an operator only when
an operator-owned source states the same **ref** AND the same **termini**.
Geography alone is never sufficient.

## OSM candidates

`research/buses/osm/candidate-lines.json`, candidate `candidate-1ecd838b5eea` and
`candidate-413ee01ab9b8`, both `wilaya_codes: ["08"]`.

| Relation | ref | name | from -> to | stop members | length | operator | network |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [9974721](https://www.openstreetmap.org/relation/9974721) | `1` | حافلة: بشار -> القنادسة | بشار -> القنادسة | 19 | 23.4 km | **absent** | **absent** |
| [10169262](https://www.openstreetmap.org/relation/10169262) | `1` | Bus : Kenadsa ->Béchar | Kenadsa -> Bechar | 7 | 22.5 km | **absent** | **absent** |

Both are classified `review_only` / `unresolved` with quality flags
`missing_network`, `missing_operator`.

Named stop members (union, in relation order): logement Urbat, موقف العربة,
موقف الفيراج, موقف المحطة, موقف الحديقة, موقف البريد, Arret de Bus Ksar,
Arret Marche Bouhlal, موقف حي الصباح, Ksar, البريد, الحديقة, المحطة, الفيراج,
العربة, حي الصباح, Arret des Bus Kenadsa Bechar, Arret de bus Escadron,
Escadron, Arret des Bus vers Bechar. Several members are unnamed.

## Official line list available for comparison

**None.** `etus-bechar.dz` is the operator's own declared domain (the Google Play
developer profile "ETUS Bechar" states it verbatim) but DNS resolution failed for
both the apex and `www` on 2026-09-03. The operator Facebook page and the
Direction des transports page are login-walled.

## Match verdict

**No match can be asserted.** There is nothing official to match against, so
neither the `ref=1` nor the Bechar-Kenadsa termini pair is corroborated by the
operator. The two relations are also not tagged with any operator, so even the
claim "this is an ETUSB line" is unsourced in OSM itself.

The Bechar - Kenadsa corridor is a real ~23 km suburban link and it is plausible
that ETUSB runs it, but that is geography plus plausibility, which this project
explicitly does not accept as attribution.

Two further reconciliation problems are deferred until a list exists:

1. The two relations share `ref=1` and are near-mirror directions, but their stop
   counts differ sharply (19 vs 7), so they are not a clean directional pair and
   would need merging or splitting before promotion.
2. Nothing establishes whether `1` is the operator's own line number or a mapper's
   convenience.
