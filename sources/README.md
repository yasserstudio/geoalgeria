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
sources/<pkg>/manifest.json   # per-source: url, retrieved, records, sha256, bytes
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
- Captures are not published: nothing here ships to npm or the CDN.
- Size: captures of a few MB are fine. For an unusually large pull (>20 MB),
  capture the trimmed projection the build actually consumes and record the
  trim in the manifest `note`.

## Status

Converted so far: `telecom`, `ecoles` (reference implementations,
2026-08-03), `protection-civile`, and `buses`. The buses capture is a reviewed,
trimmed OSM projection with its non-atomic Overpass receipts preserved. Bus
Operator captures are rights-safe projections: they retain only factual fields
used by the package plus upstream URLs, retrieval timestamps, byte counts and
SHA-256 hashes for the ignored raw HTML, API and map responses. This keeps the
evidence auditable without committing or relicensing full all-rights-reserved
pages and KML files. Remaining packages convert as they are
next touched — their raw pulls still land in gitignored `research/<pkg>/`
until then.
