# Cirta Pay (`constantine.cloudroutes.devcloud`) static audit

Date: 2026-09-03. Static inspection only; not executed, no credential used, **no
endpoint called** (this is a payments app).

## Answer

**No line or stop data.** Despite the `cloudroutes` package name this is a fare
*wallet*, not a route app: an Expo/React Native client whose whole API surface is
`/customers/auth/*`, `/customers/cards/*`, `/customers/bus/pay`,
`/customers/bus/pricing`. Nothing bundled beyond the JS bundle and ML-Kit barcode
models.

## Fingerprint

- **seen:** `constantine.cloudroutes.devcloud`, label **`Cirta Pay`**, version
  `2.2.0`, code `220`. XAPK SHA-256
  `d9f0fecddd9e69c24cff1d27349bc9b75ecc25007f18cd0f97b05f6507046712`
  (82,756,236 bytes), fetched 2026-09-03 from `d.apkpure.net`.
- **seen:** Framework **Expo / React Native**, SDK 52, `assets/index.android.bundle`
  4.5 MB, `expo-router` with typed routes. Only permission declared: `INTERNET`.
- **seen:** `assets/app.config` (copied to `extracted/app.config.json`) gives
  `slug: cloudroutes-client-app`, `scheme: etus-constantine`, `owner: chargily`,
  EAS project `9e4d2a46-d678-40da-8e89-8783a9a91c88`, and - telling - an icon
  `./assets/images/setif-splash.png` alongside `etusc-*` assets.
  **inferred:** a white-label "cloudroutes" client shipped per wilaya, first built
  for Sétif; `oran.routes.devcloud`, `ouargla.routes.devcloud`,
  `biskra.routes.devcloud`, `saida.routes.devcloud`, `ain_defla.cloudroutes.devcloud`,
  `ain_temouchent.route.devcloud` are the same family.

## Tier 1 - endpoint inventory

| Host | Method | Path | Auth | Source |
|---|---|---|---|---|
| `constantine.routes.devcloud.dz` | GET/WS | `/api/socket` | session | `index.android.bundle` |
| `constantine.routes.devcloud.dz` | POST | `/customers/auth/*` (logout-other-devices, reset-password, tokens) | session | `index.android.bundle` |
| `constantine.routes.devcloud.dz` | POST | `/customers/bus/pay`, `/customers/bus/pricing` | session | `index.android.bundle` |
| `constantine.routes.devcloud.dz` | POST | `/customers/cards/add`, `/customers/cards/remove` | session | `index.android.bundle` |
| `cloudroutes-map.vercel.app` | GET | ? | ? | `index.android.bundle` |
| `?` | GET | `/api/v2/push/update` | ? | `index.android.bundle` |

None called. **inferred:** the host pattern `<city>.routes.devcloud.dz` is the one
worth following up for the rest of the family - and `cloudroutes-map.vercel.app` is
the likeliest place a route/stop catalogue is actually served, but it was out of
scope for this pass (unknown shape, payments-adjacent app).

## Licence / terms

None seen covering transit data.
