---
"geoalgeria": minor
---

Wilaya telephone area codes: say why the 2026 cohort has none

`phone_code` is `null` for all eleven wilayas Law 26-06 created (59 to 69), and
the new `data/phone-code-provenance.json` now says why rather than leaving the
gap unexplained. It records the official texts searched on 2026-10-01 with each
one's title, URL and retrieval date, and what each one said: ARPCE allocates
numbering resources under the ten-digit plan national de numérotation of
22 February 2008, whose geographic digits identify a numbering zone rather than a
wilaya, and has published no allocation for these eleven; Law n° 26-06, decree
26-206 and decree 26-253 are silent on numbering; Algérie Télécom has announced
no new code. The mother wilaya's code is never copied in.

Read it as `require("geoalgeria").phoneCodeProvenance`. A code enters it only with
an official citation, and a test keeps it in step with `algeria.json`,
`csv/wilayas.csv`, `geojson/wilayas.geojson` and `sql/full.sql`, so an allocation
published later lands in all five at once. The `phone_code` field itself is
unchanged and already typed `string | null`.
