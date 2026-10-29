---
"@geoalgeria/poste": minor
---

Refresh poste from baridimap.poste.dz, retrieved 2026-10-25, and remove two military locations: 3,907 post offices and 2,024 ATMs.

**Migration.** Two ids are retired and reserved forever in
`packages/poste/data/retired-ids.json`. They forward nowhere: the records are
removed, not merged, so a consumer holding one of these keys finds it gone by
design.

| Retired id | File | Record |
| --- | --- | --- |
| `2532` | `postoffices.json` | HOPITAL CENTRAL ANP, inside the Ain Naadja central military hospital |
| `13519` | `atms.json` | ECOLE NAVAL, inside the naval school at Mostaganem |

The project publishes no military location. The exclusion lives in the build
(`packages/poste/scripts/fetch.mjs`, `MILITARY_IDS`), keyed on the operator's own
id, which is the published id too, so every later refresh drops them again. An
office whose ADDRESS merely names the ANP or the gendarmerie is unaffected, and
so is `404` ("AHCENE ASKRI"), whose name is a person's.

`distinct_postal_codes` reads 3,999 from 4,000 because `16105` was carried by
that one office and by nothing else.

**The refresh itself.** Previous pull 2026-06-08, and the source has been geo-blocked from outside Algeria since; this one ran over an Algerian connection. The office table came back byte-identical, so every change on the refresh side is on the ATM side: 2,025 ATMs from 2,026.

**One removal.** `13950` ("LA DG", Dar El Beida) is absent from the live `/atms` response rather than behind a failed link, so it is delisted rather than carried over. It predates the retired-id ledger this release introduces for the package and is not reserved in it.

**One move.** `1230` ("GUTTARA", Ghardaïa) moved 702 m, to (33.1618011, 4.6927056). Algérie Poste publishes its own pins, so the new point ships `exact` / `baridimap` exactly as the old one did.

**One wilaya pinned by review.** `10848` ("ZMALET EL EMIR AEK") publishes wilaya 64 and commune 1409. The rebuild would have returned it to 14 with no commune: the shared current-wilaya reconciliation needs an exact current or official ONS commune label, and the operator's "Z'MALET EL EMIR AEK" is not one. Containment still places the point inside 64, whose mother wilaya is the 14 the operator states, so the correction is recorded in `quality/overrides/poste.json` against baridimap and the two Journal officiel reform issues. As with the ledger's other reform corrections, that record now carries `review_status` rather than `source_wilaya_code`, so the derived reconciliation set reads 89 instead of 90.

**Offline replay.** `node scripts/fetch.mjs --cache` now re-emits the package from
the records it already ships, with no network, which is how the removal above was
applied: BaridiMap is geo-blocked from outside Algeria and this package has no
raw capture under `sources/`. A replay with nothing excluded reproduces what it
read byte for byte, and it reuses the committed dates rather than stamping a
`retrieved` no request was made on.
