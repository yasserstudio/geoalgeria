# @geoalgeria/cliniques

## 1.1.0

### Minor Changes

- 586c0cc: Refresh the public OSM, ANEM, and mobile-operator sources through 2026-08-31,
  including updated records, opening hours, labels, and canonical Mobilis wilaya
  assignments.

## 1.0.1

### Patch Changes

- 64b10a1: Replace duplicated and missing `code_commune` values with the 1,541 unique codes from the official ONS 2021 Code Géographique National. Cascade the corrected foreign keys through every linked dataset, preserve Algérie Poste's differing provider-native values, enforce the SQL and repository-wide FK contracts, retain the 2021 mother-wilaya prefix for communes promoted in later reforms, and document the code contract.

## 1.0.0

### Major Changes

- 3053af4: New package `@geoalgeria/cliniques`, Algeria's clinics and proximity-care facilities from OpenStreetMap. 1,894 geocoded records across 66 wilayas, classified by type (polyclinique, salle de soins, centre de santé, maternité, clinique) with bilingual labels, a `sector` flag asserted only on signal, and speciality/address/phone/opening_hours/emergency where the map carries them. This is the OSM community tier of the health sector: the Ministry of Health registry tier (CHU/EPH/EHS/EPSP) is excluded and stays in `@geoalgeria/sante`, and every OSM element a `sante` hospital-tier record (CHU/EPH/EHS) references is excluded by construction, so no hospital is published twice under the same OSM element. Elements a `sante` EPSP record references are kept on purpose: there the reference is a geocoding anchor on the entity's seat, and the element is usually one of the facilities that EPSP runs, which is this package's population. The two describe different tiers and must never be summed. Wilaya by point-in-polygon, commune by nearest centroid inside it. JSON, CSV, GeoJSON, TypeScript.
