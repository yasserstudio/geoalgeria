# Ghardaia (wilaya 47) - ETU-G dossier

Retrieved 2026-09-03. Web and official-site sources only.

## Findings

- ETU-G / ETUG is well documented in press, but only as a *company*, never as a
  *network*. Two independent articles agree on its history:
  - Algerie360, 2 April 2015: *"Crée en juillet 2010 avec une dizaine de bus et
    une cinquantaine d'employés"*, initially serving *"les quartiers de la vallée
    du M'zab (quatre communes)"*; first expansion to El-Menea in May 2013; planned
    expansion to Berriane, Guerrara and Metlili.
  - Le Jour d'Algerie, 22 August 2022: *"L'entreprise (ETUG) compte actuellement
    une cinquantaine de bus et emploie plus de trois cents travailleurs"*;
    deployed in *"Berriane, Guerrara et Metlili, Zelfana Mansourah"*; new services
    linking Ghardaia to the new urban poles *"Oued N'chou et Noumerat, situés
    respectivement à 10 km et 20 km du chef-lieu"*. The Arabic version of the same
    story is on africanews.dz, 23 August 2022, naming the operator
    المؤسسة العمومية للنقل الحضري بغرداية.
- **Not one of these articles gives a line number or a terminus pair.** They give
  served localities, which is a different and weaker thing.
- **No ETU-G website exists.** (`etug.pt` in search results is an unrelated
  Portuguese operator.) The Direction des transports de la wilaya de Ghardaia
  Facebook page (id `100082854393114`) is login-walled.
- No Deeper Tech `com.deeper.etus.*` app for Ghardaia.
- OSM has one route, two directions, with a `ref`/`name` contradiction (`32` vs
  "Bus 1") and an `operator` tag that holds a route label rather than an operator.
  Details in `osm-match.md`.

## Best identity source

**Le Jour d'Algerie 2022-08-22** (corroborated by africanews.dz), for the operator
name, fleet size and served localities. Press tier, not official tier, and it
carries no line identity.

## Gaps

1. No line list at any tier; the `ref=32` vs `Bus 1` contradiction is therefore
   unresolvable.
2. The mapped route is a ~4 km city-centre loop, which does not correspond to any
   of the inter-locality services the press describes, so even the press cannot be
   used to sanity-check it.
3. The 56 stop members contain many unnamed and several duplicated names, so the
   ordered stop sequence would need cleaning before it could be published.

## Recommended decision

**Do not add Ghardaia. Keep the existing "exclude" verdict in `EXPANSION.md`.**

Publishing `ref=32` would assert a line number that a single OSM contributor
supplied and that the relation's own name contradicts. The realistic unblock is a
Direction des transports or ETU-G publication, or the project owner reading the
wilaya transport Facebook page directly, as was done for Ain Defla. Given ETU-G
serves eight-plus localities with about fifty buses, an official list would likely
yield far more than the single mapped loop, which is another reason not to publish
a one-line network now.
