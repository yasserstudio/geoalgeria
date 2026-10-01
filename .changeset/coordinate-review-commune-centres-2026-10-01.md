---
"geoalgeria": patch
---

68 commune centres move onto their town, decided by independent votes rather than by hand.

The coordinate review engine (`scripts/review/`) weighed the 136 commune centres that sit more than 3 km from their OpenStreetMap `admin_centre` seat, or have no seat to compare against. It wrote a value only where the open sources agree: at least three of them within 2 km of one answer, or two with the median of the `geo_precision: exact` records inside the commune's own outline among them, nothing backing a different answer, and the value inside that outline. 68 centres met that standard, every one of them on the seat; 1 was confirmed at the point it already publishes; 67 are listed for review and keep the coordinates they had. Nothing is nulled and no field is added.

Rules and the reasoning: `docs/adr/0001-coordinate-review-by-independent-votes.md`. Every row, with its Candidates and the Votes that decided it, is in `research/_commune-centres/corrections-2026-10-01b.json`; the 67 undecided are in `research/_commune-centres/review-queue-2026-10-01.json`. The moves run from 3.1 km to 22.9 km, and a move over 25 km is never made by the engine on its own, however many sources back it: three of the 67 are there for exactly that reason.

A source our own value was copied from cannot vouch for it, and that rule is the difference between this batch and a hand-run script. 222 published centres are their commune's Wikidata coordinate to the metre and 20 Wikidata items carry their commune's seat node to the metre, so agreement under 50 m is one value reaching two files rather than two readings agreeing. 23 of the 67 undecided communes are undecided for that reason alone.

**Licence.** The ODbL carve-out goes from 256 to 323 commune centre coordinates: 318 taken from a commune's own `admin_centre` node and 5 from a relation centroid. `LICENSE`, `NOTICE`, `dataset-metadata.json`, the three READMEs, `llms.txt`, `data/README.md` and both GeoJSON metadata files state the new split, and `test/osm-derived-centre-count.test.mjs` derives it from the correction ledgers rather than from a list anyone has to remember to extend. El Euch (3427) leaves the relation-centroid group, which is why that number is 5: version 2.1.0 put it on its relation's centroid, and this batch moved it 9.7 km onto its own node.

No commune link, no `wilaya_code`, no `code_commune` and no `postal_code` changes. The 69 wilaya capital points are unchanged, because no wilaya capital commune is among the 68.

Refs yasserstudio/geoalgeria.com#243.
