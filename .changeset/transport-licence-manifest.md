---
"@geoalgeria/transport": patch
---

Publish the umbrella licence declaration.

`license` became `SEE LICENSE IN LICENSE` in the repository when the restricted and umbrella packages were corrected, but the registry still serves `MIT` for the last published version, because no release since has touched this package. This patch carries the manifest to npm so the published terms match the `LICENSE` file, which states the MIT grant for the code and lists each member's data terms separately.
