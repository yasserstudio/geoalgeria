---
"@geoalgeria/jeunesse": minor
---

**Migration.** `commune` and `daira` are now `string | null`. 21 records published a placeholder commune `":"` (3 of them also a placeholder daira), which is the SIG leaving its commune referential unset, and they now publish `null`. Guard a display or a join: `r.commune ?? r.commune_code ?? ""`, and `r.daira ?? ""`. No other field and no id changes.

Refresh jeunesse from the Ministry of Youth and Sports SIG, layer `etablissements_de_jeunes` (sig.mjs.gov.dz), retrieved 2026-10-27 over an Algerian connection and committed as `sources/jeunesse/sig-etablissements.json`: 2,334 establishments, unchanged (previous pull 2026-06-23). The SIG returned 2,337 features; the 3 it added since June are unfinished entries with no type, which the fetcher drops as before.

**The register is unchanged, and so are the ids.** Every published id is carried on the establishment itself (type, point, names and address) rather than on its sort position, which the committed capture would otherwise have reshuffled for 213 records. No id is retired and none is minted.

**What changes.**
- The 21 placeholder communes and 3 placeholder dairas now publish `null` (see Migration), as the fetcher already did for every other unset field.
- `00728`, a maison de jeunes at Serguine (wilaya 64, Ksar Chellala), no longer carries a review receipt: the build now places it in wilaya 64 / commune 1439 itself, from the dataset's 2026-09-24 Serghine to Serguine rename (JORA n 25 of 2026, loi 26-06), so the reviewed correction it carried had nothing left to correct and was retired (Owner decision, 2026-10-28). Its place, wilaya and commune are unchanged; it now carries `source_wilaya_code: "14"`, like every other record the 2026 reform reconciled.
- The shared reconciler reads a commune's former JORA spelling, so the 6 records that would otherwise have fallen back to their pre-reform wilaya keep the 2026 wilaya they are published under.

`retrieved` and `updated` move to 2026-10-27, the date of the capture.
