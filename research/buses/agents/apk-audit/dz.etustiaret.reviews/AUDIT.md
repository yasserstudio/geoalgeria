# Hafilati (منصة حافلتي) — dz.etustiaret.reviews 2.4, static audit 2026-09-04

Supplied as an XAPK by the project owner (sha256 38186989ef5afc2a…). Fingerprint:
Capacitor/Vue WebView hybrid, so the app is the JS bundle under assets/public.
The package id names ETUS Tiaret, while the home screen shows Oran's Santa Cruz
and the Play blurb is generic ("gares routières et itinéraires"). Sections:
Lines, Routes, Timetables, public facilities, landmarks. Findings are appended
below by the reviewer from the grep in this session; no endpoint was called.
--- endpoints ---
https://api.mapbox.com/directions/v5
https://leafletjs.com
https://reviews.milafi-etustiaret.dz/api
https://router.project-osrm.org/route/v1
https://ui-avatars.com/api/
--- api paths ---
"/lines"
"/timing"
"/timings"
"line"
"linear"
"lines-sharp-small"
"lines-sharp"
"lines-small"
"lines"
"lineTo"
"linetouched"
"stop-propagation"
"stop"
"stops"
"stops/"
"stops/init"
"stops/lines"
"timings"

## Findings (reviewer, 2026-09-04)

- **[seen]** `capacitor.config.json` declares `appId: dz.etusoran.mybus`, `appName: حافلتي`: this build is
  **ETO Oran's "My Bus"** platform shipped under a Tiaret-vendor package id. The vendor is
  `milafi`; the backend is `https://reviews.milafi-etustiaret.dz/api`.
- **[seen]** API paths in the bundle: `lines`, `lines-small`, `stops`, `stops/init`, `stops/lines`,
  `timings`, `landmarks`, `institutions`. Routing uses public OSRM and Mapbox Directions;
  maps are Leaflet. **No line, stop or timetable data is bundled**; everything is fetched.
- **[seen]** Nothing was called. The lines/stops/timings endpoints are, by name, static network
  listings, the class the ETUSA probe read once; positions endpoints, if any, were not identified.
- **[inferred]** This was the most direct lead to a **numbered ETO line list with Stations and
  timetables**, which is exactly what the six Line drawings lacked. The one authorized,
  read-only request and resulting decision are recorded below. Same vendor may serve ETUS
  Tiaret's own "Hafilati".

## Lines endpoint probe (2026-09-04)

### Artifact fingerprint and call flow

- **[seen]** The supplied XAPK has sha256
  `38186989ef5afc2aa21ac7786ab93ea838b6f3472ab20d8df8ef1879fdd1146a`.
  The Android reverse-engineering `fingerprint.sh` classifies it as a Cordova/Capacitor WebView
  hybrid from its `assets/public/` shell, with low obfuscation and no native HTTP stack; the
  relevant implementation is therefore the extracted Web bundle, not JADX output.
- **[seen, Tier 1]** `assets/public/assets/Lines-zVm-B9Ci.js` imports the Pinia store from
  `lines-2e-XmpFc.js` and calls its `fetch()` method when the Lines screen mounts.

| Host | Method | Path | Auth | Source |
| --- | --- | --- | --- | --- |
| `reviews.milafi-etustiaret.dz` | GET | `/api/lines` | optional Bearer at the HTTP interceptor; the `/lines` screen itself requires a stored token | `assets/public/assets/lines-2e-XmpFc.js`; `assets/public/assets/index-5-63jaCk.js` |

#### Tier 2: `GET /api/lines`

- **[seen]** `lines-2e-XmpFc.js` calls Axios `.get("lines")`; `index-5-63jaCk.js` sets the
  base URL to `https://reviews.milafi-etustiaret.dz/api`, yielding `/api/lines`.
- **[seen]** The request interceptor always sends JSON `Accept`/`Content-Type` headers and adds
  `Authorization: Bearer <stored token>` only when a token exists. Separately, the app router
  redirects the `/lines` screen to `/login` when no token is stored.
- **[seen]** The client expects the response body itself to be an array. The Lines UI consumes
  `id`, `name`, `color`, `is_featured`, and nested `stops[]` entries with `id` and `name`
  (`lines-2e-XmpFc.js`, `Lines-zVm-B9Ci.js`, `LineCard.vue_vue_type_script_setup_true_lang-6udj1TeN.js`).

### One-request receipt

| UTC | Request | Result | Bytes | Content-Type | SHA-256 | Redirects |
| --- | --- | --- | ---: | --- | --- | ---: |
| `2026-09-04T10:40:01Z` (initiated; response `Date` was `10:40:19Z`) | unauthenticated `GET https://reviews.milafi-etustiaret.dz/api/lines` | HTTP/2 `404` | 0 | absent | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 |

- **[seen]** Exactly one GET was made, with retries disabled. Caddy returned an empty 404 response;
  there were no records or response fields to inspect, and no payload was added to the repository.
- **[inferred]** The static bundle proves that this build was designed to request structured Line
  records, but the exact unauthenticated endpoint was not available at probe time. The evidence is
  **validation-only**: there is no retrieved data to import and no observed reuse licence. Project
  policy excludes outreach, account creation and further probing. Leave this as a documented gap
  unless an openly reusable public source appears.
