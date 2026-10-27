---
"@geoalgeria/protection-civile": patch
---

Join a unit's commune by the commune outline that contains it, not by the nearest commune centre: 20 of the 880 units move to the commune they are actually in.

The DGPC publishes a commune name per unit, and 782 of the 880 fold to a commune in the derived wilaya. The other 98 were joined to the nearest commune centre inside that wilaya, and a centre is not a boundary: a centre that sits closer than the one whose outline holds the point wins, and it is wrong whenever two communes are unevenly shaped. Those 98 now go through the repository's shared resolver (`scripts/lib/commune-resolver.mjs`) for the commune whose OpenStreetMap outline contains the point, with the nearest centre left as the last clause. It no longer runs for any unit.

**20 units re-placed**, each into the commune whose outline contains it: `06-019` Smaoun to Fenaia Il Maten, `10-005` Djebahia to Aomar, `10-014` El Khabouzia to Bir Ghbalou, `10-026` Ath Mansour to Hanif, `14-002` Mechraa Sfa to Rahouia, `15-006` Ait Aggouacha to Larbaa Nath Irathen, `16-048` Ben Aknoun to Hydra, `19-010` Beni Chebana to Beni Ourtilane, `31-010` Ben Freha to Boufatis, `32-009` Sidi Slimane to Kef El Ahmar, `33-007` In Amenas to Bordj Omar Driss, `34-003` El Annasseur to Bordj Bou Arreridj, `39-006` Oued El Alenda to Mih Ouansa, `42-003` Bou Haroun to Ain Tagourait, `49-003` Ksar Kaddour to Tinerkouk, `53-001` Foggaret Ezzoua to Ain Salah, `53-003` Ain Salah to Inghar, `55-005` and `55-006` Nezla to Touggourt, `68-001` Menaâ to Medjedel. Ids, coordinates, names, wilaya codes and contact fields are untouched, and `wilaya_code` still comes from the boundary-plus-DGPC reconciliation: the containing outline only picks within the wilaya that reconciliation decided.

**One unit the old join would have moved and this one keeps.** `23-017` at (36.8269, 7.60981) is inside El Bouni's outline, and Sidi Amar's centre is nearer. The centroid join moved it to Sidi Amar, which does not contain it; the outline keeps it in El Bouni. `test/protection-civile-commune-outline.test.mjs` holds that case and its opposite by name.

**12 disagreements deliberately left.** Where the DGPC's own `commune_1` names one commune and the containing outline another, the DGPC wins, because deciding those needs the source rather than a re-join: `13-015`, `16-022`, `16-036`, `19-015`, `31-001`, `31-022`, `31-025`, `32-011`, `39-010`, `47-009`, `48-003`, `48-011`. They stay in `research/_wilaya-containment/record-exceptions.json` under yasserstudio/geoalgeria.com#209, whose residual drops from 302 to 282.

Rebuilt from the committed capture (`sources/protection-civile/dgpc-units.json`), so `retrieved` stays 2026-09-08: no new bytes were read. dgpc.dz drops TCP from outside Algeria, and the live pull is still owed.
