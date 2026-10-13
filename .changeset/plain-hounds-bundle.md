---
"geoalgeria": patch
---

`import geo from "geoalgeria"` now works, and the package survives a bundler: Next.js with Turbopack, webpack, Vite, esbuild.

Two separate faults made it unusable in a bundled app, both reproduced on Next.js 16.4 with Turbopack. The `exports` map offered a `require` path and nothing else, so an ESM import failed outright with `Module not found: Can't resolve 'geoalgeria'`, even with the package listed in `serverExternalPackages`. And the data was read at runtime from a path built out of `__dirname`, which a bundler rewrites, so the build passed and then every request died with `ENOENT /ROOT/node_modules/geoalgeria/data/algeria.json`.

The exports map now answers an ESM import as well as a `require`, and every JSON file is reached by a static `require("./data/<file>.json")` that a bundler can follow. `require("geoalgeria")` keeps working exactly as before, the getters stay lazy, and every value is unchanged: 69 wilayas, 551 dairas, 1,541 communes, 3,908 post offices, 2,026 ATMs.

One thing to know when you bundle: a bundler inlines the JSON it can see, all of it, including the post office and ATM mirrors. An app that needs one slice can keep its bundle small by taking that file on its own, for example `import communes from "geoalgeria/data/ecommerce/communes.json"`.
