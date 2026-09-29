// Shared build helpers for GeoAlgeria data packages.
// Reused by the transport-sector build scripts (gares-routieres, ferroviaire,
// buses) so the CSV/GeoJSON/commune-join logic lives in one place. Existing
// per-package scripts keep their inlined copies; this is additive.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadBoundaries, pointInGeometry } from "../../packages/schema/index.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEG = Math.PI / 180;

let WILAYA_BOUNDARIES = null;
function wilayaBoundaries() {
  if (!WILAYA_BOUNDARIES) {
    const fc = JSON.parse(
      readFileSync(join(REPO_ROOT, "packages", "dataset", "data", "geojson", "wilaya-boundaries.geojson"), "utf-8"),
    );
    WILAYA_BOUNDARIES = loadBoundaries(fc);
  }
  return WILAYA_BOUNDARIES;
}

/** Wilaya code whose polygon contains (lat,lng), or null when no polygon does
 *  (offshore, or just outside the simplified national outline). */
export function containingWilayaCode(lat, lng) {
  for (const [code, geom] of wilayaBoundaries()) if (pointInGeometry(lng, lat, geom)) return code;
  return null;
}

// --- commune outlines --------------------------------------------------------
//
// This repository publishes no commune boundaries, so the only commune-level
// geometry it has is OpenStreetMap's, reduced once into
// research/_commune-centres/commune-boundaries.json by
// scripts/build-commune-boundary-cache.mjs (that script refuses to write unless
// every one of the 1,541 containment verdicts is identical to the verdict from the
// unsimplified rings). It is a file, never a query: a generator that fetches is a
// generator that fails when Overpass is busy. It stays in research/ and ships in no
// package.

let COMMUNE_POLYGONS = null;
function communePolygons() {
  if (!COMMUNE_POLYGONS) {
    const doc = JSON.parse(
      readFileSync(join(REPO_ROOT, "research", "_commune-centres", "commune-boundaries.json"), "utf-8"),
    );
    COMMUNE_POLYGONS = new Map();
    for (const c of doc.communes) {
      if (!c.usable) continue;
      const w = wcode(c.wilaya_code);
      if (!COMMUNE_POLYGONS.has(w)) COMMUNE_POLYGONS.set(w, []);
      COMMUNE_POLYGONS.get(w).push(c);
    }
  }
  return COMMUNE_POLYGONS;
}

/** Ray casting over one ring of [lng, lat] pairs. */
function inRing(lng, lat, ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Inside any outer ring and no inner ring. The bbox is a reject, not the answer. */
function inCommuneOutline(lng, lat, entry) {
  const [w, s, e, n] = entry.bbox;
  if (lng < w || lng > e || lat < s || lat > n) return false;
  return entry.outer.some((r) => inRing(lng, lat, r)) && !entry.inner.some((r) => inRing(lng, lat, r));
}

/** `code_commune` of the commune whose OSM outline contains (lat,lng), searched
 *  inside `wilayaCode` only, or null when none does. */
export function containingCommuneCode(lat, lng, wilayaCode) {
  for (const entry of communePolygons().get(wcode(wilayaCode)) ?? []) {
    if (inCommuneOutline(lng, lat, entry)) return entry.code_commune;
  }
  return null;
}

/** Round to 6 decimals (≈0.1 m), or null. */
export const round6 = (n) =>
  n == null || !Number.isFinite(+n) ? null : Math.round(+n * 1e6) / 1e6;

/** Wilaya code → zero-padded 2-digit string ("16", 16, "1" → "16"/"01"). */
export const wcode = (c) => (c == null ? null : String(c).padStart(2, "0"));

/** RFC-4180 CSV with spreadsheet formula-injection guard. `cols` = ordered keys. */
export function toCSV(rows, cols) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") v = JSON.stringify(v);
    let s = String(v);
    if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => esc(r[c])).join(","));
  return lines.join("\n") + "\n";
}

/** Point FeatureCollection from rows with finite lat/lng (properties = full row). */
export function toGeoJSON(rows) {
  return {
    type: "FeatureCollection",
    features: rows
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
      .map((r) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.lng, r.lat] },
        properties: { ...r },
      })),
  };
}

/** Load geoalgeria commune centroids (all wilayas), finite coords only. */
export function loadCommunes() {
  const dir = join(REPO_ROOT, "packages", "dataset", "data");
  const files = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"];
  const out = [];
  for (const f of files) {
    for (const c of JSON.parse(readFileSync(join(dir, f), "utf-8"))) {
      if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) out.push(c);
    }
  }
  return out;
}

/** Nearest commune centroid to (lat,lng) — squared planar distance, cosLat-scaled.
 *  With `wilayaCode`, only that wilaya's communes are candidates: a point near a
 *  boundary must not be claimed by the neighbouring wilaya's nearer centroid
 *  (the ooredoo mislinks, ROADMAP "Generators"). Falls back to the unrestricted
 *  search if the code matches no commune row. */
export function nearestCommune(lat, lng, communes, wilayaCode = null) {
  const w = wilayaCode == null ? null : wcode(wilayaCode);
  let best = null, bestD = Infinity;
  const cosLat = Math.cos(lat * DEG);
  for (const c of communes) {
    if (w != null && wcode(c.wilaya_code) !== w) continue;
    const dx = (cLng(c) - lng) * cosLat;
    const dy = cLat(c) - lat;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = c; }
  }
  if (!best && w != null) return nearestCommune(lat, lng, communes);
  return best;
}

// Commune rows reach this file in two shapes: the flagship split files and
// algeria.json use latitude/longitude, and the copies pharmacies and ooredoo build
// for themselves use lat/lng. Reading both is what lets one rule serve every
// package instead of each keeping an inlined join that drifts.
const cLat = (c) => (c.latitude ?? c.lat);
const cLng = (c) => (c.longitude ?? c.lng);

const CODE_INDEX = new WeakMap();
function communeByCode(communes, code) {
  let index = CODE_INDEX.get(communes);
  if (!index) {
    index = new Map(communes.map((c) => [Number(c.code_commune), c]));
    CODE_INDEX.set(communes, index);
  }
  return index.get(Number(code)) ?? null;
}

/**
 * Which commune a point belongs to, without ever crossing a wilaya boundary.
 *
 * WHY THIS AND NOT NEAREST CENTROID. An unrestricted nearest-centroid join makes
 * every commune centre an attractor for everything around it, so moving 245 centres
 * moved 58 published records into a wilaya they are demonstrably not in: mosque
 * 31-0390 at [-0.414678, 35.547628] is inside OSM commune 3111 Oued Tlelat, wilaya
 * 31, and the join gave it Zahana in wilaya 29, outside the wilaya 29 polygon this
 * repository ships. Distance to a hand-placed centre is a weaker claim than
 * containment in a polygon, so containment decides and distance only breaks ties.
 *
 * 1. the wilaya whose SHIPPED polygon contains the point fixes the candidate set;
 * 2. inside it, the commune whose OSM outline contains the point wins outright;
 * 3. otherwise the nearest centre among that wilaya's communes;
 * 4. when no wilaya polygon contains the point at all (offshore, or outside the
 *    simplified national outline), the record keeps the wilaya it was published in
 *    and the caller is told, because a nearest-centre guess out there is exactly
 *    how those 58 happened.
 *
 * @returns {{commune: object|null, rule: string}} rule is one of `commune_polygon`,
 *   `wilaya_nearest`, `published_wilaya_nearest`, `unrestricted` or `unresolved`.
 */
export function resolveCommune(lat, lng, communes, publishedWilayaCode = null) {
  const inside = containingWilayaCode(lat, lng);
  const scope = inside ?? (publishedWilayaCode == null ? null : wcode(publishedWilayaCode));
  if (scope != null) {
    const code = containingCommuneCode(lat, lng, scope);
    const hit = code == null ? null : communeByCode(communes, code);
    if (hit) return { commune: hit, rule: "commune_polygon" };
  }
  const commune = nearestCommune(lat, lng, communes, scope);
  if (!commune) return { commune: null, rule: "unresolved" };
  if (inside != null) return { commune, rule: "wilaya_nearest" };
  return { commune, rule: scope != null ? "published_wilaya_nearest" : "unrestricted" };
}

/** Attach wilaya_code/commune/commune_code by resolveCommune() (mutates rows with
 *  lat/lng). A row's existing `wilaya_code` is its published wilaya, which is what
 *  the join keeps when no wilaya polygon contains the point. */
export function attachCommune(rows, communes = loadCommunes()) {
  for (const r of rows) {
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
    const { commune } = resolveCommune(r.lat, r.lng, communes, r.wilaya_code ?? null);
    if (!commune) continue;
    r.wilaya_code = wcode(commune.wilaya_code);
    r.commune = commune.name_fr;
    r.commune_code = commune.code_commune ?? null;
  }
  return rows;
}

/** Great-circle distance in metres. */
export function haversine(aLat, aLng, bLat, bLng) {
  const dLat = (bLat - aLat) * DEG, dLng = (bLng - aLng) * DEG;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * DEG) * Math.cos(bLat * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
}
