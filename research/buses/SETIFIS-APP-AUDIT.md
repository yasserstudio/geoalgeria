# Setifis BUS app data audit

Date: 2026-09-02  
Package: `org.bussetif.manager`  
Scope: publisher-supplied Google Play metadata, the linked developer privacy policy, official Play-hosted screenshots, already committed repository artifacts, and read-only static inspection of the user-supplied official-build artifact `org.bussetif.manager_1.08.xapk`. The app was not executed; no credential was used or reproduced, and no protected endpoint was probed.

## Answer

The app is evidence that an ETUS Sétif **live-vehicle service exists**, but it is a thin WebView client, not a bundled route database. Static inspection reveals the first-party web frontend `https://old.malimspotter.dz`, but no route/stop/shape dataset, documented API, or reusable export. A credential-like manager token is embedded and passed to the remote frontend; its value is deliberately redacted and was not used. Therefore, the requested route data cannot safely be retrieved from this artifact without operator authorization and backend documentation.

| Data | Finding | Evidence |
|---|---|---|
| Live vehicles | **seen** — the publisher says the app displays ETUS Sétif bus positions in real time. | [Google Play listing](https://play.google.com/store/apps/details?id=org.bussetif.manager&hl=fr) |
| Routes / line identities | **not seen** — no route inventory is published or bundled in the native client. | [Google Play listing](https://play.google.com/store/apps/details?id=org.bussetif.manager&hl=fr); supplied XAPK, SHA-256 below |
| Ordered stops | **not seen** — no stop list, model, or stop export is published or bundled. | [Google Play listing](https://play.google.com/store/apps/details?id=org.bussetif.manager&hl=fr); supplied XAPK, SHA-256 below |
| Shapes / route geometry | **not seen** — no GTFS, GeoJSON, KML, polyline model, or other route-shape asset is linked or bundled. | [Google Play listing](https://play.google.com/store/apps/details?id=org.bussetif.manager&hl=fr); supplied XAPK, SHA-256 below |
| Schedules | **not seen** — the listing only claims live positions. | [Google Play listing](https://play.google.com/store/apps/details?id=org.bussetif.manager&hl=fr) |
| Public API / backend host | **seen / not established** — the XAPK names `https://old.malimspotter.dz` as its WebView origin, but contains no documented API path or public-access contract. | supplied XAPK, SHA-256 below; [linked privacy policy](https://www.privacypolicies.com/live/2f1334ac-c708-4a5c-bfb5-9d44d8621fc8) |

## Supplied XAPK static inspection

- **seen:** `org.bussetif.manager_1.08.xapk` is a ZIP/XAPK with SHA-256 `71df9776981d4dece032bd8d6b26fa739657a55e1a5403b9a132d7eb104126e8`. Its XAPK manifest declares package `org.bussetif.manager`, version `1.08` / code `8`, and contains a base APK plus `arm64-v8a`, `armeabi-v7a`, English, French, and `xxhdpi` configuration splits. Source: user-supplied artifact of that filename, inspected 2026-09-02.
- **seen:** The base APK SHA-256 is `eb43b526bfe2335501ba4126688d5d2dbfd3e522104cea78c2c1ab9415c9c740`. Android `apksigner` verifies APK Signature Scheme v3 and a Google Play Source Stamp; the sole app signer certificate has subject `C=DZ, CN=Malim Adel` and SHA-256 fingerprint `7994e1ccf2cfca5270a078fa8ea7723d33dbf466ee5f65d97063e2f3725b4c1d`. This verifies archive integrity/signature properties, not operator ownership of the data.
- **seen:** The manifest identifies `org.bussetif.manager.MainActivity`, label `Setifis BUS`, minimum SDK 32 and target SDK 36. It declares Internet and coarse/fine location access, notifications, Firebase messaging/analytics/crash reporting, biometrics/fingerprint, and Google Play license checking; cleartext traffic is disabled.
- **seen:** The native app package is very small and implements a start/language screen, a WebView fragment, a Firebase messaging service, and WebView clients. Arabic, French, and English choices resolve to locale variants of `https://old.malimspotter.dz`; the WebView message bridge is restricted to that HTTPS origin.
- **seen:** No app-owned classes or assets model routes, ordered stops, shapes, GTFS, or vehicle-position responses. Static string checks found no app-specific `/api/routes`, `/api/stops`, `/api/positions`, or `/api/devices` path. Generic Android/Firebase identifiers were excluded from this conclusion.
- **seen:** The start flow contains a credential-like manager value and appends it as a `token` parameter to the remote locale URL. The message bridge also handles `login`, `authentication`, and `logout`; it saves/removes `managerToken` in Android `EncryptedSharedPreferences` using AES-256 schemes and invokes biometric authentication when retrieving it. The sensitive value is **redacted**, was not used, and must not be committed.
- **inferred:** Route, stop, shape, and live-position data—if the service exposes them—are delivered by the remote authenticated web application rather than stored in the Android package. Determining its schemas by replaying the embedded credential would cross the authorized access boundary and was not attempted.

## What the official screenshots establish

- **seen:** The three Play-hosted screenshots show a map-based fleet-tracking interface with bus/device markers, a device search field, layer controls, and map-provider choices. [Screenshot 1](https://play-lh.googleusercontent.com/ZwPEzBkWy6Efsf_b765eutYAYVJV63L2VTn_D6Q5z4Najmu2t_6UkgDNzvDA58bi4jPCm-_MXpdfbTAWgs6vwRk=w1052-h592), [screenshot 2](https://play-lh.googleusercontent.com/bVSPp7lpJ25lxfIQ7Is7asCDHiseM42H97EURIiAo-jIRD-fKzzOXkn2NdjPtaPnwJW1CNCLLKfG4b5tLHqFtw=w1052-h592), [screenshot 3](https://play-lh.googleusercontent.com/k3WCsFos4zWTlfYFNAodPRpQLHwKQFcSffuu8wAeYEsrujddimv8jkyhwZaVQaw5m_UQAPXBGFJ8tZBc9TW2KQ=w1052-h592)
- **seen:** One screenshot is visibly centered on Guelma, not Sétif; the others cover a wide area around Aïn Oussera/Djelfa. The screenshots therefore look generic or reused and are not proof of Sétif route identities, stops, or geometry.
- **seen:** Additional user-supplied Play imagery shows the same generic tracker used for Aïn Defla/M'Sila and a manager-login surface. It still does not show Sétif route geometry or ordered stops. Source: user-supplied Play screenshots, 2026-09-02.
- **inferred:** Labels such as `643-L2` may encode a vehicle and line, but a screenshot label is insufficient to establish a canonical route, its termini, stop order, or shape.

## Technical feasibility and access boundary

- **seen:** Google Play permits installing the official build through a compatible device and Google account; the listing does not provide a public APK or data export. [Google Play Terms, section 2](https://play.google.com/about/play-terms/)
- **seen:** The linked policy defines an `Account`, describes signing in, and says application data may be uploaded to company or service-provider servers. It does not document concrete endpoints, schemas, credentials, or token scope. [Linked privacy policy](https://www.privacypolicies.com/live/2f1334ac-c708-4a5c-bfb5-9d44d8621fc8)
- **seen:** Static inspection identifies the web frontend hostname and an app-bundled manager credential, but not a documented public API or anonymous data channel. The credential is an access secret, not permission for extraction or republication.
- **not established:** What permissions the embedded credential carries, whether the Sétif service offers any anonymous view, or whether its remote responses expose routes/stops/shapes in addition to vehicle positions.
- **not established:** Whether live markers expose stable public line identifiers. Sampling moving vehicles would not by itself produce authoritative route geometry or ordered stops.

## Privacy and licensing constraints

- **seen:** The Play data-safety declaration says no data is collected or shared, while the linked policy says usage data, account/contact details, device identifiers, and—with permission—location may be collected. This contradiction means the listing should not be treated as a complete technical specification. [Google Play listing](https://play.google.com/store/apps/details?id=org.bussetif.manager&hl=fr), [linked privacy policy](https://www.privacypolicies.com/live/2f1334ac-c708-4a5c-bfb5-9d44d8621fc8)
- **seen:** No open-data license, GTFS terms, API terms, or explicit republication grant is linked.
- **seen:** Google Play grants personal, non-commercial use unless expressly authorized and reserves ungranted rights; it also prohibits redistribution of Play content and circumvention of access controls. [Google Play Terms, sections 4.75–4.86](https://play.google.com/about/play-terms/)
- **inferred:** Even if the app returns live coordinates, republishing them or reconstructing persistent vehicle histories should wait for written operator/developer permission. Any third-party basemap license would be separate from rights in ETUS line and vehicle data.

## Safe next action

1. Ask ETUS Sétif and the listed developer for a static, reusable export—preferably GTFS, GeoJSON/KML, or a documented read-only API—covering line IDs, termini, ordered stops, and shapes, together with explicit republication terms.
2. Privately disclose the embedded credential finding to the developer/operator, ask whether it is intentional, and request rotation if it is not. Do not publish or reuse the value.
3. If they authorize technical inspection, use only an explicitly issued read-only credential and document endpoint schemas, rate limits, retention, and token scope; never commit credentials or live vehicle history.
4. Until permission/data arrive, use independently licensed OpenStreetMap route relations for geometry and treat the Play app only as corroboration that a live ETUS Sétif tracker exists—not as a route dataset.

## User-supplied Line 101 diagram

- **seen:** A diagram supplied on 2026-09-02 labels a Line 101 extension from
  Boussekine toward 1014 Logements / Les Tours, passing named stops including
  GR, CFA, Souk, Rempart, CHU, 750 Logements, Stade 500 Lots, Htatba, and 5ème
  arrondissement.
- **seen:** The retained OSM audit instead separates ref 101 into a 22.1 km
  `GR ↔ University of Sétif` candidate with 107 Station members and a 0.8 km
  `Les Tours ↔ GR` candidate with no Station members. Source:
  [`candidate-lines.json`](./osm/candidate-lines.json).
- **inferred:** The diagram is useful identity evidence, but it does not validate
  the 22.1 km candidate as the current Line 101. The 0.8 km relation is plainly
  incomplete for the depicted route. Reconstruct or reconcile the complete
  Boussekine–Les Tours path before promoting ref 101.

## Repository cross-check

- **seen:** The committed national inventory reached the same boundary: `live_data` is `claimed_or_protected`, while line refs, stops, geometry, schedules, and public endpoints remain unknown. Source: `data/research/buses/national/all-wilayas.json` (Sétif record).
- **seen:** Existing OSM candidates can support a separate, ODbL-governed geometry workflow, but they are not extracted from this app and require identity validation before promotion.
