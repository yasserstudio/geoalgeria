---
"@geoalgeria/buses": patch
"@geoalgeria/sante": patch
---

The noun "licence" is now spelled the en-GB way in every file these two packages publish.

`@geoalgeria/buses` states "no open reuse licence" in its 14 Operator source
descriptors, in `data/metadata.json` and in the catalog entry. That is the
wording its NOTICE, its README and the `## Data` section of its LICENSE already
carried; the LICENSE's `## Code` preamble was the one line still reading "This
license applies to package code", and reads "licence" now too. The descriptor
text is written by `scripts/lib/v2-transforms.mjs`, so it was corrected there
and regenerated rather than edited in place.

`@geoalgeria/sante` asks for "a compatible licence" in the OpenStreetMap
share-alike sentence of both its README and its LICENSE, which is what
`packages/dataset/LICENSE` already said.

The identifier keeps its own spelling throughout: the manifest `license` key,
the `license` metadata field, SPDX expressions, the `LICENSE` file name, licence
URLs, the shields.io badge labels and every use of the verb or adjective
"licensed". The French and Arabic READMEs are untouched. No record changes.

The same sweep corrected the English README of every other package too, so that
no English README heading spells the noun "License" any more (`Licence &
attribution` in 19 of them, `Source & licence` in 7, a bare `Licence` in 4,
`Licence & disclaimer` in the root README, and `Sources and licences` in buses,
which already read that way). Those packages are deliberately not bumped here:
nothing they publish changed but README prose, and each carries the corrected
text into whatever release it next has for a reason of its own.
