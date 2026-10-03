// The one rule every generator joins commune and wilaya with, over injectable
// geometry so each clause can be tested on fixtures rather than on the country.
//
// WHY IT IS NOT "THE WILAYA POLYGON FIRST". The first version of this rule pinned
// the candidate communes to the wilaya whose SHIPPED polygon contains the point,
// so a commune outline outside that set could never win. The shipped wilaya 55
// polygon is about 50 km short of the decree's boundary (yasserstudio/geoalgeria.com#171),
// and that alone moved 50 published records out of El-Hadjira (5507) and El Alia
// (5513) into N'goussa (3003) in wilaya 30: mosque 55-0051 at
// [5.513943, 32.615544] is inside OpenStreetMap's El-Hadjira relation 6542937 and
// read N'goussa, 56.1 km from the centre it was given. A commune outline is the
// finer and better-sourced claim, so it decides FIRST and globally, and the wilaya
// comes from the commune registry rather than from a polygon we already know is
// wrong.
//
// THE CLAUSES, IN ORDER
//   1. the coordinate is too coarse to re-join at all       -> keep what is published
//   2. the published commune has no OpenStreetMap outline    -> keep what is published
//   3. an OpenStreetMap commune outline contains the point   -> that commune
//   4. the wilaya whose shipped polygon contains the point   -> nearest centre in it,
//      plus every outline-less commune of that wilaya or within 10 km of the point
//   5. no wilaya polygon contains the point                  -> keep what is published
//
// Clauses 1, 2 and 5 keep a published value rather than inventing one, and every one
// of them is reported by name so a caller can count them. There is no national
// fallback: a search that silently widens to the whole country while reporting that
// it stayed inside a wilaya is how the mislabelled joins happened in the first place.

import { coordDecimals, MIN_EXACT_DECIMALS } from "../../packages/schema/index.js";

const DEG = Math.PI / 180;

/** Outline-less communes are reachable by distance out to here, so the four communes
 *  OpenStreetMap has no relation for can still claim a point their neighbours' stale
 *  outlines do not cover. 10 km is about the radius of a northern commune. */
export const OUTLINE_LESS_RADIUS_M = 10000;

/** Wilaya code -> zero-padded 2-digit string ("16", 16, "1" -> "16"/"01"). */
export const wcode = (c) => (c == null ? null : String(c).padStart(2, "0"));

// Commune rows reach this file in two shapes: the flagship split files and
// algeria.json use latitude/longitude, and the copies pharmacies and ooredoo build
// for themselves use lat/lng. Reading both is what lets one rule serve every package.
export const cLat = (c) => c.latitude ?? c.lat;
export const cLng = (c) => c.longitude ?? c.lng;

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
export function inCommuneOutline(lng, lat, entry) {
  const [w, s, e, n] = entry.bbox;
  if (lng < w || lng > e || lat < s || lat > n) return false;
  return entry.outer.some((r) => inRing(lng, lat, r)) && !entry.inner.some((r) => inRing(lng, lat, r));
}

/** Great-circle distance in metres. */
export function haversine(aLat, aLng, bLat, bLng) {
  const dLat = (bLat - aLat) * DEG, dLng = (bLng - aLng) * DEG;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * DEG) * Math.cos(bLat * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
}

/** A coordinate this rule refuses to re-join: fewer than MIN_EXACT_DECIMALS digits on
 *  its coarser axis. That is the repository's own definition of a value too rounded to
 *  be a point (`packages/schema` MIN_EXACT_DECIMALS), and it catches the placeholders
 *  by construction: culture's `19-bcp-08` at [6, 36] and `20-bcp-01` at [0, 35] are
 *  whole degrees, 100 km wide, and a join on them is arithmetic on a guess. */
export function isTooCoarseToJoin(lat, lng) {
  return coordDecimals(lat, lng) < MIN_EXACT_DECIMALS;
}

/** Nearest commune centre among `list`, ties broken by the lower `code_commune` so the
 *  answer never depends on file order. Planar squared distance, cosLat-scaled. */
function nearestOf(lat, lng, list) {
  let best = null, bestD = Infinity;
  const cosLat = Math.cos(lat * DEG);
  for (const c of list) {
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
 * Bind the rule to one set of geometry.
 *
 * @param {object} deps
 * @param {Map<string, object>} deps.wilayaGeometries  wilaya code -> GeoJSON geometry
 * @param {Array<object>} deps.outlines  commune outline entries
 *   (`{code_commune, wilaya_code, usable, bbox, outer, inner}`); an entry with
 *   `usable: false` carries no rings and marks the commune as outline-less
 * @param {Array<object>} deps.communes  the flagship commune rows, with centres
 * @param {(lng: number, lat: number, geometry: object) => boolean} deps.pointInGeometry
 */
export function createCommuneResolver({ wilayaGeometries, outlines, communes, pointInGeometry }) {
  const byCode = new Map(communes.map((c) => [Number(c.code_commune), c]));
  const byWilaya = new Map();
  for (const c of communes) {
    const w = wcode(c.wilaya_code);
    if (!byWilaya.has(w)) byWilaya.set(w, []);
    byWilaya.get(w).push(c);
  }

  // Outlines indexed by whole degree of latitude, so a global containment search
  // touches the few dozen outlines that can possibly hold the point rather than all
  // 1,537. Correctness does not depend on the index: the bands are derived from each
  // entry's own bbox, so an entry is in every band it spans.
  const usable = outlines.filter((o) => o.usable !== false);
  const bands = new Map();
  for (const o of usable) {
    for (let b = Math.floor(o.bbox[1]); b <= Math.floor(o.bbox[3]); b++) {
      if (!bands.has(b)) bands.set(b, []);
      bands.get(b).push(o);
    }
  }
  const outlineByCode = new Map(usable.map((o) => [Number(o.code_commune), o]));
  const outlineCodes = new Set(outlineByCode.keys());
  // The communes with no outline at all, as flagship rows, so clause 4 can offer them
  // by distance. A commune absent from the outline file entirely counts too.
  const outlineLess = communes.filter((c) => !outlineCodes.has(Number(c.code_commune)));

  /** Wilaya code whose SHIPPED polygon contains the point, or null. */
  const containingWilayaCode = (lat, lng) => {
    for (const [code, geom] of wilayaGeometries) if (pointInGeometry(lng, lat, geom)) return code;
    return null;
  };

  /** Every commune whose OSM outline contains the point, in ascending code order. */
  const containingCommunes = (lat, lng) => {
    const hits = [];
    for (const o of bands.get(Math.floor(lat)) ?? []) if (inCommuneOutline(lng, lat, o)) hits.push(o);
    return hits.sort((a, b) => Number(a.code_commune) - Number(b.code_commune));
  };

  const hasOutline = (code) => outlineCodes.has(Number(code));
  const outlineFor = (code) => outlineByCode.get(Number(code)) ?? null;

  /** Is the point inside the outline of `code`? `null` when that commune has none. */
  const insideOwnOutline = (lat, lng, code) => {
    const o = outlineFor(code);
    return o == null ? null : inCommuneOutline(lng, lat, o);
  };

  /**
   * @param {number} lat
   * @param {number} lng
   * @param {object|string|number|null} published  the record as published, or just its
   *   wilaya code. Read: `wilaya_code`, `commune_code`, `geo_precision`.
   * @returns {{commune: object|null, rule: string}}
   */
  function resolve(lat, lng, published = null) {
    const pub =
      published == null
        ? {}
        : typeof published === "object"
          ? published
          : { wilaya_code: published };
    const publishedCommune = pub.commune_code == null ? null : (byCode.get(Number(pub.commune_code)) ?? null);
    const publishedWilaya = pub.wilaya_code == null ? null : wcode(pub.wilaya_code);

    // 1. A coordinate too coarse to be a point cannot move anything.
    if (isTooCoarseToJoin(lat, lng) && (publishedCommune || publishedWilaya)) {
      return { commune: publishedCommune, rule: "kept_low_precision" };
    }

    // 2. A commune OpenStreetMap has no relation for cannot be contradicted by
    //    geometry, and its neighbours' outlines are stale rather than authoritative
    //    (OSM's Douira relation still covers Bir Touta, split out of it).
    if (publishedCommune && !hasOutline(publishedCommune.code_commune)) {
      return { commune: publishedCommune, rule: "kept_no_outline" };
    }

    // 3. Containment in a commune outline, searched over the whole country. The
    //    wilaya comes from the commune registry, never from a wilaya polygon.
    const hits = containingCommunes(lat, lng);
    if (hits.length) {
      const rows = hits.map((h) => byCode.get(Number(h.code_commune))).filter(Boolean);
      if (rows.length) {
        // Outlines overlap where OpenStreetMap has not caught up with a split. The
        // published commune wins its own overlap, so a record does not drift between
        // two equally containing claims; otherwise the nearest centre decides.
        const keep = publishedCommune && rows.some((r) => Number(r.code_commune) === Number(publishedCommune.code_commune));
        return { commune: keep ? publishedCommune : nearestOf(lat, lng, rows), rule: "commune_outline" };
      }
    }

    // 4. No outline holds it. Candidates are the communes of the wilaya whose shipped
    //    polygon holds it, plus every outline-less commune of that wilaya or within
    //    10 km, and the nearest centre wins.
    const inside = containingWilayaCode(lat, lng);
    if (inside != null) {
      const pool = [...(byWilaya.get(inside) ?? [])];
      const seen = new Set(pool.map((c) => Number(c.code_commune)));
      for (const c of outlineLess) {
        if (seen.has(Number(c.code_commune))) continue;
        if (haversine(lat, lng, cLat(c), cLng(c)) <= OUTLINE_LESS_RADIUS_M) pool.push(c);
      }
      const commune = nearestOf(lat, lng, pool);
      if (!commune) return { commune: publishedCommune, rule: publishedCommune ? "kept_unresolved" : "unresolved" };
      // The conservative rule, stated rather than assumed: a move needs containment in
      // an outline (clause 3) or proof that the point left its old commune's outline.
      if (publishedCommune && Number(commune.code_commune) !== Number(publishedCommune.code_commune)) {
        if (insideOwnOutline(lat, lng, publishedCommune.code_commune) !== false) {
          return { commune: publishedCommune, rule: "kept_conservative" };
        }
      }
      return { commune, rule: "wilaya_nearest" };
    }

    // 5. Outside every wilaya polygon (offshore, or outside the simplified national
    //    outline). Nothing out here can be proved, so nothing is guessed.
    if (publishedCommune) return { commune: publishedCommune, rule: "kept_outside_wilaya_polygons" };
    if (publishedWilaya != null && byWilaya.has(publishedWilaya)) {
      return { commune: nearestOf(lat, lng, byWilaya.get(publishedWilaya)), rule: "published_wilaya_nearest" };
    }
    return { commune: null, rule: "unresolved" };
  }

  return {
    resolve,
    containingWilayaCode,
    containingCommunes,
    containingCommuneCode: (lat, lng) => containingCommunes(lat, lng)[0]?.code_commune ?? null,
    hasOutline,
    outlineFor,
    insideOwnOutline,
    communeByCode: (code) => byCode.get(Number(code)) ?? null,
    outlineLessCodes: () => outlineLess.map((c) => Number(c.code_commune)).sort((a, b) => a - b),
  };
}

/** Every rule name `resolve()` can report, so a caller can initialise its counters
 *  and a test can assert the set is closed. */
export const RESOLVE_RULES = [
  "commune_outline",
  "wilaya_nearest",
  "kept_low_precision",
  "kept_no_outline",
  "kept_conservative",
  "kept_outside_wilaya_polygons",
  "kept_unresolved",
  "published_wilaya_nearest",
  "unresolved",
];
