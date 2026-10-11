---
"@geoalgeria/schema": minor
---

The Source rights registry ships with the contract, so what may be published is decided by data rather than by memory.

A package's `license` field says how the package may be used. It never said what may be done with each Source behind it, and the sentences in `metadata.sources[].license` only look like they do: "Factual public listing (ANEM)" and "Data © SOGRAL; redistributed for reference" are Source notes, not grants. `rights/registry.json` holds that decision as data: one record per Source, keyed by the Source key the packages already use, with its access class, rights class, the targets it is cleared for, attribution and NOTICE text, the evidence the classification was read from with its retrieval date, a review date, and a slot for a recorded refusal. One record per Source and never per package, because packages mix Sources: `@geoalgeria/sante` is an official registry plus ODbL and CC0 geocoding.

48 records cover all 50 Source keys in published metadata, plus the ONS Code Géographique and the Official Journal decrees the flagship dataset names in prose, the Algérie Télécom capture no package publishes, the SOGRAL timetable captures and the CARTO and Esri tiles. OpenStreetMap, Wikidata, OurAirports and the French Wikipedia ETUSA page are open or public domain; 43 Sources carry `web`, `npm`, `cdn` and `mobile-pack` because Web and npm publish them today; the timetable captures and the third-party tiles carry nothing.

`isSourceClearedFor(sourceKey, target)` is the one question a publisher asks, and it fails closed, deliberately unlike `evidenceForSourceKey`: an unknown Source, an unknown rights class, an unknown target, `restricted-research`, `prohibited`, or a recorded refusal all answer `false`, whatever a record's `allowed_targets` says. `sourcesClearedFor(target)`, `rightsRecordFor(sourceKey)`, `rightsRegistry()` and the `ACCESS_CLASSES`, `RIGHTS_CLASSES`, `RIGHTS_BASES`, `PUBLICATION_TARGETS` and `NEVER_CLEARED_RIGHTS_CLASSES` vocabularies ship with it, typed.

No package's `license` field, `LICENSE` file or metadata licence text changes. The registry is the decision record a generator reads, not a new claim about terms.
