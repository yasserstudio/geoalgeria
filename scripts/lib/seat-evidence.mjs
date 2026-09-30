// The two reads on an OSM chef-lieu node that decide whether a stored commune
// centre is wrong: is that node the seat of the commune we are testing, and is our
// value a mangled form of it?
//
// WHY IT IS ITS OWN FILE. Both answers are logic, not data, so both are unit
// tested (test/seat-evidence.test.mjs) and both are read by two callers:
// scripts/audit-commune-centres.mjs, which classifies, and the standing tests,
// which must not re-implement the rule they enforce.
//
// 1. NAME AGREEMENT. Until 2026-09-29 this was key equality on the folded FR or AR
//    name, and the audit's evidence gate depended on it. That excluded 12 rows
//    whose evidence this repository already held: the relation and its
//    `admin_centre` node carry the SAME `wikidata` item, which is OpenStreetMap
//    stating that the node is that commune's seat far more directly than a
//    transliteration ever does (Hanif/Ahnif, Illilten/Souk El Had, Inghar/In Ghar
//    and nine more). A thirteenth, Rahia (426), differs from "El Rahia" by the
//    definite article alone. So agreement is now: the folded names match, or the
//    article-free folded names match, or the two wikidata items are the same one.
//
// 2. COORDINATE ANOMALY. Containment is blind to a longitude sign flip inside a
//    Saharan commune big enough to hold both values: Fenoughil (115) stored
//    [0.3, 27.602777] for a seat at [-0.30211, 27.606097], 59.3 km away and inside
//    its own commune either way. A stored value whose sign-flipped or lat/lon
//    swapped form lands within a kilometre of the seat is not a disagreement
//    between two hand-placed claims; it is our value, mangled. That is a named,
//    decidable defect, so it is detected rather than waited on.

import { conservativeKey, looseKey } from "../../packages/normalize/index.js";

/** Metres between two [lng, lat] pairs (great circle). */
export function metresBetween(aLng, aLat, bLng, bLat) {
  const DEG = Math.PI / 180;
  const dLat = (bLat - aLat) * DEG;
  const dLng = (bLng - aLng) * DEG;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * DEG) * Math.cos(bLat * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
}

// The transliterated Arabic definite article, as it appears as a separate word in
// this repository's French commune names. Only a LEADING one is dropped, and only
// when a word follows it, so "El Oued" and "Oued" agree while "El" alone is left
// as the name it is.
const LATIN_ARTICLES = new Set(["el", "al", "le", "la", "les", "ed", "es", "er"]);

/** Folded French name with a leading definite article dropped. */
export function articleFreeLatinKey(value) {
  const words = conservativeKey(String(value ?? "")).split(" ");
  return words.length > 1 && LATIN_ARTICLES.has(words[0]) ? words.slice(1).join(" ") : words.join(" ");
}

/** Folded Arabic name with every word's definite article ال dropped. */
export function articleFreeArabicKey(value) {
  return looseKey(String(value ?? "")).replace(/(^|\s)ال/g, "$1");
}

/**
 * Is `seatTags` the chef-lieu node of the commune named (nameFr, nameAr), whose
 * relation carries `relationTags`?
 *
 * Returns how it agrees, or `false`: "name" (the folded FR or AR name matches),
 * "wikidata" (relation and node carry the same item) or "article" (the names match
 * once the definite article is dropped).
 */
export function seatNameAgreement({ nameFr, nameAr, relationTags, seatTags }) {
  if (!seatTags) return false;
  const seatFr = seatTags["name:fr"] ?? seatTags.name ?? "";
  const seatAr = seatTags["name:ar"] ?? "";
  if (
    conservativeKey(seatFr) === conservativeKey(nameFr ?? "") ||
    (nameAr && looseKey(seatAr) === looseKey(nameAr))
  ) {
    return "name";
  }
  const item = relationTags?.wikidata;
  if (item && seatTags.wikidata && item === seatTags.wikidata) return "wikidata";
  const ourFr = articleFreeLatinKey(nameFr);
  if (ourFr && articleFreeLatinKey(seatFr) === ourFr) return "article";
  const ourAr = articleFreeArabicKey(nameAr);
  if (ourAr && articleFreeArabicKey(seatAr) === ourAr) return "article";
  return false;
}

// Every way one [lng, lat] pair gets mangled into another: a dropped minus on
// either ordinate, both, and the six-decimal columns written in the wrong order.
const MANGLED_FORMS = [
  ["longitude_sign", (lng, lat) => [-lng, lat]],
  ["latitude_sign", (lng, lat) => [lng, -lat]],
  ["both_signs", (lng, lat) => [-lng, -lat]],
  ["swapped", (lng, lat) => [lat, lng]],
  ["swapped_longitude_sign", (lng, lat) => [-lat, lng]],
  ["swapped_latitude_sign", (lng, lat) => [lat, -lng]],
];

/** How close a mangled form has to land on the seat to name our value the mangled
 *  one. A kilometre is far wider than any rounding and far narrower than the
 *  59.3 km Fenoughil error it catches. */
export const ANOMALY_TOLERANCE_M = 1000;

/**
 * Is `ours` a mangled form of `seat`? Both are [lng, lat].
 *
 * Returns `{ form, metres }` for the first mangled form that lands within
 * ANOMALY_TOLERANCE_M of the seat, or `null`. A value already that close to the
 * seat is simply the same claim and is never an anomaly.
 */
export function coordinateAnomaly(ours, seat) {
  if (!Array.isArray(ours) || !Array.isArray(seat)) return null;
  const [lng, lat] = ours.map(Number);
  const [sLng, sLat] = seat.map(Number);
  if (![lng, lat, sLng, sLat].every(Number.isFinite)) return null;
  if (metresBetween(lng, lat, sLng, sLat) <= ANOMALY_TOLERANCE_M) return null;
  for (const [form, mangle] of MANGLED_FORMS) {
    const [x, y] = mangle(lng, lat);
    const metres = metresBetween(x, y, sLng, sLat);
    if (metres <= ANOMALY_TOLERANCE_M) return { form, metres: Math.round(metres) };
  }
  return null;
}
