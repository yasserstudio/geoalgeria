---
"@geoalgeria/buses": minor
---

Give every Operator its verified official links: `website_url` and `facebook_url`
on BusOperator, null when not verified rather than guessed. Lines sourced from an
Operator's Facebook announcement (Setif, Ain Defla) now carry that page as
`source_url` instead of leaking the internal source key.
