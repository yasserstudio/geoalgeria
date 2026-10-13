---
"@geoalgeria/agriculture": patch
"@geoalgeria/aviation": patch
"@geoalgeria/banques": patch
"@geoalgeria/buses": patch
"@geoalgeria/cliniques": patch
"@geoalgeria/culture": patch
"geoalgeria": patch
"@geoalgeria/djezzy": patch
"@geoalgeria/ecoles": patch
"@geoalgeria/emploi": patch
"@geoalgeria/enseignement-superieur": patch
"@geoalgeria/ferroviaire": patch
"@geoalgeria/formation-professionnelle": patch
"@geoalgeria/gares-routieres": patch
"@geoalgeria/industrie-pharmaceutique": patch
"@geoalgeria/jeunesse": patch
"@geoalgeria/livraison": patch
"@geoalgeria/mobilis": patch
"@geoalgeria/mosquees": patch
"@geoalgeria/normalize": patch
"@geoalgeria/ooredoo": patch
"@geoalgeria/pharma": patch
"@geoalgeria/pharmacies": patch
"@geoalgeria/poste": patch
"@geoalgeria/protection-civile": patch
"@geoalgeria/sante": patch
"@geoalgeria/schema": patch
"@geoalgeria/sports": patch
"@geoalgeria/telecom": patch
"@geoalgeria/tourisme": patch
"@geoalgeria/transport": patch
---

English copy now spells the noun "licence" the one way the rest of the docs
already do (en-GB). Every English README heading reads `Licence & attribution`,
`Source & licence` or `Licence`; the OpenStreetMap share-alike sentence asks for
"a compatible licence"; the `transport` umbrella points at each member's own
"data licence"; and `@geoalgeria/buses` states "no open reuse licence" in its 14
Operator source descriptors, the wording its NOTICE, its README and the `##
Data` section of its LICENSE already carried. That LICENSE's `## Code` preamble
was the one place still reading "This license applies to package code", and now
reads "licence" as well. The identifier keeps its own spelling: the manifest
`license` key, the `license` metadata field, SPDX expressions, the `LICENSE`
file name, licence URLs and the verb "licensed" are untouched, and the French and
Arabic READMEs are unaffected. No record changes.
