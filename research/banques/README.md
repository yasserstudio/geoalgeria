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

## Pending address geocoding review

As of 2026-09-10, the official BNH directory contributes 60 address-only
branches and the official Fransabank directory contributes 23. All 83 records
already carry the official name, address, phone, and wilaya; none has a verified
branch-level coordinate. A Nominatim address pass produced no candidates strong
enough to publish.

A one-time Google Geocoding API pass is paused. The Google Cloud project is
linked to a paid billing account and Maps APIs are enabled, but the endpoint
still returns `REQUEST_DENIED` with a billing-not-enabled message. Google notes
that services can take up to 24 hours to restart after billing is enabled. No
Google result was received, cached, or added to this repository, and no API key
is stored here.

When resuming, first send one probe and stop on any status other than `OK` or
`ZERO_RESULTS`. The full BNH + Fransabank pass is capped at 166 requests (official
address query plus bank/name fallback per branch). Treat results as review
candidates only: require the point to fall in the official wilaya, reject broad
locality and partial matches, and confirm the bank or exact street/address before
editing `branches.json`. Rebuild the package and run its validation after any
accepted coordinate changes. Restrict the temporary key to the Geocoding API and
rotate it after the review.
