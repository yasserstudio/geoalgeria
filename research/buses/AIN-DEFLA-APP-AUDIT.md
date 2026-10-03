# Aïn Defla bus apps: static audit, 2026-09-03

Two APKs supplied by the project owner, inspected with the
`android-reverse-engineering` skill (fingerprint, jadx decompile, API sweep) plus
`strings` on the Flutter AOT snapshot. Static inspection only: no endpoint was
called, no token was used. Both apps are thin clients; neither bundles a line or
stop dataset.

`seen` means directly observed in the package; `inferred` is a conclusion.

## Etus AinDefla 1.0.0 (Flutter)

- **[seen]** Framework Flutter; Dart logic in `lib/<abi>/libapp.so`; Java code is
  Firebase glue only. Language files (`assets/langs/{en,fr,ar}.json`, 33 keys) carry
  UI chrome, no line names.
- **[seen]** Static network API in the Dart snapshot: base `https://etus44.dt-pay.com/api`
  with paths `/getline` and `/getarret`, request keys `lineId`, `arret_from`, and
  `Authorization` / `Bearer` / `apiKey` strings nearby.
- **[seen]** Live-vehicle API, Traccar-shaped: `https://45.80.148.192/api/devices` and
  `/api/positions`.
- **[seen]** `etus44.dt-pay.com` does not resolve (`ENOTFOUND`, 2026-09-03). The 1.0.0
  build's static API is dark; the app may be superseded or defunct.

## Ain Defla Bus 1.19 (`org.aindeflabus.manager`, third party)

- **[seen]** Seven app classes; `MainFragment` is a WebView that loads
  `https://etus.malimspotter.dz/?locale={ar,en,fr}`. AdMob and Firebase bundled.
- **[seen]** `etus.malimspotter.dz` serves a **Traccar login page**; `api/server` is
  Traccar's server-info endpoint. Nothing is visible without an account.

## Tier 1 inventory

| App | Host | Path | Auth | Kind | Source |
|---|---|---|---|---|---|
| Etus AinDefla | `etus44.dt-pay.com` | `/api/getline` | token likely | static Lines | `libapp.so` |
| Etus AinDefla | `etus44.dt-pay.com` | `/api/getarret` (`lineId`, `arret_from`) | token likely | static Stops | `libapp.so` |
| Etus AinDefla | `45.80.148.192` | `/api/devices`, `/api/positions` | Traccar session | live vehicles | `libapp.so` |
| Ain Defla Bus | `etus.malimspotter.dz` | `/` (WebView), `/api/server` | Traccar login | live tracker UI | `defpackage/b60.java`, `z50.java` |

## Verdict

- **[inferred]** Neither app is a usable identity source today: the official app's
  static API host is dead, and the third-party app is a login-walled live tracker.
  Under the promotion gate (live GPS and exposed endpoints are leads, not sources),
  **ETUAD stays directory-less and unmapped.**
- **[inferred]** What would clear ETUAD Lines X and 2: a line list or network map from
  the operator page `facebook.com/ETUS44` (login-walled to fetchers, readable by a
  person), or a reuse grant for `/getline` + `/getarret` if the vendor host returns
  under a new name. The OSM relations (7107372, 16022861) already carry
  `operator=ETUAD`; only the termini and identity are missing.
