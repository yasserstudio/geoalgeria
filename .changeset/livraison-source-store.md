---
"@geoalgeria/livraison": patch
---

Rebuild livraison offline: every carrier pull is now a committed capture.

The package was the last carded dataset whose build existed only as a live run. Its eight sources (Yalidine, Guepex, Anderson, Noest, Maystro, ZR Express, Swift Express, HHD Express) now write through the repository's source store into `sources/livraison/`, and `node scripts/fetch.mjs --cache` re-emits the whole package from there with no network at all. A dead, moved or WAF-blocked carrier can no longer block a re-emission, and a refresh arrives as a reviewable git diff of the capture rather than only as a diff of the output.

**What is stored is the parsed projection, not the carrier's page.** Each capture holds the rows the build consumes (id, name, commune, the wilaya the card declares, address and the operator's own Maps link), which is what the package already publishes, so no all-rights-reserved page is relicensed into the repository. It is also what keeps the store at 387 KB instead of several MB: HHD's home page alone is ~530 KB and Swift's RSC payload ~2.7 MB. This is the rights-safe shape the Bus Operator captures already use.

**The Maps resolutions are captured too, because they decide the coordinates.** A stop-desk's pin comes from resolving a shortlink that carries no coordinate of its own, so a capture of the cards alone would still have to ask Google and could not reproduce the same pins. `maps-resolutions.json` records all 484 links, keyed by the link the carrier printed: the final URL, the coordinate extracted from it and the tier that produced it (inline, redirect, place-dms, static-map, cid-pin, unresolved). Google's per-request parameters are stripped from the stored URL, which would otherwise churn the entire capture on every re-fetch with no changed fact in it.

Dates follow the repository's rule: a live run stamps its own, a `--cache` replay reuses the committed ones, so the rebuild is reproducible on any later day. Verified against the published build: both a live run and a zero-network `--cache` rebuild reproduce `stopdesks.json`, `carriers.json`, `coverage.json`, `metadata.json`, `retired-ids.json`, both CSVs and the GeoJSON byte for byte. No data, id, carry rule or retirement logic changed.
