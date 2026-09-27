---
"@geoalgeria/transport": patch
"@geoalgeria/pharma": patch
---

Republish the transport and pharma umbrellas on a fresh version number after an aborted staged publish reserved the previous one.

transport 2.0.4 and pharma 2.0.2 were staged on npm on 2026-09-27 and the staged uploads were dropped before approval; npm never reuses a version it has seen, so those numbers can no longer be published. This release carries exactly the same content: transport depends on aviation ^2.6.0, buses ^2.2.0, gares-routieres ^2.2.5 and ferroviaire ^2.0.3; pharma depends on industrie-pharmaceutique ^2.0.3 and pharmacies ^2.2.2.
