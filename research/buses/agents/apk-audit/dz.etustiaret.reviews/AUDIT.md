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
- **[inferred]** This is the most direct route to a **numbered ETO line list with stops and
  timetables**, which is exactly what the six route drawings lacked. Next step: one read-only,
  unauthenticated GET of `/api/lines` (and `/api/stops/init`) with a logged receipt, then a
  reuse request to ETO citing the app. Same vendor may serve ETUS Tiaret's own "Hafilati".
