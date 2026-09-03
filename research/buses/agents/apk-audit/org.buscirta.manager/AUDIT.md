# Cirtabus (`org.buscirta.manager`) static audit

Date: 2026-09-03. Static inspection only; not executed, no credential used.

## Answer

**No line or stop data.** This is the Constantine sibling of `org.bussetif.manager`
(see `research/buses/SETIFIS-APP-AUDIT.md`) - the same thin native WebView shell over
the malimspotter live-tracking frontend. Nothing to extract; `extracted/` is empty
by design.

## Fingerprint

- **seen:** `org.buscirta.manager`, label `Cirtabus`, version `1.30`, code `30`.
- **seen:** XAPK SHA-256 `52f9fcefec3422e5c35974bd869b338c92117d4d4510f2dde7940596bb8fc829`
  (13,306,871 bytes), fetched 2026-09-03 from `d.apkpure.net`. Splits
  `config.armeabi_v7a`, `config.en`, `config.mdpi`, `config.zh`.
- **seen:** Native Android (no Flutter/RN markers). Assets are
  `adi-registration.properties`, `dexopt/*`, `kotlin-tooling-metadata.json` - no data
  files, no SQLite, no JSON/GeoJSON.

## Tier 1 - endpoint inventory

| Host | Method | Path | Auth | Source |
|---|---|---|---|---|
| `gps.malimspotter.dz` | GET | `/`, `/?locale=ar`, `/?locale=en`, `/?locale=fr` | WebView, token appended by the shell | `classes.dex` / `resources.arsc` |

Everything else in the string sweep is AdMob / Firebase / Chromium boilerplate.
`gps.malimspotter.dz` is the Traccar-backed tracking frontend - **not called**.

## Note

`gps.malimspotter.dz` also appears inside `dz.etu.bus`'s per-wilaya host list, and
the Setif app (`org.bussetif.manager`) points at `old.malimspotter.dz`. One operator
of a white-label fleet, many packages.
