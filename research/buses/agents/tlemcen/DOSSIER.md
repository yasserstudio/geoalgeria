# Tlemcen (13) - ETUS Tlemcen, bus network dossier

Operator: Entreprise / Etablissement public de transport urbain et suburbain de Tlemcen
(ETUS Tlemcen, also written ETUST; the 2018 thesis writes it once as "ETUT").
Compiled 2026-09-03, web sources only. No live vehicle or position endpoint was called
and no token was used.

## Verdict up front

**Recommended decision: directory-only, plus an OSM exclusion that is now evidenced
rather than assumed.**

The EXPANSION.md entry of 2026-09-03 already said "Tlemcen: exclude". That call survives
this dossier, and is now backed by a document instead of by tag-reading: the OSM A42/B42
pair matches two lines that a wilaya-Transport-Directorate-sourced table classifies as
*private*, and the four `(univ)Chetouane-*` relations match nothing in the city-line
inventory at all. See `osm-match.md`.

What is new: **a 19-line inventory of the Tlemcen city network now exists in
`lines.json`** - 6 public lines and 13 private ones, with both termini, bus counts and
stop counts. It is not good enough to publish as ETUS line data, for the reasons below,
but it is good enough to steer the next attempt and to justify the exclusion.

## Best identity source

Nothing official publishes a Tlemcen line list. The best source found is second hand:

> FORLOUL Charef, SERBOUK Nesrine. *Restructuration du reseau de transport urbain de la
> ville de Tlemcen.* Memoire de Master II, Genie Industriel, Universite Abou Bekr Belkaid
> Tlemcen, defended 25 June 2018.
> <http://dspace.univ-tlemcen.dz/bitstream/112/12959/1/Ms.Eln.Forloul+Serbouk.pdf>

The authors state the network data was collected *"aupres de la direction de transport de
la wilaya de Tlemcen"*. So the numbers originate with the wilaya Transport Directorate,
an official body, but reach us through a student transcription with no way to audit it.
Tableau 3.1 (p.50) gives 13 "lignes independantes" (private), Tableau 3.2 (p.50) gives 6
"lignes publiques" (Ligne 01 to 06), each with both termini and a bus count; service
windows 06h00-20h00 private and 06h00-23h00 public.

Ranking of everything else: official site < official Facebook < official app < press.
All four rank below the thesis here because none of them contains a single line ref.

## What the official channels actually hold

- **etus-tlemcen.dz** is one page. Verbatim: 30 buses, 11 826 700 places offered (2017),
  5 876 383 passengers (2017), 174 employees. No lines, no schedules, no map, no PDF.
  Nine likely paths (`/lignes`, `/horaires`, `/itineraires`, `/reseau.html`, `robots.txt`,
  `sitemap.xml`, ...) all returned 404; only `/` returns 200. There is no hidden subtree.
- **facebook.com/etustlemcen13** is the real official page but is login-walled to a
  fetcher: only the page title comes back. Search engines index post URLs, but the indexed
  snippets are ceremonial posts, not line inventories. Noted and moved on, per the rules.
- **Google Play `nano.dz.etustlemcen`** ("Etus Tlemcen", developer Etus Tlemcen, v1.1,
  last updated 14 August 2025) is a real official app that advertises "detailed bus
  schedules", e-payment and monthly subscriptions. The Play listing 404s to the fetcher and
  the Uptodown mirror's description carries no line refs. The line list is behind the app's
  API. **Not called.**
- **Press** never gives a ref plus a terminus pair. The August 2026 L'Express DZ piece
  says 20 new 100-seat buses reinforce **nine** public urban lines serving El Koudia,
  Boudjlida, Oudjlida (Tlemcen), Bouhenak and AADL (Mansourah), Ouzidane (Chetouane), with
  20+ more planned for Hennaya and Beni Mester. The November 2025 La Voie d'Algerie piece
  is almost entirely interurban, and its one urban item is that **line 44 got four buses,
  two public and two private** - a useful reminder that a Tlemcen ref does not map cleanly
  onto one operator.

## Cross-checks and one rejection

- The 2026 press destination set (Koudia, Boudjlida, Oudjlida, Bouhenak, Ouzidane)
  reproduces the 2018 public table's destination set (Bouhennak, Koudia, Oujlida,
  Ouzidane, Boujlida, Lala Setti) almost exactly. Independent corroboration that the
  public network is the centre-to-suburb radial set the thesis describes.
- Line count moved from **6 public lines in 2018 to nine in 2026**. The 2018 refs are
  therefore incomplete for today, and possibly renumbered.
- **Rejected:** lemagvoyage.fr claims Tlemcen lines "2A, 2B, 3, 3A, 4A, 4B et 4C". It
  cites nothing, assigns no line to any destination, shows generated-content markers, and
  its ref set matches no other source, including the wilaya-sourced table. It is the top
  French-language search hit for "bus Tlemcen", so expect it to resurface. Do not use it.

## Gaps that block publication

1. **No operator attribution for the six public lines.** Tableau 3.2 says "publiques", it
   never says ETUS. ETUS being the wilaya's only public urban operator makes the link very
   likely, but that is an inference, and `@geoalgeria/buses` claims an operator per line.
2. **Eight years stale, and the count has changed** (6 -> 9). Refs 01-06 may no longer be
   the live numbering.
3. **No stop sequences.** The thesis holds them only as ArcGIS map figures, not text, so
   nothing geocodable survives extraction. Termini only.
4. **No geometry for anything ETUS.** The only Tlemcen OSM relations with usable geometry
   (A42, B42) are the private pair; three of the four university shuttles have zero stop
   members. So even a directory entry cannot be upgraded to a mapped line from OSM today.
5. **Trap in the source.** The same thesis proposes a *restructured* network whose figures
   are also labelled "ligne 01" through "ligne 10". Those are proposals. Anyone reading the
   PDF later must take the lines from Tableau 3.1/3.2 on p.50 and from nowhere else.
6. **Naming.** Oujlida and Boujlida are different places and appear on different lines
   (03 vs 05, A-42/B-42 vs A-52/B-52). Press spells them Oudjlida and Boudjlida in the same
   sentence. Any transcription must keep them apart.

## Recommendation

- **Directory-only.** Carry ETUS Tlemcen as an operator (site, official Facebook, official
  app, 30 buses, 2017 ridership) with no line list attached.
- **Keep excluding all six OSM relations**, and replace the EXPANSION.md reasoning with the
  evidenced version: A42/B42 are the thesis's private Ligne A-42/B-42 on the Oujlida
  corridor, and the `(univ)` routes match no city line ref at all.
- **Do not publish `lines.json` as ETUS data.** It is a research artefact: derived, 2018,
  and only 6 of its 19 rows are even public-operator rows.
- **Not yet** for a mapped network. Two leads would change that, in order of value:
  1. the official app `nano.dz.etustlemcen` - a static APK audit in the style of
     `AIN-DEFLA-APP-AUDIT.md` (strings, bundled assets, hardcoded route tables), no live
     calls, which is the single most likely place a current nine-line list exists;
  2. the operator Facebook page read by a human, which is exactly how the Ain Defla
     deadlock broke.

## Note on the output schema

`source_kind` has no value for an academic or institutional-repository document. The
thesis is recorded as `press` with the real nature spelled out in `notes`. If more wilayas
turn out to depend on university theses, and Algerian transport theses very often carry
exactly these directorate-supplied tables, adding an `academic` kind would be worth it.

## Addendum, 2026-09-03 (reviewer)

The Operator's own Eid al-Adha 2026 program, supplied by the project owner the same day, lists refs 2A, 2B, 2C, 03, 4B, 4C, 4E, 11, 44 and H with termini. The lettered refs this dossier judged "likely generated" on lemagvoyage.fr are therefore genuine Operator refs; the site remains unsourced for everything else. Ten Lines were promoted directory-only from the program; the six OSM verdicts above stand.
