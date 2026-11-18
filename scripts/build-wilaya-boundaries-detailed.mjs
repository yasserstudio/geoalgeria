#!/usr/bin/env node
// Build packages/dataset/data/geojson/wilaya-boundaries-detailed.geojson: one outline
// per wilaya, at the detail of the commune outlines.
//
// WHY A SECOND FILE. wilaya-boundaries.geojson is 3 decimals, simplified 2%, and
// hand-corrected twice (El Aricha; Touggourt/Ouargla/Ghardaia/El Meniaa). It is a
// published, guarded display outline and is left exactly as it is. This file is the
// other thing a consumer asks for: the wilaya at the same detail as the commune
// boundaries, so a map can draw both without the wilaya border cutting across
// communes.
//
// HOW. Each wilaya is the union of its own communes' outlines in
// commune-boundaries.geojson, matched by the commune's wilaya_code, which is the
// repository's parent link. Nothing is drawn: membership decides the line. Gaps
// between communes of one wilaya (slivers left by simplifying each commune on its own)
// are closed by dropping holes under MIN_HOLE_KM2; larger holes are kept.
//
// USAGE
//   node scripts/build-wilaya-boundaries-detailed.mjs --write | --check

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import polygonClipping from "polygon-clipping";
import { bboxOf, km2At, orient, polygonsOf, reduceRing, repairRing, ringArea, ringIsSimple, round } from "./lib/commune-boundaries.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GEOJSON = join(ROOT, "packages", "dataset", "data", "geojson");
const OUT = join(GEOJSON, "wilaya-boundaries-detailed.geojson");
const OUT_META = join(GEOJSON, "wilaya-boundaries-detailed.metadata.json");
export const MIN_HOLE_KM2 = 5;

const read = (p) => JSON.parse(readFileSync(p, "utf-8"));

const fixed = (ring, code, repaired) => {
  const r = reduceRing(ring, 0);
  if (!r) throw new Error(`wilaya ${code}: a ring collapsed`);
  if (ringIsSimple(r)) return r;
  const f = repairRing(r);
  if (!f) throw new Error(`wilaya ${code}: ring cannot be made simple by deleting vertices`);
  repaired.push({ code, vertices_removed: f.removed, area_change_percent: Number((f.areaChange * 100).toFixed(4)) });
  return f.ring;
};

export function build() {
  const communes = read(join(GEOJSON, "commune-boundaries.geojson")).features;
  const by = new Map();
  for (const f of communes) by.set(f.properties.wilaya_code, [...(by.get(f.properties.wilaya_code) ?? []), ...polygonsOf(f.geometry)]);
  const repaired = [];
  const features = [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([code, polys]) => {
      const merged = polygonClipping.union(polys[0], ...polys.slice(1)).map((p) =>
        orient([
          fixed(p[0], code, repaired),
          ...p.slice(1).filter((h) => km2At(Math.abs(ringArea(h)), h[0][1]) >= MIN_HOLE_KM2).map((h) => fixed(h, code, repaired)),
        ]),
      );
      return {
        type: "Feature",
        properties: { code },
        geometry: merged.length === 1 ? { type: "Polygon", coordinates: merged[0] } : { type: "MultiPolygon", coordinates: merged },
      };
    });
  const all = features.flatMap((f) => polygonsOf(f.geometry));
  const types = {};
  for (const f of features) types[f.geometry.type] = (types[f.geometry.type] ?? 0) + 1;
  return {
    features,
    repaired,
    bbox: bboxOf(all).map((v) => round(v, 3)),
    types,
    vertices: all.reduce((n, p) => n + p.reduce((m, r) => m + r.length, 0), 0),
    rings: all.reduce((n, p) => n + p.length, 0),
  };
}

function metadata(b) {
  return {
    file: "wilaya-boundaries-detailed.geojson",
    title_en: `Algeria: detailed wilaya boundary polygons (${b.features.length})`,
    title_fr: `Algérie: polygones détaillés des limites de wilaya (${b.features.length})`,
    title_ar: `الجزائر: حدود الولايات المفصلة (${b.features.length})`,
    feature_count: b.features.length,
    geometry_types: b.types,
    properties: { code: "wilaya code as an integer 1-69 (join key to wilayas.json)" },
    bbox: b.bbox,
    license: "ODbL-1.0",
    sources: [
      {
        key: "osm-communes",
        name: "OpenStreetMap: commune boundaries (relation, boundary=administrative, admin_level=8) in Algeria, full geometry",
        url: "https://www.openstreetmap.org",
        retrieved: "2026-09-29",
        timestamp_osm_base: "2026-09-29T13:04:54Z",
        evidence_type: "crowdsourced",
        note: "Reached through data/geojson/commune-boundaries.geojson, which this file is dissolved from.",
      },
    ],
    simplification: {
      method:
        "None of its own. Each wilaya is the polygon-clipping union of its communes' outlines in commune-boundaries.geojson (4 decimals), holes under 5 km2 dropped, exterior rings counter-clockwise.",
      coordinate_precision_dp: 4,
      vertices: b.vertices,
      rings: b.rings,
    },
    repaired_rings: b.repaired,
    provenance_notes: [
      "Derived, not drawn: a wilaya's outline is the union of the outlines of the communes the records place in it (wilaya_code), so the line follows commune membership, including the 2019 and 2026 reforms and the three communes moved to Touggourt and Ghardaia.",
      "wilaya-boundaries.geojson is unchanged and remains the simplified, hand-corrected display outline. The two agree on every wilaya's area to within 2%; this one follows commune borders and the coast at commune detail.",
      "Licence: ODbL-1.0 is recorded, while the package itself declares SEE LICENSE IN LICENSE for its mixed terms, because the outlines are OpenStreetMap-derived and the validator needs a stated term; it is provisional and the final licence decision is deferred. The three communes drawn from geoBoundaries ADM3 and the one derived gap (see commune-boundaries.metadata.json) are included in the unions.",
      "Gaps between communes of one wilaya are closed by dropping holes under 5 km2; they are simplification slivers, not territory.",
    ],
  };
}

export const serialise = (b) => ({
  geo: `${JSON.stringify({ type: "FeatureCollection", features: b.features })}\n`,
  meta: `${JSON.stringify(metadata(b), null, 2)}\n`,
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = serialise(build());
  if (process.argv.includes("--write")) {
    writeFileSync(OUT, out.geo);
    writeFileSync(OUT_META, out.meta);
    console.log(`wrote ${OUT} (${out.geo.length} bytes)`);
  } else if (process.argv.includes("--check")) {
    if (readFileSync(OUT, "utf-8") !== out.geo || readFileSync(OUT_META, "utf-8") !== out.meta) {
      console.error("wilaya-boundaries-detailed is stale; run with --write");
      process.exit(1);
    }
    console.log("detailed wilaya boundaries are current");
  } else {
    console.error("usage: --write | --check");
    process.exit(2);
  }
}
