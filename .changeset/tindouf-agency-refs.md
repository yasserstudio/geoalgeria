---
"@geoalgeria/gares-routieres": minor
---

Tindouf comes home, and every station gains its MAHATATI agency id.

Station 33-01 TINDOUF shipped with a sign-flipped source longitude (+8.125
for a station at 8.13°W), which also derived the wrong wilaya and commune
(33/Illizi) from the wrong point. The coordinate is now OSM-verified (node
4593158192), the station sits in Tindouf (wilaya 37, commune 3701) as its own
refs and address always said, and coverage grows to 52 wilayas. Because the
id encodes the wilaya, the record is re-identified as 37-01; 33-01 is retired
in the new data/retired-ids.json and can never be reassigned. No other id
changes: the generator now pins committed ids through carryOverIds.

New: refs.mahatati_agency, the per-station MAHATATI departure-agency id
(73 of 74 stations; In Saleh is not a departure agency), staged from the
public MAHATATI departure-station list. refs.sogral is now documented as a
town-level id shared by twin stations (Annaba and Sidi Brahim, the three
Constantine gares): never treat it as a station key.
