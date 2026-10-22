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

These packages now work in a bundled app: esbuild and Vite can follow the data path.

Before this release, `import { stations } from "@geoalgeria/ferroviaire"` (and the same for every package here) built fine and then threw `ENOENT ... /data/stations.json` on the first call. The JSON was read at run time from a path joined off `import.meta.url`; esbuild and Vite inline the module without relocating that read, so it went looking for the data next to the generated bundle. Node and Next.js with Turbopack were never affected, which is why this took until now to surface.

Each package now reaches its data through a generated `loaders.cjs`: one `require` of a literal path per data file, inside a function. A bundler can trace a literal path, and the `require` stays lazy, so importing the package still parses nothing until you call a loader. Every call still answers with a fresh copy, as it always did, so a caller that sorts what it gets cannot reorder another caller's records.

Nothing is different for you: same exports, same arguments, same return values, same TypeScript types, and not one record of data changed. Verified by packing each real tarball and running it three ways, under plain Node, an esbuild bundle and a Vite 8 SSR bundle (rolldown), with the three required to agree. Those are the three that are checked, and the only ones claimed.

Turbopack is the one bundler that cannot be checked that way, because it needs a `next build`. It already served these packages before the fix, and the fix gives it a graph it has not seen before (an ESM index importing a CommonJS loader whose JSON arrives by literal `require`), so the proof for it is the geoalgeria.com preview build released in the same batch, which loads `@geoalgeria/gares-routieres` through its index on a live page.
