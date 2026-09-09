# Bank coordinate review

`collect-osm.mjs` collects Algerian `amenity=bank` and `office=financial`
objects as review candidates. It preserves the OSM object ID, tags, coordinate,
point precision, wilaya containment, source URL, retrieval time, and response
hash. Run it with:

```bash
node research/banques/collect-osm.mjs
```

OSM is supporting coordinate evidence, not the branch identity source. A point
is published only after a deterministic match to a branch from an official bank
locator. The first reviewed batch requires the same BDL agency number plus an
agreement on bank, wilaya, and locality. Ambiguous name or proximity matches
remain candidates.

`osm/candidates.json` is the normalized review snapshot. `osm/raw.json` is a
reproducible local capture and is ignored because it duplicates the candidate
snapshot and can be fetched again.
