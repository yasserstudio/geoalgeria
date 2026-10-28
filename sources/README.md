# sources/ — committed raw captures

The local reference copy of every upstream payload we build from. One canonical
**latest** capture per (package, source); **git history is the archive**. This
directory exists so that:

- every dataset can be rebuilt **offline** — a dead, moved, or WAF-blocked
  upstream (mobilis.dz, mfp.gov.dz) never blocks re-emission;
- a refresh is a **reviewable diff**: fetch, compare against the stored capture,
  review the delta, then promote to the package;
- the raw evidence behind a published record survives, per the provenance
  posture.

## Layout

```
sources/<pkg>/<source>.json   # raw payload as received (post-parse, pre-transform)
sources/<pkg>/manifest.json   # per-source: provenance, url, retrieved, records, sha256, bytes
```

Written only through `scripts/lib/source-store.mjs` (`writeCapture` /
`readCapture` / `captureMeta`) — never by hand — so serialization stays
canonical: sorted object keys at every depth, 2-space indent, trailing newline.
A re-fetch that changes nothing is **byte-identical**; a real upstream change is
a clean `git diff`. Fetchers receiving unordered sets sort them before
capturing, so reordering noise never reaches the diff.

## Workflow

1. `npm run fetch` in the package: raw payloads are captured here the moment
   they arrive (before validation, so evidence survives an aborted run), then
   transformed into `packages/<pkg>/data/`.
2. `git diff sources/<pkg>/` shows exactly what the upstream changed.
3. Review the delta; commit the capture together with the regenerated package.
4. Offline rebuild: the package's `--cache` mode reads from here, no network.

### Guarded scheduled promotion

The low-churn DGPC Protection Civile directory has an approved zero-touch
exception to step 3. Its monthly workflow may promote a changed capture only
after deterministic sorting, schema/package validation, review-queue rebuild,
stable-id retention, bounded record-count change, and bounded material field
change all pass. Any failed gate leaves `main` and the published snapshot
unchanged; the resulting bot commit keeps the accepted source delta reviewable
in git history. Larger or structural publisher changes require a manual run and
human review.

## Rules

- Latest capture only — history lives in git. Never `<source>-2026-08.json`
  date-suffixed siblings.
- Capture the payload **as received** (post-parse, pre-transform). Cleaning
  belongs in the fetcher's transform step, visible in code review.
- A capture needs an upstream `url`. When the project owner supplies an
  official artifact without its original post URL, use the explicit
  `owner_supplied_artifact` provenance and a null URL; never substitute a
  guessed page or generic search URL.
- Captures are not published: nothing here ships to npm or the CDN.
- Size: captures of a few MB are fine. For an unusually large pull (>20 MB),
  capture the trimmed projection the build actually consumes and record the
  trim in the manifest `note`.

## Status

Converted so far: `telecom`, `ecoles` (reference implementations,
2026-08-03), `protection-civile`, `buses`, `livraison`, `sports`, and
`jeunesse`. The buses capture is a reviewed,
trimmed OSM projection with its non-atomic Overpass receipts preserved. Bus
Operator captures are rights-safe projections: they retain only factual fields
used by the package plus upstream URLs, retrieval timestamps, byte counts and
SHA-256 hashes for the ignored raw HTML, API and map responses. This keeps the
evidence auditable without committing or relicensing full all-rights-reserved
pages and KML files. The Sidi Bel Abbès projection is explicitly marked as
owner-supplied official HTML because its PHP pages returned 404 during the live
recheck; it does not claim a live-response hash.

The eight `livraison` carrier captures follow the same rights-safe rule: each is
the parsed row projection the build consumes (id, name, commune, the wilaya the
card declares, address and the operator's own Google Maps link), not the
carrier's page, which is all rights reserved and runs to 2.7 MB for one of them.
Alongside them, `maps-resolutions.json` is the resolution cache for those Maps
links, keyed by the link itself: the final URL, the coordinate extracted from it
and the tier that produced it. A stop-desk's pin comes from resolving a
shortlink that carries no coordinate of its own, so without that cache an
offline rebuild could not place the same desks; with it, `--cache` reproduces
the package byte for byte and asks Google nothing. Google's per-request
parameters (`g_ep`, `skid`, `entry`, `coh`, `lucs`, `utm_source`) are stripped
from the stored URL, which would otherwise churn the whole capture on every
re-fetch. The trade-off of projecting at parse time is that a parser fix is not
exercised by a `--cache` rebuild; re-run live once after changing one.

The two MJS GeoServer captures (`sports/sig-infrastructures.json`,
`jeunesse/sig-etablissements.json`) are a key whitelist, not a single drop.
`canonicalizeMjsLayer()` keeps exactly the top-level `type`, `totalFeatures` and
`features`, and per feature its `type`, `geometry`, `geometry_name` and the whole
`properties` object as received. Every other key is dropped: today that is the
per-request feature id GeoServer mints
(`<layer>.fid-5ffd9fe9_1a17f142549_80d`), and tomorrow it is any top-level key
the endpoint starts sending, a GeoServer `crs` or `bbox` included. An unknown key
is dropped rather than refused on purpose, so the next live pull cannot be lost
to a schema surprise during the vantage-point window; review catches it as the
capture losing something it had.

Dropping the feature id is what makes a no-change refresh a no-change diff: two
pulls 90 seconds apart changed all 2,337 of them, and without it those two pulls
capture byte-identically. Features are sorted by `properties.id`, the stable
per-record UUID, so a server-side reorder stays a no-op; a row with no
`properties.id` sorts last, after its own canonical body breaks the tie, so even
an unidentified row cannot carry server arrival order into the file. Both layers
answer only from an Algerian vantage point, which is why the capture matters more
here than elsewhere: it replays offline with `--cache` long after the window
closes.

Replaying is not rebuilding. Both `--cache` runs currently abort in
`applyReviewedOverrides` on a review decision gone stale by absorption (sports
`facilities.json/01663`, jeunesse `institutions.json/00728`, each expecting
wilaya 14 where the build now derives 64 with commune 1439), before either
package writes anything, so neither dataset has been promoted from these
captures. Retiring those decisions edits the #209 audit gate, so both are parked
for batch 2026-16; `refresh-schedule.json` carries the reason per package. Owed
in 2026-16, once the rebuild runs again: a gate that proves a live pull replays
byte-identically to the committed capture end to end, rather than only at the
projection, which is all `test/mjs-sig-capture.test.mjs` pins today.

Remaining packages convert as they are
next touched — their raw pulls still land in gitignored `research/<pkg>/`
until then.
