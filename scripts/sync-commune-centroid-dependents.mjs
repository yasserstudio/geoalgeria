#!/usr/bin/env node
// Cascade corrected flagship commune centres into the sector packages that
// derive from them but cannot replay their own generator offline.
//
// WHY. `scripts/fix-commune-centres.mjs` has moved 230 commune centres in
// packages/dataset over two audits, 56 on 2026-09-27 and 189 on 2026-09-29
// (research/_commune-centres/README.md). Two kinds of published
// record are derived from those values and go stale the moment they move:
//
//   1. a coordinate that IS a commune centre, because the record has no point of
//      its own (geo_method `commune_centroid` / `wilaya_centroid` / `commune`).
//      Left alone it keeps pointing at a repudiated value: sante's EPH El Harrach
//      sat 51.5 km away, inside wilaya 35.
//   2. `wilaya_code` / `commune` / `commune_code` stamped by a nearest-commune-
//      centroid join. A centre that moves 25 km stops being the nearest centroid
//      for everything around its old position and starts being it around the new
//      one.
//
// Most dependents rebuild from a capture their generator can replay and are
// simply re-run (`node packages/<pkg>/scripts/fetch.mjs --cache`). The three
// handled here cannot:
//
//   djezzy                     has no offline mode at all; only a live pull of
//                              djezzy.dz feeds its generator.
//   agriculture                was built by research/agriculture/geocode.py, which
//                              predates the v2 contract and would emit the old shape.
//   industrie-pharmaceutique   ships no generator; its data was assembled once from
//                              the MIP fabrication register.
//
// `sante` was handled here on 2026-09-27 and 2026-09-29 because its replay churned
// published ids, and ids are public join keys. Both of those causes are fixed in the
// generator itself now (it carries ids over on the MSP registry id, and it no longer
// pairs two posts on a commune that only two name fragments agree on), but it is
// listed again from 2026-10-01 for a third reason: refineWithFacilities() indexes
// every OSM and Wikidata health facility by NEAREST COMMUNE CENTROID, so moving a
// centre changes which establishments that step refines, well beyond the handful that
// borrow the centre. On the 2026-10-01 batch it turned EHS Mere et Enfant Biskra
// (07-ehs-03) into an `osm_point`, which the Owner had hand-verified as a building
// point the day before (quality/overrides/sante.json, reviewed 2026-09-30), and the
// replay aborted on that stale decision rather than overwrite it. Recentring the four
// borrowed coordinates is the correction the batch is for; the nearest-centroid index
// inside that generator is its own fix.
//
// WHAT EACH PACKAGE GETS
//   agriculture, industrie-pharmaceutique, sante  recentre only. Their commune is
//     matched from the source's own text (a MADR address, an MIP commune column, the
//     MSP registry's own wilaya and commune), not from geometry, so no attribution can
//     move; only the coordinate they borrow from the commune has to follow it.
//   djezzy  re-join. It stamps wilaya/commune from the flagship set by the shared
//     rule scripts/lib/build-utils.mjs resolveCommune(), reproduced in
//     rejoinCommune() below: containing wilaya polygon, then containing commune
//     outline, then distance. It was an unrestricted nearest-centroid search until
//     2026-09-29.
//
// RECENTRE ANCHORS (also the rule scripts/validate-packages.mjs enforces)
//   commune_code    the record names its commune by code: the anchor is that
//                   commune's current centre.
//   commune_name    the record names it in prose (`commune`, no code): the anchor
//                   is the commune that name resolves to inside the declared
//                   wilaya, via the canonical crosswalk. A name that does not
//                   resolve is reported, never guessed at.
//   repudiated      no usable anchor (agriculture's `wilaya_centroid` rows carry
//                   commune: null by design). Those move only when the stored
//                   coordinate is byte-equal to a value the corrections file
//                   repudiates, and only to that row's replacement.
//
// USAGE
//   node scripts/sync-commune-centroid-dependents.mjs            # report
//   node scripts/sync-commune-centroid-dependents.mjs --write    # patch
//   node scripts/sync-commune-centroid-dependents.mjs --check    # fail if stale

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MIGRATIONS,
  committedDates,
  padC,
  readRetiredIds,
  writePackageV2,
} from "./lib/v2-transforms.mjs";
import { canonicalCommuneForCode, canonicalCommuneForCurrentLabel } from "./lib/commune-index.mjs";
import { resolveCommune } from "./lib/build-utils.mjs";
import { describeBatches, loadCorrections } from "./lib/commune-corrections.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");

const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE && CHECK) throw new Error("Choose either --write or --check");

// 6 decimals is the repository's coordinate resolution (schema round6, ~0.1 m), and
// the flagship keeps a handful of centres at 7, so every comparison is made on the
// rounded value a published record can actually carry.
const round6 = (n) => Number(n.toFixed(6));
const samePoint = (lat, lng, c) => round6(c.latitude) === round6(lat) && round6(c.longitude) === round6(lng);

// --- the flagship commune set, in both shapes its consumers read --------------
// djezzy reads the three split files in that order, and the join is first-wins on
// an exact distance tie, so the iteration order is part of the reproduced join.
const SPLIT_FILES = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"];

function communesSplit() {
  const out = [];
  for (const f of SPLIT_FILES) {
    for (const c of JSON.parse(readFileSync(join(DATA, f), "utf-8"))) {
      if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) out.push(c);
    }
  }
  if (!out.length) throw new Error("no commune centroids loaded: check packages/dataset/data");
  return out;
}

/** The join djezzy uses, which is scripts/lib/build-utils.mjs resolveCommune(): the
 *  commune whose OpenStreetMap outline contains the point wins outright, searched over
 *  the whole country and with the wilaya taken from the commune registry; only when no
 *  outline holds it does distance decide, inside the wilaya whose shipped polygon does.
 *  It was an unrestricted nearest-centroid search until 2026-09-29, which is how
 *  moving 245 commune centres carried 58 published records into a wilaya whose polygon
 *  does not contain them. The row is passed whole, so the commune it already shipped
 *  in is what the rule keeps wherever geometry cannot contradict it. */
function rejoinCommune(r, communes) {
  return resolveCommune(r.lat, r.lng, communes, r).commune;
}

// --- the repudiated values, from every applied corrections file ---------------
// Every batch, not the latest: a dependent can still be sitting on a value the
// 2026-09-27 batch repudiated, and dropping that batch would read as clean.
const corrections = loadCorrections();
const repudiated = new Map(); // "lat,lng" of the old centre -> correction row
for (const f of corrections.corrections) repudiated.set(`${round6(f.from[1])},${round6(f.from[0])}`, f);

// --- what each package needs -------------------------------------------------
const PACKAGES = [
  {
    pkg: "agriculture",
    file: "agriculture.json",
    recentre: { commune_centroid: "commune_code", wilaya_centroid: "repudiated" },
  },
  {
    pkg: "industrie-pharmaceutique",
    file: "industrie-pharmaceutique.json",
    recentre: { commune_centroid: "commune_code" },
  },
  { pkg: "sante", file: "sante.json", recentre: { commune_centroid: "commune_code" } },
  { pkg: "djezzy", file: "boutiques.json", rejoin: "split" },
];

const split = communesSplit();

const report = [];
let anyChange = false;

for (const spec of PACKAGES) {
  const dir = join(ROOT, "packages", spec.pkg, "data");
  const path = join(dir, spec.file);
  const rows = JSON.parse(readFileSync(path, "utf-8"));

  let rejoined = 0;
  if (spec.rejoin) {
    for (const r of rows) {
      if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
      const c = rejoinCommune(r, split);
      if (!c) continue;
      const wilaya_code = String(c.wilaya_code).padStart(2, "0");
      const commune_code = padC(c.code_commune);
      if (r.wilaya_code === wilaya_code && r.commune_code === commune_code && r.commune === c.name_fr) continue;
      r.wilaya_code = wilaya_code;
      r.commune_code = commune_code;
      r.commune = c.name_fr;
      rejoined++;
    }
  }

  let moved = 0;
  let unresolved = 0;
  for (const [method, anchorKind] of Object.entries(spec.recentre ?? {})) {
    for (const r of rows) {
      if (r.geo_method !== method) continue;
      if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;

      if (anchorKind === "repudiated") {
        const f = repudiated.get(`${round6(r.lat)},${round6(r.lng)}`);
        if (!f) continue;
        r.lat = round6(f.to[1]);
        r.lng = round6(f.to[0]);
        moved++;
        continue;
      }

      const anchor =
        anchorKind === "commune_code"
          ? r.commune_code == null
            ? null
            : canonicalCommuneForCode(r.commune_code)
          : canonicalCommuneForCurrentLabel(r.wilaya_code, r.commune, r.commune_ar ?? r.commune);
      if (!anchor) {
        unresolved++;
        continue;
      }
      if (samePoint(r.lat, r.lng, anchor)) continue;
      // A record that declares commune-level precision but sits somewhere its
      // commune never was is not this script's business to invent a point for;
      // the honest value is the commune centre it already claims.
      r.lat = round6(anchor.latitude);
      r.lng = round6(anchor.longitude);
      moved++;
    }
  }

  // writePackageV2 owns the JSON/CSV/GeoJSON/metadata fan-out and validates the
  // v2 contract before it writes anything, so an emit can never ship a shape the
  // release gate would reject. It writes unconditionally, hence only under --write.
  if (WRITE) {
    const cfg = MIGRATIONS[spec.pkg];
    const { updated, retrieved } = committedDates(dir);
    writePackageV2({
      pkg: spec.pkg,
      dir,
      files: [{ file: spec.file, rows }],
      meta: cfg.meta,
      updated,
      retrieved,
      retiredIds: readRetiredIds(dir),
    });
  }

  report.push(
    `${spec.pkg}/${spec.file}: ${moved} coordinate(s) recentred, ${rejoined} attribution(s) re-joined` +
      (unresolved ? `, ${unresolved} row(s) with no resolvable commune anchor (left alone)` : ""),
  );
  if (moved || rejoined) anyChange = true;
}

console.log(`flagship centres repudiated to date: ${corrections.count} over ${corrections.docs.length} batch(es): ${describeBatches(corrections.docs)}`);
for (const line of report) console.log(`  ${line}`);
if (CHECK && anyChange) {
  console.error("\ndependents are stale: run node scripts/sync-commune-centroid-dependents.mjs --write");
  process.exit(1);
}
