#!/usr/bin/env node
/**
 * Second-source votes for @geoalgeria/enseignement-superieur's campus Claims
 * (run 2026-10-28), in the sense of docs/adr/0001 and CONTEXT.md
 * "Coordinate review".
 *
 * Reads the 35 records of the Review queue
 * research/enseignement-superieur/precision-review-2026-10-28.json and the four
 * BAC 2026 additions P08/P09/P10/P23 (seeds/bac-2026.json, published exact on one
 * OSM object each), and for each one asks whether Wikidata P625, an open source
 * independent of OpenStreetMap, agrees with the OSM Claim. It writes
 * research/enseignement-superieur/second-source-votes-2026-10-28.json and edits
 * no seed or data file.
 *
 * Offline and deterministic: it reads committed files and the two captures
 * written by fetch-second-sources.mjs (sources/enseignement-superieur/
 * osm-campus-objects.json and wikidata-campuses.json, through readCapture, which
 * refuses a capture its manifest hash does not match), carries no clock and
 * sorts what it writes, so two runs give the same bytes.
 *
 * Run:  node research/enseignement-superieur/second-source-votes.mjs
 *
 * IDENTITY FIRST (a Wikidata item near a campus is not a Claim about it). A
 * candidate item is this institution only on one of three ties, recorded as `tie`:
 *   - website: a P856 host (www. stripped) equals the record's website host. A
 *     parent's host (univ-x.dz for ens.univ-x.dz) or a sub-domain is no tie, and an
 *     item whose labels name a faculty, department, annex or the like is refused;
 *   - osm_wikidata_tag: the item is the `wikidata` tag of the record's live OSM
 *     element and none of its fr/ar/en labels contradicts the record (another
 *     institution type, a sub-unit, a qualifier one side lacks, another number);
 *   - name: an fr/ar/en label or alias ties the record's name or name_ar under the
 *     token rule of precision-review.mjs, copied below verbatim because that script
 *     writes its output on import: the institution types agree, a sub-unit never
 *     ties, every significant token or the eponym is on the label, and the item
 *     lies in the declared wilaya and is not another record's.
 *
 * VOTES (ADR 0001 rules 2 and 3). The OSM Claim is the element's LIVE point. Each
 * identity item's best-rank P625 values are its Claim. Within COPY_RADIUS_M of an
 * OSM Claim it is a Copied claim and casts no Vote; within AGREEMENT_KM it is a
 * Vote for that OSM Claim; beyond it from every OSM Claim it disagrees.
 *
 * VERDICTS
 *   promote      one OSM Claim in the declared wilaya (or several of which the
 *                Wikidata Vote singles out exactly one, flagged `singled_out`),
 *                an identity item Voting for it, and no identity item disagreeing;
 *   keep_exact   the same test passed by a BAC 2026 addition: its exact point now
 *                has two Votes;
 *   copied       the only agreement is a Copied claim;
 *   disagree     the identity items' P625 is over AGREEMENT_KM from every OSM Claim;
 *   no_second_source  no identity item carries P625;
 *   ambiguous    several OSM Claims the second source does not single one out of,
 *                identity items that disagree with one another, or no live OSM
 *                Claim left in the declared wilaya.
 * A BAC addition with any verdict but keep_exact carries `demote: true`.
 *
 * The point that ships for promote / keep_exact is the OSM element's live point
 * (ADR 0001, the shipped-candidate order puts OpenStreetMap before Wikidata), with
 * the commune whose OSM outline contains it and the nearest flagship commune
 * centre, which is how the generator labels a campus, so the two can be compared.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { containingCommuneCode, containingWilayaCode, haversine } from "../../scripts/lib/build-utils.mjs";
import { captureMeta, readCapture } from "../../scripts/lib/source-store.mjs";
import { AGREEMENT_KM, COPY_RADIUS_M } from "../../scripts/review/thresholds.mjs";

const RUN = "2026-10-28";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT = join(HERE, `second-source-votes-${RUN}.json`);
const readJson = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), "utf8"));

const PKG = "enseignement-superieur";
// The frozen inputs, not the live files: the promotions this review decides change
// both the queue and the published records, so reading them live would make a
// replay review a different set (docs/adr/0001, rule 8).
const INPUT = readJson("research", PKG, `second-source-input-${RUN}.json`);
const RECORDS = INPUT.records;
const BY_ID = new Map(RECORDS.map((r) => [r.id, r]));
const QUEUE = INPUT.queue;
const SEED = INPUT.bac_additions;
const WILAYAS = readJson("packages", "dataset", "data", "wilayas.json").wilayas;
const FLAGSHIP_COMMUNES = readJson("packages", "dataset", "data", "geojson", "communes.geojson").features.map((f) => f.properties);
const CENTRES = readJson("packages", "dataset", "data", "geojson", "communes.geojson").features.map((f) => ({
  name_fr: f.properties.name_fr,
  wilaya_code: Number(f.properties.wilaya_code),
  lat: f.geometry.coordinates[1],
  lng: f.geometry.coordinates[0],
}));
const FLAGSHIP_ROWS = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"].flatMap((f) => readJson("packages", "dataset", "data", f));
const OUTLINES = readJson("research", "_commune-centres", "commune-boundaries.json").communes;

const OSM = readCapture(PKG, "osm-campus-objects");
const WD = readCapture(PKG, "wikidata-campuses");
const OSM_META = captureMeta(PKG, "osm-campus-objects");
const WD_META = captureMeta(PKG, "wikidata-campuses");

/** The BAC 2026 additions and the record ids the generator gave them. */
const BAC = { P08: "00184", P09: "00183", P10: "00182", P23: "00185" };

/** Record websites that are not the institution's own site (precision-review.mjs). */
const NOT_OWN_SITE = {
  "asal.dz": "a page on the Algerian Space Agency's site, not the school's own",
};

// ---- folding, tokens, types and places: copied verbatim from precision-review.mjs

const QUALIFIERS = [
  ["military", /\b(militaire|military)\b|عسكري/],
  ["superieur", /\b(superieure?|higher)\b|عالي|عليا/],
  ["preparatoire", /\bpreparatoire\b|تحضيري/],
];
const qualifiersOf = (s) => {
  const f = fold(s).replace(/[^a-z0-9ء-ي]+/g, " ");
  return QUALIFIERS.filter(([, re]) => re.test(f)).map(([k]) => k).join(",");
};

function fold(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ً-ٰٟـ‌-‏‪-‮]/g, "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ھ/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/([ء-ي])([0-9])/g, "$1 $2")
    .replace(/([0-9])([ء-ي])/g, "$1 $2");
}
const AR_ARTICLE = /^(وال|بال|فال|كال|لل|ال)/;
function words(s) {
  return fold(s)
    .replace(/[^a-z0-9ء-ي]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((t) => (/^[ء-ي]/.test(t) && t.replace(AR_ARTICLE, "").length >= 2 ? t.replace(AR_ARTICLE, "") : t));
}
const STOP = new Set([
  "ecole", "superieure", "superieur", "nationale", "national", "normale", "institut", "institute",
  "universite", "university", "centre", "center", "universitaire", "academie", "academy",
  "de", "des", "du", "la", "le", "les", "et", "en", "d", "l", "au", "aux", "a", "the", "of", "and",
  "college", "school", "higher", "alias", "cheikh", "chahid", "moudjahid", "dz",
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
const arStem = (t) => (/^[ء-ي]/.test(t) && t.replace(/(ات|ه|ا)$/, "").length >= 3 ? t.replace(/(ات|ه|ا)$/, "") : t);
function same(a, b) {
  if (a === b) return true;
  for (const p of ["ب", "و", "ل"]) if (a === p + b || b === p + a) return true;
  if (/^[ء-ي]/.test(a) && /^[ء-ي]/.test(b) && arStem(a) === arStem(b)) return true;
  if (/^[a-z]/.test(a) && (a === b + "s" || b === a + "s")) return true;
  return a.length >= 6 && b.length >= 6 && !/^[0-9]+$/.test(a) && damerau1(a, b);
}

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
  const f = fold(name).replace(/[^a-z0-9ء-ي]+/g, " ");
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
  out.sort((a, b) => b.words.length - a.words.length);
  PLACES_BY_WILAYA.set(wilaya, out);
  return out;
}
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
function parseName(raw, wilaya) {
  let s = String(raw);
  const hints = [];
  s = s.replace(/\(([^)]*)\)?/g, (_, inner) => (hints.push(inner), " "));
  s = s.replace(/\s+ex\s.*$/i, " ").replace(/سابقا.*$/, " ");
  const dash = s.search(/\s*[-–‐]\s*/);
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

// ---- geometry and hosts ------------------------------------------------------

const metres = (a, b) => Math.round(haversine(a.lat, a.lng, b.lat, b.lng));
function locate(lat, lng) {
  const code = containingCommuneCode(lat, lng);
  const o = code == null ? null : OUTLINE_BY_CODE.get(Number(code));
  const wilaya = o ? o.wilaya_code : containingWilayaCode(lat, lng);
  return { outline: o, communeCode: o ? Number(o.code_commune) : null, wilaya };
}
const communeOf = (o) => ({ code: String(o.code_commune).padStart(4, "0"), name_fr: o.name_fr, wilaya_code: String(o.wilaya_code).padStart(2, "0") });

/** Nearest flagship commune centre, nationally, by the metric fetch.mjs labels with. */
const toRad = (d) => (d * Math.PI) / 180;
function nearestCentre(lat, lng) {
  let best = null, bd = Infinity;
  for (const c of CENTRES) {
    const x = toRad(lng - c.lng) * Math.cos(toRad((lat + c.lat) / 2));
    const y = toRad(lat - c.lat);
    const d = x * x + y * y;
    if (d < bd) { bd = d; best = c; }
  }
  const rows = FLAGSHIP_ROWS.filter((r) => Number(r.wilaya_code) === best.wilaya_code && r.name_fr === best.name_fr);
  return {
    ...(rows.length === 1 ? { code: String(rows[0].code_commune).padStart(4, "0") } : {}),
    name_fr: best.name_fr,
    wilaya_code: String(best.wilaya_code).padStart(2, "0"),
    distance_m: metres({ lat, lng }, best),
  };
}

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
const ownHost = (r) => {
  const h = hostOf(r.website);
  return h && !NOT_OWN_SITE[h] ? h : null;
};

// ---- the captures, indexed ---------------------------------------------------

const ELEMENT = new Map(OSM.map((e) => [e.ref, e]));
const ITEMS = WD.items.map((it) => {
  const best = (() => {
    const live = it.P625.filter((p) => p.rank !== "deprecated" && (p.globe == null || p.globe === "Q2"));
    const pref = live.filter((p) => p.rank === "preferred");
    return (pref.length ? pref : live).map((p) => ({ lat: p.lat, lng: p.lng, rank: p.rank }));
  })();
  const names = [];
  for (const l of ["fr", "ar", "en"]) {
    if (it.labels[l]) names.push({ key: `label:${l}`, value: it.labels[l] });
    for (const a of it.aliases[l] ?? []) names.push({ key: `alias:${l}`, value: a });
  }
  const loc = best.length ? locate(best[0].lat, best[0].lng) : { communeCode: null, wilaya: null };
  return {
    ...it,
    best,
    hosts: [...new Set(it.P856.filter((v) => v.rank !== "deprecated").map((v) => hostOf(v.value)).filter(Boolean))].sort(),
    el: { names: names.map((n) => ({ ...n, type: typeOf(n.value), words: words(n.value) })), communeCode: loc.communeCode, wilaya: loc.wilaya },
    records: new Set(it.found_by.map((f) => f.record)),
  };
});

/** Another record whose own item this is: its website host, or its exact point within the copy radius. */
function ownerOf(item, self) {
  for (const r of RECORDS) {
    if (r.id === self.id) continue;
    const h = ownHost(r);
    if (h && item.hosts.includes(h)) return `${r.id} (website ${h})`;
    if (r.geo_precision === "exact" && item.best.some((p) => metres(p, r) <= COPY_RADIUS_M)) return `${r.id} (exact point within ${COPY_RADIUS_M} m)`;
  }
  return null;
}

/** Why an item's fr/ar/en LABELS (not aliases, which hold former names) contradict a record, or null. */
function contradiction(rec, item) {
  const recName = rec.name ?? rec.name_ar;
  const recType = typeOf(recName);
  const recQual = qualifiersOf(recName);
  const nums = (s) => words(s).filter((t) => /^[0-9]+$/.test(t)).map(Number).sort().join(",");
  const recNums = nums(String(recName).replace(/\([^)]*\)?/g, " ").split(/\s+[-–]\s+/)[0]);
  for (const l of ["fr", "ar", "en"]) {
    const v = item.labels[l];
    if (!v) continue;
    const t = typeOf(v);
    if (t === "subunit" || t === "wrong") return `label:${l} "${v}" names a ${t === "subunit" ? "sub-unit" : "non-higher-education establishment"}`;
    if (t && recType && t !== recType) return `label:${l} "${v}" is a ${t}, the record a ${recType}`;
    if (qualifiersOf(v) !== recQual) return `label:${l} "${v}" qualifiers [${qualifiersOf(v)}] against the record's [${recQual}]`;
    if (nums(v) !== recNums) return `label:${l} "${v}" numbers [${nums(v)}] against the record's [${recNums}]`;
  }
  return null;
}

const PARSED = new Map();
function parsed(rec, field) {
  const k = `${rec.id}|${field}`;
  if (!PARSED.has(k)) PARSED.set(k, parseName(rec[field], Number(rec.wilaya_code)));
  return PARSED.get(k);
}

// ---- one record --------------------------------------------------------------

const labelsOf = (it) => Object.fromEntries(["ar", "en", "fr"].filter((l) => it.labels[l]).map((l) => [l, it.labels[l]]));

function identity(rec, osmClaims) {
  const host = ownHost(rec);
  const tags = new Set(osmClaims.flatMap((c) => (c.wikidata_tag ? String(c.wikidata_tag).split(";").map((s) => s.trim()) : [])));
  const ties = [];
  const rejected = [];
  let considered = 0;
  for (const it of ITEMS) {
    if (!it.records.has(rec.id)) continue;
    considered++;
    const leadVia = [...new Set(it.found_by.filter((f) => f.record === rec.id).map((f) => f.via))].sort();
    let tie = null;
    let detail = null;
    // 1. website
    if (host && it.hosts.includes(host)) {
      const c = contradiction(rec, it);
      if (c && /sub-unit|non-higher/.test(c)) rejected.push({ qid: it.qid, labels: labelsOf(it), via: leadVia, why: `P856 host ${host} equals the record's, but ${c}` });
      else { tie = "website"; detail = `P856 host = record website host ${host}`; }
    } else if (host) {
      const rel = it.hosts.find((h) => h.endsWith(`.${host}`) || host.endsWith(`.${h}`));
      if (rel) rejected.push({ qid: it.qid, labels: labelsOf(it), via: leadVia, why: `P856 host ${rel} is ${rel.endsWith(`.${host}`) ? "a sub-domain of" : "the parent of"} the record's ${host}: not this institution's item` });
    }
    // 2. the live OSM element's wikidata tag
    if (!tie && tags.has(it.qid)) {
      const c = contradiction(rec, it);
      if (c) rejected.push({ qid: it.qid, labels: labelsOf(it), via: leadVia, why: `the OSM element's wikidata tag, but ${c}` });
      else { tie = "osm_wikidata_tag"; detail = `wikidata tag of ${osmClaims.filter((x) => String(x.wikidata_tag ?? "").split(";").map((s) => s.trim()).includes(it.qid)).map((x) => x.element).join(", ")}; labels do not contradict the record`; }
    }
    // 3. name, under precision-review.mjs's token rule
    if (!tie) {
      for (const field of ["name", "name_ar"]) {
        if (!rec[field]) continue;
        const t = nameTie(rec, parsed(rec, field), it.el, field);
        if (!t) continue;
        // An item with no P625 cannot be placed, so it stays an identity item that casts no Vote.
        if (it.best.length && it.el.wilaya !== Number(rec.wilaya_code)) {
          rejected.push({ qid: it.qid, labels: labelsOf(it), via: leadVia, why: `name tie (${t}) but its P625 is in wilaya ${it.el.wilaya ?? "none"}, not the declared ${rec.wilaya_code}` });
          break;
        }
        const owner = ownerOf(it, rec);
        if (owner) {
          rejected.push({ qid: it.qid, labels: labelsOf(it), via: leadVia, why: `name tie (${t}) but the item is ${owner}'s` });
          break;
        }
        tie = "name";
        detail = t;
        break;
      }
    }
    if (tie) ties.push({ it, tie, detail, via: leadVia });
    else if (!rejected.some((r) => r.qid === it.qid) && leadVia.some((v) => v !== "around"))
      rejected.push({ qid: it.qid, labels: labelsOf(it), via: leadVia, why: "no website, tag or name tie" });
  }
  return { ties, rejected, considered };
}

function review(rec, claimRefs, bac) {
  const wilaya = Number(rec.wilaya_code);
  const osm = claimRefs.map(({ ref, tie }) => {
    const e = ELEMENT.get(ref);
    if (!e) throw new Error(`${rec.id}: ${ref} is not in the OSM capture`);
    const loc = e.point ? locate(e.point.lat, e.point.lng) : null;
    const flags = [];
    if (e.deleted) flags.push(`deleted in version ${e.version} (${e.timestamp})`);
    if (e.moved_m != null && e.moved_m > COPY_RADIUS_M) flags.push(`live point moved ${Math.round(e.moved_m)} m from the capture point`);
    return {
      element: ref,
      tie,
      version: e.version,
      timestamp: e.timestamp,
      deleted: e.deleted,
      point: e.point,
      capture_point: e.capture_point,
      moved_m: e.moved_m,
      commune_by_outline: loc?.outline ? communeOf(loc.outline) : null,
      in_declared_wilaya: loc ? loc.wilaya === wilaya : false,
      ...(e.tags?.wikidata ? { wikidata_tag: e.tags.wikidata } : {}),
      ...(e.tags?.name ? { osm_name: e.tags.name } : {}),
      ...(flags.length ? { flags } : {}),
    };
  });
  const live = osm.filter((c) => !c.deleted && c.point && c.in_declared_wilaya);
  const { ties, rejected, considered } = identity(rec, osm);

  // Each identity item with P625 against each live OSM Claim.
  const idItems = ties.map(({ it, tie, detail, via }) => {
    const votes = [];
    for (const p of it.best) {
      for (const c of live) {
        const d = metres(p, c.point);
        votes.push({ element: c.element, p625: { lat: p.lat, lng: p.lng }, distance_m: d, kind: d <= COPY_RADIUS_M ? "copied" : d <= AGREEMENT_KM * 1000 ? "vote" : "disagree" });
      }
    }
    votes.sort((a, b) => a.distance_m - b.distance_m || (a.element < b.element ? -1 : 1));
    const agreesWith = [...new Set(votes.filter((v) => v.kind === "vote").map((v) => v.element))].sort();
    const copiedWith = [...new Set(votes.filter((v) => v.kind === "copied").map((v) => v.element))].sort();
    const status = !it.best.length ? "no_p625" : agreesWith.length ? "vote" : copiedWith.length ? "copied" : live.length ? "disagree" : "no_osm_claim";
    return {
      qid: it.qid,
      tie,
      detail,
      found_by: via,
      labels: labelsOf(it),
      p625: it.P625.map((p) => ({ lat: p.lat, lng: p.lng, rank: p.rank })),
      p856: it.P856.map((v) => v.value),
      p31: it.P31.filter((v) => v.rank !== "deprecated").map((v) => v.value),
      p402: it.P402.map((v) => v.value),
      status,
      agrees_with: agreesWith,
      copied_with: copiedWith,
      distances: votes,
    };
  });

  const withP625 = idItems.filter((i) => i.status !== "no_p625");
  const voting = idItems.filter((i) => i.status === "vote");
  const copied = idItems.filter((i) => i.status === "copied");
  const disagreeing = idItems.filter((i) => i.status === "disagree");
  const flagNotes = osm.flatMap((c) => (c.flags ?? []).map((f) => `${c.element} ${f}`));
  let verdict;
  let why;
  let shipOn = null;
  let singledOut = false;
  if (!withP625.length) {
    verdict = "no_second_source";
    why = idItems.length
      ? `identity item${idItems.length > 1 ? "s" : ""} ${idItems.map((i) => `${i.qid} (${i.tie})`).join(", ")} carr${idItems.length > 1 ? "y" : "ies"} no P625`
      : `none of the ${considered} Wikidata candidates is this institution`;
  } else if (!live.length) {
    verdict = "ambiguous";
    why = "no live OSM Claim is left in the declared wilaya";
  } else if (voting.length && disagreeing.length) {
    verdict = "ambiguous";
    why = `identity items disagree: ${voting.map((i) => i.qid).join(", ")} vote for the OSM Claim, ${disagreeing.map((i) => `${i.qid} (${i.distances[0].distance_m} m)`).join(", ")} lie over ${AGREEMENT_KM} km from it`;
  } else if (voting.length) {
    const agreed = [...new Set(voting.flatMap((i) => i.agrees_with))].sort();
    if (agreed.length === 1) {
      if (live.length > 1) singledOut = true;
      const voteTo = (i) => i.distances.find((v) => v.element === agreed[0] && v.kind === "vote").distance_m;
      shipOn = { element: agreed[0], item: voting.slice().sort((a, b) => voteTo(a) - voteTo(b) || (a.qid < b.qid ? -1 : 1))[0] };
      verdict = bac ? "keep_exact" : "promote";
      const d = voteTo(shipOn.item);
      why = `${shipOn.item.qid} (${shipOn.item.tie}) P625 is ${d} m from ${agreed[0]}: a second independent Vote${singledOut ? `, and it singles out ${agreed[0]} among the ${live.length} OSM Claims` : ""}`;
    } else {
      verdict = "ambiguous";
      why = `the Wikidata Vote${voting.length > 1 ? "s" : ""} fall${voting.length > 1 ? "" : "s"} within ${AGREEMENT_KM} km of ${agreed.length} OSM Claims (${agreed.join(", ")}) and single none out`;
    }
  } else if (copied.length && !disagreeing.length) {
    verdict = "copied";
    why = `${copied.map((i) => `${i.qid} (${i.distances[0].distance_m} m from ${i.distances[0].element})`).join(", ")}: within ${COPY_RADIUS_M} m, a Copied claim that casts no Vote`;
  } else if (disagreeing.length && !copied.length) {
    verdict = "disagree";
    why = `${disagreeing.map((i) => `${i.qid} (${i.tie}) P625 is ${i.distances[0].distance_m} m from the nearest OSM Claim ${i.distances[0].element}`).join("; ")}: over ${AGREEMENT_KM} km`;
  } else {
    verdict = "ambiguous";
    why = `identity items disagree: ${copied.map((i) => i.qid).join(", ")} copied, ${disagreeing.map((i) => i.qid).join(", ")} over ${AGREEMENT_KM} km`;
  }
  if (flagNotes.length) why += `; ${flagNotes.join("; ")}`;
  if (bac && verdict !== "keep_exact") why = `BAC 2026 addition ${bac} would be demoted from exact: ${why}`;

  const out = {
    id: rec.id,
    name: rec.name,
    name_ar: rec.name_ar,
    wilaya_code: rec.wilaya_code,
    website: rec.website,
    ...(bac ? { bac_addition: bac } : {}),
    verdict,
    ...(bac && verdict !== "keep_exact" ? { demote: true } : {}),
    why,
    published: { lat: rec.lat, lng: rec.lng, geo_precision: rec.geo_precision, commune: rec.commune, commune_code: rec.commune_code },
    osm,
    wikidata: {
      considered,
      identity: idItems,
      rejected: rejected.sort((a, b) => Number(a.qid.slice(1)) - Number(b.qid.slice(1))),
    },
  };
  if (shipOn) {
    const c = osm.find((x) => x.element === shipOn.element);
    const v = shipOn.item.distances.find((x) => x.element === shipOn.element && x.kind === "vote");
    const loc = locate(c.point.lat, c.point.lng);
    out.ship = {
      point: { lat: c.point.lat, lng: c.point.lng },
      osm: c.element,
      osm_version: c.version,
      osm_timestamp: c.timestamp,
      wikidata: shipOn.item.qid,
      wikidata_tie: shipOn.item.tie,
      p625: v.p625,
      distance_osm_wikidata_m: v.distance_m,
      moves_from_published_m: metres(c.point, rec),
      ...(singledOut ? { singled_out: true, other_osm_claims: live.filter((x) => x.element !== c.element).map((x) => x.element) } : {}),
    };
    out.commune_by_outline = loc.outline ? communeOf(loc.outline) : null;
    out.commune_nearest_centre = nearestCentre(c.point.lat, c.point.lng);
  }
  return out;
}

// ---- run ---------------------------------------------------------------------

const work = [];
for (const q of QUEUE) {
  const rec = BY_ID.get(q.id);
  if (!rec) throw new Error(`${q.id}: queued but not in institutions.json`);
  work.push({ rec, refs: q.claims.map((c) => ({ ref: c.element, tie: c.tie })), bac: null });
}
for (const [code, id] of Object.entries(BAC)) {
  const rec = BY_ID.get(id);
  const add = SEED[code];
  if (!rec || hostOf(rec.website) !== hostOf(add.website)) throw new Error(`${code}: record ${id} is not this addition`);
  work.push({ rec, refs: [{ ref: add.place.osm, tie: "seed" }], bac: code });
}
const records = work.map((w) => review(w.rec, w.refs, w.bac)).sort((a, b) => (a.id < b.id ? -1 : 1));

const counts = {};
for (const r of records) counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;
const doc = {
  run: RUN,
  rule:
    `docs/adr/0001: an OSM campus Claim is exact on a second independent open Claim within AGREEMENT_KM (${AGREEMENT_KM} km) that is not a Copied claim within COPY_RADIUS_M (${COPY_RADIUS_M} m). The second Claim read here is Wikidata P625, counted only from an item that is this institution (website host, the OSM element's own wikidata tag with labels that do not contradict, or a strict name tie); the OSM element's live point is what ships.`,
  captures: {
    osm: { retrieved: OSM_META.retrieved, sha256: OSM_META.sha256 },
    wikidata: { retrieved: WD_META.retrieved, sha256: WD_META.sha256 },
  },
  counts: Object.fromEntries(Object.keys(counts).sort().map((k) => [k, counts[k]])),
  records,
};
if (records.length !== QUEUE.length + Object.keys(BAC).length) throw new Error("record count");
const text = JSON.stringify(doc, null, 2) + "\n";
if (text.includes("\u2014")) throw new Error("em dash in output");
writeFileSync(OUT, text);

// ---- summary on stdout (not written) -------------------------------------------
console.log(Object.entries(doc.counts).map(([k, v]) => `${k} ${v}`).join(", "));
for (const r of records) {
  const s = r.ship
    ? ` | ${r.ship.osm} ${r.ship.wikidata} ${r.ship.distance_osm_wikidata_m} m | outline ${r.commune_by_outline?.name_fr ?? "none"} / nearest ${r.commune_nearest_centre.name_fr} / published ${r.published.commune ?? "null"}`
    : "";
  console.log(`${r.id}${r.bac_addition ? ` ${r.bac_addition}` : ""} ${r.verdict}${s} :: ${r.why}`);
}
