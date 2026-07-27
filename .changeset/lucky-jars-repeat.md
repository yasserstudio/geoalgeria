---
"@geoalgeria/aviation": minor
---

Every airport now carries an IATA code, and the three airports ANAC's map omits are in.

- **IATA codes on all 36 records.** `iata` was `null` on every record because ANAC publishes only ICAO. They are backfilled from [OurAirports](https://ourairports.com/data/) on an ICAO join. A matching code is not on its own evidence that two rows describe the same place, so every join is confirmed against ANAC's own coordinate and the build fails on anything more than 5 km away. The observed spread is 0.31 to 2.15 km, the far end being Ouargla (`DAUU`/`OGX`), whose OurAirports entry is named for the Ain Beida aerodrome rather than the city. `refs` now carries `iata` alongside `icao`.
- **Three new airports**, absent from ANAC's map and taken from OurAirports: Hassi R'Mel (`DAFH`/`HRM`), Mécheria (`DAAY`/`MZW`) and Laghouat (`DAUL`/`LOO`). 33 records to 36, 31 wilayas to 33.
- **`source` is now `"anac" | "ourairports"`**, and `metadata` gains a `by_source` breakdown. The mixed provenance is legible per record, not only in `metadata.sources[]`.
- **`address` and `website` are now `string | null`.** They were typed non-nullable, which the three OurAirports records escape: OurAirports publishes no contact fields. Every ANAC record still carries both.
