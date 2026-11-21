// Match an Operator's ordered Listed stops to package Stations or OSM bus-stop
// nodes (accuracy plan P4, ADR 0005). Pure: the caller loads the data and decides
// which communes a Line may use; this file only compares names and ranks.
//
// Nothing is placed by guess. A Listed stop is `exact` only when one candidate
// in an allowed commune has the same stop key; several equal candidates, or only
// fuzzy ones, are `ambiguous` and go to Owner review; otherwise `unmatched`.

import { looseKey } from "../../../packages/normalize/index.js";
import { haversine } from "../../../scripts/lib/commune-resolver.mjs";

// Leading words that only say "this is a stop", as Loose-key tokens, longest
// first. Dropped only at the start and only when a name is left after them.
const STOP_WORDS = [["arret", "de", "bus"], ["arret", "bus"], ["arret"], ["station"], ["محطه"], ["موقف"]];

/** The comparison key for a stop name: the shared Loose key (alef, hamza, taa
 *  marbuta, alef maqsura, accents, case, punctuation), digits split from a word
 *  they are glued to and read without leading zeros, and a leading stop word
 *  dropped. */
export function stopKey(name) {
  const tokens = looseKey(String(name ?? ""))
    .split(" ")
    .flatMap((t) => t.split(/(?<=\d)(?=\D)|(?<=\D)(?=\d)/u))
    .map((t) => (/^\d+$/.test(t) ? String(Number(t)) : t))
    .filter(Boolean);
  const prefix = STOP_WORDS.find((w) => w.every((t, i) => tokens[i] === t));
  return (prefix && prefix.length < tokens.length ? tokens.slice(prefix.length) : tokens).join(" ");
}

/**
 * Match one Line's ordered Listed stops.
 *
 * @param {Array<{position: number, name_ar: string|null, name_fr: string|null}>} listedStops
 * @param {Array<{kind: "station"|"osm_node", id: string|number, names: string[], lat: number, lng: number, commune_code: number|null}>} candidates
 * @param {{communeCodes: number[]}} options  the communes this Line may stop in
 */
export function matchListedStops(listedStops, candidates, { communeCodes }) {
  const allowed = new Set(communeCodes.map(Number));
  const keyed = candidates.map((c) => ({ ...c, keys: c.names.map(stopKey).filter(Boolean) }));
  const inside = keyed.filter((c) => allowed.has(Number(c.commune_code)));
  const outside = keyed.filter((c) => !allowed.has(Number(c.commune_code)));
  let anchor = null; // the previous exact match, the only thing distance is measured from

  return listedStops.map((stop) => {
    const keys = [stop.name_ar, stop.name_fr].filter(Boolean).map(stopKey);
    const equalIn = (pool) => pool.filter((c) => c.keys.some((k) => keys.includes(k)));
    const fuzzyIn = (pool) => pool.filter((c) => c.keys.some((k) => keys.some((l) => isFuzzy(k, l))));
    const equal = equalIn(inside);
    const row = { ...stop, outcome: "unmatched", station_id: null, osm_node_id: null, reason: null, candidates: [] };

    if (equal.length === 1) {
      const [c] = equal;
      anchor = c;
      return { ...row, outcome: "exact", [c.kind === "station" ? "station_id" : "osm_node_id"]: c.id };
    }
    if (equal.length > 1) {
      return { ...row, outcome: "ambiguous", reason: "several_candidates", candidates: ranked(equal, "equal", anchor) };
    }
    const fuzzy = fuzzyIn(inside);
    if (fuzzy.length) {
      return { ...row, outcome: "ambiguous", reason: "fuzzy_only", candidates: ranked(fuzzy, "fuzzy", anchor) };
    }
    return { ...row, reason: fuzzyIn(outside).length ? "name_outside_communes" : "no_candidate" };
  });
}

/** Two keys name the same place loosely: equal once the Arabic article is dropped
 *  from each word, or the shorter one sits whole, in order, inside the longer. */
export function isFuzzy(a, b) {
  const words = (k) => k.split(" ").map((w) => (w.startsWith("ال") && w.length > 3 ? w.slice(2) : w));
  const [x, y] = [words(a), words(b)].sort((p, q) => p.length - q.length);
  for (let i = 0; i + x.length <= y.length; i++) {
    if (x.every((w, j) => y[i + j] === w)) return true;
  }
  return false;
}

/** Candidates for review, nearest to the anchor first. Distance only orders; it
 *  never turns an ambiguous stop into a match. Without an anchor, input order. */
function ranked(pool, match, anchor) {
  const rows = pool.map((c) => ({
    kind: c.kind,
    id: c.id,
    name: c.names[0],
    commune_code: c.commune_code,
    match,
    distance_m: anchor ? Math.round(haversine(anchor.lat, anchor.lng, c.lat, c.lng)) : null,
  }));
  return anchor ? rows.sort((a, b) => a.distance_m - b.distance_m) : rows;
}

/** An Overpass node as a candidate: `name`, `name:ar`, `name:fr`, each split on
 *  OSM's ";" list separator, de-duplicated in that order. */
export function candidateFromOsm(element, communeCode) {
  const tags = element.tags ?? {};
  const names = [tags.name, tags["name:ar"], tags["name:fr"]]
    .filter(Boolean)
    .flatMap((v) => v.split(";"))
    .map((v) => v.trim())
    .filter(Boolean);
  return {
    kind: "osm_node",
    id: element.id,
    names: [...new Set(names)],
    lat: element.lat,
    lng: element.lon,
    commune_code: communeCode,
  };
}

/** The communes a network's Lines may stop in, from the commune registry rather
 *  than a hand-written list: the commune of the Line's wilaya named like its
 *  `network` (the seat), plus any commune of that wilaya whose Arabic name is one
 *  of the areas the Operator says it serves. Ascending codes. */
export function networkCommunes(communes, { wilayaCode, network, servedAreas = [] }) {
  const areas = new Set(servedAreas.map(stopKey));
  return communes
    .filter((c) => String(c.wilaya_code).padStart(2, "0") === String(wilayaCode).padStart(2, "0"))
    .filter((c) => stopKey(c.name_fr) === stopKey(network) || areas.has(stopKey(c.name_ar)))
    .map((c) => Number(c.code_commune))
    .sort((a, b) => a - b);
}
