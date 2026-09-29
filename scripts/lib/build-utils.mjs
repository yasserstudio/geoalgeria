// Shared build helpers for GeoAlgeria data packages.
// Reused by the transport-sector build scripts (gares-routieres, ferroviaire,
// buses) so the CSV/GeoJSON/commune-join logic lives in one place. Existing
// per-package scripts keep their inlined copies; this is additive.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadBoundaries, pointInGeometry } from "../../packages/schema/index.js";
import {
  RESOLVE_RULES,
  cLat,
  cLng,
  createCommuneResolver,
  haversine,
  wcode,
} from "./commune-resolver.mjs";

export { RESOLVE_RULES, haversine, wcode };
export { OUTLINE_LESS_RADIUS_M, isTooCoarseToJoin } from "./commune-resolver.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEG = Math.PI / 180;

// --- the one resolver, over the geometry this repository ships ----------------
//
// The wilaya polygons are the 69 display-grade outlines of
// packages/dataset/data/geojson/wilaya-boundaries.geojson. The commune outlines are
// OpenStreetMap's, reduced once into research/_commune-centres/commune-boundaries.json
// by scripts/build-commune-boundary-cache.mjs (that script refuses to write unless
// every one of the 1,541 containment verdicts is identical to the verdict from the
// unsimplified rings). It is a file, never a query: a generator that fetches is a
// generator that fails when Overpass is busy. It stays in research/ and ships in no
// package.
//
// The rule itself, with its clause order and the reasons for it, is
// scripts/lib/commune-resolver.mjs. It is separate so it can be tested on fixtures
// (test/commune-resolver.test.mjs) instead of only on the country.

// The commune set the resolver uses when a caller names none, loaded once.
let DEFAULT_COMMUNES = null;
const defaultCommunes = () => (DEFAULT_COMMUNES ??= loadCommunes());

// The geometry is parsed once per process (the outline file is 3.7 MB), and a resolver
// is memoised PER COMMUNE ARRAY rather than in one slot. Both matter: a single slot
// thrashed between the array a generator passes and the default one
// insideOwnCommuneOutline() uses, and re-parsing on every thrash turned one grid test
// into 185 seconds.
let GEOMETRY = null;
function geometry() {
  if (!GEOMETRY) {
    GEOMETRY = {
      wilayaGeometries: loadBoundaries(
        JSON.parse(
          readFileSync(join(REPO_ROOT, "packages", "dataset", "data", "geojson", "wilaya-boundaries.geojson"), "utf-8"),
        ),
      ),
      outlines: JSON.parse(
        readFileSync(join(REPO_ROOT, "research", "_commune-centres", "commune-boundaries.json"), "utf-8"),
      ).communes,
    };
  }
  return GEOMETRY;
}

const RESOLVERS = new WeakMap();
export function communeResolver(communes = defaultCommunes()) {
  let resolver = RESOLVERS.get(communes);
  if (!resolver) {
    resolver = Object.assign(createCommuneResolver({ ...geometry(), communes, pointInGeometry }), { communes });
    RESOLVERS.set(communes, resolver);
  }
  return resolver;
}

/** Wilaya code whose polygon contains (lat,lng), or null when no polygon does
 *  (offshore, or just outside the simplified national outline). */
export function containingWilayaCode(lat, lng) {
  return communeResolver().containingWilayaCode(lat, lng);
}

/** `code_commune` of the commune whose OSM outline contains (lat,lng), searched over
 *  the whole country, or null when none does. Ties (overlapping outlines, where OSM
 *  has not caught up with a split) come back in ascending code order. */
export function containingCommuneCode(lat, lng) {
  return communeResolver().containingCommuneCode(lat, lng);
}

/** Is (lat,lng) inside the OSM outline of `communeCode`? `null` when that commune has
 *  no outline, which is not the same answer as `false`. */
export function insideOwnCommuneOutline(lat, lng, communeCode) {
  return communeResolver().insideOwnOutline(lat, lng, communeCode);
}

/** The `code_commune`s OpenStreetMap ships no `admin_level=8` relation for. */
export function outlineLessCommuneCodes() {
  return communeResolver().outlineLessCodes();
}

/** Round to 6 decimals (≈0.1 m), or null. */
export const round6 = (n) =>
  n == null || !Number.isFinite(+n) ? null : Math.round(+n * 1e6) / 1e6;

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

/** Nearest commune centre to (lat,lng), squared planar distance, cosLat-scaled.
 *  With `wilayaCode`, only that wilaya's communes are candidates: a point near a
 *  boundary must not be claimed by the neighbouring wilaya's nearer centre (the
 *  ooredoo mislinks, ROADMAP "Generators"). A code that matches no commune row
 *  returns null: the silent widening to a national search this used to do reported
 *  `published_wilaya_nearest` for an answer that had left the wilaya entirely. */
export function nearestCommune(lat, lng, communes, wilayaCode = null) {
  const w = wilayaCode == null ? null : wcode(wilayaCode);
  let best = null, bestD = Infinity;
  const cosLat = Math.cos(lat * DEG);
  for (const c of communes) {
    if (w != null && wcode(c.wilaya_code) !== w) continue;
    const dx = (cLng(c) - lng) * cosLat;
    const dy = cLat(c) - lat;
    const d = dx * dx + dy * dy;
    if (d < bestD || (d === bestD && best && Number(c.code_commune) < Number(best.code_commune))) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/**
 * Which commune a point belongs to. The rule and the reasons for its clause order are
 * scripts/lib/commune-resolver.mjs; this is the binding to the geometry this
 * repository ships.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {Array<object>} communes  the flagship commune rows
 * @param {object|string|number|null} published  the record as published, or just its
 *   wilaya code. `wilaya_code`, `commune_code` and `geo_precision` are read; passing
 *   `commune_code` is what lets the rule keep a claim it cannot disprove instead of
 *   re-guessing it.
 * @returns {{commune: object|null, rule: string}} `rule` is one of RESOLVE_RULES.
 */
export function resolveCommune(lat, lng, communes, published = null) {
  return communeResolver(communes).resolve(lat, lng, published);
}

/** Attach wilaya_code/commune/commune_code by resolveCommune() (mutates rows with
 *  lat/lng). `publishedFor(row)` returns the row AS PUBLISHED, whose `wilaya_code`,
 *  `commune_code` and `geo_precision` are the claim the rule keeps when geometry
 *  cannot contradict it; the default reads those fields off the row itself, which is
 *  right for a generator whose rows carry them already. */
export function attachCommune(rows, communes = defaultCommunes(), publishedFor = null) {
  attachCommuneWithRules(rows, communes, publishedFor);
  return rows;
}

/** attachCommune() plus the per-rule tally, so a generator can print which clause
 *  decided each of its records instead of asserting that one did. */
export function attachCommuneWithRules(rows, communes = defaultCommunes(), publishedFor = null) {
  const counts = Object.fromEntries(RESOLVE_RULES.map((r) => [r, 0]));
  for (const r of rows) {
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
    const { commune, rule } = resolveCommune(r.lat, r.lng, communes, publishedFor ? publishedFor(r) : r);
    counts[rule]++;
    if (!commune) continue;
    r.wilaya_code = wcode(commune.wilaya_code);
    r.commune = commune.name_fr;
    r.commune_code = commune.code_commune ?? null;
  }
  return counts;
}

/** One line naming which clause decided how many records, for a generator's log. */
export function describeLinkage(counts) {
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ");
}
