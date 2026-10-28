# Sports refresh: what the 447 retired ids really are, and a transition carry rule

Measured 2026-10-28 on `data/306-sig` (PR #308, head `044b32c`) against the committed
capture `sources/sports/sig-infrastructures.json` (pulled 2026-10-27, 5,234 features)
and the published `@geoalgeria/sports` 2.0.4 (5,141 facilities). Nothing here is
shipped: this is the evidence for the Owner's decision on whether the sports refresh
goes into the release cut on Saturday 31 October, 12:00.

> **Decided 2026-10-28.** The Owner shipped the refresh in batch 2026-15 with the strict
> rule plus both optional tiers (relabel and rename), the 01663 / 01666 decisions retired
> and the reconciler taught the former JORA spellings. The matcher is now code in
> `packages/sports/scripts/fetch.mjs` (`matchTransition`, `findRepeatPosts`), and its
> decisions are in [`id-transition.json`](id-transition.json). The shipped counts differ
> slightly from the simulation below because the year fix (section 4.4) landed first and
> raised attribute agreement: 4,954 ids carried (119 strict, 20 relabel, 121 rename on
> top of the 4,694 the place key keeps), 280 minted, 187 retired, 5 of them forwarded.
> 01115 is corrected by a reviewed ledger decision rather than listed as an exception.

## Summary

| | Today's place key | Proposed strict rule | + relabel tier | + rename tier | + both tiers |
| --- | ---: | ---: | ---: | ---: | ---: |
| published ids carried | 4,694 | 4,813 | 4,833 | 4,930 | 4,950 |
| ids minted | 540 | 421 | 401 | 304 | 284 |
| ids retired | 447 | 328 | 308 | 211 | 191 |
| of which forwarded (Repeat posts) | 0 | 5 | 5 | 5 | 5 |
| contested pairings decided | n/a | 0 | 0 | 0 | 0 |

The 447 split as: 36 address edits, 7 spelling-only edits, 74 coordinate edits (67 of
them the published point rounded to 4 decimals), 2 both, 5 Repeat posts of a live
record, 77 genuinely gone, 246 other (mostly renamed or reclassified at the very same
point). All 421 rows the strict rule still mints were edited by the ministry after the
June pull (`last_modified_date` from 2026-07 on), so the churn is the ministry's
September and October editing campaign, not GeoAlgeria.

Four things block a ship besides the carry rule, all found by letting the build run to
the end in a scratch copy:

1. Ledger rows `01663` and `01666` are stale by absorption (not only `01663`).
2. 14 carried records fall back from their 2026 wilaya to the mother wilaya, because the
   2026-09-24 JORA commune renames left the SIG's old spellings unmatched.
3. A new facility type `PCA` (Parcours d'athlétisme) escapes the `TypeCode` union.
4. A year-parsing regression blanks 168 published construction years.

## 1. Reproduction

```sh
cd packages/sports && node scripts/fetch.mjs --cache
# Using stored MJS capture: 5234 raw features
#   id carry-over: 4694/5234 facilities kept their published id, 540 new, 447 retired
# Error: review overrides [facilities.json/01663]: stale decision; ... expect={"wilaya_code":"14",
#   "commune_code":null,"lat":35.2515,"lng":2.4818}; actual={"wilaya_code":"64","commune_code":"1439",...}
```

447 / 540 reproduced exactly. To see past the abort, the whole worktree (minus `.git`)
was copied to the session scratchpad and two env-guarded patches were applied there
only, never to the branch:

- `packages/schema/src/review.js`, `applyReviewedOverrides`: when
  `SCRATCH_BYPASS_STALE` is set, a stale decision (expect no longer matching) or an
  unknown record id is logged and skipped instead of thrown.
- `packages/sports/scripts/fetch.mjs`, `main`: keeps the SIG UUID of each row before
  the rows are renumbered, and when `SCRATCH_DUMP` is set writes the v2 rows (after
  `assignStableIds`), their UUIDs, the committed records and the retired set to JSON.
  A later `SCRATCH_TRANSITION` hook replays a pairing file onto the rows to simulate a
  carry rule end to end.

With the bypass the build logs exactly two stale decisions (`01663`, `01666`), no
unknown id (all 15 ledger ids are carried by the place key), and writes 5,234
facilities across 69 wilayas. The analysis scripts compare the dumped rows with the
committed records; distances are haversine metres, names and communes are compared on
their Loose key (`looseKey` from `@geoalgeria/normalize`, whole string, no ignored
words), and seven non-key attributes (capacity, year, both surfaces, operational, PMR,
daira) are counted as corroboration only.

## 2. The 447 to-be-retired ids, classified

Strict evidence for (a) to (c): same `type`, same Loose key of name, same Loose key of
commune, a one-to-one pairing (no other candidate on either side), and either the same
point, the published point rounded to 4 decimals, or (for a real move up to 300 m) the
same address Loose key where that (commune, type, name, address) tuple is unique among
all published records and among all live rows.

| class | n | what it is |
| --- | ---: | --- |
| (a) address edited | 36 | 17 `Inclus dans le` prefix added, 16 reworded, 2 removed, 1 added; same point |
| (a0) spelling only | 7 | every key field equal under the Loose key: `EL AFFROUN` became `EL-AFFROUN` (6), one name lower-cased |
| (b) coordinates edited | 74 | 67 the published 6-decimal point rounded to 4 decimals; 7 real moves of 11 to 210 m with a distinctive address kept |
| (c) both | 2 | 4-decimal rounding plus an address edit |
| (d) Repeat post of a live record | 5 | the source entered one place twice and now holds it once |
| (e) gone | 77 | no row within 300 m in the same commune sharing the name Loose key, and no row at the same point |
| (f) other | 246 | a successor exists but changed a field the strict rule does not forgive |

(d) uses the glossary's Repeat post (an official source entering one place twice in
the same language), not Double mapping, which is reserved for crowdsourced sources.

**Distance distribution, (b) and (c), n = 76.** Median 3.9 m, p25 3.0, p75 5.3, p90 6.3,
max 210.2. Bins: 0-2 m 8, 2-4 m 31, 4-6 m 27, 6-8 m 3, 10-25 m 2, 25-50 m 1, 50-100 m 2,
100-300 m 2. 69 of the 76 are exactly the published point rounded to 4 decimals (the
largest error such rounding can make is about 7 m): the SIG's editor re-saves an edited
record at 4 decimals, so those "moves" are an artefact of the edit, not a correction.

**(f) breakdown.** 117 renamed at the same point, same commune and type (honorific
added, `Terrain sportif de proximité` became `Terrain combiné` across Djelfa, 3 of 4 to 7
of 7 attributes agree); 20 commune relabelled at the same point, same name and type
(spellings such as `OUED ATHMANIA` to `OUED ATHMENIA`, corrections such as `BENI SAF` to
`SIDI SAFI`, and one source error, see 4.3); 76 at the same point with a type change
and/or a name change below the attribute threshold (28 name only, 7 type only, 34 type
and name, 7 with the commune too); 27 same name and commune beyond 300 m (331 m to
13.6 km, 21 of them generic proximity fields in Ain Temouchent re-placed 2026-10-18 to
22); 3 renamed and moved within 50 m; 2 refused as indistinct (below); 1 type change
within 155 m (`00882`, EJT to CRP).

**By wilaya.** (e) concentrates in Khenchela (32 of 77) and Batna (10); Khenchela is
also where most new rows appear (70 of 421), so its records look re-entered rather than
edited. (f) concentrates in Djelfa (37), Aïn Témouchent (27) and Aïn Ouessara (26).

### Ten examples per class

Format: published `id type "name" | commune | "address" | lat,lng`, then the live row
(its scratch id from the bypassed build, which is not a published id).

**(a)**
- 00098 BN "Bassin de Natation" SENDJAS "Stade communal Centre Vile/ RN19" to "Inclus dans le Stade communal Centre Vile/ RN19", same point, 7/7
- 00100 BN OULED FARES "Stade Communal / Centre ville" to "Inclus dans le Stade Communal / Centre ville", 6/7
- 00101 BN OULED ABBES "CSP \"BAHI AEK\" ..." to "Inclus dans le CSP \"BAHI AEK\" ...", 7/7
- 00102 BN AIN MERANE "Stade communal Centre Vile" to "Inclus dans le Stade communal Centre Vile", 7/7
- 00103 BN CHLEF "CSP \"FERDJI AEK\" à Hay Es-salem / RN19" with the prefix, 7/7
- 00099 BN OUED SLY "Stade communal VSA/ Centre ville" to "Hay Zeboudj / Centre ville", 7/7
- 00105 BN CHETTIA "S OMS \"TITTALI Mohamed\" Zone 04" to "Zone 04 à coté de la salle OMS ...", 7/7
- 02856 SS MOSTAGANEM "Rue Bensikadour N°:28 (ex:pépiniére)" to "(ex: pépiniére)", 7/7
- 03287 SOMS AIN TURK "INFS,Commune D'Ain Türck" to null, 6/7
- 04138 STOMS SOUK-AHRAS null to "Cité 20 Aout 1955", 5/7

**(a0)**: 01081 BL, 01129, 01142, 01158, 01162 and 01163 TSP: `EL AFFROUN` to `EL-AFFROUN`,
same point, 5 or 6 of 7; 01834 AJF AIN MAABED "Aire de jeux de football" to "aire de
jeux de football", 7/7. (Only seven exist.)

**(b)**
- 00086 AJF HARCHOUN 36.12452,1.506971 to 36.1245,1.507 (3.4 m, rounding), 7/7
- 00087 AJF SOBHA 36.110085,1.090769 to 36.1101,1.0908 (3.2 m), 7/7
- 01141 TSP DJEBABRA 36.591104,3.278301 to 36.5911,3.2783 (0.5 m), 4/7
- 03307 TSP SIDI CHAMI -0.575185 to -0.5752 (1.4 m), 6/7
- 03988 SOMS "18Février" KHENCHELA (1.4 m), 6/7
- 04386 TSP ZEGHAIA "Rue boutrif" (1.8 m), 5/7
- 04676 TSP HASSASNA "hay 20 logts social" 35.2779 to 35.278 (11.1 m, real move), 5/7
- 01836 AJF SED RAHAL "commune sed rahal" 3.2378 to 3.238 (18.4 m), 6/7
- 04648 TSP HAMMAM BOUHADJAR "ECOLE DES AVEUGLE" (85.1 m), 4/7
- 04696 TSP HAMMAM BOU HADJAR "HAY 8 LOGT VILLAGE HJAIRIA" (210.2 m), 5/7

**(c)**: 00120 PA CHLEF (0.5 m, `inclus dans le` wording); 01847 PA DJELFA "OPOW djelfa
cité 05 juillet" to "cité 05 juillet(OPOW djelfa )" (3.7 m). (Only two.)

**(d)**: 04035, 04036, 04065 TSP KHENCHELA "la cité adel", three place-identical
published records 3.5 m from live 04052, which the source now holds once; 04663 TSP
HASSASNA, same published point and name as 04676 (whose address the source kept);
04915 PP AOUGROUT "Tibrghmine aougrout", 25.7 m from live 04916, same address, 7/7.
(Only five.)

**(e)**
- 00452 AJF "aire de jeux bouzina" BOUZINA: no live row in the commune at all
- 00463 AJF "Aire de jeux de foot Ichmoul" ICHEMOUL: none
- 00476 AJF "aire de jeux Ouled sellam" OULED SELLEM: none
- 00477 AJF "aire de jeux Seggana" SEGGANA: none
- 00534 TSP "Terrain de proximité Boumia" BOUMIA: none
- 00536 TSP "Terrain de proximité Djerma" DJERMA: none
- 00579 TSP "terrain de sport de Bouzina" BOUZINA: none
- 00405 TSP "T. C / Aire Jeux" AIN KERCHA: nearest live row 1.2 km, 2/7
- 00472 AJF "aire de jeux de football Thniet el abed": nearest is a TSP 244 m away, other name
- 01835 AJF MESSAAD: nearest 16.5 km

**(f)**
- 00109 BNA EL MARSA "Base Nautique" to "Base Nautique \"HADDAD Mohamed\"", same point, 7/7 (renamed)
- 01899 TSP DJELFA "Terrain sportif de proximité" to "terrain combiné", same point, 7/7 (renamed)
- 00164 TSP ABOU EL HASSEN to ABOU EL HASSANE, same point, 6/7 (relabelled)
- 04603 AJF BENI SAF to SIDI SAFI (the address already said Sidi Safi), 5/7 (relabelled)
- 00111 CRP CHLEF to UHR, renamed, same point, 7/7 (type and name)
- 00898 TF BISKRA "Terrain combine" to TSP, same point, 6/7 (type)
- 01852 SOMS DJELFA "salle OMS 500Pl" to "salle OMS el chahid azzouz el messaoud", same point, 3/7 (name, below threshold)
- 00882 EJT BISKRA to CRP, same name, 155 m (type, moved)
- 01849 SOMS HASSI BAHBAH "salle OMS" to "Salle OMS El Moudjahid charmat abderahman", 36 m, 5/7 (renamed and moved)
- 00616 TSP TENIET EL ABED "terrain de sport de Thniet el abed", same name, 330 m (beyond radius)

Full id lists per class are in the appendix.

## 3. Proposed transition carry rule

### Statement

A one-shot tier inside `assignStableIds` (`packages/sports/scripts/fetch.mjs`), run after
the place key and before minting, over the published records the place key left
unclaimed (read through `asGenerated`, so the ledger is undone exactly as today) and the
live rows it left unclaimed:

1. A pairing (P, L) is a candidate only if all hold:
   - `P.type === L.type`;
   - Loose key of `name` equal (both null counts as equal);
   - Loose key of `commune` equal;
   - spatial evidence, in rank order: **S0** identical point; **S1** L's point is P's
     point rounded to 4 decimals; **S2** distance up to 300 m AND equal address Loose
     key after stripping a leading `Inclus dans le/la/l'`, AND that (commune, type, name,
     address) tuple occurs exactly once among all published records and exactly once
     among all live rows.
2. Candidates are ranked S0, S1, S2, then same raw address, then distance, then
   attribute agreement, then published id and UUID for determinism. They are accepted
   nearest-first, one per side. A candidate with a rival of exactly equal rank on either
   side is refused, and both records fall through to retire and mint.
3. Every accepted pairing is logged (published id, UUID, tier, distance).
4. The 5 Repeat posts (d) retire with a `migrations` forward (`merged_into` the live
   record, a `note`, and the UUID the pair now stands for): 04035, 04036, 04065 to
   04052; 04663 to 04676; 04915 to 04916.

Optional tiers, each an Owner decision, both S0/S1 only and both still requiring the
same type and one-to-one uniqueness:
- **relabel**: commune Loose key may differ, name must match, at least 4 of 7
  attributes agree (20 records, including the 01115 source error in 4.3);
- **rename**: name may differ, commune must match, at least 5 of 7 attributes agree
  (117 records).

### Outcome (simulated end to end in the scratch build)

Strict rule: 119 published ids come back (43 S0, 69 S1, 7 S2), giving **4,813 carried,
421 minted, 328 retired** (5 forwarded, 323 plain), and the scratch build writes the
package. With the tiers: relabel 308 retired / 401 minted, rename 211 / 304, both 191 /
284.

### Every ambiguous case it decides

No accepted pairing had an equal-rank rival in any variant. The cases with more than
one candidate, and what the rule does with them:

- 04676 / 04663 (HASSASNA): one live row (`hay 20 logts social`, 11.1 m) and two
  published records at one point. 04676 shares the address and keeps its id (S2); 04663
  retires and forwards to 04676 as a Repeat post.
- 02134 / 02159 / 02163 (SAIDA, name `I.N.D`): 02134 takes the row at its exact point
  (S0), 02159 the row at its rounded point (S1, 3.8 m); 02163 (`CITE BADER`, built 2023)
  has no candidate left and retires.
- 00113 to 00116 (four pools, CHLEF) and 01129 / 01142 / 01162 (EL AFFROUN): several
  same-name records, each with one live row at its own exact point; resolved by S0.
- Refused, retired and minted instead: 04646 and 04649 (AIN TEMOUCHENT, five identical
  `terrain sportif de proximité` with address `commune aln temouchent`, 72 to 279 m
  apart: the address is not distinctive) and 00570 (BATNA, 33 m, the tuple is not
  unique, and a tennis court now sits at its published point).

### Adopting the SIG UUID from this release on

The UUID is unique across all 5,234 rows and was unchanged between two pulls 90 s
apart. It is an Upstream link in the glossary's sense (CONTEXT.md names only the
administrative ones today, so the entry needs one line for `refs.mjs`).

- `packages/sports/scripts/fetch.mjs`: keep `uuid: p.id` on each facility instead of
  overwriting it with the sequence number. `scripts/lib/v2-transforms.mjs`,
  `MIGRATIONS.sports.map`: add `refs: refs({ mjs: r.uuid })`.
- From the next refresh, the carry key is `refs.mjs` wherever the committed record has
  one (every record, after this release); the place key and the transition tier remain
  only as the fallback for a committed record without it. A UUID repeated on the live
  side fails the build. `sportsCarryKey`'s twin numbering is then moot for keyed records.
- `packages/sports/types/index.d.ts`: `refs: { mjs: string }` on `Facility`, and `"PCA"`
  in `TypeCode`. `packages/schema/types/index.d.ts` needs no change (`Refs` already has an
  index signature); documenting `mjs?: string` there would be a separate schema minor.
- CSV gains a `refs` column after `source` (a JSON string), which shifts every later
  column for positional readers; GeoJSON properties gain `refs`. Both belong in the
  changeset.
- READMEs: package `README.md`, `README.fr.md`, `README.ar.md` (field table row for
  `refs.mjs`, counts 5,141 to 5,234, type table plus `PCA`); root README en/fr/ar (5,141
  to 5,234, 27 to 28 types); `package.json` description; `index.json` via
  `scripts/build-catalog.mjs`; `refresh-schedule.json` (`last_retrieved` 2026-10-27,
  note); `coverageNote` (the "267 records are reconciled" count must be recounted).
- Changeset: `@geoalgeria/sports` **minor** (RELEASING.md: retiring a published id is a
  minor with a migration note; a new field and a new type code are new data/format). It
  must open with a **Migration** paragraph listing the retired ids and pointing at the
  new `packages/sports/data/retired-ids.json` (sports has none today) and its
  `migrations` map.
- A one-refresh grace (`pending`, as livraison has since the Owner's 2026-10-25
  decision) would not help here: the next refresh keys on UUIDs the pending records
  never carried, so nothing could reclaim them. Retire now.

## 4. Review-ledger rows and other gates that go stale

### 4.1 `01663` and `01666`: stale by absorption

```json
{"file":"facilities.json","record_id":"01663","status":"corrected","publish_action":"patch",
 "expect":{"wilaya_code":"14","commune_code":null,"lat":35.2515,"lng":2.4818},
 "patch":{"wilaya_code":"64","commune_code":"1439"},
 "evidence":["https://sig.mjs.gov.dz","https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf",
             "https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf"]}
```

`01666` is identical with `lat 35.2967, lng 2.4996`. Both are TSPs in SERGUINE (daira
Ksar Chellala).

What the new data says: the source has not changed (wilaya TIARET, commune SERGUINE,
same points). The generator now derives `wilaya_code 64`, `commune_code 1439` and
`source_wilaya_code 14` itself, through `reconcileCurrentWilayaByCommune`: commune 1439
was renamed Serghine to Serguine in the dataset on 2026-09-24 (JORA n° 25 of 2026, law
26-06 art. 52 bis 15, item 5), so the SIG's label now matches by name; the point lies in
wilaya 64; and 64's mother is 14. The 2026-10-01 decisions were written against the
June-built record, which predates that rename. Reform context: law 26-06 (JO n° 25,
5 April 2026) created wilayas 59 to 69, Ksar Chellala (64) from Tiaret (14), and
presidential decree 26-206 (JO n° 40) fixed their communes. 64 is right; only the
mechanism moved. `jeunesse` `institutions.json/00728` is the same commune and the same
mechanism.

Options:
- **A, retire both decisions (recommended).** The records lose `review_status`,
  `reviewed_at`, `reviewed_by`, `review_evidence` and gain `source_wilaya_code: "14"`,
  like the other reconciled records. `test/reform-stale-209.test.mjs` changes
  `CORRECTED.sports` 15 to 13 and `TOTAL` 56 to 54 (the #209 gate, under the Owner's eye).
- **B, re-base as `keep` / `verified`** with `expect` at the new generated values. The
  audit trail stays in the ledger, but no receipt is stamped on the record and the #209
  counts drop the same way.
- **C, teach `applyReviewedOverrides` an "absorbed" outcome** (actual already equals the
  patch: pass and stamp the receipt). Keeps the receipts and unblocks jeunesse too, but
  it changes the shared review gate for every ledger; not for this Saturday.

### 4.2 Fourteen records lose their 2026 wilaya (no ledger row, but the gate fails)

The same renames cut the other way: the SIG still writes the former spellings, and the
reconciler reads only current names and ONS 2021 labels, not `name-history.json`. With
the published ids carried, these revert to the mother wilaya and
`test/record-in-declared-wilaya.test.mjs` fails on all 14:

| ids | SIG commune | published | rebuilt | rename (JORA n° 25, law 26-06) |
| --- | --- | --- | --- | --- |
| 00629 to 00633 | AZIL ABEDELKADER | 60 / 0515 | 05 / null | Abdelkader Azil, art. 52 bis 11 |
| 01454, 01456, 01492, 01494, 01514, 01519 | BOUIHI | 63 / 1343 | 13 / null | El Bouihi, art. 52 bis 14 |
| 01605, 01622 | ZMALET EL EMIR ABDELKADE | 64 / 1409 | 14 / null | Zmalet El Emir Abdelkader, art. 52 bis 15 |
| 02827 | OULED EMAARAF | 67 / 2603 | 26 / null | Ouled Maaref, art. 52 bis 18 |

Options: **fix the reconciler** (fall back to `canonicalCommuneForCurrentLabel` in the
current wilaya, which already indexes the former JORA spellings; tried in the scratch
copy, all 14 return to exactly their published wilaya and commune, and no other sports
record moves; the helper is shared with jeunesse and the telecom 5G maps, so their next
rebuilds inherit it), or **add 14 #209 decisions** (sports 13 to 27 under option A).

### 4.3 The containment exceptions

After 4.2 is fixed, `record-in-declared-wilaya` still differs on four rows, so
`research/_wilaya-containment/record-exceptions.json` needs regenerating and two
decisions:
- `01115` (TSP, stade communal, Oued El Alleug, Blida): the source now labels the same
  point commune OULED DJELLAL, wilaya 51. A source error. Either a ledger patch back to
  wilaya 09 and the Oued El Alleug commune, or a listed exception. Under the strict rule
  it retires and the error ships under a new id.
- `01902` (Ain Oussera, an existing exception) was renamed `Terrain combiné` at the same
  point: under the strict rule its exception moves to a new id; under the rename tier it
  stays.
- `01835` (Messaad, an existing exception) is gone (e): its exception drops.

### 4.4 Two non-ledger defects the refresh would ship

- `PCA` (1 record) is not in `TypeCode`: `pnpm validate` fails at
  "types/index.d.ts and shipped data".
- `stripUUID` treats `2013:undefined` as a UUID prefix (digits are hex), so 506 capture
  rows lose their year and **168 published years become null**. One-line fix: strip only
  a real `8-4-4-4-12` UUID prefix.

## 5. Effort to ship by Saturday 12:00

Assuming the Owner decides 4.1, 4.2, 4.3 and the optional tiers by Thursday evening:

| item | hours |
| --- | ---: |
| `stripUUID` fix and test | 0.5 |
| reconciler former-name fallback and tests (or 14 ledger rows) | 2 |
| transition tier, Repeat-post forwards, `sports-carry-key` tests | 4 |
| `refs.mjs` in fetcher, map, types, CSV note | 1.5 |
| ledger edits, #209 gate counts, exceptions regeneration | 1.5 |
| READMEs en/fr/ar (package and root), catalog, schedule row, coverage note, changeset with the Migration list | 2 |
| `pnpm validate`, full suite, `review:accuracy`, review | 2 |
| **total** | **about 13.5** |

PR #308 is held for batch 2026-15 behind #305; landing this means rebasing it and
adding the work above to that batch.

## Appendix: retired ids by class

Under the strict rule, ids in (a), (a0), (b) and (c) are kept, except the three refused
ones (04646, 04649 and 00570 are in (f)); everything else retires (328).

- (a) 36: 00098 00099 00100 00101 00102 00103 00104 00105 00106 00107 00108 00113 00114 00115 00116 00121 00123 00136 00140 00141 00147 00162 00182 00253 01139 01840 02103 02104 02105 02106 02134 02854 02856 02902 03287 04138
- (a0) 7: 01081 01129 01142 01158 01162 01163 01834
- (b) 74: 00086 00087 00088 00148 00241 00249 01072 01073 01075 01078 01108 01113 01118 01123 01141 01146 01149 01157 01836 01930 01931 01940 02159 02185 02256 03307 03393 03411 03965 03988 04001 04082 04086 04091 04093 04104 04106 04289 04315 04317 04321 04323 04324 04330 04332 04343 04345 04374 04380 04381 04384 04386 04392 04393 04394 04395 04400 04602 04648 04651 04676 04696 04826 04836 04848 04858 04862 04869 04870 04872 04898 04900 04972 04973
- (c) 2: 00120 01847
- (d) 5: 04035 04036 04065 04663 04915
- (e) 77: 00405 00420 00452 00463 00472 00476 00477 00534 00536 00579 00586 00587 00611 01107 01287 01835 01841 01844 01846 01848 01855 01862 01865 01870 01889 01904 02118 02941 03728 03790 03977 03978 03979 03980 03981 03990 03997 03999 04000 04008 04017 04018 04030 04034 04041 04049 04053 04059 04068 04069 04072 04075 04076 04077 04080 04084 04089 04097 04101 04102 04105 04110 04122 04137 04598 04601 04615 04629 04636 04640 04688 04691 04812 04827 05015 05017 05022
- (f) relabel tier 20: 00164 00187 01115 01122 01127 01128 01156 03745 04098 04285 04296 04307 04318 04322 04334 04354 04365 04406 04420 04603
- (f) rename tier 117: 00109 00110 00118 00124 00125 00143 00145 00733 01095 01102 01270 01706 01707 01832 01838 01842 01843 01851 01853 01856 01857 01858 01860 01866 01869 01871 01872 01873 01874 01877 01878 01879 01880 01881 01885 01886 01890 01891 01896 01898 01899 01900 01902 01903 01907 01910 01911 01912 01913 01915 01917 01918 01919 01920 01922 01929 01933 01936 01938 01939 02111 02115 02120 02123 02125 02126 02127 02627 02628 02638 02643 02644 02833 02835 02858 02863 02864 02865 02866 02867 02868 02869 02870 02872 02873 02874 02875 02877 02879 02880 02889 03150 03152 03208 04004 04067 04123 04124 04129 04131 04610 04808 04809 04814 04815 04816 04817 04818 04819 04820 04822 04824 04828 04969 05024 05025 05026
- (f) same point, type and/or name changed below the tiers 76: 00111 00127 00144 00570 00898 01845 01852 01854 01859 01861 01863 01864 01867 01868 01875 01876 01882 01883 01884 01887 01888 01892 01893 01894 01895 01897 01901 01905 01906 01908 01914 01916 01921 01923 01926 01932 01935 02101 02102 02623 02630 02631 02635 02637 02677 02871 03240 03250 03321 03351 03739 03753 03941 03989 03995 03996 04005 04015 04033 04039 04040 04042 04096 04125 04127 04128 04130 04132 04133 04134 04135 04682 04813 04821 04825 05023
- (f) same name and commune beyond 300 m 27: 00616 01097 01934 02163 03926 04589 04590 04593 04597 04600 04620 04626 04632 04633 04641 04644 04645 04652 04655 04661 04666 04669 04677 04687 04689 04694 04698
- (f) other 6: 00882 (type changed, 155 m); 01849 01850 01909 (renamed and moved within 50 m); 04646 04649 (refused, not distinctive)
