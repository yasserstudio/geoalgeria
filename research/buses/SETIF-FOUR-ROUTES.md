# ETUS Sétif Lines 104, 105, 106A and 106B

Researched 2026-09-02. `seen` means the value appears directly in the cited source. `inferred` means it is a documented reconciliation across sources and must not be presented as an operator-supplied fact.

## Result

| Line | Public geometry | Stops | Match to the 2026 ETUS Line | Confidence | Promotion recommendation |
|---|---|---:|---|---|---|
| 104 | OSM relation [14596722](https://www.openstreetmap.org/relation/14596722), 16.028 km full circuit (`seen`) | 79 stop/platform memberships: 37 stop positions and 42 platforms (`seen`) | Relation name is `ETUS SETIF 104`; GR to the University through El Hidhab matches the current Gare routière–Cité El Hidhab identity (`seen` + `inferred`) | High | Promote after retaining the current official endpoints rather than the stale OSM `to` label. |
| 105 | None found in the current Sétif OSM bus-relation inventory (`seen`) | No current public stop sequence found (`seen`) | The 2026 ETUS artwork establishes Gare routière–Cité El Hidhab (`seen`). A 2015 study describes an older/different Gare routière–1014 Logements service and cannot establish the current trace (`seen`). | Low for geometry | Do not promote a shape. Keep directory-only until an operator map, GTFS feed, or field trace is available. |
| 106A | None found in the current Sétif OSM bus-relation inventory (`seen`) | No public stop sequence found (`seen`) | The 2026 ETUS artwork establishes Centre-ville–Cité 5 Juillet 1962 (`seen`). No public geometry could be tied to that branch. | Low for geometry | Do not promote a shape. |
| 106B | OSM relations [14616622](https://www.openstreetmap.org/relation/14616622) and [14618940](https://www.openstreetmap.org/relation/14618940), each containing the same 52-way, 16.656 km circuit in a rotated order (`seen`) | 22 memberships per relation, representing 11 stop/platform pairs (`seen`) | The OSM terminal `AADL 2` is 0.377 km from OSM Aïn Romane node [663714175](https://www.openstreetmap.org/node/663714175); this matches the current Centre-ville–Cité Aïn Romane branch (`inferred`) | Medium-high | Promote one circuit only as 106B. Do not concatenate the two duplicate relations. Preserve an inference note. |

The current official identities come from ETUS Sétif's 26 May 2026 Eid service artwork supplied by the project owner (SHA-256 `504eefe7f850a0600363b7110050e4f1d030701eb9d29194d10089e811e7561e`). A public [mirror of the ETUS announcement](https://www.govserv.org/DZ/S%C3%A9tif/111330534776381/ETUS-S%C3%89TIF) dates the network-wide programme to 26 May 2026 (`seen`). The artwork itself is validation evidence and is not redistributed.

## Line 104

Primary raw source: [OSM relation 14596722 full JSON](https://api.openstreetmap.org/api/0.6/relation/14596722/full.json).

- `seen`: relation version 21, last edited 2024-06-19; tags include `name=ETUS SETIF 104`, `operator=ETUS SETIF`, `from=GR`, `to=University of Setif`, and the erroneous `ref=1`.
- `seen`: the 48 route-way memberships total 16.028 km when their current OSM node geometry is summed.
- `seen`: principal platform sequence is GR ETUS → Samu ETUS → Mahdi ETUS → Malizia ETUS → Guessab ETUS → Parc → CPA → 600 Logements → Laararsa 1 → Laararsa 2 → 500 Logements 1 → 500 Logements 2 → Chadli 1 → Chadli 2 → Hidhab 1 → Hidhab 2 → Hidhab 3 → Hidhab 4 → Hidhab 5 → Hidhab 6 → University of Setif. The relation contains paired platforms/stops and duplicates for opposite sides of the road, so 79 memberships are not 79 physical stations.
- `inferred`: the University terminus is within the El Hidhab corridor and is compatible with the current official Arabic endpoint `حي الهضاب`. The project should expose the current operator endpoint, not copy the OSM `to` tag verbatim.
- Secondary check: [OpenAlfa's relation-derived station page](https://rues-algerie.openalfa.com/lignes-de-bus/etus-setif-104-14596722) shows the same GR, central Sétif, El Hidhab and university sequence (`seen`).

## Line 105

- `seen`: a current Overpass inventory of every `type=route` + `route=bus` relation intersecting the Sétif search box returned Lines 101, 104 and generic 106 only; no relation names or refs identify Line 105.
- `seen`: the 2026 ETUS artwork identifies Line 105 as `المحطة البرية – حي الهضاب` (Gare routière–Cité El Hidhab).
- `seen`, historical only: a 2015 field-study transcription describes Line 105 as Gare routière–1014 Logements, 10 km one-way, serving SAMU, 1000 Logements, Bizard, Sonatrach, 20 Août 1955, Cinq Fusillés, Ben Begag Mohamed, Thlidjene Abderrahmane, Dallas, Ouled Brahim, 1006 Logements, 300 Logements, Aïn Mous and El Hidhab. Source: [study transcription, lines 2429–2430](https://pdfcoffee.com/--31473-pdf-free.html).
- `inferred`: that historical corridor may explain how Line 105 reaches El Hidhab, but its old terminus label conflicts with the 2026 operator artwork. It is unsuitable as exact current geometry or a current stop list.

## Line 106A

- `seen`: the 2026 ETUS artwork identifies Line 106A as `وسط المدينة – حي 5 جويلية 1962` (Centre-ville–Cité 5 Juillet 1962).
- `seen`: neither the current Overpass inventory nor OpenAlfa's OSM-derived Sétif directory contains a 106A/5 Juillet relation.
- `inferred`: generating a shortest path from the two endpoint areas would only create routing-engine output, not an evidenced transit alignment. It should not be published as ETUS geometry.

## Line 106B

Primary raw sources: [OSM relation 14616622 full JSON](https://api.openstreetmap.org/api/0.6/relation/14616622/full.json), [OSM relation 14618940 full JSON](https://api.openstreetmap.org/api/0.6/relation/14618940/full.json), and [OSM Aïn Romane node 663714175](https://api.openstreetmap.org/api/0.6/node/663714175.json).

- `seen`: relation 14616622 is version 7 and relation 14618940 is version 4; both were last edited 2025-09-29. Their names are `ETUS SETIF 106 aller` and `ETUS SETIF 106 retour`.
- `seen`: both relations contain the same 52 way IDs, merely rotated in membership order. Each sums to 16.656 km; treating them as two different shapes would duplicate the circuit.
- `seen`: the platform sequence recorded in both is AADL 2 → AADL 1 → Sonalgaz → El Hassi → La Cité → Les Tours → 50 Logements → unnamed stop → CNEP → Cadastre → arrêt 5. The relation roles contain 11 stop positions and 11 corresponding platforms.
- `seen`: terminal platform AADL 2 is at 36.1775394, 5.4956761; OSM names Aïn Romane/عين الرمان at 36.1791726, 5.4992969.
- `inferred`: the 0.377 km separation makes the generic 106 geometry a strong match for current Line 106B, whose operator endpoint is `حي عين الرمان`. It is not evidence for 106A.
- Secondary check: [OpenAlfa's relation-derived 106 station page](https://rues-algerie.openalfa.com/lignes-de-bus/etus-setif-106-aller-14616622) lists the same 11 named stops (`seen`).

## Reproducible OSM inventory

Queried against `https://overpass-api.de/api/interpreter` on 2026-09-02 (`seen`):

```overpass
[out:json][timeout:60];
rel(36.10,5.30,36.25,5.55)[type=route][route=bus];
out tags;
```

The result contained only relations 14596722 (104), 14607143 and 14608521 (101), and 14616622 and 14618940 (generic 106). This is a negative finding for 105 and 106A, not evidence that those services do not operate.

## Rights-safe endpoint anchors for the missing shapes

These points can support a directory map or an explicit “approximate endpoints” treatment, but not a drawn transit Line (`inferred`):

| Line | Origin anchor | Destination anchor | Basis |
|---|---|---|---|
| 105 | 36.1854689, 5.3917199 | 36.2125484, 5.4436910 | OSM's GR ETUS and Hidhab 6 platforms from relation 14596722. Both lie in the two areas named by the current ETUS artwork, but they are not verified Line 105 stops. |
| 106A | 36.1854503, 5.4180218 | approximately 36.16981, 5.48406 | OSM's central `arret 5` platform from the generic 106 relation, plus the decoded centre of Plus Code `5F9M+WJ` for a Cité 5 Juillet 1962 housing complex in Ouled Saber. The Plus Code is published by [AfricaBizInfo](https://www.africabizinfo.com/fr-DZ/%D9%85%D8%AC%D9%85%D8%B9-%D8%8C-%D9%88-%D8%8C%D8%AD%D9%8A-%D8%AC%D9%88%D9%8A%D9%84%D9%8A%D8%A9-%D8%8C-%D8%B3%D8%B7%D9%8A%D9%81%D8%8C-%D8%A7%D9%84%D8%AC%D8%B2%D8%A7%D8%A6%D8%B1); neither point is verified as a 106A stop. |

For 105, sharing the complete 104 shape would falsely imply that two Lines with the same displayed endpoints take the same streets. For 106A, routing between the two anchors would be an invented alignment. Both should remain directory-only unless the UI visibly distinguishes endpoint-only approximations from verified Line geometry.

No credential from the Android package was used, disclosed, or sent to any endpoint.
