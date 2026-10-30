# Reviewed data corrections

These versioned ledgers are the publication boundary between research/review and
the public `@geoalgeria/*` packages. `scripts/lib/v2-transforms.mjs` automatically
loads `quality/overrides/<package>.json` before it validates and emits a package.

The first pilot is `sante.json`. Any other package can adopt the same workflow by
adding a ledger named after the package; no generator-specific correction code is
needed.

Landing a ledger entry means re-running the package's writer so the correction is
applied, validated and mirrored. `banques` has `npm run build` for that; most sector
packages have only `npm run fetch`, which needs the live upstream, so
`node scripts/apply-overrides.mjs <package>...` re-emits one from the records it already
ships. It makes no decision of its own, and a second run is a no-op.

## Safety contract

- `status` records what the reviewer found. `publish_action` separately chooses
  `keep`, `patch`, or `exclude`; marking something missing or duplicate does not
  delete it automatically.
- A ruling that a candidate is **not** a correction is a decision too, and it
  belongs here rather than in the research file that raised it: `status`
  `verified` with `publish_action` `keep`, the `reviewer` and `reviewed_at` of the
  ruling, its reason in `notes`, and its sources in `evidence`. It changes no
  published field; what it does is close the candidate so it stops returning to
  the review queue. ADR 0001 rule 10 says the same for the coordinate review: the
  ledger, not the page, is the record. `historic-91` in `tourisme.json` is the
  worked example, one of the four OpenStreetMap re-place candidates the Owner
  rejected on 2026-10-28.
- A decision whose record is **retired into a survivor** is removed, not re-keyed
  onto the survivor: the survivor is a different record and the ruling was never
  made on it, and `applyReviewedOverrides` refuses a decision whose `record_id`
  is no longer published, so carrying one would stop every later rebuild. The
  ledger's own `note` says which decisions went and why, the package's
  `retired-ids.json` holds the forward, and the test that replays the run follows
  that forward rather than the id. The other three of those four candidates,
  `parks.json` park-25, park-29 and park-31, are the worked example: superseded
  on 2026-10-30 when the parks they named merged into their OpenStreetMap twins.
- Every patched field includes its old value in `expect`; exclusions snapshot the
  complete old record. A build stops if any affected upstream value changed.
- To add a missing shared optional field, list it in `expect_absent`; publication
  stops if upstream has since added that field. Arbitrary new fields are rejected.
- `patch` and `exclude` require a public evidence URL and check date. Local,
  private-network, and credential-bearing URLs are rejected.
- Ledgers cannot change record identity, source attribution, or external refs.
- The normal package schema validation runs after corrections, so reviewed data
  receives the same coordinate, ID, provenance, and vocabulary checks as upstream
  data.
- Patched records expose `review_status`, `reviewed_at`, `reviewed_by`, and the
  public `review_evidence` URLs alongside their original source provenance.
  Decisions may carry their own reviewer and timestamp so later ledger merges do
  not rewrite the provenance of earlier reviews.

Example:

```json
{
  "schema_version": 1,
  "dataset": "sante",
  "reviewer": "reviewer@example.com",
  "reviewed_at": "2026-08-28",
  "decisions": [
    {
      "file": "sante.json",
      "record_id": "sante:16-00001",
      "status": "corrected",
      "publish_action": "patch",
      "expect": { "name": "Old name", "lat": 36.75, "lng": 3.05 },
      "patch": { "name": "Correct name", "lat": 36.76, "lng": 3.06 },
      "evidence": [
        {
          "url": "https://authority.example/facility/1",
          "checked_at": "2026-08-28"
        }
      ]
    }
  ]
}
```
