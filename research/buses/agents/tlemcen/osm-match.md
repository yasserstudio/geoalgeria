# OSM candidate identity, Tlemcen (wilaya 13)

Retrieved 2026-09-03. Six OSM route relations carry wilaya code 13 in
`research/buses/osm/candidate-lines.json`. None of them carries a `from`/`to` pair,
an operator name that resolves to a real company, or a `network` value that names a
network. Identity below is decided on **ref plus termini matched to a document**,
never on geography alone.

The only document that inventories Tlemcen city lines is the 2018 Universite de
Tlemcen master's thesis (FORLOUL/SERBOUK), whose Tableau 3.1 lists the private
"lignes independantes" and Tableau 3.2 the "lignes publiques". See `sources.json`.

| relation | ref / name | OSM operator tag | verdict | confidence |
|---|---|---|---|---|
| 7848044 | `A42` | `name here` (placeholder) | private operator route | high |
| 7848086 | `B42` / `(B42)Oujlida-Aboutachfine-Tlemcen` | `Prive` | private operator route | high |
| 7876088 | `(univ)Chetouane-Imama` | `Public` | university shuttle | medium |
| 7876089 | `(univ)Chetouane-Medecine` | `Public` | university shuttle | medium |
| 7876090 | `(univ)Chetouane-LaGare` | `Public` | university shuttle | medium |
| 7848106 | `(univ)Chetouane-LaRocade` | none (`operator:type=public`) | university shuttle | medium |

**Zero of the six is an identified ETUS Tlemcen line.**

## 7848044 - A42, private

Tags: `ref=A42`, `name=A42`, `network=bus number`, `operator=name here`,
`route_ref=ref here`. `bus number`, `name here` and `ref here` are unedited editor
placeholder strings, so the operator tag carries no information at all. 65 stop
members, 23.2 km, no from/to. One stop member is literally named `A42/B42`.

Match: Tableau 3.1 of the thesis lists **Ligne A-42, Centre-ville - Oujlida, 23 buses,
16 stops**, under the heading *lignes independantes* (private operators). Ref matches
exactly and the corridor matches its paired B42 relation (below). The thesis places
A-42 among the private lines, and the OSM tagging supplies no counter-evidence.
**Verdict: private operator route on the Oujlida corridor, not ETUS. Confidence high**
(ref match against a wilaya-Transport-Directorate-sourced table; the residual doubt is
that the table is 2018 and the relation is not dated).

## 7848086 - B42, private

Tags: `ref=B42`, `name=(B42)Oujlida-Aboutachfine-Tlemcen`, `network=Oujlida-Aboutachfine-Tlemcen`,
`operator=Prive`. 28 stop members, 18.0 km. Shares **16 of its 28 stop members with
7848044**, including the stop named `AB`, so A42 and B42 are a paired A/B service over
one corridor, exactly as the thesis lists them (A-42 and B-42, both Centre-ville - Oujlida).

Match: Tableau 3.1, **Ligne B-42, Centre-ville - Oujlida, 27 buses, 13 stops**. The OSM
name adds Abou Tachfine as the intermediate point, which is consistent (Abou Tachfine sits
between the centre and Oujlida, and is where the ETUS depot is).
**Verdict: private operator route. Confidence high** - here the mapper's own
`operator=Prive` tag and the thesis agree independently.

## 7876088 / 7876089 / 7876090 / 7848106 - the four `(univ)` Chetouane relations

Tags: `name`/`ref` = `(univ)Chetouane-Imama`, `(univ)Chetouane-Medecine`,
`(univ)Chetouane-LaGare`, `(univ)Chetouane-LaRocade`; `network` repeats the name;
`operator=Public` on three, and 7848106 has only `operator:type=public` with no operator
name. Lengths 18.4 / 14.5 / 4.3 / 13.6 km. Stop members: 8 on 7876089 (all unnamed),
**zero** on the other three.

- The `(univ)` prefix is the mapper's own marker, and the four destinations are the
  university's own sites: Imama and Chetouane are Universite Abou Bekr Belkaid campuses,
  "Medecine" is the faculty of medicine, "LaGare" the rail/bus station, "LaRocade" the
  ring road. This is a campus shuttle pattern, not a numbered city line.
- Decisive negative: **no ref of the `(univ)Chetouane-*` shape appears anywhere in either
  thesis table**, neither among the 6 public lines (01-06) nor the 13 private ones. A
  numbered ETUS line would have a number.
- `operator=Public` is a generic word, not a company. It does not read as ETUS and must
  not be promoted to one.

**Verdict: university shuttles, almost certainly ONOU/COUS student transport (the national
student-services agency runs campus shuttles in every university wilaya). Confidence
medium**, because no document was found that names the operator of these four routes; the
identification rests on the destination set and on their absence from the city-line
inventory, not on a source that says "ONOU". Three of the four are additionally unmappable
as published data (0 stop members).

## What would change these verdicts

- An ETUS or wilaya-Transport-Directorate line list dated after 2018 that assigns A42/B42
  to the public operator. The August 2026 press says the public network is now nine lines,
  up from six in 2018, so a public takeover of a former private corridor is not impossible.
- An ONOU Tlemcen or university transport notice naming the four Chetouane shuttles.
