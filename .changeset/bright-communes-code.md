---
"geoalgeria": major
"@geoalgeria/agriculture": patch
"@geoalgeria/cliniques": patch
"@geoalgeria/culture": patch
"@geoalgeria/djezzy": patch
"@geoalgeria/ecoles": patch
"@geoalgeria/ferroviaire": patch
"@geoalgeria/gares-routieres": patch
"@geoalgeria/industrie-pharmaceutique": patch
"@geoalgeria/mosquees": patch
"@geoalgeria/ooredoo": patch
"@geoalgeria/pharmacies": patch
"@geoalgeria/poste": minor
"@geoalgeria/protection-civile": patch
"@geoalgeria/sante": patch
"@geoalgeria/schema": patch
---

Replace duplicated and missing `code_commune` values with the 1,541 unique codes from the official ONS 2021 Code Géographique National. Cascade the corrected foreign keys through every linked dataset, preserve Algérie Poste's differing provider-native values, enforce the SQL and repository-wide FK contracts, retain the 2021 mother-wilaya prefix for communes promoted in later reforms, and document the code contract.
