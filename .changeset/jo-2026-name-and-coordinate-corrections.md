---
"geoalgeria": patch
---

Correct 2 wilaya and 178 commune names against the Official Journal, repair six placeholder coordinates, and publish the former spellings so search still finds them.

Reported by [@djamel2288](https://github.com/djamel2288) in issue #221, then audited in full against both editions of the law rather than only the lines the report named.

**Names.** Wilaya 65 is `Aïn Ouessara`, not `Aïn Oussera`: presidential decree 26-206 (JORA n° 40 of 3 June 2026, art. 1, item 65, p. 5) reads "Wilaya de Aïn Ouessara avec chef-lieu la ville de Aïn Ouessara". Wilaya 28 is `M'Sila`, not `M'sila`. Law 26-06 (JORA n° 25 of 5 April 2026) re-states the commune list of ten existing wilayas and creates eleven more, so all 404 commune names it prints were compared with the dataset in French (F2026025.pdf) and in the authoritative Arabic edition (A2026025.pdf): 143 French and 63 Arabic readings differed and now follow the law, among them `Lemcene` to `Lemsane`, `El Haoudane` to `Deux Bassins`, `Tletat Ed Douair` to `Eddouair`, `Mezerana` to `Mezghenna` and `Azil Abedelkader` to `Abdelkader Azil`. Eight Arabic readings are deliberately not taken: the Arabic edition writes a final yaa as alef maqsura and omits hamzas inconsistently, so those forms are typesetting rather than spelling, and they are listed with their reason in `scripts/lib/jo-2026-corrections.mjs`.

**Former names stay searchable.** The new `data/name-history.json` carries all 208 replaced spellings with the text that replaced each one, `findCommune()` matches them, and the repo's own commune joins resolve them, so an address stored before a correction still lands on the right record. No commune code, daira id, e-commerce id or SQL row id moved.

**Coordinates.** Six communes shared one of two placeholder points: `Belarbi` (22) and `Makhda` (29) both sat at 35.15, 0.15; `El Hamdania` and `El Haoudane` (26), `Ouled Bouachra` and `Si Mahdjoub` (26), and `El Achir` and `El Euch` (34) each shared one neighbour's point. Every replacement is the centroid of the OpenStreetMap admin_level=8 relation whose `ref` tag is that commune's own ONS code (© OpenStreetMap contributors, ODbL 1.0). No other commune coordinate duplicates another.

**Daira.** `Deux Bassins` (2653) moves from daira `Ouzera` to `Tablat`: its point lies inside the OpenStreetMap boundary of Daïra Tablat (relation 4461829). Ouzera now lists 4 communes and Tablat 4.

**Atlas labels.** `algeria.geojson` and the three delivery-zone tables labelled wilayas 59 to 69 alphabetically against numeric codes, so ten wilayas carried another wilaya's name over the right point; a dozen older labels had also lost their accents. Every label is now rebuilt from the wilaya's own row.
