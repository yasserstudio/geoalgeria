# Communes reconciliation: package (1,528) vs app (1,541)

Sources compared directly (both read in full, no sampling):
- `/Volumes/Work/geoalgeria/data/packages/dataset/data/communes_w1_w23.json` (760 rows)
- `/Volumes/Work/geoalgeria/data/packages/dataset/data/communes_w24_w48.json`
- `/Volumes/Work/geoalgeria/data/packages/dataset/data/communes_w49_w69.json`
  (concatenation = 1,528 rows, "pkg" below)
- `/Volumes/Work/geoalgeria/app/apps/web/public/geodata/algeria.json` (69 wilaya objects,
  flattened `communes[]` = 1,541 rows, "app" below)

Method: joined on `(wilaya_code, name_fr)` first (exact), then re-joined after
Unicode-normalizing/ASCII-folding `name_fr` (strips accents, punctuation, case) to catch
spelling variants. Cross-checked every candidate match by `code_commune` and by
`(latitude, longitude)` to confirm it's the same physical commune, not a name coincidence.

**Headline result: none of the 14 are genuinely missing data.** All 14 exist in the
package. 13 of them are tagged with a **stale pre-2026 wilaya_code** in the package
(the reform renumbered wilayas but the package's `wilaya_code` field for these specific
rows was never updated); the 14th is a pure accent/spelling variant already under the
correct new wilaya_code. This overturns the framing in the task brief — there is no
missing-record problem here, there is a wilaya_code-staleness problem confined to a
one-off set of communes whose parent wilaya changed under the reform.

## 1. Per-commune disposition (all 14, `seen` = verified directly in the JSON files)

| Target (app, new wc) | Found in pkg as | Coords match? | Verdict |
|---|---|---|---|
| (10, Ain Turk) | `code_commune 3109`, pkg `wilaya_code=31` (old Oran code), daira Aïn El Turk | yes, exact | present, stale wilaya_code (31→10) |
| (15, Souk-El-Tenine) | `code_commune 608`, pkg `wilaya_code=6` (old Béjaïa code) | yes, exact | present, stale wilaya_code (6→15) |
| (23, El Eulma) | `code_commune 1920`, pkg `wilaya_code=19` (old Sétif code) | yes, exact | present, stale wilaya_code (19→23) |
| (25, Ben Badis) | `code_commune 2245`, pkg `wilaya_code=22` (old Sidi Bel Abbès code) | yes, exact | present, stale wilaya_code (22→25) |
| (31, Ain Kerma) | `code_commune 3621`, pkg `wilaya_code=36` (old El Tarf code) | yes, exact | present, stale wilaya_code (36→31) |
| (46, Emir Abdelkader) | `code_commune 1806`, pkg `wilaya_code=18` (old Jijel code) | yes, exact | present, stale wilaya_code (18→46) |
| (51, Chaiba) | `code_commune 4216`, pkg `wilaya_code=42` (old Tipaza code) | yes, exact | present, stale wilaya_code (42→51) |
| (55, Sidi Slimane) | `code_commune 3221`, pkg `wilaya_code=32` (old El Bayadh code), daira "Boualem" (app says "Megarine") | yes, exact | present, stale wilaya_code (32→55); daira name also differs (see note below) |
| (64, Bougara) | `code_commune 922`, pkg `wilaya_code=9` (old Blida code) | yes, exact | present, stale wilaya_code (9→64) |
| (65, Ain Oussera) | `code_commune 1731`, pkg **already** `wilaya_code=65` (correct new code, lives in `communes_w49_w69.json`) | yes, exact | present, correct wilaya_code — only difference is spelling `Aïn Oussera` (pkg) vs `Ain Oussera` (app); not a real gap |
| (66, Deldoul) | `code_commune 117`, pkg `wilaya_code=49`, daira "Aougrout" (app says wilaya 66, daira "Messaad") | yes, exact (28.702778, 0.15 in both) | **contradiction, not resolved** — see flag below |
| (68, Menaa) | `code_commune 506`, pkg `wilaya_code=5` (old Batna code) | yes, exact | present, stale wilaya_code (5→68) |
| (68, Sidi Ameur) | `code_commune 3218`, pkg `wilaya_code=32` (old El Bayadh code) | yes, exact | present, stale wilaya_code (32→68) |
| (68, Sidi M'hamed) | `code_commune 1602`, pkg `wilaya_code=16` (old Algiers code) | yes, exact | present, stale wilaya_code (16→68) |

**Flag — Deldoul contradiction (unresolved, do not trust either label as-is):**
Both files give identical coordinates (28.702778, 0.15) for a commune named Deldoul, but
disagree on which wilaya/daira it belongs to: pkg says wilaya 49 / daira Aougrout
(consistent with Adrar-region geography — 28.7°N is Saharan, matching Aougrout), app says
wilaya 66 / daira Messaad (Djelfa region, ~34°N — geographically inconsistent with that
latitude). The coordinate is Saharan, which favors the pkg placement (Adrar-area, wilaya
49) being geographically correct and the app's wilaya-66/Messaad label being the error —
but this is `inferred` from latitude alone, not confirmed against an official source. I
could not find an authoritative decree/ONS list distinguishing two same-named communes
called Deldoul in the time available. **Needs manual verification before either file is
"fixed" based on the other** — do not just copy pkg's wilaya_code onto the app row (or
vice versa) without checking a primary source.

**Side note on Sidi Slimane (55):** pkg's daira for this row is "Boualem", app's is
"Megarine" — a second small discrepancy beyond the wilaya_code, not requested for
follow-up but worth flagging since it means the row's *daira* field, not just
wilaya_code, is stale in one of the two files.

## 2. "Genuinely missing" list

**Empty.** All 14 target communes exist in the package. No new records needed to be
compiled from Wikidata/JO/ONS, because there is nothing missing — only wilaya_code needs
correcting on 13 rows (mechanical: old code → new code per the reform's own wilaya
renumbering table), and one name needs an accent added (Ain Oussera → Aïn Oussera, or
vice versa, for consistency).

If a full re-verification is still wanted (e.g. to confirm postal_code/daira on the
listed rows against a primary source rather than trusting the existing pkg values),
that would require separate sourcing work — flagging as not done here since the records
already exist and match on coordinates.

## 3. The "package-only" 4 codes — re-checked, not actually package-only

The task noted 1505 Souama (w15), 2631 Sidi Demed (w67), 2649 M'fatha (w67), 2821 Ouled
Sidi Brahim (w68) as existing only in the package. A full `(wilaya_code, name_fr)` set
diff (accent-normalized) in both directions found:

- app → pkg: 13 missing (the list above, minus Ain Oussera which normalizes to a match)
- pkg → app: **0 missing**

So these 4 are not package-only — each name+wilaya_code combination exists in app too.
But their *other* fields diverge sharply from the pkg row of the same name+wilaya:

| Commune | pkg (code_commune / postal / lat,lon) | app (code_commune / postal / lat,lon) |
|---|---|---|
| Souama (w15) | 1505 / 15044 / 36.637553, 4.3438623 | 2840 / 15049 / **35.6546, 4.668889** |
| Sidi Demed (w67) | 2631 / 26069 / 35.8706421, 3.2531476 | 2012 / **66010** / **34.55, 0.259722** |
| M'fatha (w67) | 2649 / 26059 / 35.8831842, 2.9346884 | 914 / **26059** / **36.6204, 3.22248** |
| Ouled Sidi Brahim (w68) | 2821 / 64011 / 35.2992435, 4.1696166 | 2823 / 64011 / **36.2, 4.174722** |

These are not a naming mismatch, they are a **coordinate/code disagreement between the
two files for the same named commune** — in each case the coordinates differ by roughly
1 degree of latitude/longitude (tens of km), too large to be rounding. This looks like a
data-quality bug (wrong row matched during a merge/geocode step) in one or both files,
separate from the wilaya_code-staleness issue. I did not determine which file (if
either) has the correct coordinate for these 4 — flagging as `seen but unresolved`,
not verified against Wikidata/ONS in this pass.

## 4. code_commune duplicate diagnosis

**Scheme identified (seen, high confidence):** `code_commune` in both files is the
**pre-2026, 48-wilaya-era ONS commune code**: 2-digit *old* wilaya number + 2-digit
ordinal within that wilaya (e.g. `4118` = old wilaya 41 (old Souk Ahras), ordinal 18;
`101` = old wilaya 1 (Adrar), ordinal 1; `3109` = old wilaya 31 (Oran), ordinal 09).
This is confirmed by cross-checking dozens of rows above: every one of the 13
"stale wilaya_code" rows carries a code_commune whose leading 1-2 digits equal the
row's own (stale) old wilaya_code, not the commune's current/new wilaya_code. **It has
not been renumbered for the 2026 reform** — this is expected/documented behavior per
the reform notes (communes weren't renumbered, only wilayas were promoted), but it means
`code_commune` alone cannot be used to look up a commune's current wilaya.

**Duplicates are NOT a legitimate encoding of the reform — they are ingestion-bug
collisions (inferred, but strongly evidenced):**

- pkg has 34 distinct `code_commune` values that are duplicated (79 rows total across
  those 34 groups); app has 51 duplicated values (113 rows).
- Sampled two named in the brief:
  - `4118` in pkg: **Ain Soltane** (daira Sedrata), **Oued Kebrit** (daira Oum El
    Adhaim), **Sidi Fredj** (daira Merahna) — three unrelated communes in wilaya 41,
    different dairas, all sharing `code_commune=4118` *and* all sharing the identical
    (also wrong-looking) `postal_code="41026"`. In app, the same 3 communes keep
    `code_commune=4118` but each has a *distinct* postal_code (41017/41023/41019).
  - `4504` in pkg: **Asla**, **Djenienne Bourezg**, **Tiout** (wilaya 45, different
    dairas) all share `code_commune=4504` and identical `postal_code="45030"` in pkg;
    in app the code_commune collision persists but postal codes differ (45006/45007/45003).
- Systematically: of pkg's 34 duplicate-code groups, **33 have every colliding row
  sharing the exact same postal_code too**, and only 1 group has differing postal codes
  within the group. That pattern (code AND postal both collapsing to one repeated value
  across otherwise-unrelated communes) is the signature of a **forward-fill / stale-value
  bug in a scraping or table-merge pipeline** — when a lookup for a given commune's
  code/postal failed, the previous successfully-parsed row's values were carried over
  instead of being left blank or erroring. This is `inferred` (I did not find the
  generator script in this pass to confirm directly — that would need someone with repo
  write access, i.e. `dev`, to trace); the postal_code correction present in app for the
  `4118` group (correct, non-duplicated) while `code_commune` still collides in app too
  suggests the two fields come from different, only partially-repaired source passes:
  postal_code got fixed for some communes, code_commune fix (if any) never happened.
- **Not a legitimate shared scheme**: three geographically and administratively
  unrelated communes cannot share one official ONS code by design — ONS commune codes
  are 1:1. This is corruption, not convention.

**app's 10 rows with `code_commune: None`** (seen, listed in full):
Lemcene (w5), Benimaouche (w6), Tinebdar (w6), Meziraa (w7), Z'barbar (w10), Abelsa
(w11), Bologhine Ibnou Ziri (w16), Mohamed Belouzdad (w16), Erraguene Souissi (w18),
Bouihi (w63). These have real lat/lon and postal_code but no code_commune value at all
— consistent with the same partial-repair story: someone nulled out code_commune where
it was known to be wrong/unavailable rather than leaving a bad value, but did so for
only 10 of the ~113 app rows implicated by duplicates, i.e. incompletely.

**Secondary, unresolved inconsistency worth flagging:** `postal_code`'s wilaya prefix is
not consistently old vs. new. Example: pkg's Deldoul (wilaya_code=49, a *new*
post-reform code) has `postal_code="49036"` (new-style prefix), but pkg's Barika
(wilaya_code=60, also a new post-reform code) has `postal_code="05001"` (old Batna
prefix, 05, not 60). So postal_code renumbering was applied to some new-wilaya communes
and not others — another sign of an incomplete/inconsistent migration pass, not
something I could fully characterize in this pass (would need the full 69-wilaya
postal-code table to know intended behavior).

## What I could not verify

- Which of the two Deldoul wilaya/daira assignments (pkg's Adrar/Aougrout vs. app's
  Djelfa/Messaad) is correct. Coordinate favors pkg's Adrar placement but I have no
  primary-source (JO/ONS) confirmation either way.
- Which coordinate is correct for the 4 "package vs app disagree by ~1°" communes
  (Souama, Sidi Demed, M'fatha, Ouled Sidi Brahim) — not checked against Wikidata/ONS in
  this pass; flagged as a data-quality bug, source unresolved.
- The generator/ingestion script responsible for the code_commune/postal_code
  duplication — I did not locate or trace it (would require code access / `dev` lane,
  out of scope for a read-only research pass).
- No Wikidata QIDs or JO decree citations were pulled for individual communes because
  none of the 14 turned out to need a "compile a full record from scratch" fix — the
  records already exist with real coordinates in both files. If per-commune postal_code/
  daira accuracy needs independent verification against ONS/Wikidata regardless of the
  wilaya_code fix, that is a distinct, larger task not attempted here.
