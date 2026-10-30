---
"@geoalgeria/pharmacies": minor
---

Refresh pharmacies from OpenStreetMap, retrieved 2026-10-22: 3,795 records to 3,812.

Source: OpenStreetMap (ODbL 1.0), `amenity=pharmacy` in Algeria, Overpass snapshot `2026-10-22T19:37:51Z`. Previous pull 2026-08-31.

Nineteen pharmacies are added and two are removed. Of the additions, 12 are OpenStreetMap nodes placed exactly and 7 are building polygons placed at their centre, which is why `approximate` coordinates rise from 296 to 303 while `exact` rises from 3,499 to 3,509. Named records go from 2,461 to 2,475, `name_ar` from 1,030 to 1,032, phones from 145 to 146, opening hours from 256 to 259, addresses from 1,161 to 1,163 and `dispensing` flags from 530 to 536. Coverage against the ~11,000 estimate moves from 34.5% to 34.7%, still a partial community extract and not a registry. 67 wilayas, unchanged.

**Two ids retire, neither is re-used.** `04-00007` (node/4261857892, Ain Beida) and `30-00015` (node/4423703990, Hassi Messaoud) were deleted upstream on 2026-10-16, which the OpenStreetMap API confirms independently of the Overpass pull the build reads: both elements answer 410 Gone with `visible:false`. `data/retired-ids.json` grows from 31 reserved ids to 33 so neither can ever be handed to another pharmacy, and neither gets a forward, because a deletion has no successor to point at. The 29 existing forwards are untouched. No id changed hands: every one of the 3,793 pharmacies present in both pulls keeps the id it shipped under.

**No pharmacy moved more than 39 m.** Fourteen records have a new coordinate, the largest move 39 m and only three over 11 m. None changed wilaya or commune, and no `geo_precision` or `geo_method` changed. Checked against the repo's own wilaya boundary polygons rather than the tags that produced the coordinates: every geometric verdict in the accuracy review is unchanged record for record, so no point left the commune outline it is joined to.

**Sixty-seven records are renamed, all of them upstream.** Mostly one mapper's cleanup pass over Algerian pharmacies: `name` rewritten as a `Latin;Arabic` pair, or `name:fr` added or case-corrected. One is a real change of name, `16-00372` (node/4344773997) from `Pharmarcie Kaci` to `Sorecal` / `سوريكال`, an edit dated 2026-10-19 in the OpenStreetMap API, still tagged `amenity=pharmacy`. The build code for names changed since the last pull, so this was settled by replaying this pull through the previous code: the two outputs are identical on every field of all 3,812 records, so nothing in this refresh is an artefact of the generator.
