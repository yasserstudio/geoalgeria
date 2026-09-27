---
"geoalgeria": patch
"@geoalgeria/agriculture": patch
"@geoalgeria/aviation": patch
"@geoalgeria/banques": patch
"@geoalgeria/cliniques": patch
"@geoalgeria/culture": patch
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
---

Replace em dashes in source names and citations with plain separators.

- Every source `name` reads `Operator: descriptor`, where it used to carry a
  U+2014 em dash, in `data/metadata.json` and in the `dataset-metadata.json`
  descriptor built from it.
- The schema.org/DCAT `citation` entries join a source name and its licence with
  a comma: `OpenStreetMap: schools & kindergartens in Algeria, ODbL 1.0 (© OpenStreetMap contributors)`.
- Coverage notes, package `description`s, the `types/index.d.ts` documentation and
  the `index.js` headers carry a colon, comma or semicolon in place of the dash.

No count, coordinate, licence or date changes. Consumers that match a source name
or a citation string literally need to update the separator; anything keyed on
`sources[].key` is unaffected. `pnpm validate` now fails on an em dash in
published metadata, so it cannot come back through a generator.
