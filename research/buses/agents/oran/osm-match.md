# Oran (wilaya 31) OSM candidates vs official Line identity

Checked 2026-09-03 against `research/buses/osm/candidate-lines.json`
(`wilaya_codes` containing `"31"`) and the Line tables in `lines.json`.

`candidate-lines.json` holds exactly **two** wilaya-31 candidates. Both are
`map_readiness: review_only`, `operator_id: null`, `classification: unresolved`,
and both were created by the same OSM user (`AllelXR`) in a single edit on
2025-07-26. Neither relation carries `operator`, `network` or `ref`.

## candidate-628972ec671b - relation 19393432 "Line 39"

| Field | Value |
| --- | --- |
| OSM tags | `route=bus`, `name=Line 39`, `from=bus 39`, `to=Medina Jdida`, `roundtrip=yes`, `public_transport:version=2` |
| Members | 26 ways, **0** stop/platform members |
| Length | 12.2 km (candidate file) |
| Endpoint A | 35.64614, -0.57128 -> Nominatim: *Nedjma, Hassi Labiod, Sidi Chahmi, Daira Es Senia, Oran* |
| Endpoint B | 35.68978, -0.64583 -> Nominatim: *Boulevard Colonel Lotfi, Cite El Ghoualem, Oran* |

**Ref match: yes.** `name=Line 39` / `from=bus 39` against ref 39, which exists
in all three Line tables.

**Termini match: yes, on both ends.**
GuideOran ref 39 = "Mdina Jdida Palais des sports" -> "Cheteibo" via El Barki -
Fellaoucen - Saint Remy. fr.wikipedia ref 39 = "Palais des sports (m'dina
jdida)" -> "Hai Nedjma (chetaibo)". ar.wikipedia ref 39 = "قصر الرياضة - بلاطو -
البركي - فلاوسن - الأمير عبد القادر (st remy) - حي النجمة". Hai Nedjma /
Chetaibo is exactly the Nedjma locality at endpoint A, and the Palais des Sports
(M'dina Jdida) area sits on Boulevard Colonel Lotfi at endpoint B. The OSM `to`
tag ("Medina Jdida") names the same end independently.

**Operator match: NO.** Nothing in OSM attributes this relation to ETO, and
neither GuideOran's ETO footnote (101, 37, U, 102, 23, 69, 2, 53) nor the
ar.wikipedia ETO markers (2, 10, 23, 53, 54, 69) include ref 39. ar.wikipedia
explicitly annotates a neighbouring ref (79) as privately operated, so "an Oran
line" is demonstrably not the same claim as "an ETO line" in this network.

**Confidence:** high that the relation is the Oran network's Line 39 (ref + both
termini + independent `to` tag). **Zero** evidence that ETO runs it. Promotable
at most as a Line whose operator is unstated; attributing it to ETO would be
attribution by geography, which the brief forbids.

## candidate-23d306ba53b8 - relation 19393433 "Line Hai Nedjma - Hai Sabah"

| Field | Value |
| --- | --- |
| OSM tags | `route=bus`, `name=Line Hai Nedjma - Hai Sabah`, `roundtrip=yes`, `public_transport:version=2` (no `from`/`to`) |
| Members | 14 ways + 2 named members: platform "Cite Sabah", stop "Station saint remy" |
| Length | 6 km (candidate file) |
| Endpoint A | 35.65280, -0.56779 -> Nominatim: *Nedjma, Hassi Labiod, Sidi Chahmi, Oran* |
| Endpoint B | 35.69485, -0.57438 -> Nominatim: *Cite Essabah, Douar Sidi Maarouf, Sidi Chahmi, Oran* |

**Ref match: no ref exists** on the relation, and no source Line is published as
Hai Nedjma - Hai Sabah.

**Termini match: no.** In the sourced tables, Hai Sabah is a terminus of refs 11,
51 and 90 (all of which start on the other side of the city: Bd Maata, M'dina
Jdida, Boufatis), and Hai Nedjma is a terminus of 39 and 69 (both starting from
Palais des Sports / El Hamri). No Line joins the two. The relation's own two
named members are consistent with the 39/69 corridor through Saint Remy, so this
is plausibly a fragment or a local variant, but that is a guess, not a match.

**Operator match: NO.** No operator tag, no candidate Line to attach it to.

**Confidence:** low / unmatched. Do not promote, do not attribute to ETO.

## Summary

| Relation | ref match | termini match | operator evidence | verdict |
| --- | --- | --- | --- | --- |
| 19393432 | yes (39) | yes (both) | none | Line 39 of the Oran network, operator unstated |
| 19393433 | no | no | none | unmatched, leave in review_only |

Neither relation has usable stop membership for the map (0 and 2 members), so
even the confident one is a geometry-only candidate.
