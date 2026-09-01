# ETO Oran source audit

Reviewed on 2026-09-01 before any Oran data is promoted into
`@geoalgeria/buses`.

## Outcome

ETO Oran is a verified urban/suburban Operator, but no complete, reusable Line
dataset was found.

- The official GPS portal is a branded Traccar 6.6 installation.
- Public access exposes server metadata and the Operator logo only.
- Devices, positions, groups, historical traces and detected dwell events need
  authentication.
- Traccar `route` reports are vehicle traces, not authoritative passenger Line
  geometry. Its `stops` reports are dwell events, not passenger Stations.
- No public licence or republication permission was found.
- Current reporting supplies a few Line facts, but no ordered Stations or
  geometry. Historical academic material is incomplete and already stale.

The Operator may be shown in research and its verified mark may be used for
identification. Oran Lines must remain out of the published package until an
authorized export or an openly licensed official feed supplies identity,
geometry and Station membership.

## Local artifact

[`audit.json`](./audit.json) records the endpoint checks, known Line leads and
the exact blocker without copying protected telemetry or third-party pages.
