// Which commune a DGPC unit belongs to, over injectable geometry so each clause can be
// tested on fixtures rather than on the country
// (test/protection-civile-commune-join.test.mjs).
//
// WHY THIS IS NOT JUST `resolveCommune`. The shared rule
// (scripts/lib/commune-resolver.mjs) joins a PUBLISHED record, whose own
// `commune_code` is the claim it keeps when geometry cannot contradict it. A DGPC
// rebuild has no published claim to keep: it has the DGPC's own `commune_1`, an
// Arabic commune NAME, which is a different and stronger kind of evidence than a
// coordinate. So this file keeps the source's name as its first clause and borrows the
// shared rule's geometry, its containment query and its coarse-coordinate guard, for
// the rest. The wilaya is already decided before this runs (the boundary-derived code,
// reconciled against the DGPC's own `cod_wilaya`), and nothing here may move it.
//
// THE CLAUSES, IN ORDER
//   1. the DGPC's commune_1 folds to exactly one commune of the wilaya  -> that commune
//   2. ... or to exactly one within two edits of it                     -> that commune
//   3. the coordinate is too coarse to join on                          -> clause 5
//   4. a commune outline of the wilaya contains the point               -> that commune
//   5. the nearest commune centre in the wilaya                         -> best effort
//
// EVERY CLAUSE READS ONLY THE SOURCES. The capture, the commune registry and the
// committed outline cache decide, and nothing here reads the package's own published
// records. A join that consults its own last output is not reproducible: a first build
// from an empty data/ answers differently from a rebuild, so the bytes depend on the
// order the builds happened in rather than on the sources (ADR 0001 rule 8). Where a
// clause gets a unit wrong, the correction is a frozen row in
// quality/overrides/protection-civile.json, which writePackageV2 applies after this
// join and which is a reviewable input rather than a feedback loop.
//
// WHY CLAUSE 2 EXISTS. Clause 1 is exact equality on the folded key, so a one-character
// spelling difference in the DGPC's own name silently demotes the unit to geometry.
// 16-048 publishes "بن عكنون" against the registry's "ابن عكنون" (Ben Aknoun) and
// 33-007 "إن أميناس" against "إن أمناس" (In Amenas): one edit each, and in both cases
// the next-nearest commune of the wilaya is five or more edits away, so there is
// nothing to be ambiguous about. Without clause 2 the outline then overruled the
// source, putting the Ben Aknoun zoo unit in Hydra, 103 m inside Hydra's simplified
// ring, and the In Amenas unit in Bordj Omar Driss. Two edits is the ceiling because
// the registry's own commune names are short: a wider window starts to reach a
// genuinely different commune, and a tie or an empty window falls through to geometry
// rather than guessing.
//
// WHERE CLAUSE 2 IS KNOWN TO BE WRONG. 23-017 is the one unit whose tolerant match the
// sources cannot settle: the DGPC files it under "وادي العنب", one edit from Oued El
// Aneb (2306), with its own unit name and address agreeing, yet the point is 65 m
// outside Oued El Aneb's reduced outline and 86 m inside El Bouni's (2305). The rule
// answers 2306 and the review decided 2305, so that decision is a ledger row with its
// OpenStreetMap evidence, not a clause. Encoding it as a clause is what made this join
// read its own output.
//
// WHY CLAUSE 4 ASKS THE WHOLE COUNTRY AND THEN FILTERS. The containment search is
// global by design (`containingCommunes`), because a commune outline is a finer claim
// than any wilaya polygon and the shipped polygons are known to be wrong by tens of
// kilometres in places. The wilaya FILTERS that answer, it does not scope the search:
// where OpenStreetMap outlines overlap across a wilaya line, taking the lowest code
// nationwide and then checking it would discard a perfectly good in-wilaya outline and
// fall to a centre. Every containing outline is offered, in ascending code order, and
// the first one belonging to the wilaya wins.

import { isTooCoarseToJoin } from "./commune-resolver.mjs";

/** The widest spelling difference clause 2 will cross, in edits on the folded key. */
export const NAME_EDIT_TOLERANCE = 2;

/** Arabic name folding for commune matching: strip diacritics and tatweel, fold the
 *  alef, ya and ta-marbuta variants, drop everything that is not Arabic or a space.
 *  Same recipe as the sante generator. */
export function normAr(s) {
  if (!s) return "";
  s = s.replace(/[ً-ْٰـ]/g, "");
  s = s
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
  return s.replace(/[^؀-ۿ ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Levenshtein distance, or `null` as soon as it is known to exceed `max`. The length
 *  gap is a free lower bound, and a row whose every cell is already over the ceiling
 *  can only grow, so both cut the work off early. */
export function editDistanceAtMost(a, b, max) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return null;
    prev = cur;
  }
  return prev[b.length] <= max ? prev[b.length] : null;
}

/** The one commune of `list` whose folded name is nearest `key` within
 *  NAME_EDIT_TOLERANCE, or `null` when nothing is that close or more than one is
 *  equally close. Ambiguity is never broken by file order. */
export function nearestNameMatch(key, list, max = NAME_EDIT_TOLERANCE) {
  if (!key) return null;
  let best = [];
  let bestD = max + 1;
  for (const c of list) {
    const d = editDistanceAtMost(key, c.name_ar_norm, Math.min(max, bestD));
    if (d == null) continue;
    if (d < bestD) {
      bestD = d;
      best = [c];
    } else if (d === bestD) {
      best.push(c);
    }
  }
  return best.length === 1 ? best[0] : null;
}

/**
 * Bind the join to one containment query.
 *
 * @param {object} deps
 * @param {(lat: number, lng: number) => Array<{code_commune: number|string}>}
 *   deps.containingCommunes  every commune outline containing the point, nationwide,
 *   in ascending `code_commune` order (the shared resolver's own query)
 * @param {(lat: number, lng: number) => boolean} [deps.tooCoarseToJoin]
 */
export function createCommuneJoin({ containingCommunes, tooCoarseToJoin = isTooCoarseToJoin }) {
  /**
   * @param {string|null} commune1  the DGPC's own Arabic commune name
   * @param {string} wilayaCode  the wilaya already decided for this unit
   * @param {object} communes  `{ byWilaya }`, rows carrying `name_ar_norm`, `lat`, `lng`
   * @param {object} stats  counters, incremented by the clause that decided
   */
  return function assignCommune(commune1, wilayaCode, lng, lat, communes, stats) {
    const list = communes.byWilaya.get(wilayaCode);
    if (!list || !list.length) return null;
    const rowFor = (code) => list.find((c) => Number(c.code_commune) === Number(code)) ?? null;

    // Containment, asked at most once and only for a coordinate rounded finely enough
    // to be a point at all: joining on a whole-degree placeholder is arithmetic on a
    // guess, and the shared rule refuses it for the same reason (MIN_EXACT_DECIMALS).
    // The query is GLOBAL and the wilaya filters it, so an overlap crossing a wilaya
    // line cannot discard a good in-wilaya outline.
    let containing;
    const containingOfWilaya = () => {
      if (containing === undefined) {
        containing = tooCoarseToJoin(lat, lng)
          ? null
          : containingCommunes(lat, lng).find((h) =>
              list.some((c) => Number(c.code_commune) === Number(h.code_commune)),
            ) ?? null;
      }
      return containing;
    };

    // 1 + 2. The source's own name, exactly and then within two edits.
    const key = normAr(commune1);
    if (key) {
      const exact = list.find((c) => c.name_ar_norm === key);
      if (exact) { stats.commune_name++; return exact; }
      const near = nearestNameMatch(key, list);
      if (near) { stats.commune_name_near++; return near; }
    }

    // 3 + 4. The commune outline of the wilaya that contains the point.
    const hit = containingOfWilaya();
    if (hit) {
      stats.commune_outline++;
      return rowFor(hit.code_commune);
    }

    // 5. Nearest commune centre in the wilaya. Planar squared distance, cosLat-scaled.
    let best = null, bestD = Infinity;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    for (const c of list) {
      const dx = (c.lng - lng) * cosLat;
      const dy = c.lat - lat;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = c; }
    }
    stats.commune_centroid++;
    return best;
  };
}

/** Every counter `assignCommune` can increment, so a caller can initialise them all
 *  and a test can assert the set is closed. */
export const COMMUNE_JOIN_CLAUSES = [
  "commune_name",
  "commune_name_near",
  "commune_outline",
  "commune_centroid",
];
