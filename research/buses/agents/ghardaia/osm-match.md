# Ghardaia (47) - OSM to official line matching

Checked 2026-09-03. Rule applied: ref AND termini must both come from an
operator-owned source. Geography alone is never sufficient.

## OSM candidate

`research/buses/osm/candidate-lines.json`, candidate `candidate-3d295b2ae620`,
`wilaya_codes: ["47"]`.

| Relation | ref | name | from -> to | operator tag | network |
| --- | --- | --- | --- | --- | --- |
| [13145030](https://www.openstreetmap.org/relation/13145030) | `32` | Bus 1 | موقف حافلة 1 - مركز المدينة والسوق -> موقف حافلة 1 - الأقواس | `Bus Ghardaia ville 1` | **absent** |
| [13145031](https://www.openstreetmap.org/relation/13145031) | `32` | Bus 1 Reverse | موقف حافلة 1 - الأقواس -> موقف حافلة 1 - مركز المدينة والسوق | `Bus Ghardaia ville 1 Reverse` | **absent** |

56 stop members across the pair, 4.1-4.2 km per direction, `review_only` /
`unresolved`, flag `missing_network`.

Named stops include: Lakwass (الأقواس), Lablad/Soug/Centre ville, Marghoub
universitaire, Marghoub el thenia, Thenia universitaire, Actel/Baladia/Lycee,
Societe Generale, BNA, Muhafada, OPGI/Baladia, Marakchi, موقف القهوة,
موقف المحطة, al Ateuf rond-point, sidi abbaz ala bara el oued. Many members are
unnamed and several names repeat, so the ordered stop sequence is not clean.

## Tagging problems found

- **The `operator` tag is not an operator.** It contains `Bus Ghardaia ville 1`,
  a route label. ETU-G is never named anywhere in the relations.
- **`ref` and `name` disagree**: `ref=32` versus name `Bus 1` and stop names that
  all say "موقف حافلة 1". One of the two is wrong and there is no source to say
  which.
- The route is only ~4.1 km, i.e. a city-centre loop, not one of the
  inter-locality services (Oued N'chou, Noumerat, El Menea, Berriane, Guerrara,
  Metlili, Zelfana, Mansourah) that the press attributes to ETU-G.

## Match verdict

**No match can be asserted.** No ETU-G line list, numbered or otherwise, exists
in any retrievable source. The press corroborates only that ETU-G exists, when it
was created, its fleet size, and which *localities* it serves - never a ref and
never a terminus pair. Matching `Bus 1`/`ref 32` to an official line is therefore
impossible today, and matching by geography would be exactly the error this
project forbids.
