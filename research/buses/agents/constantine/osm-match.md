# Constantine (wilaya 25) - OSM candidates vs official/press lines

Checked 2026-09-03 against the committed snapshot
`research/buses/osm/relations.json` and `research/buses/osm/candidate-lines.json`.

## What OSM actually has in wilaya 25

Exactly **one** candidate group, **two** relations, and it is not an urban line:

| Relation | ref | name | operator | network | from -> to | km | stop members |
|---|---|---|---|---|---|---|---|
| [18472778](https://www.openstreetmap.org/relation/18472778) | none | none | none | none | الحروش -> قسنطينة | 40.2 | 0 |
| [18472822](https://www.openstreetmap.org/relation/18472822) | none | none | none | none | قسنطينة -> الحروش | 41.7 | 0 |

Group `candidate-17dddbab7a67`, wilaya_codes `["21","25"]`, classified
`inter_wilaya_candidate`, `map_readiness: review_only`, quality flags
`cross_wilaya, missing_network, missing_operator, missing_ref, no_station_members`.

## Match result: none

- **ref match: impossible.** No OSM relation in wilaya 25 carries a `ref` at all,
  so none can be matched to L02, L05, L08, L15, L16 or L19.
- **termini match: none.** The only OSM pair runs Harrouch (wilaya 21) <-> Constantine,
  a ~41 km interwilaya corridor. No press-attested ETUSC line has Harrouch as a
  terminus; every ETUSC line found is inside the Constantine agglomeration
  (Kaddour Boumedous, Boussouf, Zaouche, the airport, Bab El Kantara / Zamouche,
  Ali Mendjeli, El Khroub, Didouche Mourad, Aïn Nehas).
- **operator match: none.** `operator` and `network` are unset on both relations.
  ETUSC cannot be attached to them. Attaching it because the route touches
  Constantine would be attribution by geography alone, which this project does not do.

**Confidence: high that there is no match.** The finding is negative and it is
firm: the ETUSC urban network is simply not mapped in OSM as route relations.

## Consequence

Constantine cannot be given drawable geometry from the current OSM snapshot.
Any Constantine publication would be directory-only (ref + termini), exactly like
Sidi Bel Abbès, Béjaïa and M'Sila today.
