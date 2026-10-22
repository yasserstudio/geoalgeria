---
"@geoalgeria/agriculture": patch
"@geoalgeria/aviation": patch
"@geoalgeria/banques": patch
"@geoalgeria/buses": patch
"@geoalgeria/cliniques": patch
"@geoalgeria/culture": patch
"@geoalgeria/djezzy": patch
"@geoalgeria/ecoles": patch
"@geoalgeria/emploi": patch
"@geoalgeria/enseignement-superieur": patch
"@geoalgeria/ferroviaire": patch
"@geoalgeria/formation-professionnelle": patch
"@geoalgeria/gares-routieres": patch
"@geoalgeria/industrie-pharmaceutique": patch
"@geoalgeria/jeunesse": patch
"@geoalgeria/livraison": patch
"@geoalgeria/mobilis": patch
"@geoalgeria/mosquees": patch
"@geoalgeria/ooredoo": patch
"@geoalgeria/pharmacies": patch
"@geoalgeria/poste": patch
"@geoalgeria/protection-civile": patch
"@geoalgeria/sante": patch
"@geoalgeria/sports": patch
"@geoalgeria/telecom": patch
"@geoalgeria/tourisme": patch
---

These packages now work in a bundled app: esbuild, Vite and the other Rollup-based bundlers can follow the data path.

Before this release, `import { stations } from "@geoalgeria/ferroviaire"` (and the same for every package here) built fine and then threw `ENOENT ... /data/stations.json` on the first call. The JSON was read at run time from a path joined off `import.meta.url`; esbuild and Vite inline the module without relocating that read, so it went looking for the data next to the generated bundle. Node, Next.js and Turbopack were never affected, which is why this took until now to surface.

Each package now reaches its data through a generated `loaders.cjs`: one `require` of a literal path per data file, inside a function. A bundler can trace a literal path, and the `require` stays lazy, so importing the package still parses nothing until you call a loader. Everything else is unchanged: same exports, same arguments, same return values, same TypeScript types, and not one record of data was touched.

One thing to know: a loader now answers with the module cache copy of its file, shared by every caller, where before each call re-parsed the JSON. That is what a bundler inlining the JSON does in any case. Treat what you get back as read-only and copy before sorting in place: `[...stations()].sort(...)`.
