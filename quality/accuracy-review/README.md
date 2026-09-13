# Data accuracy review queue

Run `pnpm review:accuracy` from the data repo. `pnpm review:accuracy --check`
compares both committed artifacts with a fresh offline run, without writing.

This is an inventory of **review candidates**, not verified errors or completed
human review. No canonical records are changed. Existing record fields, including
source refs and any existing review evidence, are preserved in each snapshot.

- `summary.json`: counts by dataset and entity, reasons, complete
  dataset metadata (including sources and retrieved dates), boundary metadata,
  excluded entities, and SHA-256 receipts for every input read.
- `candidates.json`: stable dataset/entity/record IDs, reasons, complete canonical
  record snapshots, relevant boundary results, and shared-coordinate groups.
  Group members are stored once to avoid quadratic duplication.

The generator discovers packages with `data/metadata.json`, follows `entities`
when declared, and otherwise inspects top-level JSON arrays. Only arrays with
`lat` or `lng` fields are audited, including all-null arrays. Generated mirrors,
administrative datasets without this metadata, app-only datasets, and raw source
captures are outside this scope. Aviation routes and international route endpoints,
and representative bus Line coordinates are explicitly excluded; airports and bus
Stations are included. Intentionally ungeocoded Mobilis points of sale and bank
institution directories are excluded; bank branches are included. Discovery
exclusions are recorded in the summary.

Signals cover missing/invalid coordinates, explicit approximate coordinates,
missing/invalid geometry confidence, identical finite coordinates within an
entity, unknown wilaya linkage, and points outside their declared wilaya.
Coordinate strings are invalid rather than silently converted. Null coordinates
never form shared-coordinate groups. Identical coordinates can represent separate
establishments at the same address; this signal never merges records or declares
duplicates. Shared coordinates are detected regardless of geometry confidence.

Boundary findings distinguish adjacent and nonadjacent wilayas and points outside
all polygons. The committed boundaries are simplified, display-grade geometry:
a finding is a review lead, not proof that coordinates or administrative linkage
are wrong. The original boundary metadata and its limitations are preserved.

Start with invalid geometry and nonadjacent linkage, then inspect shared exact
points and approximate coordinates using the declared sources. Establish evidence
for a specific change before applying a correction with expected-old-value checks,
as in the service-station workflow. A fresh generator run is not a new source
retrieval or a review date. Hashes identify input snapshots; no current timestamp
is inserted, so unchanged inputs produce byte-identical artifacts.
