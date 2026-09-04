# Batna (05) - OSM to official line matching

Checked 2026-09-03. Rule applied: ref AND termini must both come from an
operator-owned source. Geography alone is never sufficient.

## OSM candidate

`research/buses/osm/candidate-lines.json`, candidate `candidate-31211607d2df`,
`wilaya_codes: ["05"]`.

| Relation | ref | name | from -> to | stop members | length | operator | network |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [18591051](https://www.openstreetmap.org/relation/18591051) | `03` | **none** | Parc a Fourage -> Hamla 3 | 16 | 14.5 km | **absent** | **absent** |

Classified `review_only` / `unresolved`, flags `missing_network`,
`missing_operator`.

**All 16 stop members are unnamed.** There is no intermediate-stop evidence of any
kind, so a stop-sequence comparison against a future official list is not even
possible from the current OSM data.

## Official line list available for comparison

**None.** No ETUB website was found. The only ETUB press coverage (awras.net,
2026-08-24, 35 new buses) never names a line. `fr.wikipedia` "Transport a Batna"
is a stub whose entire urban-bus content is a fare range sourced to a 2011 Lonely
Planet page. The `com.deeper.etus.batna` Play app is published by a third party
(Deeper Tech) and its description is the single sentence "BATNA Urban Transport
App".

## Match verdict

**No match can be asserted.** Neither half of the rule is satisfied: `ref=03` is
uncorroborated and the termini "Parc a Fourage" / "Hamla 3" appear in no official
source.

**Trap to avoid.** The Wikipedia article documents a *planned tramway* running
Bouzourane <-> the new town of Hamla via the city centre, 15 km, 24 stations. That
is the same corridor and a similar length as OSM relation 18591051 (Parc a Fourage
-> Hamla 3, 14.5 km). It is a different mode, a different project, and a different
terminus at the western end. Do not let the corridor similarity be read as
confirmation of a bus line `03`.
