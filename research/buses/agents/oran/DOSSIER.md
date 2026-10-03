# Oran (wilaya 31) - ETO bus network research dossier

Compiled 2026-09-03. Web and OSM API sources only. No live vehicle or position
endpoint was called and no token was used.

## Operator identity

The Operator is **ETO**, whose full French name is confirmed by press as
*Etablissement de transport d'Oran* (Ouest Tribune, 7 July 2023, reporting the
launch of its "Oran bus" tracking app). `operator-registry.json` records it as
`etus-oran`, *Entreprise de transport urbain et suburbain d'Oran*, and an older
GuideOran news item uses the predecessor form **ETUSO**. All three names refer to
the same public urban/suburban Operator; the registry's `name_ar` is still null
and none of the sources read here published an Arabic corporate name.

Important: ETO does **not** run the whole Oran bus network. ar.wikipedia
annotates ref 79 as run by a private company, and the same reference numbers
(2, 23, 53, 69) appear twice in that table - once plain, once ETO-marked - with
different corridors. GuideOran independently footnotes only a subset as ETO.
Oran is a mixed public/private network, so "a bus line in Oran" is not a claim
about ETO.

## What was found

`lines.json` holds **65 rows**: 44 from GuideOran's two tables, 21 from the
ar.wikipedia table, plus 3 press rows. 60 rows carry both Arabic termini,
44 carry both French termini.

- **GuideOran** (`guideoran.com/informations-utiles/ligne-bus-wilaya-oran.html`)
  is the real primary of this whole documentation chain: 35 city rows in the
  form Depart / Arret 1 / Arret 2 / Terminus, plus 7 gare-routiere-El-Bahia
  rows. Both Wikipedia articles cite it.
- **ar.wikipedia** ("شبكة خطوط حافلات وهران") is materially richer than the
  French article: about 52 city rows given as full ordered Arabic corridors,
  including 16 refs the French article and GuideOran do not have (8, 14, 29, 38,
  49, 50, 52, 58, 59, 61, 89, 97, T, Z, G52, plus a "10 ETO"). It is the only
  Arabic-language naming found anywhere for these Lines.
- **fr.wikipedia** ("Reseau de bus d'Oran") is a near-copy of GuideOran, plus an
  infobox (ETO, 42 lines, 175 km, 10 M passengers/year, 20/30 DA fare).
- **CapDZ, 9 August 2026** is the only *current* Operator-level Line fact found:
  ETO's line 69 now runs El Hamri - El Braya, and a second new ETO line runs
  from station El Morchid to Gdyel, terminus the gare routiere, with no
  published number. It also reports ~200 new buses allocated to the wilaya and
  users asking ETO to publish timetables (i.e. no public timetable exists).

## Official vs crowdsourced

**Nothing found is Operator-published Line data.** Not one row in `lines.json`
comes from an ETO channel.

- `evidence_type: official` is used on exactly 2 rows, both from CapDZ: they
  report an Operator/authority service decision through press. That is the
  strongest evidence in this dossier and it still is not an ETO publication.
- Everything else is `crowdsourced`: a city guide (GuideOran) and two Wikipedia
  tables derived from it. The ar.wikipedia city table carries **no per-row
  citation at all**; only its Bahia-station table is referenced.
- The Ministry of Interior monograph URL that both Wikipedia articles cite for
  the 175 km figure is **dead** (page not found), and its `wilaya=20` parameter
  is inconsistent with Oran being wilaya 31. Treat the 175 km / 42 lines figures
  as unverified.
- The **official Facebook page is unverified**: search surfaces `facebook.com/p/
  ETO-100093054514209/`, but the fetch returned a ~1.5 KB error interstitial -
  login-walled, ownership not confirmed, no Line list read. Recorded as a lead.
- The **official app is unverified**: Ouest Tribune confirms ETO launched an app
  named "Oran bus"; the matching Play Store id `com.deeper.etobus` (Deeper Tech)
  returns HTTP 404, so it is unpublished or region-locked. The three other Oran
  bus apps that do resolve (`oran.routes.devcloud`, `com.karim.busoran`,
  `com.yasser.transportoran`) all have third-party/individual developers, not
  ETO.
- `gps.etusoran.dz` was **not** re-fetched; it stays what the registry already
  says it is - an authorisation lead requiring operator access.

## Best identity source

**GuideOran's ETO footnote plus the ar.wikipedia ETO markers**, in that order.
Those are the only two places any source says *which* Lines are ETO:

- GuideOran: "Les lignes ETO : 101 - 37 - U - 102 - 23 - 69 - 2 - 53" (23 is
  printed twice).
- ar.wikipedia ref column: `2 ETO`, `10 ETO`, `23 ETO`, `53 ETO`, `ETO 54`,
  `69 ETO`.

Union: **10 refs** - 2, 10, 23, 37, 53, 54, 69, 101, 102, U - carried on
**16 rows** in `lines.json` (some refs appear both as a GuideOran row and as a
distinct ar.wikipedia ETO corridor). Ref 69 is the only one corroborated by
current press, and that press corrects its terminus from Cheteibo to El Braya,
which is exactly what the ar.wikipedia "69 ETO" corridor already said. That
agreement is the single best identity signal in the dossier.

## OSM

Two candidates in wilaya 31, both untagged for operator/network/ref, both from
one 2025-07-26 edit. Relation 19393432 matches ref 39 on both termini
(Nedjma / Palais des Sports - M'dina Jdida) with high confidence, but ref 39 is
**not** in any ETO list, and it has 0 stop members. Relation 19393433 matches
nothing. Details in `osm-match.md`.

## What is still missing

1. Any ETO-published Line list, in any medium. This is the blocking gap.
2. A verified ETO web presence: no operator website was found at all, and the
   candidate Facebook page could not be confirmed as ETO's.
3. The number of the new Gdyel line, and confirmation of which of the 10
   ETO-marked refs are still in service after the 2025-26 network changes
   (a new transport plan for Oran was announced for 2025).
4. Reusable geometry: 2 OSM relations for a network of 40-50 Lines, with 0 and
   2 stop members. There is no shape and no ordered Station evidence for any
   ETO Line.
5. Reuse rights: GuideOran carries a plain copyright and no licence; the
   Wikipedia tables are CC BY-SA of an uncited compilation; the tracker is
   operator-access-only. Nothing here is open.
6. An Arabic corporate name for the registry's null `name_ar`.

## Recommended promotion decision

**Not yet.** Do not promote Oran into `@geoalgeria/buses` in this pass, in
either the directory-only or the mapped shape.

Reasons, against the four gates in `EXPANSION.md`:

- *Operator identity*: partially met. ETO exists and is named, but the network
  is provably mixed public/private and no ETO source states its own Lines. A
  directory-only promotion would have to publish ~50 Lines under an Operator
  that only two crowdsourced footnotes attribute, and would silently attribute
  private-operator Lines to ETO. That is precisely the "changes what the dataset
  claims to be" failure already recorded for the 2026-09-03 operator check.
- *Line ref / termini*: met in volume, failed in evidence. Termini exist for 60+
  rows, but the strongest source is a city guide whose table is transcribed,
  duplicated and internally contradicted (ref 69 was stale until CapDZ corrected
  it; GuideOran prints "H" and "23" twice; the same refs carry two different
  corridors in Arabic).
- *Reusable geometry rights*: failed. No shapes at all, no licence.
- *Ordered Station evidence*: failed. 2 named stop nodes in the entire wilaya.

Narrow exception worth considering separately, if the maintainer wants any Oran
presence now: relation 19393432 could be published as a single geometry Line
"39" with **operator unstated** (the same treatment applied to Bechar), since
its ref and both termini are triple-corroborated. I do not recommend it in this
pass - one shape with no stops and no operator adds little and invites the ETO
inference the sources do not support.

Next concrete action, in priority order: (1) get a human to open
`facebook.com/p/ETO-100093054514209/` and confirm whether it is ETO's page and
whether it has posted a Line list or route artwork - this is exactly how Ain
Defla was unblocked; (2) ask ETO directly for the current Line list, termini and
reuse terms, referencing the CapDZ report that users want published timetables;
(3) only then evaluate `gps.etusoran.dz` for authorised geometry.
