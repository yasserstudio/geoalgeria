# Annaba (wilaya 23) - OSM candidates vs official lines

Checked 2026-09-03 against the committed snapshot
`research/buses/osm/relations.json` and `research/buses/osm/candidate-lines.json`.

## What OSM actually has touching wilaya 23

Four candidate groups, seven relations. **Every one has `ref: null`, `name: null`,
`operator: null`, `network: null` and zero stop members.**

| Relation | from -> to | km | group | classification |
|---|---|---|---|---|
| [18468277](https://www.openstreetmap.org/relation/18468277) | كوش نور الدين -> مرزوق عمار | 23.8 | candidate-f93a49993b17 | unresolved |
| [18468278](https://www.openstreetmap.org/relation/18468278) | مرزوق عمار -> كوش نور الدين | 25.4 | candidate-f93a49993b17 | unresolved |
| [18468572](https://www.openstreetmap.org/relation/18468572) | كوش نور الدين -> حجر الديس | 21.4 | candidate-aec92493bd0f | unresolved |
| [18468573](https://www.openstreetmap.org/relation/18468573) | حجر الديس -> كوش نور الدين | 21.0 | candidate-aec92493bd0f | unresolved |
| [18559186](https://www.openstreetmap.org/relation/18559186) | كوش نور الدين -> الكاليتوسة | 35.6 | candidate-e472b453eff5 | unresolved |
| [18559187](https://www.openstreetmap.org/relation/18559187) | الكاليتوسة -> كوش نور الدين | 35.7 | candidate-e472b453eff5 | unresolved |
| [18472594](https://www.openstreetmap.org/relation/18472594) | عنابة -> عزابة | 62.2 | candidate-f58c5fcf87b7 | inter_wilaya_candidate (21+23) |

## What can honestly be said

- The three reciprocal pairs are a **star centred on كوش نور الدين**. Local press
  (Akher Saa) identifies Kouche Noureddine as the Annaba station that operates the
  **semi-urban** routes, while urban buses work out of Souidani Boudjemaa. So the
  OSM cluster is, in shape, the semi-urban radial network of Annaba city.
- That is a **shape argument, not an identity argument.** ETUS Annaba is one of
  several operators licensed on semi-urban routes out of that station; the same
  press notes private operators on the neighbouring-commune lines. `operator` is
  unset on all seven relations.
- 18472594 (Annaba -> Azzaba, 62 km, one direction only) crosses into Skikda and is
  an interwilaya coach corridor, not urban or suburban.

## Match result: none

- **ref match: impossible.** No ETUS Annaba line list of any kind was found, and no
  OSM relation carries a ref. There is nothing on either side to join on.
- **termini match: not attempted.** With no official termini list, matching
  Kouche Noureddine -> Merzoug Ammar / Hadjar Eddis / El Kalitoussa to an ETUS line
  would be attribution by geography alone. Not done.
- **operator match: none.**

**Confidence: high.** Annaba is a double blank - no official line list, no OSM
identity. It is a weaker position than Constantine, which at least has six
press-attested refs.

## If Annaba is ever unblocked

The three reciprocal pairs are the only drawable Annaba geometry available, and
they carry complete geometry (`geometry_status: complete`). The moment an ETUS
Annaba line list exists, re-run this match on termini: three candidate corridors
is a small enough set to confirm or reject by hand.
