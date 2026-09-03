# ETUSA network API: one read-only probe, 2026-09-03

Found by the static audit of the operator-owned app `dz.etusa.etusa_mob` (see
`agents/apk-audit/dz.etusa.etusa_mob/AUDIT.md`). Host `etusaapi.streamsystem.com`;
its TLS certificate is expired, so the read was made with verification off and
that is recorded here. No credential, no token, nothing written.

| Time (UTC) | Request | Result |
|---|---|---|
| 2026-09-03T16:12:32Z | `GET /reseau/arret` | 200, 186,041 bytes, sha256 `06dfade2f9700136…` |
| 2026-09-03T16:12:32Z | `GET /reseau/arretwithligne` | 404 (expects a parameter) |
| 2026-09-03T16:12:32Z | `GET /reseau/horaire` | 404 (expects a parameter) |

## What `/reseau/arret` is

- **[seen]** 1,219 stops, every one geocoded, 1,218 with an Arabic name, 56 communes;
  fields `nom`, `nom_ar`, `commune`, `commune_ar`, `lat`, `lon`. This is ETUSA's own
  bilingual stop directory. Saved verbatim at `agents/apk-audit/etusa-api-probe/`.
- **[seen]** Against the package's 901 OSM-derived ETUSA Stations: 656 sit within 50 m of
  an official stop and 760 within 150 m; 401 carry a name that appears in the official list.
  The OSM layer is therefore largely right where it exists, and the official list is a
  third larger.

## Decision

- **[inferred]** Validation-only for now. Stop coordinates are Operator-controlled
  geometry, which the promotion gate keeps out of the package without a reuse grant; the
  identities and Arabic names are the kind of factual reference data the package already
  publishes for other Operators, but the endpoint is not a published feed and no terms
  accompany it.
- **[inferred]** `/reseau/arretwithligne`, `/reseau/drawofligne2` and `/reseau/horaire`
  take a line parameter whose name is not known; enumerating it would be probing, not
  reading. Next step is a reuse request to ETUSA naming these three endpoints, or a
  published feed. If granted, this is the full 186-Line network with timetables.
