---
"@geoalgeria/gares-routieres": minor
---

Six more stations come home.

Tindouf was not alone. SEBDOU, MAGHENIA, EL OUED, AIN SEFRA, NAAMA and
RELIZANE all shipped with a corrupted source longitude, and because wilaya and
commune are derived from the point, each was published from the wrong wilaya
under the name of whatever commune it landed in. SOGRAL's EL OUED was 542 km
away and labelled "Krakda"; RELIZANE was "Marsat El Hadjadj"; MAGHENIA was
"Faidja". In every case the record's own `refs.sogral`, `official_name` and
`address` already said where the station is, and only the coordinate disagreed.

Four are the Tindouf defect exactly: a longitude that lost its sign. Where OSM
has the gare mapped it sits at the source's own latitude with the longitude
negated, which is what confirms the diagnosis rather than merely fitting it:
MAGHENIA (way 1214562347), AIN SEFRA (way 307745928), NAAMA (way 304431817).
SEBDOU is the same flip, uncorroborated only because no gare is mapped at
Sebdou at all. The other two carry a longitude unrelated to the station:
EL OUED resolves to OSM way 433835302, whose Arabic name is this record's own
`official_name`, and RELIZANE to way 293130423 "Gare routière Ouest Relizane",
600 m from the Bendaoud its address names.

Every corrected station's derived wilaya now agrees with the wilaya encoded in
its `refs.sogral`, which was not used to make the fix.

Because the id encodes the wilaya, six records are re-identified:
`14-01` → `13-02` (SEBDOU), `14-03` → `13-03` (MAGHENIA), `32-02` → `39-01`
(EL OUED), `69-01` → `45-02` (AIN SEFRA), `69-02` → `45-03` (NAAMA), and
`31-01` → `48-01` (RELIZANE). All six old ids are retired and can never be
reassigned. No other station's id changes. Coverage stays at 74 stations and
52 wilayas: wilayas 39 and 48 gain their first station, 31 and 69 lose theirs.
