---
"@geoalgeria/banques": patch
---

The CNEP branch in Aïn Azel is named after its commune again.

`cnep-156` shipped as `AIN –AZEL`: the commune name with a stray dash wedged into
it, which the locator typed and nothing caught. Folding that dash to a spaced
hyphen would have published `AIN - AZEL`, reading as a branch called Azel in a
place called Ain, so the name is corrected rather than folded. It now reads `AIN
AZEL`, the spelling the dataset already carries: the flagship commune table reads
Ain Azel, the BADR branch in the same commune publishes `AIN AZEL`, and all-caps
is how CNEP writes 212 of its 230 branch names.

The correction is a reviewed ledger entry, so it survives the next locator pull
and ships its evidence with the record. Nothing else about the branch changes:
same id, coordinate, address and telephone, and the branch, bank and institution
counts are unchanged.
