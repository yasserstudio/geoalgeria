# WASLAYA (`com.deeper.etus.oeb`) APK audit

Audited 2026-09-04 from `WASLAYA+-+وصلايا_1.0.0_APKPure.apk`, supplied by the project owner. This is a bounded source-discovery audit for ETUS Oum El Bouaghi bus data; it is not a security assessment.

## Receipt

- APK SHA-256: `6b619a4d39d0a94bc2ab0feea5603b8c1cc5b1f503feac9c79ce8bd6db4eb648`
- Package: `com.deeper.etus.oeb`
- Version: `1.0.0` (`versionCode` 1)
- App label: `Waslaya`
- Architecture: Flutter AOT (`libapp.so` and `libflutter.so`), low apparent obfuscation
- Static analysis: manifest/resources decoded with JADX; Flutter assets and native strings inspected directly, following the Android reverse-engineering skill's Flutter stop condition

No Line or Station dataset is bundled in the Flutter assets. The app contains Arabic/French/English UI strings and screens for a map, buses, authentication, tickets, balance and payments.

## Static endpoint inventory

| Endpoint | Static source | Purpose | Method/auth confidence | Decision |
|---|---|---|---|---|
| `https://etus04.mt-pay.xyz/api/getline` | `libapp.so`: absolute URL and `getLine` | Line discovery | GET inferred; auth unknown | One bounded unauthenticated probe |
| `https://etus04.mt-pay.xyz/api/getarret` | `libapp.so`: absolute URL and `parseStops` context | Station discovery | GET inferred; auth unknown | Not called after Line host failed DNS |
| `https://etus04.mt-pay.xyz/api/clients_login` | `libapp.so`: API base plus path string | Account login | POST inferred; credentials/token flow unknown | Excluded: account mutation/authentication |
| `https://etus04.mt-pay.xyz/api/clients_signup` | `libapp.so`: API base plus path string | Account registration | POST inferred; credentials/token flow unknown | Excluded: account mutation |
| `https://etus04.mt-pay.xyz/api/clients_active` | `libapp.so`: API base plus path string | Account activation | Method/auth unknown | Excluded: account mutation |
| `https://etus04.mt-pay.xyz/api/checktoken` | `libapp.so`: API base plus path string | Token validation | Method unknown; Bearer/client token inferred | Excluded: authenticated account operation |
| `http://45.80.148.242:8082/api/devices` | `libapp.so`: absolute URL | Live Traccar device data | GET/Basic or token auth inferred | Excluded: live fleet data |
| `http://45.80.148.242:8082/api/positions` | `libapp.so`: absolute URL | Live Traccar position data | GET/Basic or token auth inferred | Excluded: live location data |

Static strings also include `Authorization`, `Basic`, `Bearer`, `clinet_token`, `device_id` and `deviceid`; they do not prove the auth mode of either catalogue endpoint.

## Inferred call flow

```text
Android MainActivity
  -> Flutter runtime / package:flutter_auth
     -> dashboard/map
        -> getLine -> /api/getline -> Line list
        -> parseStops -> /api/getarret -> Station/map display
        -> authenticated tracking -> Traccar /api/devices + /api/positions
     -> account screens
        -> clients_login / clients_signup / clients_active / checktoken
```

The arrows after the Flutter runtime are an inference from co-located native strings and source-path symbols, not recovered Dart source or observed traffic.

## Network probe

Exactly one unauthenticated, read-only request was attempted on 2026-09-04:

```text
GET https://etus04.mt-pay.xyz/api/getline
redirects: disabled
retries: disabled
result: curl (6), Could not resolve host: etus04.mt-pay.xyz
HTTP status: 000
response bytes: 0
```

The first sandboxed attempt could not use network DNS and did not reach a server. The logged request above was repeated with approved external network access and still failed DNS, establishing the current external result. No response body exists to retain or hash. No other WASLAYA endpoint was contacted.

## Promotion decision

The dead catalogue host cannot supply a reusable source today. Per the project's no-outreach rule, no Operator/developer contact is proposed.

The supplied WASLAYA poster, Operator logo and APK package identity corroborate the app/Operator relationship. Five separately supplied numbered Operator diagrams establish Lines 01–05 and their bilingual endpoint projection; their major-Station lists and distances remain evidence in `sources/buses/etus-oeb-lines.json`. Operator artwork is not redistributed. The unnumbered 9.3 km night loop remains evidence-only because it has no Line ref, direction definition, operating dates, or proof of permanent service. No supplied map geometry is published.
