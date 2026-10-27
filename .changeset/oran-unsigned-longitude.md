---
"@geoalgeria/formation-professionnelle": patch
---

Thirty-three Oran establishments are in Oran again: the takwin.dz capture ships their longitude with no minus sign.

`01392` (معهد بيئة الصحة والسلامة) was the one that was reported: `wilaya_code` 48 against commune السانية / Es Senia, which belongs to wilaya 31, an address reading `BIR EL DJIR ORAN` that agrees with neither, and a longitude whose sign would have to flip for any of it to be consistent. Those are one defect, and it is 33 records wide.

The portal names the publishing directorate on every row, and that is an attribution the coordinate had no part in: all 33 come from `IDDFEP` 31, Oran's. Their longitude arrives positive, so +0.63 falls in Relizane and +0.31 in Mostaganem, and the generator stamps `wilaya_code` from the coordinate, which made the wrong wilaya agree with the wrong point. No containment check could see it, which is why the package has never had a row in `research/_wilaya-containment/record-exceptions.json` and why its `outside_declared_wilaya` count is the same before and after.

The generator now restores the sign, and only when mirroring the axis carries the point into the wilaya that published the row, so a reading it cannot explain is left exactly as the portal shipped it. Over the 2026-10-25 capture that is 32 rows: each keeps `geo_precision: "exact"` and `geo_method: "takwin"` on the portal's own reading with its sign back, and `wilaya_code` follows the corrected point to 31 (29 of them from 48, 3 from 27).

`01392` is the thirty-third and the one exception. Its pair, 35.7167 / 0.6333, is whole arcminutes on both axes, so it is a rounded placeholder rather than a reading, and mirroring it lands in the bay of Oran, inside no wilaya at all. There is nothing there to sign-correct, so it takes the same path as every other establishment the portal left unplaced and sits on its own commune's centroid: `wilaya_code` 31, Es Senia's point, `geo_precision: "approximate"` on `geo_method: "commune"`.

Record, id and geocoded counts are unchanged (1,963 records, 1,961 geocoded), and so is the `geo_precision` split at 1,666 `exact` / 295 `approximate`. The method split moves by one, 1,680 `takwin` and 250 on a commune centroid, which the READMEs in all three locales and the generated coverage note now read.

`test/formation-longitude-sign.test.mjs` is the guard, with no allow-list: no establishment may keep a longitude whose mirror lands in the wilaya of the directorate that published it.
