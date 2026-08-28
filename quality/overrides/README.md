# Reviewed data corrections

These versioned ledgers are the publication boundary between research/review and
the public `@geoalgeria/*` packages. `scripts/lib/v2-transforms.mjs` automatically
loads `quality/overrides/<package>.json` before it validates and emits a package.

The first pilot is `sante.json`. Any other package can adopt the same workflow by
adding a ledger named after the package; no generator-specific correction code is
needed.

## Safety contract

- `status` records what the reviewer found. `publish_action` separately chooses
  `keep`, `patch`, or `exclude`; marking something missing or duplicate does not
  delete it automatically.
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
