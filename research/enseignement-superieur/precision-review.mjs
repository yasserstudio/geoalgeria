#!/usr/bin/env node
/**
 * Precision review of @geoalgeria/enseignement-superieur's approximate records
 * (run 2026-10-28), written as a Review queue in the sense of docs/adr/0001 and
 * CONTEXT.md "Coordinate review".
 *
 * For every record published with geo_precision "approximate" it looks for the
 * institution's own campus in the committed OpenStreetMap capture
 * sources/enseignement-superieur/osm-campuses.json and writes what it finds to
 * research/enseignement-superieur/precision-review-2026-10-28.json. It promotes
 * nothing and edits no seed or data file: the capture is OpenStreetMap, one
 * source, and ADR 0001 needs two independent ones before a point is exact, so
 * every match it finds is a single-source Claim for the queue.
 *
 * Offline and deterministic: it reads committed files only, carries no clock,
 * and sorts everything it writes, so two runs give the same bytes.
 *
 * Run:  node research/enseignement-superieur/precision-review.mjs
 *
 * HOW A CAPTURE ELEMENT BECOMES A CLAIM (strict on purpose: a wrong match is
 * worse than none)
 *
 *  1. website: the element's website / contact:website / url host (www.
 *     stripped) equals the record's website host.
 *     website_subdomain: the element's host is a sub-domain of the record's
 *     (a faculty of the institution, not its campus).
 *     A record host that is a sub-domain of the element's (ens.univ-mosta.dz
 *     against univ-mosta.dz) is the parent university and is no tie at all.
 *  2. name: one name tag of the element (name, name:fr/en/ar, official_name*,
 *     alt_name*, short_name*; old_name is a former name and is not read) against
 *     the record's name or name_ar, compared token by token after folding:
 *       - the institution type asserted by the two names agrees (universite,
 *         centre universitaire, ENS, ecole, institut, academie); an element
 *         named as a faculty, department, laboratory, annex, residence or as a
 *         CFPA/lycee/CEM never name-ties;
 *       - place names of the record's own wilaya (the wilaya and its communes)
 *         are read out of the record name as constraints: each must be named by
 *         the element or contain the element;
 *       - every other significant token of the record name is on the element
 *         (core tie), or, for a name with an eponym after its dash, every token
 *         of the eponym is (eponym tie, at least two tokens);
 *       - a core of ONE token needs a place to hold it: one the name states,
 *         or the commune a commune-method record already declares;
 *       - the qualifiers military / superieur / preparatoire are on both names
 *         or on neither (QUALIFIERS);
 *       - words compare after folding, with an Arabic proclitic (b-, w-, l-) or
 *         feminine/plural ending (-a, -at, ta marbuta) and a French plural -s
 *         ignored, and one edit allowed in words of six letters or more;
 *       - a core with no token left but places ties only a universite, centre
 *         universitaire or ENS whose element names the place itself;
 *       - a parenthesis or an "ex ..." / "sabiqan ..." tail is a location or a
 *         former name, not part of the name: its places are constraints, its
 *         other words are not required;
 *       - the element lies in the record's declared wilaya, and is not the
 *         website-tied campus of another record nor within the copy radius of
 *         another record's exact point.
 *  3. The element's point (node lat/lon, way/relation center) is placed in a
 *     commune by the OSM outlines (research/_commune-centres/commune-boundaries.json)
 *     and in a wilaya by the commune outline's wilaya, else the wilaya polygon.
 *     A website tie outside the declared wilaya is kept and flagged; a name tie
 *     outside it is dropped.
 *
 * DECISIONS taken by reading the capture, each with its reason, are the tables
 * WEBSITE_REJECTED, NOT_OWN_SITE and ROLES below.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { containingCommuneCode, containingWilayaCode, haversine } from "../../scripts/lib/build-utils.mjs";
import { AGREEMENT_KM, COPY_RADIUS_M, MOVE_CAP_KM } from "../../scripts/review/thresholds.mjs";

const RUN = "2026-10-28";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT = join(HERE, `precision-review-${RUN}.json`);
const readJson = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), "utf8"));

const PKG = "enseignement-superieur";
const RECORDS = readJson("packages", PKG, "data", "institutions.json");
const CAPTURE = readJson("sources", PKG, "osm-campuses.json");
const MANIFEST = readJson("sources", PKG, "manifest.json")["osm-campuses"];
const SEED = readJson("packages", PKG, "scripts", "seeds", "bac-2026.json");
const WILAYAS = readJson("packages", "dataset", "data", "wilayas.json").wilayas;
const FLAGSHIP_COMMUNES = readJson("packages", "dataset", "data", "geojson", "communes.geojson").features.map((f) => f.properties);
const OUTLINES = readJson("research", "_commune-centres", "commune-boundaries.json").communes;

// ---- decisions read off the capture ----------------------------------------

/** Website ties the capture states but the element's own name contradicts. */
const WEBSITE_REJECTED = {
  "00042|way/236032205":
    "the element carries univ-setif.dz but is named Universite Mohamed Lamine Debaghine - Setif 2, another institution of this package",
  "00072|way/216905046":
    "the element carries enssp.dz but is named Universite d'Alger 3 - Faculte des Sciences d'Information et Communication (ITFC), a faculty of another university",
};

/** Record websites that are not the institution's own site, so no host tie. */
const NOT_OWN_SITE = {
  "asal.dz": "a page on the Algerian Space Agency's site, not the school's own; the capture element carrying asal.dz is ASAL's Centre des Techniques Spatiales at Arzew",
};

/** What a Claim the rule finds is a Claim for, where it is not the seat. A row
 *  whose Claim the rule no longer finds is an error, so the note cannot go stale. */
const ROLES = {
};

/** Qualifiers that make two otherwise equal names two institutions: each must be
 *  on both names of a name tie or on neither (a military school is not the
 *  civilian one, an ecole superieure is not an ecole or an institut de formation). */
const QUALIFIERS = [
  ["military", /\b(militaire|military)\b|عسكري/],
  ["superieur", /\b(superieure?|higher)\b|عالي|عليا/],
  ["preparatoire", /\bpreparatoire\b|تحضيري/],
];
const qualifiersOf = (s) => {
  const f = fold(s).replace(/[^a-z0-9ء-ي]+/g, " ");
  return QUALIFIERS.filter(([, re]) => re.test(f)).map(([k]) => k).join(",");
};

// ---- folding and tokens ----------------------------------------------------

function fold(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064b-\u065f\u0670\u0640\u200c-\u200f\u202a-\u202e]/g, "")
    .toLowerCase()
    .replace(/[\u0623\u0625\u0622]/g, "\u0627")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u06be/g, "\u0647")
    .replace(/\u0649/g, "\u064a")
    .replace(/([\u0621-\u064a])([0-9])/g, "$1 $2")
    .replace(/([0-9])([\u0621-\u064a])/g, "$1 $2");
}
const AR_ARTICLE = /^(وال|بال|فال|كال|لل|ال)/;
/** Every word, article stripped, short ones kept (place phrases need "el", "ain"). */
function words(s) {
  return fold(s)
    .replace(/[^a-z0-9\u0621-\u064a]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((t) => (/^[\u0621-\u064a]/.test(t) && t.replace(AR_ARTICLE, "").length >= 2 ? t.replace(AR_ARTICLE, "") : t));
}
const STOP = new Set([
  // French / English generic and type words (the type is compared separately)
  "ecole", "superieure", "superieur", "nationale", "national", "normale", "institut", "institute",
  "universite", "university", "centre", "center", "universitaire", "academie", "academy",
  "de", "des", "du", "la", "le", "les", "et", "en", "d", "l", "au", "aux", "a", "the", "of", "and",
  "college", "school", "higher", "alias", "cheikh", "chahid", "moudjahid", "dz",
  // Arabic generic and type words, article already stripped
  "مدرسه", "وطنيه", "وطني", "عليا", "عالي", "معهد", "جامعه", "مركز", "جامعي", "اكاديميه",
  "ولايه", "في", "من", "عن", "سابقا", "مجاهد", "شيخ", "شهيد", "مدعو", "كاتبه", "مفكر", "اساتذه",
]);
const significant = (t) => /^[0-9]+$/.test(t) || (t.length >= 3 && !STOP.has(t));

function damerau1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return true;
  if (a.length === b.length) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  return s.slice(i) === l.slice(i + 1);
}
/** An Arabic word without its feminine or plural ending (ة, ات, ا), when 3+ letters remain. */
const arStem = (t) => (/^[ء-ي]/.test(t) && t.replace(/(ات|ه|ا)$/, "").length >= 3 ? t.replace(/(ات|ه|ا)$/, "") : t);
/** Same word: equal, an Arabic one-letter proclitic or a feminine/plural ending
 *  apart, a French plural apart, or (6+ letters) one edit or transposition apart. */
function same(a, b) {
  if (a === b) return true;
  for (const p of ["ب", "و", "ل"]) if (a === p + b || b === p + a) return true;
  if (/^[ء-ي]/.test(a) && /^[ء-ي]/.test(b) && arStem(a) === arStem(b)) return true;
  if (/^[a-z]/.test(a) && (a === b + "s" || b === a + "s")) return true;
  return a.length >= 6 && b.length >= 6 && !/^[0-9]+$/.test(a) && damerau1(a, b);
}

// ---- institution type of a name --------------------------------------------

const WRONG_TYPE = /\b(cfpa|cfp|insfp|lycee|cem|primaire)\b|متوسطه|ثانويه|ابتدائيه|مركز التكوين المهني/;
const SUBUNIT = /\b(facult\w*|departement|department|dean|doyen|laborato\w*|research|recherche|annexe|bibliotheque|library|residence|restaurant)\b|cite universitaire|كليه|قسم|عماده|مخبر|وحده البحث|مركز البحث|ملحقه|مكتبه|اقامه|مطعم/;
const TYPES = [
  ["ens", /ecole normale|normal school|ecole superieure des enseignants|للاساتذه|الاساتذه|اساتذه/],
  ["centre_universitaire", /centre universitaire|university cent|مركز الجامعي/],
  ["universite", /\buniversite\b|\buniversity\b|جامعه/],
  ["ecole", /\becole\b|\bschool\b|مدرسه|\bpolytechnique\b/],
  ["institut", /\binstitut\b|\binstitute\b|معهد/],
  ["academie", /\bacademie\b|\bacademy\b|اكاديميه/],
];
function typeOf(name) {
  const f = fold(name).replace(/[^a-z0-9\u0621-\u064a]+/g, " ");
  if (WRONG_TYPE.test(f)) return "wrong";
  if (SUBUNIT.test(f)) return "subunit";
  for (const [t, re] of TYPES.slice(0, 2)) if (re.test(f)) return t;
  let best = null;
  for (const [t, re] of TYPES.slice(2)) {
    const m = f.match(re);
    if (m && (best == null || m.index < best.i)) best = { t, i: m.index };
  }
  return best?.t ?? null;
}

// ---- places of a wilaya ----------------------------------------------------

const OUTLINE_BY_CODE = new Map(OUTLINES.map((o) => [Number(o.code_commune), o]));
const PLACES_BY_WILAYA = new Map();
function placesOf(wilaya) {
  if (PLACES_BY_WILAYA.has(wilaya)) return PLACES_BY_WILAYA.get(wilaya);
  const out = [];
  const w = WILAYAS.find((x) => x.code === wilaya);
  for (const n of [w.name_fr, w.name_en, w.name_ar]) out.push({ words: words(n), wilaya, commune: null });
  for (const o of OUTLINES.filter((c) => c.wilaya_code === wilaya)) {
    const names = [o.name_fr, ...FLAGSHIP_COMMUNES.filter((f) => f.wilaya_code === wilaya && f.name_fr === o.name_fr).map((f) => f.name_ar)];
    for (const n of names) out.push({ words: words(n), wilaya, commune: Number(o.code_commune) });
  }
  // Longest phrase first, so "Bordj El Kiffan" is read before a shorter name inside it.
  out.sort((a, b) => b.words.length - a.words.length);
  PLACES_BY_WILAYA.set(wilaya, out);
  return out;
}
/** Split a word list into place constraints and the rest. */
function readPlaces(ws, wilaya) {
  const places = [];
  const rest = [];
  for (let i = 0; i < ws.length; ) {
    const hit = placesOf(wilaya).find((p) => p.words.length && p.words.every((x, k) => ws[i + k] != null && same(ws[i + k], x)));
    if (hit) {
      places.push(hit);
      i += hit.words.length;
    } else rest.push(ws[i++]);
  }
  return { places, rest };
}

// ---- record names, parsed once ---------------------------------------------

function parseName(raw, wilaya) {
  let s = String(raw);
  const hints = [];
  s = s.replace(/\(([^)]*)\)?/g, (_, inner) => (hints.push(inner), " "));
  s = s.replace(/\s+ex\s.*$/i, " ").replace(/سابقا.*$/, " ");
  const dash = s.search(/\s*[-\u2013\u2010]\s*/);
  const core = dash > 0 ? s.slice(0, dash) : s;
  const eponym = dash > 0 ? s.slice(dash + 1) : "";
  const c = readPlaces(words(core), wilaya);
  const e = readPlaces(words(eponym), wilaya);
  const h = readPlaces(words(hints.join(" ")), wilaya);
  return {
    raw,
    type: typeOf(raw),
    qualifiers: qualifiersOf(s),
    core: [...new Set(c.rest.filter(significant))],
    eponym: [...new Set(e.rest.filter(significant))],
    places: [...c.places, ...h.places],
  };
}

// ---- geometry --------------------------------------------------------------

const pointOf = (e) => (e.lat != null ? { lat: e.lat, lng: e.lon } : e.center ? { lat: e.center.lat, lng: e.center.lon } : null);
function locate(lat, lng) {
  const code = containingCommuneCode(lat, lng);
  const o = code == null ? null : OUTLINE_BY_CODE.get(Number(code));
  const wilaya = o ? o.wilaya_code : containingWilayaCode(lat, lng);
  return { commune: o ? { code: String(o.code_commune).padStart(4, "0"), name: o.name_fr } : "outside all usable outlines", communeCode: o ? Number(o.code_commune) : null, wilaya };
}
const metres = (a, b) => Math.round(haversine(a.lat, a.lng, b.lat, b.lng));

// ---- hosts -----------------------------------------------------------------

function hostOf(u) {
  if (!u) return null;
  let s = String(u).trim().replace(/&amp;/g, "&");
  if (!/^[a-z]+:\/\//i.test(s)) s = `http://${s}`;
  try {
    return new URL(s).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}
const URL_KEYS = ["website", "contact:website", "url"];
const NAME_KEYS = [
  "name", "name:fr", "name:en", "name:ar", "official_name", "official_name:fr", "official_name:ar",
  "alt_name", "alt_name:fr", "alt_name:ar", "alt_name:en", "short_name", "short_name:fr", "short_name:ar",
];
const KEPT_KEYS = new Set([...NAME_KEYS, ...URL_KEYS, "wikidata", "operator", "addr:city", "addr:street"]);
const keptTags = (t) => Object.fromEntries(Object.keys(t).filter((k) => KEPT_KEYS.has(k)).sort().map((k) => [k, t[k]]));

// ---- the capture -----------------------------------------------------------

const ELEMENTS = CAPTURE.elements
  .filter((e) => e.tags && pointOf(e))
  .map((e) => {
    const p = pointOf(e);
    const names = NAME_KEYS.flatMap((k) => (e.tags[k] ? String(e.tags[k]).split(";").map((v) => ({ key: k, value: v.trim() })) : [])).filter((n) => n.value);
    return {
      ref: `${e.type}/${e.id}`,
      tags: e.tags,
      point: p,
      ...locate(p.lat, p.lng),
      hosts: URL_KEYS.map((k) => ({ key: k, host: hostOf(e.tags[k]) })).filter((h) => h.host),
      names: names.map((n) => ({ ...n, type: typeOf(n.value), words: words(n.value) })),
    };
  })
  .sort((a, b) => (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0));
const BY_REF = new Map(ELEMENTS.map((e) => [e.ref, e]));

// Ownership: an element that is another record's website-tied campus, or sits
// within the copy radius of another record's exact point, is that record's.
const recordHost = (r) => {
  const h = hostOf(r.website);
  return h && !NOT_OWN_SITE[h] ? h : null;
};
function ownerOf(el, self) {
  for (const r of RECORDS) {
    if (r.id === self.id) continue;
    const h = recordHost(r);
    if (h && el.hosts.some((x) => x.host === h)) return `${r.id} (website ${h})`;
    if (r.geo_precision === "exact" && metres(el.point, r) <= COPY_RADIUS_M) return `${r.id} (exact point within ${COPY_RADIUS_M} m)`;
  }
  return null;
}

// ---- matching one record ---------------------------------------------------

const log = { rejected: [], dropped: [] };

/** The commune a commune-method record already declares, as an outline code. */
function declaredCommune(rec) {
  if (rec.geo_method !== "commune" || !rec.commune) return null;
  const w = Number(rec.wilaya_code);
  const o = OUTLINES.find((c) => c.wilaya_code === w && words(c.name_fr).join(" ") === words(rec.commune).join(" "));
  return o ? Number(o.code_commune) : null;
}

function nameTie(rec, parsed, el, field) {
  for (const n of el.names) {
    if (n.type !== parsed.type || !parsed.type) continue;
    if (qualifiersOf(n.value) !== parsed.qualifiers) continue;
    const has = (t) => n.words.some((w) => same(w, t));
    const named = (p) => p.words.every((x) => n.words.some((w) => same(w, x)));
    const placesOk = parsed.places.every((p) => named(p) || (p.commune != null ? el.communeCode === p.commune : el.wilaya === p.wilaya));
    if (!placesOk) continue;
    // One identifying word is enough only with a place to hold it: one the name
    // states, or the commune the record already declares.
    const inDeclaredCommune = declaredCommune(rec) != null && el.communeCode === declaredCommune(rec);
    const coreOk =
      parsed.core.every(has) &&
      (parsed.core.length >= 2 ||
        (parsed.core.length === 1 && (parsed.places.length >= 1 || inDeclaredCommune)) ||
        (parsed.core.length === 0 && ["universite", "centre_universitaire", "ens"].includes(parsed.type) && parsed.places.some(named)));
    if (coreOk) return `${n.key} ~ ${field} (core${parsed.core.length === 1 && !parsed.places.length ? ", one word, inside the declared commune" : ""})`;
    if (parsed.eponym.length >= 2 && parsed.eponym.every(has)) return `${n.key} ~ ${field} (eponym)`;
  }
  return null;
}

function claimFrom(rec, el, tie, matched, extra = {}) {
  const wilaya = Number(rec.wilaya_code);
  const claim = {
    source: "osm",
    element: el.ref,
    tie,
    ...(matched ? { matched } : {}),
    tags: keptTags(el.tags),
    point: { lat: el.point.lat, lng: el.point.lng },
    commune: el.commune,
    wilaya_code: el.wilaya == null ? null : String(el.wilaya).padStart(2, "0"),
    in_declared_wilaya: el.wilaya === wilaya,
    distance_m: metres(el.point, rec),
    ...extra,
  };
  if (el.tags.wikidata) claim.wikidata_tag = el.tags.wikidata;
  return claim;
}

function review(rec) {
  const wilaya = Number(rec.wilaya_code);
  const claims = new Map();
  const host = hostOf(rec.website);
  const ownHost = host && !NOT_OWN_SITE[host] ? host : null;
  if (host && NOT_OWN_SITE[host]) log.rejected.push(`${rec.id}: record website ${host} is ${NOT_OWN_SITE[host]}`);

  for (const el of ELEMENTS) {
    if (ownHost) {
      const exact = el.hosts.find((h) => h.host === ownHost);
      const sub = el.hosts.find((h) => h.host.endsWith(`.${ownHost}`));
      const parent = el.hosts.find((h) => ownHost.endsWith(`.${h.host}`));
      const why = WEBSITE_REJECTED[`${rec.id}|${el.ref}`];
      if ((exact || sub) && why) {
        log.rejected.push(`${rec.id}: ${el.ref} website tie rejected, ${why}`);
        continue;
      }
      if (exact) {
        claims.set(el.ref, claimFrom(rec, el, "website", `${exact.key} host = record website host ${ownHost}`));
        continue;
      }
      if (sub) {
        claims.set(el.ref, claimFrom(rec, el, "website_subdomain", `${sub.key} host ${sub.host} is a sub-domain of ${ownHost}`));
        continue;
      }
      if (parent) log.rejected.push(`${rec.id}: ${el.ref} carries ${parent.host}, the parent of the record's ${ownHost}: the university, not this institution`);
    }
    for (const [field, raw] of [["name", rec.name], ["name_ar", rec.name_ar]]) {
      if (!raw) continue;
      const parsed = PARSED.get(`${rec.id}|${field}`);
      const tie = nameTie(rec, parsed, el, field);
      if (!tie) continue;
      if (el.wilaya !== wilaya) {
        log.dropped.push(`${rec.id}: ${el.ref} name tie (${tie}) outside wilaya ${rec.wilaya_code} (in ${el.wilaya ?? "none"})`);
        break;
      }
      const owner = ownerOf(el, rec);
      if (owner) {
        log.dropped.push(`${rec.id}: ${el.ref} name tie (${tie}) but the element is ${owner}'s`);
        break;
      }
      claims.set(el.ref, claimFrom(rec, el, "name", tie));
      break;
    }
  }

  for (const [key, role] of Object.entries(ROLES)) {
    const [id, ref] = key.split("|");
    if (id !== rec.id) continue;
    if (!claims.has(ref)) throw new Error(`${key}: ROLES names a Claim the rule no longer finds`);
    claims.get(ref).role = role;
  }
  return [...claims.values()].sort((a, b) => a.distance_m - b.distance_m || (a.element < b.element ? -1 : 1));
}

function reasonFor(rec, claims) {
  const inW = claims.filter((c) => c.in_declared_wilaya);
  if (!inW.length) return "candidate outside declared wilaya";
  if (inW.length < claims.length) return "ambiguous: several candidates";
  for (const a of inW) for (const b of inW) if (metres(a.point, b.point) > AGREEMENT_KM * 1000) return "ambiguous: several candidates";
  return "single source";
}

/** What the seed already knows about a record's second source. */
const NEEDS = {
};

function needsFor(rec, claims) {
  if (NEEDS[rec.id]) return NEEDS[rec.id];
  const qs = [...new Set(claims.map((c) => c.wikidata_tag).filter(Boolean))].sort();
  const host = hostOf(rec.website);
  const site = host && !NOT_OWN_SITE[host] ? `the institution's own site (${host})` : null;
  const parts = [];
  if (qs.length) parts.push(`read P625 on Wikidata ${qs.join(", ")} (an OSM wikidata tag is a lead, not a coordinate)`);
  if (site) parts.push(`a campus address or map on ${site}`);
  if (!qs.length) parts.push("a Wikidata item for the institution with P625 (none is tagged on the OSM element)");
  if (!site) parts.push("an official address, since the record carries no own website");
  return `${parts.join("; or ")}, independent of OpenStreetMap and within ${AGREEMENT_KM} km of the Claim`;
}

// ---- run -------------------------------------------------------------------

const APPROX = RECORDS.filter((r) => r.geo_precision === "approximate").sort((a, b) => (a.id < b.id ? -1 : 1));
const PARSED = new Map();
for (const r of APPROX) {
  if (r.name) PARSED.set(`${r.id}|name`, parseName(r.name, Number(r.wilaya_code)));
  if (r.name_ar) PARSED.set(`${r.id}|name_ar`, parseName(r.name_ar, Number(r.wilaya_code)));
}

const queue = [];
const noCandidate = [];
for (const rec of APPROX) {
  const claims = review(rec);
  if (!claims.length) {
    noCandidate.push({ id: rec.id, ...(rec.name ? { name: rec.name } : { name_ar: rec.name_ar }), wilaya_code: rec.wilaya_code, geo_method: rec.geo_method });
    continue;
  }
  queue.push({
    id: rec.id,
    name: rec.name,
    name_ar: rec.name_ar,
    wilaya_code: rec.wilaya_code,
    geo_method: rec.geo_method,
    published: { lat: rec.lat, lng: rec.lng, commune: rec.commune },
    claims,
    reason: reasonFor(rec, claims),
    needs: needsFor(rec, claims),
  });
}

const doc = {
  run: RUN,
  package: PKG,
  rule:
    `docs/adr/0001: a record becomes exact only when two independent open sources agree within ${AGREEMENT_KM} km and are not a Copied claim within ${COPY_RADIUS_M} m of each other; Nominatim, api.openstreetmap.org and Overpass are all OpenStreetMap, one source, so every Claim below is single-source and nothing is promoted.`,
  network:
    `Candidates come from the committed capture sources/${PKG}/osm-campuses.json (${MANIFEST.records} amenity=university|college elements, retrieved ${MANIFEST.retrieved}, sha256 ${MANIFEST.sha256}), one source. The second-source pass of the same run (research/${PKG}/second-source-votes-${RUN}.json) re-read each candidate live from api.openstreetmap.org and looked for its Wikidata P625; the records it promoted are exact and so are no longer here, and the verdict for every record still queued (copied, disagree or no second source) is in that file. Overpass and the institutions' own sites did not answer on ${RUN}.`,
  counts: {
    approximate_reviewed: APPROX.length,
    queued_single_source: queue.length,
    no_open_candidate: noCandidate.length,
    promoted: 0,
  },
  queue,
  no_candidate: noCandidate,
};
if (doc.counts.queued_single_source + doc.counts.no_open_candidate !== doc.counts.approximate_reviewed) throw new Error("counts do not add up");
const text = JSON.stringify(doc, null, 2) + "\n";
if (text.includes("\u2014")) throw new Error("em dash in output");
writeFileSync(OUT, text);

// ---- summary on stdout (not written) ---------------------------------------
console.log(`approximate ${APPROX.length}, queued ${queue.length}, no candidate ${noCandidate.length}, promoted 0`);
for (const q of queue) {
  const pub = locate(q.published.lat, q.published.lng);
  const line = q.claims.map((c) => {
    const flags = [];
    if (c.distance_m > MOVE_CAP_KM * 1000) flags.push(`>${MOVE_CAP_KM}km`);
    if (typeof c.commune === "object" && pub.communeCode != null && Number(c.commune.code) !== pub.communeCode) flags.push(`commune ${c.commune.name} vs published-point ${OUTLINE_BY_CODE.get(pub.communeCode).name_fr}`);
    if (typeof c.commune !== "object") flags.push("outside outlines");
    if (!c.in_declared_wilaya) flags.push(`wilaya ${c.wilaya_code}`);
    return `${c.element} ${c.tie} ${c.distance_m}m${flags.length ? ` [${flags.join("; ")}]` : ""}`;
  });
  console.log(`${q.id} ${q.reason} | ${line.join(" | ")}`);
}
console.log("\nrejected:");
for (const l of [...new Set(log.rejected)]) console.log("  " + l);
console.log("\ndropped name ties:");
for (const l of [...new Set(log.dropped)]) console.log("  " + l);
