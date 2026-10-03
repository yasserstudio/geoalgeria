---
"geoalgeria": minor
---

Wilaya telephone area codes: say why the 2026 cohort has none

`phone_code` is `null` for all eleven wilayas Law 26-06 created (59 to 69), and
the new `data/phone-code-provenance.json` now carries the answer rather than
leaving the gap bare. Per official text it records the title, the URL, the
document's own date, the retrieval date, the article read and what was found
there: ARPCE allocates numbering resources under the ten-digit plan national de
numérotation of 22 February 2008, whose geographic digits identify a numbering
zone rather than a wilaya, and has published no allocation for these eleven; Law
n° 26-06, decree 26-206 and decree 26-253 are silent on numbering; Algérie Télécom
has announced no new code. The code carried by the wilaya a new one was split from
is never copied in.

Read it as `require("geoalgeria").phoneCodeProvenance`, typed
`PhoneCodeProvenance`. A code enters the ledger only by citing a declared official
text and the article it was read at, on the gazette's, the regulator's or the
operator's own domain, and a value equal to the one its origin wilaya carries has
to declare that coincidence rather than pass silently. A test keeps the ledger in
step with `algeria.json`, `csv/wilayas.csv`, `geojson/wilayas.geojson` and
`sql/full.sql`, so an allocation published later lands in all five at once. The
`phone_code` values themselves are unchanged, and the field was already typed
`string | null`.
