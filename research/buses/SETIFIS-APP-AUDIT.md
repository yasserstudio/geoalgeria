# Setifis BUS app data audit

Date: 2026-09-02  
Package: `org.bussetif.manager`  
Scope: publisher-supplied Google Play metadata, the linked developer privacy policy, official Play-hosted screenshots, and already committed repository artifacts. No APK mirror, authentication bypass, token extraction, or production endpoint probing was used.

## Answer

The app is evidence that an ETUS Sétif **live-vehicle service exists**, but the public first-party surfaces inspected do **not** expose reusable Sétif routes, ordered stops, line shapes, schedules, an API hostname, or an access token. Therefore, those datasets cannot presently be retrieved from this Play listing alone.

| Data | Finding | Evidence |
|---|---|---|
| Live vehicles | **seen** — the publisher says the app displays ETUS Sétif bus positions in real time. | [Google Play listing](https://play.google.com/store/apps/details?id=org.bussetif.manager&hl=fr) |
| Routes / line identities | **not seen** — no route inventory is published in the description or support metadata. | [Google Play listing](https://play.google.com/store/apps/details?id=org.bussetif.manager&hl=fr) |
| Ordered stops | **not seen** — no stop list or stop export is published. | [Google Play listing](https://play.google.com/store/apps/details?id=org.bussetif.manager&hl=fr) |
| Shapes / route geometry | **not seen** — no GTFS, GeoJSON, KML, or other route-shape download is linked. | [Google Play listing](https://play.google.com/store/apps/details?id=org.bussetif.manager&hl=fr) |
| Schedules | **not seen** — the listing only claims live positions. | [Google Play listing](https://play.google.com/store/apps/details?id=org.bussetif.manager&hl=fr) |
| Public API / backend host | **not seen** — neither the listing nor its linked privacy policy names an API host or documents an API. | [Google Play listing](https://play.google.com/store/apps/details?id=org.bussetif.manager&hl=fr), [linked privacy policy](https://www.privacypolicies.com/live/2f1334ac-c708-4a5c-bfb5-9d44d8621fc8) |

## What the official screenshots establish

- **seen:** The three Play-hosted screenshots show a map-based fleet-tracking interface with bus/device markers, a device search field, layer controls, and map-provider choices. [Screenshot 1](https://play-lh.googleusercontent.com/ZwPEzBkWy6Efsf_b765eutYAYVJV63L2VTn_D6Q5z4Najmu2t_6UkgDNzvDA58bi4jPCm-_MXpdfbTAWgs6vwRk=w1052-h592), [screenshot 2](https://play-lh.googleusercontent.com/bVSPp7lpJ25lxfIQ7Is7asCDHiseM42H97EURIiAo-jIRD-fKzzOXkn2NdjPtaPnwJW1CNCLLKfG4b5tLHqFtw=w1052-h592), [screenshot 3](https://play-lh.googleusercontent.com/k3WCsFos4zWTlfYFNAodPRpQLHwKQFcSffuu8wAeYEsrujddimv8jkyhwZaVQaw5m_UQAPXBGFJ8tZBc9TW2KQ=w1052-h592)
- **seen:** One screenshot is visibly centered on Guelma, not Sétif; the others cover a wide area around Aïn Oussera/Djelfa. The screenshots therefore look generic or reused and are not proof of Sétif route identities, stops, or geometry.
- **inferred:** Labels such as `643-L2` may encode a vehicle and line, but a screenshot label is insufficient to establish a canonical route, its termini, stop order, or shape.

## Technical feasibility and access boundary

- **seen:** Google Play permits installing the official build through a compatible device and Google account; the listing does not provide a public APK or data export. [Google Play Terms, section 2](https://play.google.com/about/play-terms/)
- **seen:** The linked policy defines an `Account`, describes signing in, and says application data may be uploaded to company or service-provider servers. It does not document concrete endpoints, schemas, credentials, or token scope. [Linked privacy policy](https://www.privacypolicies.com/live/2f1334ac-c708-4a5c-bfb5-9d44d8621fc8)
- **inferred:** Runtime observation of an official Play installation could identify the backend hostname and response types if the app is usable without privileged credentials. It cannot be assumed that a discovered session token authorizes bulk extraction or republication.
- **not established:** Whether the Sétif service is anonymously readable, uses an app-bundled shared token, requires a user account, or exposes routes/stops/shapes in addition to vehicle positions.
- **not established:** Whether live markers expose stable public line identifiers. Sampling moving vehicles would not by itself produce authoritative route geometry or ordered stops.

## Privacy and licensing constraints

- **seen:** The Play data-safety declaration says no data is collected or shared, while the linked policy says usage data, account/contact details, device identifiers, and—with permission—location may be collected. This contradiction means the listing should not be treated as a complete technical specification. [Google Play listing](https://play.google.com/store/apps/details?id=org.bussetif.manager&hl=fr), [linked privacy policy](https://www.privacypolicies.com/live/2f1334ac-c708-4a5c-bfb5-9d44d8621fc8)
- **seen:** No open-data license, GTFS terms, API terms, or explicit republication grant is linked.
- **seen:** Google Play grants personal, non-commercial use unless expressly authorized and reserves ungranted rights; it also prohibits redistribution of Play content and circumvention of access controls. [Google Play Terms, sections 4.75–4.86](https://play.google.com/about/play-terms/)
- **inferred:** Even if the app returns live coordinates, republishing them or reconstructing persistent vehicle histories should wait for written operator/developer permission. Any third-party basemap license would be separate from rights in ETUS line and vehicle data.

## Safe next action

1. Ask ETUS Sétif and the listed developer for a static, reusable export—preferably GTFS, GeoJSON/KML, or a documented read-only API—covering line IDs, termini, ordered stops, and shapes, together with explicit republication terms.
2. If they authorize technical inspection, install the official Google Play build on a controlled Android device/emulator and observe only the app's normal unauthenticated or explicitly authorized traffic. Record endpoint schemas and token scope; never commit credentials or live vehicle history.
3. Until permission/data arrive, use independently licensed OpenStreetMap route relations for geometry and treat the Play app only as corroboration that a live ETUS Sétif tracker exists—not as a route dataset.

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
