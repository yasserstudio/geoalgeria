#!/usr/bin/env node
// Build packages/dataset/data/geojson/commune-boundaries.geojson: one polygon per
// commune, keyed by code_commune. Offline and deterministic.
//
// IDENTITY AND LOCATION COME FROM THE REPOSITORY. A polygon is attached to a commune
// record only through a rule below; a name never decides, and no commune point is
// ever read to be changed.
//
//   Rule A  the committed OSM outline (research/_commune-centres/commune-boundaries.json)
//           whose osm_relation_id equals the record's. Primary source.
//   Rule B  a commune with no usable outline may take a geoBoundaries ADM3 polygon,
//           only if all five clauses hold (see ruleB). Evaluated by --extract-fills
//           against the uncommitted geo/ download and written, with its verdicts, to
//           research/_commune-centres/commune-boundary-fills.json, which this script
//           then reads. A commune that fails stays absent and is listed as missing.
//   Rule C  a commune whose point lies outside its own outline (the 16 in
//           containment-exceptions.json) keeps its point and its outline, but the
//           outline ships only if an independent geoBoundaries polygon of the same
//           commune agrees (bbox IoU >= 0.8). Also written by --extract-fills.
//   Rule E  a commune still without an outline after A to C, alone in its wilaya in
//           that state, takes the one gap its neighbours leave: the wilaya outline minus
//           the union of the wilaya's other published communes. Nothing is invented; it
//           is what the neighbours and the wilaya border already imply. It ships only if
//           the gap is clear (one piece at least 5 km2 and 5 times the next) and an
//           independent geoBoundaries polygon of the same commune has shape IoU >= 0.9
//           with it. The commune's point is not moved, even if it falls outside.
//   Rule D  no commune point is ever moved, and no outline is drawn by hand, merged
//           across communes or inferred from a name.
//
// USAGE
//   node scripts/build-commune-boundaries.mjs --extract-fills [geo/geoBoundaries-DZA-ADM3.geojson]
//       evaluate Rules B and C against the supplied file; write the fills file.
//   node scripts/build-commune-boundaries.mjs --write      build the dataset and sidecar
//   node scripts/build-commune-boundaries.mjs --check      fail if either differs from disk

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import polygonClipping from "polygon-clipping";
import { pointInGeometry } from "../packages/schema/src/geo.js";
import {
  bboxIoU,
  bboxOf,
  foldName,
  km2At,
  multiArea,
  polygonArea,
  orient,
  polygonsOf,
  reduceRing,
  repairRing,
  ringIsSimple,
  round,
  shareInside,
} from "./lib/commune-boundaries.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = join(ROOT, "packages", "dataset", "data");
const OUT = join(DATASET, "geojson", "commune-boundaries.geojson");
const OUT_META = join(DATASET, "geojson", "commune-boundaries.metadata.json");
const CENTRES = join(ROOT, "research", "_commune-centres");
const CACHE = join(CENTRES, "commune-boundaries.json");
const EXCEPTIONS = join(CENTRES, "containment-exceptions.json");
const FILLS = join(CENTRES, "commune-boundary-fills.json");
const DEFAULT_SUPPLIED = join(ROOT, "geo", "geoBoundaries-DZA-ADM3.geojson");

/** Rule B clause 4: at least this share of the polygon inside its declared wilaya. */
export const MIN_WILAYA_SHARE = 0.98;
/** Rule C: a corroborating polygon must overlap the outline's bbox at least this much. */
export const MIN_CORROBORATION_IOU = 0.8;
/** Rule E: the derived gap must overlap an independent polygon at least this much. */
export const MIN_GAP_IOU = 0.9;
export const MIN_GAP_KM2 = 5;
export const MIN_GAP_DOMINANCE = 5;

const read = (p) => JSON.parse(readFileSync(p, "utf-8"));

function records() {
  return read(join(DATASET, "algeria.json")).flatMap((w) => w.communes);
}

function wilayaPolygons() {
  const by = new Map();
  for (const f of read(join(DATASET, "geojson", "wilaya-boundaries.geojson")).features)
    by.set(f.properties.code, f.geometry);
  return by;
}

const point = (c) => [c.longitude, c.latitude];

// ---------------------------------------------------------------------------
// Rules B and C: evaluated against the supplied file.
// ---------------------------------------------------------------------------

function extractFills(suppliedPath) {
  const supplied = read(suppliedPath);
  const meta = read(suppliedPath.replace(/\.geojson$/, "-metaData.json"));
  const polys = supplied.features;
  const boxes = polys.map((f) => bboxOf(polygonsOf(f.geometry)));
  const recs = records();
  const cache = read(CACHE).communes;
  const exceptions = read(EXCEPTIONS).exceptions;
  const wil = wilayaPolygons();

  const containing = (c) =>
    polys.flatMap((f, i) => {
      const [x, y] = point(c);
      const b = boxes[i];
      return x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && pointInGeometry(x, y, f.geometry) ? [i] : [];
    });

  // Rule B
  const attached = new Set();
  const ruleB = [];
  const fills = [];
  for (const entry of cache.filter((e) => !e.usable)) {
    const c = recs.find((r) => r.code_commune === entry.code_commune);
    const hit = containing(c);
    const clauses = {};
    clauses.exactly_one_polygon_holds_the_point = hit.length === 1;
    const i = hit[0];
    let share = null;
    let name = null;
    if (hit.length === 1) {
      clauses.holds_no_other_repo_point = recs.filter((r) => r !== c && containing(r).includes(i)).length === 0;
      clauses.not_attached_to_another_commune = !attached.has(i);
      share = shareInside(polygonsOf(polys[i].geometry), polygonsOf(wil.get(c.wilaya_code)));
      clauses.wilaya_share_at_least_98_percent = share >= MIN_WILAYA_SHARE;
      name = polys[i].properties.shapeName;
      clauses.name_does_not_contradict = foldName(name) === foldName(c.name_fr);
    }
    const ok = Object.values(clauses).length === 5 && Object.values(clauses).every(Boolean);
    ruleB.push({
      code_commune: c.code_commune,
      name_fr: c.name_fr,
      wilaya_code: c.wilaya_code,
      supplied_shapeName: name,
      supplied_shapeID: i === undefined ? null : polys[i].properties.shapeID,
      wilaya_share: share === null ? null : round(share, 4),
      clauses,
      verdict: ok ? "attached" : "withheld",
    });
    if (!ok) continue;
    attached.add(i);
    const rings = polygonsOf(polys[i].geometry)
      .map((p) => p.map((r) => reduceRing(r)).filter(Boolean))
      .filter((p) => p.length && p[0]);
    fills.push({ code_commune: c.code_commune, polygons: rings });
  }

  // Rule C
  const ruleC = exceptions.map((e) => {
    const entry = cache.find((x) => x.code_commune === e.code_commune);
    let best = { iou: 0, shapeName: null };
    boxes.forEach((b, i) => {
      const iou = bboxIoU(b, entry.bbox);
      if (iou > best.iou) best = { iou, shapeName: polys[i].properties.shapeName, shapeID: polys[i].properties.shapeID };
    });
    return {
      code_commune: e.code_commune,
      name_fr: e.name_fr,
      supplied_shapeName: best.shapeName,
      supplied_shapeID: best.shapeID ?? null,
      bbox_iou: round(best.iou, 4),
      verdict: best.iou >= MIN_CORROBORATION_IOU ? "corroborated" : "withheld",
    };
  });

  const doc = {
    generated: "2026-11-18",
    purpose:
      "Rule B and Rule C verdicts (see the header of scripts/build-commune-boundaries.mjs), evaluated against the supplied geoBoundaries ADM3 file, plus the polygons Rule B attached. scripts/build-commune-boundaries.mjs reads this file; it never needs the supplied download itself. Regenerate with --extract-fills.",
    supplied: {
      name: "geoBoundaries ADM3, Algeria",
      boundaryID: meta.boundaryID,
      boundarySource: meta.boundarySource,
      sourceDataUpdateDate: meta.sourceDataUpdateDate,
      buildDate: meta.buildDate,
      features: polys.length,
    },
    reduction: { tolerance_deg: 0.0005, precision_dp: 4 },
    rule_b: ruleB,
    rule_c: ruleC,
    fills,
  };
  // Rule E: only for a commune alone in its wilaya without an outline after A to C.
  const b = build({ fills: doc, derive: false });
  doc.rule_e = b.missing
    .filter((m) => b.missing.filter((x) => x.wilaya_code === m.wilaya_code).length === 1)
    .map((m) => {
      const c = recs.find((r) => r.code_commune === m.code_commune);
      const gap = clearGap(gapPieces(b.features, c, wil.get(c.wilaya_code)));
      const refs = polys.filter((f) => foldName(f.properties.shapeName) === foldName(c.name_fr));
      const ref = refs.length === 1 ? refs[0] : null;
      const reference = ref ? polygonsOf(ref.geometry).map((p) => p.map((r) => reduceRing(r)).filter(Boolean)) : null;
      const iou = gap.piece && reference ? shapeIoU([gap.piece.polygon], reference) : null;
      return {
        code_commune: c.code_commune,
        name_fr: c.name_fr,
        wilaya_code: c.wilaya_code,
        gap_failed_clause: gap.failed ?? null,
        gap_km2: gap.piece ? Number(gap.piece.km2.toFixed(1)) : null,
        supplied_shapeName: ref?.properties.shapeName ?? null,
        supplied_shapeID: ref?.properties.shapeID ?? null,
        shape_iou: iou === null ? null : Number(iou.toFixed(3)),
        verdict: iou !== null && iou >= MIN_GAP_IOU ? "corroborated" : "withheld",
        reference,
      };
    });
  writeFileSync(FILLS, `${JSON.stringify(doc, null, 1)}\n`);
  console.log(`wrote ${FILLS}`);
  for (const r of ruleB) console.log(`B ${r.code_commune} ${r.name_fr}: ${r.verdict}`, JSON.stringify(r.clauses), r.wilaya_share);
  for (const r of doc.rule_e) console.log(`E ${r.code_commune} ${r.name_fr}: ${r.verdict}`, r.gap_km2, r.shape_iou, r.gap_failed_clause);
  console.log(`C corroborated ${ruleC.filter((r) => r.verdict === "corroborated").length} of ${ruleC.length}`);
}

// ---------------------------------------------------------------------------
// The build.
// ---------------------------------------------------------------------------

/** Pieces left when a wilaya's other published communes are cut out of its outline, largest first. */
export function gapPieces(features, c, wilayaGeom) {
  const mine = features.filter((f) => f.properties.wilaya_code === c.wilaya_code).flatMap((f) => polygonsOf(f.geometry));
  const rest = polygonClipping.difference(polygonsOf(wilayaGeom), polygonClipping.union(mine[0], ...mine.slice(1)));
  const lat = (bboxOf(polygonsOf(wilayaGeom))[1] + bboxOf(polygonsOf(wilayaGeom))[3]) / 2;
  return rest.map((p) => ({ polygon: p, km2: km2At(polygonArea(p), lat) })).sort((a, b) => b.km2 - a.km2);
}

/** The Rule E clauses that need no download. Returns the piece or the failed clause. */
export function clearGap(pieces) {
  const [one, next] = pieces;
  if (!one || one.km2 < MIN_GAP_KM2) return { failed: "gap_at_least_5_km2" };
  if (one.polygon.length !== 1) return { failed: "gap_has_no_holes" };
  if (next && one.km2 < MIN_GAP_DOMINANCE * next.km2) return { failed: "gap_dominates_other_pieces" };
  return { piece: one };
}

const toGeometry = (polygons) => {
  const oriented = polygons.map(orient);
  return oriented.length === 1
    ? { type: "Polygon", coordinates: oriented[0] }
    : { type: "MultiPolygon", coordinates: oriented };
};

/**
 * Rounding to the publication precision, or the cache's own simplification, can leave
 * a ring touching itself. Fix it by deleting vertices only (never adding or moving
 * one) and say so in the sidecar; refuse a ring that cannot be fixed.
 */
function simple(ring, code, repaired) {
  if (ringIsSimple(ring)) return ring;
  const fixed = repairRing(ring);
  if (!fixed) throw new Error(`commune ${code}: ring cannot be made simple by deleting vertices`);
  repaired.push({ code_commune: code, vertices_removed: fixed.removed, area_change_percent: Number((fixed.areaChange * 100).toFixed(4)) });
  return fixed.ring;
}

/** Outer rings of a cache entry as polygons, each reduced to the publication precision. */
function cachePolygons(entry) {
  const rings = entry.outer.map((r) => reduceRing(r, 0)).filter(Boolean);
  // Cache entries carry no inner rings today; refuse a future one rather than drop it.
  if (entry.inner.length) throw new Error(`commune ${entry.code_commune} has inner rings; extend the builder`);
  return rings.map((r) => [r]);
}


const featureOf = (c, polygons) => ({
  type: "Feature",
  properties: {
    name_fr: c.name_fr,
    name_ar: c.name_ar,
    wilaya_code: c.wilaya_code,
    postal_code: c.postal_code,
    daira: c.daira,
    code_commune: c.code_commune,
  },
  geometry: toGeometry(polygons),
});

/** Intersection over union of two polygon lists. */
export function shapeIoU(a, b) {
  const inter = multiArea(polygonClipping.intersection(a, b));
  return inter / (multiArea(a) + multiArea(b) - inter);
}

export function build({ fills: fillsOverride, derive = true } = {}) {
  const recs = records();
  const cache = new Map(read(CACHE).communes.map((e) => [e.code_commune, e]));
  const fillsDoc = fillsOverride ?? read(FILLS);
  const exceptions = new Set(read(EXCEPTIONS).exceptions.map((e) => e.code_commune));
  const ruleC = new Map(fillsDoc.rule_c.map((r) => [r.code_commune, r]));
  const fills = new Map(fillsDoc.fills.map((f) => [f.code_commune, f]));

  const features = [];
  const repaired = [];
  const origin = {};
  const missing = [];
  for (const c of recs) {
    const entry = cache.get(c.code_commune);
    let polygons = null;
    let how = null;
    let why = null;
    if (entry?.usable) {
      if (entry.osm_relation_id !== c.osm_relation_id)
        throw new Error(`commune ${c.code_commune}: cache relation ${entry.osm_relation_id} != record ${c.osm_relation_id}`);
      if (exceptions.has(c.code_commune) && ruleC.get(c.code_commune)?.verdict !== "corroborated")
        why = "Rule C: no independent polygon corroborates this outline";
      else {
        polygons = cachePolygons(entry);
        how = exceptions.has(c.code_commune) ? "C" : "A";
      }
    } else if (fills.has(c.code_commune)) {
      polygons = fills.get(c.code_commune).polygons;
      how = "B";
    } else {
      const b = fillsDoc.rule_b.find((r) => r.code_commune === c.code_commune);
      const failed = b ? Object.entries(b.clauses).filter(([, v]) => !v).map(([k]) => k) : [];
      why = `no usable OSM outline; Rule B withheld${failed.length ? ` (failed: ${failed.join(", ")})` : ""}`;
    }
    if (!polygons) {
      missing.push({ code_commune: c.code_commune, name_fr: c.name_fr, wilaya_code: c.wilaya_code, reason: why });
      continue;
    }
    polygons = polygons.map((p) => p.map((r) => simple(r, c.code_commune, repaired)));
    origin[how] = (origin[how] ?? 0) + 1;
    features.push(featureOf(c, polygons));
  }

  // Rule E
  const derived = [];
  const wil = wilayaPolygons();
  const ruleE = new Map((fillsDoc.rule_e ?? []).map((r) => [r.code_commune, r]));
  if (derive) {
    for (const m of [...missing]) {
      const alone = missing.filter((x) => x.wilaya_code === m.wilaya_code).length === 1;
      const e = ruleE.get(m.code_commune);
      if (!alone || e?.verdict !== "corroborated") continue;
      const c = recs.find((r) => r.code_commune === m.code_commune);
      const { piece } = clearGap(gapPieces(features, c, wil.get(c.wilaya_code)));
      if (!piece) continue;
      const ring = reduceRing(piece.polygon[0], 0);
      const polygons = [[simple(ring, c.code_commune, repaired)]];
      const iou = shapeIoU(polygons, e.reference);
      if (iou < MIN_GAP_IOU) continue; // the reference no longer agrees: leave it missing
      const f = featureOf(c, polygons);
      features.push(f);
      origin.E = (origin.E ?? 0) + 1;
      missing.splice(missing.indexOf(m), 1);
      derived.push({
        code_commune: c.code_commune,
        name_fr: c.name_fr,
        wilaya_code: c.wilaya_code,
        area_km2: Number(piece.km2.toFixed(1)),
        shape_iou_with_geoboundaries: Number(iou.toFixed(3)),
        point_inside_outline: pointInGeometry(c.longitude, c.latitude, f.geometry),
      });
    }
  }
  features.sort((a, b) => a.properties.wilaya_code - b.properties.wilaya_code || a.properties.code_commune - b.properties.code_commune);

  const all = features.flatMap((f) => polygonsOf(f.geometry));
  const bbox = bboxOf(all);
  const geometryTypes = {};
  for (const f of features) geometryTypes[f.geometry.type] = (geometryTypes[f.geometry.type] ?? 0) + 1;
  const vertices = all.reduce((n, p) => n + p.reduce((m, r) => m + r.length, 0), 0);
  return { features, origin, missing, repaired, derived, bbox, geometryTypes, vertices, fillsDoc };
}

function metadata(b) {
  const n = b.features.length;
  const fmt = (v) => v.toLocaleString("en-US");
  return {
    file: "commune-boundaries.geojson",
    title_en: `Algeria: commune boundary polygons (${fmt(n)})`,
    title_fr: `Algérie: polygones des limites de commune (${fmt(n)})`,
    title_ar: `الجزائر: حدود البلديات (${fmt(n)})`,
    feature_count: n,
    geometry_types: b.geometryTypes,
    properties: {
      name_fr: "commune name in French, copied from the commune record",
      name_ar: "commune name in Arabic, copied from the commune record",
      wilaya_code: "parent wilaya code as an integer 1-69 (join key to wilayas.json)",
      postal_code: "commune postal code, null for the 1 commune with no citable code",
      daira: "parent daira name in French",
      code_commune: "commune code as an integer (join key to the commune records, unique)",
    },
    license: "ODbL-1.0",
    bbox: b.bbox.map((v) => round(v, 3)),
    missing_codes: b.missing,
    repaired_rings: b.repaired,
    derived_outlines: b.derived,
    origin: {
      A: "OpenStreetMap admin_level=8 outline from research/_commune-centres/commune-boundaries.json, matched by osm_relation_id",
      B: "geoBoundaries ADM3 polygon, attached only when all five Rule B clauses held (research/_commune-centres/commune-boundary-fills.json)",
      C: "as A, for a commune whose point lies outside its own outline; shipped only because an independent geoBoundaries polygon corroborates it. The point is unchanged.",
      E: "derived: the gap the neighbours and the wilaya outline leave, for a commune that is the only one in its wilaya without an outline, shipped only because an independent geoBoundaries polygon of the same commune overlaps it at shape IoU >= 0.9 (research/_commune-centres/commune-boundary-fills.json). The commune point is not moved even where it falls outside; see derived_outlines.",
      counts: b.origin,
    },
    sources: [
      {
        key: "osm-communes",
        name: "OpenStreetMap: commune boundaries (relation, boundary=administrative, admin_level=8) in Algeria, full geometry",
        url: "https://www.openstreetmap.org",
        retrieved: "2026-09-29",
        timestamp_osm_base: "2026-09-29T13:04:54Z",
        evidence_type: "crowdsourced",
      },
    ],
    simplification: {
      method:
        "Outlines taken from the committed cache (Douglas-Peucker 0.0005 degrees) and rounded to 4 decimals; Rule B polygons reduced from full resolution with Douglas-Peucker at 0.0005 degrees and rounded to 4 decimals. Exterior rings counter-clockwise.",
      coordinate_precision_dp: 4,
      vertices: b.vertices,
    },
    provenance_notes: [
      "Identity comes from the commune records, never from a name: each feature is attached to its code_commune through the OSM relation id the record carries, or through the five-clause Rule B. Properties are copied from the records, not from any source file.",
      "No commune point was read to be changed. The 16 communes in research/_commune-centres/containment-exceptions.json keep the point they have; their outlines ship under Rule C.",
      "Licence: ODbL-1.0 is recorded, while the package itself declares SEE LICENSE IN LICENSE for its mixed terms, because the outlines are OpenStreetMap-derived; the package LICENSE and NOTICE list this file as an ODbL 1.0 part, (c) OpenStreetMap contributors. The geoBoundaries ADM3 file (OSM extract of 2023-01-19, geoBoundaries build of 2023-12-12, boundaryID DZA-ADM3-69997007) supplies the Rule B outlines and the Rule C corroboration; its stated source is OpenStreetMap via osm-boundaries.com, so its outlines carry the same ODbL terms, and NOTICE credits geoBoundaries for them.",
      "repaired_rings lists every ring that touched itself after the cache's simplification or the 4-decimal rounding and was made simple by deleting 1 to 4 vertices; none changed its area by more than 0.03%.",
      "No commune point was moved for a derived outline either: where the point falls outside it, derived_outlines says so.",
      "Absent communes are listed in missing_codes with the reason. No outline was drawn to fill them.",
    ],
  };
}

export const serialise = (b) => ({
  geo: `${JSON.stringify({ type: "FeatureCollection", features: b.features })}\n`,
  meta: `${JSON.stringify(metadata(b), null, 2)}\n`,
});

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--extract-fills")) {
    const given = argv.find((a) => a.endsWith(".geojson"));
    return extractFills(given ?? DEFAULT_SUPPLIED);
  }
  const out = serialise(build());
  if (argv.includes("--write")) {
    writeFileSync(OUT, out.geo);
    writeFileSync(OUT_META, out.meta);
    console.log(`wrote ${OUT} (${out.geo.length} bytes) and ${OUT_META}`);
  } else if (argv.includes("--check")) {
    const same = readFileSync(OUT, "utf-8") === out.geo && readFileSync(OUT_META, "utf-8") === out.meta;
    if (!same) {
      console.error("commune-boundaries.geojson or its metadata is stale; run with --write");
      process.exit(1);
    }
    console.log("commune boundaries are current");
  } else {
    console.error("usage: --extract-fills [file] | --write | --check");
    process.exit(2);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
void polygonClipping;
void multiArea;
