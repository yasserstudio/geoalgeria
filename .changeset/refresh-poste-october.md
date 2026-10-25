---
"@geoalgeria/poste": patch
---

Refresh poste from baridimap.poste.dz, retrieved 2026-10-25: 3,908 post offices unchanged, 2,025 ATMs from 2,026.

Previous pull 2026-06-08, and the source has been geo-blocked from outside Algeria since; this one ran over an Algerian connection. The office table came back byte-identical, so every change here is on the ATM side.

**One removal.** `13950` ("LA DG", Dar El Beida) is absent from the live `/atms` response rather than behind a failed link, so it is delisted rather than carried over.

**One move.** `1230` ("GUTTARA", Ghardaïa) moved 702 m, to (33.1618011, 4.6927056). Algérie Poste publishes its own pins, so the new point ships `exact` / `baridimap` exactly as the old one did.

**One wilaya pinned by review.** `10848` ("ZMALET EL EMIR AEK") publishes wilaya 64 and commune 1409. The rebuild would have returned it to 14 with no commune: the shared current-wilaya reconciliation needs an exact current or official ONS commune label, and the operator's "Z'MALET EL EMIR AEK" is not one. Containment still places the point inside 64, whose mother wilaya is the 14 the operator states, so the correction is recorded in `quality/overrides/poste.json` against baridimap and the two Journal officiel reform issues. As with the ledger's other reform corrections, that record now carries `review_status` rather than `source_wilaya_code`, so the derived reconciliation set reads 89 instead of 90.
