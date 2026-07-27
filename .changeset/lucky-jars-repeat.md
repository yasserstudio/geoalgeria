---
"@geoalgeria/aviation": minor
---

Every airport now carries an IATA code, and the three airports ANAC's map omits are in.

**Migration: `address` and `website` are now nullable.** They were `string` and every one of the 33 records carried a value; they are now `string | null` and 3 of 36 carry `null`. The three OurAirports records have no contact fields upstream. If you do `airport.website.startsWith("https")` or `airport.address.trim()`, guard it: `airport.website?.startsWith("https")`. TypeScript consumers under `strictNullChecks` will see this at compile time; plain JavaScript will see it at runtime. `phone` was already nullable and is unchanged. This ships as a minor because the bump rules key on the data, and this is new data rather than a schema redesign, but it is the one thing in this release that can break existing code.

- **IATA codes on all 36 records.** `iata` was `null` on every record because ANAC publishes only ICAO. They are backfilled from [OurAirports](https://ourairports.com/data/) on an ICAO join. A matching code is not on its own evidence that two rows describe the same place, so every join is confirmed against ANAC's own coordinate and the build fails on anything more than 5 km away. The observed spread is 0.31 to 2.15 km, the far end being Ouargla (`DAUU`/`OGX`), whose OurAirports entry is named for the Ain Beida aerodrome rather than the city. `refs` now carries `iata` alongside `icao`, as an optional key: `refs` omits null values, so an airport without an IATA code ships `refs: { icao }`.
- **Three new airports**, absent from ANAC's map and taken from OurAirports: Hassi R'Mel (`DAFH`/`HRM`), Mécheria (`DAAY`/`MZW`) and Laghouat (`DAUL`/`LOO`). 33 records to 36, 31 wilayas to 33.
- **`source` is now `"anac" | "ourairports"`**, and `metadata` gains a `by_source` breakdown. The mixed provenance is legible per record, not only in `metadata.sources[]`.
- **The OurAirports source is `evidence_type: "crowdsourced"`**, not `official`. OurAirports is volunteer-edited, so it is neither a government register nor a first-party operator feed. If you filter on evidence tier, the three supplementary airports and all 36 IATA codes are crowdsourced-tier; the other 33 records' names, coordinates and contacts remain official-tier ANAC data.
