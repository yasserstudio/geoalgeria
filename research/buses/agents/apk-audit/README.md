# Official Algerian bus app APK audit - 2026-09-03

Five packages fetched and statically inspected with the
`android-reverse-engineering` skill. None executed. No embedded token, API key or
credential used. No login. No vehicle-position / device / session endpoint called.
Exactly one unauthenticated read-only GET was issued (Wahran `/catalog`, 401) and one
was attempted and abandoned on an expired TLS certificate (ETUSA `/reseau/arret`);
both are logged in the respective `AUDIT.md`.

| app | package | version | framework | bundled data? | lines extracted |
|---|---|---|---|---|---:|
| ETUS Bus | `dz.etu.bus` | 1.6.1 | Flutter | **yes** - 13 cities, GeoJSON + JSON | **215** |
| Wahran Transport | `com.wahrantransport.app` | 1.0.5 | Kotlin/Compose | **yes** - 4-file catalogue, no coords | **66** (42 lines) |
| Cirtabus | `org.buscirta.manager` | 1.30 | Native WebView | no | 0 |
| Cirta Pay | `constantine.cloudroutes.devcloud` | 2.2.0 | Expo/RN | no (payments app) | 0 |
| ETUSA MOB | `dz.etusa.etusa_mob` | 1.0.0 | Flutter | no (but official API) | 0 |

## Read this first

The two apps that ship data are **third-party publishers**, not operators
(`Ambs Inc / findapply.com` for ETUS Bus; a community project for Wahran). The ETUS
Bus payload is very likely **OSM-derived** - OSM route-relation naming, OSM refs, OSM
basemap attribution. Neither package carries a licence or redistribution statement
for the transit data. `evidence_type: official` in the emitted `lines.json` files
means "published in an official-channel app", **not** "authored by the operator".
Confirm provenance before publishing any of it.

The one genuinely operator-owned surface found is **ETUSA's**
`etusaapi.streamsystem.com/reseau/{arret,arretwithligne,drawofligne2}` - currently
unreachable because ETUSA's TLS certificate has expired.

## Could not obtain

| package | why | mirror to try by hand |
|---|---|---|
| `oran.routes.devcloud` | 404 on APKPure for both APK and XAPK | `https://play.google.com/store/apps/details?id=oran.routes.devcloud` |

## Not pursued this pass (candidates found via Play search)

`ouargla.routes.devcloud`, `biskra.routes.devcloud`, `saida.routes.devcloud`,
`ain_temouchent.route.devcloud`, `org.busAintmouchent.manager`, `dz.milabus.com`,
`com.oran.bus`, `com.yasser.transportoran`.
(`ain_defla.cloudroutes.devcloud` is already covered by
`research/buses/AIN-DEFLA-APP-AUDIT.md`.)

No ETUS Annaba, ETUS Sidi Bel Abbès or ETUS Tlemcen app was identified as a distinct
package. Annaba, Tlemcen and Sidi Bel Abbès do appear indirectly: `bus-annaba.malimspotter.dz`
is named inside `dz.etu.bus`, and Tlemcen has bundled line/stop data there.
