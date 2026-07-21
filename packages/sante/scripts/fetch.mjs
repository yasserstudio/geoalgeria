#!/usr/bin/env node
/**
 * Build Algeria's public health-establishment dataset from the Ministry of
 * Health (MoH) registry and emit JSON, CSV, and GeoJSON to ../data. Raw source
 * pulls are cached under research/sante/.
 *
 * Identity / names (authoritative): the MoH publishes its establishments as a
 * WordPress custom post type at sante.gov.dz, exposed via the REST API
 * (/wp-json/wp/v2/healthinstitution). French and Arabic are separate parallel
 * posts; each is tagged with its wilaya (categorie-healthinstitution taxonomy).
 * The MoH carries no coordinates, address, or commune — only name + type
 * (in the title) + wilaya. Type is derived from the title; the FR and AR posts
 * are paired into one bilingual record.
 *
 * Geography (layered on): the establishment locality (the title minus its type
 * prefix) is matched to the flagship geoalgeria commune set within the known
 * wilaya, giving a commune + a centroid coordinate. Where a hospital/clinic in
 * OpenStreetMap (ODbL) or Wikidata (CC0) sits in that same commune, its precise
 * point upgrades the coordinate. Every record carries `source` and
 * `geo_precision` so the coordinate's origin is explicit.
 *
 * Note: sante.gov.dz may be unreachable from non-Algerian networks / sandboxes;
 * run with direct network access if the MoH pull fails.
 *
 * Usage: node scripts/fetch.mjs
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import https from "node:https";
import http from "node:http";
import tls from "node:tls";
import { X509Certificate, createHash } from "node:crypto";
import { MIGRATIONS, writePackageV2, committedDates, carryOverIds, readCommitted } from "../../../scripts/lib/v2-transforms.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");
const REPO_ROOT = join(__dirname, "..", "..", "..");
const RESEARCH_DIR = join(REPO_ROOT, "research", "sante");
const MATCH_M = 200; // OSM↔Wikidata "same facility" proximity threshold (metres)
const UA = "geoalgeria-data/1.0 (+https://geoalgeria.com)";
const MAX_BYTES = 96 * 1024 * 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DEG = Math.PI / 180;
const M_PER_DEG = 111_320;

// --- generic HTTP ----------------------------------------------------------
const MAX_REDIRECTS = 5;
// Only follow https + same-host redirects (SSRF guard); cap depth so a redirect
// loop can't recurse unbounded.
function safeRedirect(location, fromUrl) {
  const next = new URL(location, fromUrl);
  if (next.protocol !== "https:" || next.hostname !== new URL(fromUrl).hostname) {
    throw new Error(`refusing cross-host/insecure redirect to ${next.href}`);
  }
  return next.href;
}

function httpRequest(url, { method = "GET", headers = {}, body = null, ca = null, depth = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(u, { method, headers, ...(ca ? { ca } : {}) }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.destroy();
        if (depth >= MAX_REDIRECTS) return reject(new Error(`${url} -> too many redirects`));
        try {
          return resolve(httpRequest(safeRedirect(res.headers.location, url), { method, headers, body, ca, depth: depth + 1 }));
        } catch (e) {
          return reject(e);
        }
      }
      res.setEncoding("utf8");
      let data = "";
      res.on("data", (c) => {
        data += c;
        if (data.length > MAX_BYTES) {
          res.destroy();
          reject(new Error(`${url} -> response exceeds ${MAX_BYTES} bytes`));
        }
      });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.setTimeout(300_000, () => req.destroy(new Error(`${url} -> timed out`)));
    if (body) req.write(body);
    req.end();
  });
}

async function getJSON(url, ca = null, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const { status, body } = await httpRequest(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        ca,
      });
      if (status === 200) return JSON.parse(body);
      if (status === 400) return null; // WP returns 400 past the last page
      console.warn(`  HTTP ${status} for ${url}; retrying…`);
    } catch (e) {
      console.warn(`  err: ${e.message}; retrying…`);
    }
    await sleep(2000 + i * 3000);
  }
  throw new Error(`failed to GET ${url}`);
}

// Fetch a small binary body over http/https (used for the intermediate CA cert),
// with a timeout and a hard size cap so a stalled or hostile source can't hang
// the build or exhaust memory.
function httpGetBuffer(url, maxBytes = 256 * 1024) {
  const mod = url.startsWith("https") ? https : http;
  return new Promise((resolve, reject) => {
    const req = mod.get(url, { headers: { "User-Agent": UA } }, (res) => {
      if (res.statusCode !== 200) { res.destroy(); return reject(new Error(`${url} -> HTTP ${res.statusCode}`)); }
      const chunks = [];
      let n = 0;
      res.on("data", (c) => {
        n += c.length;
        if (n > maxBytes) { res.destroy(); reject(new Error(`${url} -> exceeds ${maxBytes} bytes`)); }
        else chunks.push(c);
      });
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject);
    req.setTimeout(30_000, () => req.destroy(new Error(`${url} -> timed out`)));
  });
}

// --- MoH registry (sante.gov.dz) -------------------------------------------
const MSP_BASE = "https://sante.gov.dz/wp-json/wp/v2";
// sante.gov.dz serves an incomplete TLS chain (leaf only, no intermediate).
// We fetch the Sectigo intermediate named in the leaf's AIA extension and
// complete the chain locally (alongside the system roots, so the leaf is still
// validated). The cert is fetched over http, so we PIN it by SHA-256: a
// MITM-substituted CA won't match the digest and is rejected — it can never
// become a rogue trust anchor. On any failure we fall back to the default trust
// store (which then simply fails the incomplete-chain handshake, not silently).
const MSP_INTERMEDIATE_CRT = "http://crt.sectigo.com/SectigoPublicServerAuthenticationCADVR36.crt";
const MSP_INTERMEDIATE_SHA256 = "8c54c334b66ba4e426772af4a3f9136c19a1aec729fdb28c535c07a5a4ef22e0";
let _mspCA = null;
async function mspCA() {
  if (_mspCA) return _mspCA;
  try {
    const der = await httpGetBuffer(MSP_INTERMEDIATE_CRT);
    const digest = createHash("sha256").update(der).digest("hex");
    if (digest !== MSP_INTERMEDIATE_SHA256) throw new Error(`intermediate CA fingerprint mismatch (${digest})`);
    const pem = new X509Certificate(der).toString();
    _mspCA = [pem, ...tls.rootCertificates];
  } catch (e) {
    console.warn(`  could not obtain a pinned MoH intermediate CA (${e.message}); using default trust store`);
    _mspCA = null;
  }
  return _mspCA;
}

async function fetchPaginated(path, fields, ca) {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const url = `${MSP_BASE}/${path}?per_page=100&page=${page}&_fields=${fields}`;
    const batch = await getJSON(url, ca);
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

async function fetchMSP() {
  console.log("Fetching MoH health establishments (sante.gov.dz)…");
  const ca = await mspCA();
  const posts = await fetchPaginated("healthinstitution", "id,title,slug,categorie-healthinstitution", ca);
  const byId = new Map();
  for (const p of posts) byId.set(p.id, p); // de-dup FR/AR overlap by post id
  const records = [...byId.values()];
  console.log(`  ${records.length} establishment posts (FR + AR)`);
  const taxonomy = await fetchPaginated("categorie-healthinstitution", "id,name", ca);
  console.log(`  ${taxonomy.length} wilaya taxonomy terms`);
  if (records.length < 400) throw new Error("MoH returned too few posts; treating as partial");
  mkdirSync(RESEARCH_DIR, { recursive: true });
  writeFileSync(join(RESEARCH_DIR, "msp-healthinstitution-raw.json"), JSON.stringify(records, null, 1) + "\n");
  writeFileSync(join(RESEARCH_DIR, "msp-wilaya-taxonomy.json"), JSON.stringify(taxonomy, null, 1) + "\n");
  return { records, taxonomy };
}

// --- text normalization ----------------------------------------------------
// WordPress title.rendered is HTML-encoded — decode the entities that appear in
// MoH titles (en-dash, curly apostrophe, ampersand, …) so names and matching
// tokens are clean. Numeric first, then named, then &amp; last.
function decodeEntities(s) {
  if (typeof s !== "string") return s;
  return s
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(+n); } catch { return ""; } })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => { try { return String.fromCodePoint(parseInt(n, 16)); } catch { return ""; } })
    .replace(/&rsquo;|&lsquo;/g, "’")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
const str = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const wcode = (n) => (Number.isInteger(n) && n > 0 ? String(n).padStart(2, "0") : null);
const isArabic = (s) => typeof s === "string" && /[؀-ۿ]/.test(s);

// Latin: strip accents, uppercase, keep [A-Z0-9 ].
function norm(s) {
  if (!s) return "";
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return s.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
// Arabic: strip diacritics/tatweel, fold alef/hamza/ya/ta-marbuta variants.
function normAr(s) {
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
const squash = (s) => s.replace(/ /g, "");

// Rough Arabic→Latin transliteration (Algerian/French romanization style), used
// only to align FR↔AR establishment names that couldn't be paired by commune.
const TRANSLIT = {
  "ا": "a", "ب": "b", "ت": "t", "ث": "t", "ج": "j", "ح": "h", "خ": "kh", "د": "d",
  "ذ": "d", "ر": "r", "ز": "z", "س": "s", "ش": "ch", "ص": "s", "ض": "d", "ط": "t",
  "ظ": "d", "ع": "a", "غ": "gh", "ف": "f", "ق": "k", "ك": "k", "ل": "l", "م": "m",
  "ن": "n", "ه": "h", "و": "ou", "ي": "i", "ء": "", "ى": "a",
};
function translitAr(s) {
  const n = normAr(s).replace(/^ال| ال/g, " ").trim(); // drop the definite article
  return [...n].map((c) => (c === " " ? " " : TRANSLIT[c] ?? "")).join("").replace(/\s+/g, " ").trim();
}
// edit distance capped at 2 (returns 2 for anything ≥ 2)
function lev1(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;
  if (a.length === b.length) {
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    return d === 1 ? 1 : 2;
  }
  if (a.length > b.length) [a, b] = [b, a];
  let i = 0, j = 0, diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; }
    else { diff++; j++; if (diff > 1) return 2; }
  }
  return 1;
}

// --- type derivation (keyword-based; robust to MoH typos) -------------------
const TYPE_LABELS = {
  eph: { fr: "Établissement Public Hospitalier", ar: "المؤسسة العمومية الاستشفائية" },
  epsp: { fr: "Établissement Public de Santé de Proximité", ar: "المؤسسة العمومية للصحة الجوارية" },
  ehs: { fr: "Établissement Hospitalier Spécialisé", ar: "المؤسسة الاستشفائية المتخصصة" },
  chu: { fr: "Centre Hospitalo-Universitaire", ar: "المركز الاستشفائي الجامعي" },
  clinique: { fr: "Clinique", ar: "عيادة" },
  hopital: { fr: "Hôpital", ar: "مستشفى" },
};
// Prefix phrases (normalized) to strip from the title to recover the locality.
const FR_PREFIXES = [
  "ETABLISSEMENT PUBLIC HOSPITALIER SPECIALISE",
  "ETABLISSEMENT HOSPITALIER SPECIALISE",
  "ETABLISSEMENT PUBLIC DE SANTE DE PROXIMITE",
  "CENTRE HOSPITALO UNIVERSITAIRE",
  "CENTRE HOSPITALIER UNIVERSITAIRE",
  "ETABLISSEMENT PUBLIC HOSPITALIER",
  "ETABLISSEMENT HOSPITALIER",
  "HOPITAL",
];
const AR_PREFIXES = [
  "الموسسه العموميه الاستشفاييه المتخصصه",
  "الموسسه الاستشفاييه المتخصصه",
  "الموسسه العموميه للصحه الجواريه",
  "المركز الاستشفايي الجامعي",
  "الموسسه العموميه الاستشفاييه",
  "الموسسه الاستشفاييه",
  "مستشفي",
];

function classify(title) {
  const lang = isArabic(title) ? "ar" : "fr";
  const n = lang === "ar" ? normAr(title) : norm(title);
  let type;
  if (lang === "ar") {
    if (n.includes("الجواريه")) type = "epsp";
    else if (n.includes("المتخصصه")) type = "ehs";
    else if (n.includes("الجامعي")) type = "chu";
    else if (n.includes("عياده")) type = "clinique";
    else if (n.includes("الاستشفايي") || n.includes("استشفايي")) type = "eph";
    else if (n.includes("مستشفي")) type = "hopital";
  } else {
    if (n.includes("PROXIMITE")) type = "epsp";
    else if (n.includes("SPECIALISE")) type = "ehs";
    else if (n.includes("UNIVERSITAIRE")) type = "chu";
    else if (n.includes("CLINIQUE") || n.includes("POLYCLINIQUE")) type = "clinique";
    else if (n.includes("HOSPITALIER")) type = "eph";
    else if (n.includes("HOPITAL")) type = "hopital";
  }
  // recover locality: drop the longest matching prefix phrase
  let loc = n;
  const prefixes = lang === "ar" ? AR_PREFIXES : FR_PREFIXES;
  for (const p of prefixes) {
    const idx = loc.indexOf(p);
    if (idx !== -1) { loc = (loc.slice(0, idx) + " " + loc.slice(idx + p.length)).trim(); break; }
  }
  if (lang === "fr") loc = loc.replace(/^(NOUVEL |NOUVEAU |DE |DU |D |LA |LE |LES |EN )/, "").trim();
  return { lang, type, locality: loc.replace(/\s+/g, " ").trim() };
}

// Specialty of an EHS, mapped to a language-independent code so an FR specialty
// name pairs with its AR equivalent (which never transliterates the same).
const SPECIALTY_FR = [
  [/PSYCHIATR|MALADIES MENTALES|SANTE MENTALE/, "psy"],
  [/OBSTETRIQUE|GYNECO|MERE ET ENFANT|\bMERE\b|MATERNIT|NEONAT/, "gyneco"],
  [/OPHTALMO|\bYEUX\b|\bOEIL\b/, "oph"],
  [/CARDIO|CARDIAQUE|\bCOEUR\b/, "cardio"],
  [/CANCER|CANCEREUX|CANCIREUX|ONCOLOG/, "cancer"],
  [/REEDUCATION|READAPTATION|FONCTIONNELLE/, "reeduc"],
  [/NEPHRO|UROLOG|HEMODIALYSE|DIALYSE|\bREIN/, "nephro"],
  [/PNEUMO|PHTISIO|RESPIRATOIRE|THORAC|POUMON/, "pneumo"],
  [/ORTHOPED|TRAUMATOLOG|OSSEUS/, "ortho"],
  [/INFECTIEUS|CONTAGIEUS|TRANSMISSIBLES/, "infect"],
  [/BRULE/, "brule"],
];
const SPECIALTY_AR = [
  [/عقليه|نفسيه/, "psy"],
  [/النساء|النسا|التوليد|الام والطفل|الامومه|الولاده/, "gyneco"],
  [/العيون|عيون/, "oph"],
  [/القلب/, "cardio"],
  [/السرطان|سرطان|الاورام|اورام/, "cancer"],
  [/التاهيل|الترويض|الوظيفي|اعاده التربيه/, "reeduc"],
  [/الكلي|المسالك|البوليه|تصفيه الدم/, "nephro"],
  [/الصدريه|الصدر|الرئه|التنفسيه/, "pneumo"],
  [/العظام|الرضوض/, "ortho"],
  [/المعديه|المتنقله/, "infect"],
  [/الحروق/, "brule"],
];
function specialtyCode(title, lang) {
  if (lang === "ar") { const n = normAr(title); for (const [re, c] of SPECIALTY_AR) if (re.test(n)) return c; }
  else { const n = norm(title); for (const [re, c] of SPECIALTY_FR) if (re.test(n)) return c; }
  return null;
}

// --- reference data (flagship geoalgeria) ----------------------------------
function loadWilayas() {
  const wj = JSON.parse(readFileSync(join(REPO_ROOT, "packages", "dataset", "data", "wilayas.json"), "utf-8")).wilayas;
  const byCode = new Map();
  const fr = [];
  const ar = [];
  for (const w of wj) {
    byCode.set(w.code, w);
    fr.push([norm(w.name_fr), w.code]);
    ar.push([normAr(w.name_ar), w.code]);
  }
  return { byCode, fr, ar };
}
function loadCommunes() {
  const dir = join(REPO_ROOT, "packages", "dataset", "data");
  const files = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"];
  const byWilaya = new Map(); // code -> [{name_n, name_sq, c}]
  let n = 0;
  for (const f of files) {
    for (const c of JSON.parse(readFileSync(join(dir, f), "utf-8"))) {
      if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) continue;
      const list = byWilaya.get(c.wilaya_code) || [];
      const name_n = norm(c.name_fr);
      const name_ar = normAr(c.name_ar);
      list.push({ c, fr: name_n, ar: name_ar, frsq: squash(name_n), arsq: squash(name_ar) });
      byWilaya.set(c.wilaya_code, list);
      n++;
    }
  }
  if (!n) throw new Error("no commune centroids loaded — check packages/dataset/data");
  return byWilaya;
}

// resolve wilaya code from the post's taxonomy terms (fuzzy), else from locality.
function resolveWilaya(termIds, taxMap, wil, locality, lang) {
  const tryName = (raw) => {
    const nf = norm(raw), na = normAr(raw);
    const sf = squash(nf), sa = squash(na);
    for (const [name, code] of wil.fr) if (name === nf) return code;
    for (const [name, code] of wil.ar) if (name === na) return code;
    for (const [name, code] of wil.fr) if (squash(name) === sf && sf) return code;
    for (const [name, code] of wil.ar) if (squash(name) === sa && sa) return code;
    for (const [name, code] of wil.ar) if (sa && lev1(squash(name), sa) <= 1) return code;
    for (const [name, code] of wil.fr) if (sf && lev1(squash(name), sf) <= 1) return code;
    return null;
  };
  for (const id of termIds || []) {
    const name = taxMap.get(id);
    if (!name) continue;
    const code = tryName(name);
    if (code) return code;
  }
  // fallback: the locality itself may be a wilaya name (e.g. a post with no term)
  return tryName(locality);
}

// match a locality string to a commune within the wilaya; returns {c, how} or null.
function matchCommune(locality, lang, wilayaCode, communesByWilaya) {
  const list = communesByWilaya.get(wilayaCode);
  if (!list || !locality) return null;
  const key = lang === "ar" ? "ar" : "fr";
  const keysq = key + "sq";
  const sloc = squash(locality);
  for (const e of list) if (e[key] === locality) return { c: e.c, how: "exact" };
  for (const e of list) if (e[keysq] && e[keysq] === sloc) return { c: e.c, how: "squash" };
  for (const e of list) {
    const cn = e[key];
    if (!cn) continue;
    if ((" " + locality + " ").includes(" " + cn + " ") || e[keysq].length >= 4 && sloc.includes(e[keysq])) return { c: e.c, how: "substr" };
  }
  for (const e of list) if (e[keysq] && e[keysq].length >= 4 && lev1(e[keysq], sloc) <= 1) return { c: e.c, how: "lev1" };
  // token-level fuzzy (handles multi-word localities with one fuzzy token)
  const toks = locality.split(" ").filter((t) => t.length >= 4);
  for (const e of list) {
    const cn = e[key];
    if (!cn) continue;
    for (const ct of cn.split(" ")) {
      if (ct.length < 4) continue;
      for (const t of toks) if (lev1(ct, t) <= 1) return { c: e.c, how: "token" };
    }
  }
  return null;
}

// Drop a trailing wilaya-name marker like "(W. ORAN)" / "(ORAN)" from a locality
// before commune matching, so it doesn't spuriously match the capital commune.
// Kept as-is when the locality IS just the wilaya name (a genuine capital-commune
// establishment that should match that commune).
function stripWilayaSuffix(locality, w, lang) {
  if (!w || !locality) return locality;
  const wToks = (lang === "ar" ? normAr(w.name_ar) : norm(w.name_fr)).split(" ").filter((t) => t.length >= 3);
  const toks = locality.split(" ").filter(Boolean);
  const kept = toks.filter((t) => t !== "W" && !wToks.includes(t));
  // keep the original if stripping leaves nothing substantial (locality WAS the
  // wilaya name, e.g. "Oum El Bouaghi" → don't reduce to the fragment "El")
  return (kept.some((t) => t.length >= 3) ? kept : toks).join(" ");
}

// Last-resort: match a locality to a commune anywhere in the country (exact /
// space-insensitive / one-edit only — strict, to avoid cross-wilaya false hits).
function matchCommuneGlobal(locality, lang, globalCommunes) {
  if (!locality) return null;
  const key = lang === "ar" ? "ar" : "fr";
  const keysq = key + "sq";
  const sloc = squash(locality);
  for (const e of globalCommunes) if (e[key] === locality) return e.c;
  for (const e of globalCommunes) if (e[keysq] && e[keysq] === sloc) return e.c;
  for (const e of globalCommunes) if (e[keysq] && e[keysq].length >= 5 && lev1(e[keysq], sloc) <= 1) return e.c;
  return null;
}

// --- OSM + Wikidata health facilities (geocoding refinement) ---------------
const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const WD_QUERY = `SELECT ?item ?itemLabel ?arLabel ?frLabel ?coord WHERE {
  ?item wdt:P31/wdt:P279* wd:Q16917 .
  ?item wdt:P17 wd:Q262 .
  ?item wdt:P625 ?coord .
  OPTIONAL { ?item rdfs:label ?arLabel FILTER(LANG(?arLabel)="ar") }
  OPTIONAL { ?item rdfs:label ?frLabel FILTER(LANG(?frLabel)="fr") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,ar,en". }
}`;
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

async function fetchWikidata() {
  const body = "query=" + encodeURIComponent(WD_QUERY);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(`Querying Wikidata SPARQL (hospitals)…`);
      const { status, body: out } = await httpRequest(WIKIDATA_SPARQL, {
        method: "POST",
        headers: {
          "User-Agent": UA,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
          Accept: "application/sparql-results+json",
        },
        body,
      });
      if (status !== 200) { await sleep(4000 + attempt * 4000); continue; }
      const json = JSON.parse(out);
      const b = json.results?.bindings || [];
      if (b.length) {
        mkdirSync(RESEARCH_DIR, { recursive: true });
        writeFileSync(join(RESEARCH_DIR, "wikidata-hospitals-raw.json"), JSON.stringify(json) + "\n");
        return b;
      }
    } catch (e) {
      console.warn(`  err: ${e.message}; retrying…`);
      await sleep(4000 + attempt * 4000);
    }
  }
  console.warn("  Wikidata hospitals unavailable — coordinates from commune centroids only.");
  return [];
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const OSM_QUERY = `[out:json][timeout:300];
area["ISO3166-1"="DZ"][admin_level=2]->.dz;
(
  node["amenity"="hospital"](area.dz);
  way["amenity"="hospital"](area.dz);
  relation["amenity"="hospital"](area.dz);
  node["amenity"="clinic"](area.dz);
  way["amenity"="clinic"](area.dz);
  node["healthcare"~"hospital|clinic|centre"](area.dz);
  way["healthcare"~"hospital|clinic|centre"](area.dz);
);
out center tags;`;

async function fetchOSM() {
  const body = "data=" + encodeURIComponent(OSM_QUERY);
  for (const ep of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`Querying Overpass: ${ep}…`);
        const { status, body: out } = await httpRequest(ep, {
          method: "POST",
          headers: {
            "User-Agent": UA,
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(body),
            Accept: "application/json",
          },
          body,
        });
        if (status !== 200) { await sleep(3000 + attempt * 4000); continue; }
        const json = JSON.parse(out);
        if (Array.isArray(json.elements) && json.elements.length) {
          mkdirSync(RESEARCH_DIR, { recursive: true });
          writeFileSync(join(RESEARCH_DIR, "osm-health-raw.json"), JSON.stringify(json) + "\n");
          return json.elements;
        }
      } catch (e) {
        console.warn(`  err: ${e.message}; trying next…`);
        await sleep(3000 + attempt * 4000);
      }
    }
  }
  console.warn("  OSM health facilities unavailable — coordinates from commune centroids only.");
  return [];
}

// Normalize WD + OSM facilities into a common point list, then dedup near-dupes.
function normFacilities(wdBindings, osmElements) {
  const pts = [];
  for (const x of wdBindings) {
    const m = x.coord?.value.match(/Point\(([-0-9.]+) ([-0-9.]+)\)/);
    if (!m) continue;
    const lng = Number(m[1]), lat = Number(m[2]);
    if (!inAlgeria(lat, lng)) continue;
    const il = x.itemLabel?.value;
    const label = il && /^Q\d+$/.test(il) ? null : str(il);
    pts.push({
      kind: "wikidata",
      wikidata: x.item.value.split("/").pop(),
      osm_id: null,
      name: str(x.frLabel?.value) || str(x.arLabel?.value) || label,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    });
  }
  for (const el of osmElements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!inAlgeria(lat, lng)) continue;
    const t = el.tags || {};
    pts.push({
      kind: "osm",
      wikidata: str(t.wikidata),
      osm_id: `${el.type}/${el.id}`,
      name: str(t.name) || str(t["name:fr"]) || str(t["name:ar"]),
      lat: Number(Number(lat).toFixed(6)),
      lng: Number(Number(lng).toFixed(6)),
    });
  }
  return pts;
}

// --- assemble establishments -----------------------------------------------
function buildEstablishments(records, taxMap, wil, communesByWilaya, stats) {
  // nationwide commune index for the last-resort wilaya fallback (a locality that
  // is itself a commune name pins down the wilaya even with no/odd taxonomy term).
  const globalCommunes = [];
  for (const [, list] of communesByWilaya) for (const e of list) globalCommunes.push(e);

  // 1) one intermediate per post. Never drop: an unclassified type defaults to
  //    "hopital"; an unresolved wilaya falls back to a nationwide commune match.
  const posts = [];
  for (const r of records) {
    const title = decodeEntities(str(r.title?.rendered));
    if (!title) continue;
    const c0 = classify(title);
    const lang = c0.lang;
    const locality = c0.locality;
    let type = c0.type;
    if (!type) { stats.type_fail++; type = "hopital"; }

    let wilayaCode = resolveWilaya(r["categorie-healthinstitution"], taxMap, wil, locality, lang);
    let commune = null;
    if (wilayaCode) {
      // try the wilaya-stripped locality first (resolves the specific town, not
      // the capital); fall back to the full locality (resolves capital-named
      // establishments like "EPH Oum El Bouaghi (Ibn Sina)")
      const matchLoc = stripWilayaSuffix(locality, wil.byCode.get(wilayaCode), lang);
      let cm = matchCommune(matchLoc, lang, wilayaCode, communesByWilaya);
      if (!cm && matchLoc !== locality) cm = matchCommune(locality, lang, wilayaCode, communesByWilaya);
      if (cm) { commune = cm.c; stats[`commune_${cm.how}`] = (stats[`commune_${cm.how}`] || 0) + 1; }
      else stats.commune_fail++;
    } else {
      // wilaya unknown: find the commune nationwide, take its wilaya
      const g = matchCommuneGlobal(locality, lang, globalCommunes);
      if (g) { commune = g; wilayaCode = g.wilaya_code; stats.wilaya_from_commune++; }
      else { stats.wilaya_fail++; continue; } // truly unplaceable (no wilaya at all)
    }

    const specialty = type === "ehs" ? specialtyCode(title, lang) : null;
    posts.push({ lang, type, locality, specialty, wilayaCode, title, slug: str(r.slug), msp_id: r.id, commune });
  }

  // 2) pair FR + AR posts within each (wilaya, type) group (see pairPosts):
  //    by transliterated-locality similarity, then by an unambiguous shared
  //    commune. Ambiguous cases stay monolingual rather than risk a wrong pair.
  const groups = new Map(); // "wilaya|type" -> { fr:[], ar:[] }
  for (const p of posts) {
    const key = `${p.wilayaCode}|${p.type}`;
    const g = groups.get(key) || { fr: [], ar: [] };
    g[p.lang].push(p);
    groups.set(key, g);
  }

  const establishments = [];
  const wname = (code) => wil.byCode.get(code);
  const push = (fr, ar) => {
    const base = fr || ar;
    const w = wname(base.wilayaCode);
    const name_fr = fr ? titleCaseFr(fr.title) : null;
    const name_ar = ar ? ar.title : null;
    const commune = base.commune;
    establishments.push({
      name: name_fr || name_ar,
      name_ar,
      name_fr,
      type: base.type,
      type_label_fr: TYPE_LABELS[base.type].fr,
      type_label_ar: TYPE_LABELS[base.type].ar,
      sector: "public", // MoH registry is public establishments; private clinics will carry "private"
      wilaya: w.name_fr,
      wilaya_ar: w.name_ar,
      wilaya_code: wcode(base.wilayaCode),
      commune: commune ? commune.name_fr : null,
      commune_code: commune ? commune.code_commune : null,
      lat: commune ? Number(commune.latitude.toFixed(6)) : null,
      lng: commune ? Number(commune.longitude.toFixed(6)) : null,
      source: "msp",
      geo_precision: commune ? "commune_centroid" : "none",
      wikidata: null,
      osm_id: null,
      msp_id: (fr || ar).msp_id,
      slug: (fr || ar).slug,
    });
  };

  for (const g of groups.values()) {
    for (const { fr, ar } of pairPosts(g.fr, g.ar, wil)) {
      if (fr && ar) stats.paired++;
      push(fr, ar);
    }
  }

  return establishments;
}

// Pair FR and AR posts of one (wilaya, type) group. Step 1: transliterated-
// locality token similarity (≥ 0.5). Step 2: an unambiguous shared commune
// (exactly one remaining fr + one ar in it). Step 3: leftovers stay monolingual.
// The wilaya name is stripped from locality tokens — inside the capital every
// establishment carries it, so it can't tell two of them apart.
function pairPosts(fr, ar, wil) {
  const out = [];
  if (!fr.length && !ar.length) return out;
  const wset = wilayaTokens(wil.byCode.get((fr[0] || ar[0]).wilayaCode));
  const usedF = new Set(), usedA = new Set();

  const cands = [];
  for (const f of fr) {
    const ft = postTokens(f, wset);
    for (const a of ar) cands.push([simTokens(ft, postTokens(a, wset)), f, a]);
  }
  cands.sort((p, q) => q[0] - p[0]);
  for (const [s, f, a] of cands) {
    if (s < 0.5 || usedF.has(f) || usedA.has(a)) continue;
    usedF.add(f); usedA.add(a); out.push({ fr: f, ar: a });
  }

  // step 1b: EHS — pair remaining by an unambiguous shared specialty in the
  // wilaya (a wilaya rarely has two specialized hospitals of the same specialty).
  const byS = new Map();
  const sslot = (k) => byS.get(k) || byS.set(k, { f: [], a: [] }).get(k);
  for (const f of fr) if (!usedF.has(f) && f.specialty) sslot(f.specialty).f.push(f);
  for (const a of ar) if (!usedA.has(a) && a.specialty) sslot(a.specialty).a.push(a);
  for (const { f, a } of byS.values()) {
    if (f.length === 1 && a.length === 1) { usedF.add(f[0]); usedA.add(a[0]); out.push({ fr: f[0], ar: a[0] }); }
  }

  const byC = new Map();
  const slot = (k) => byC.get(k) || byC.set(k, { f: [], a: [] }).get(k);
  // null commune codes (a few source communes lack one) can't disambiguate — skip
  for (const f of fr) if (!usedF.has(f) && f.commune && f.commune.code_commune != null) slot(f.commune.code_commune).f.push(f);
  for (const a of ar) if (!usedA.has(a) && a.commune && a.commune.code_commune != null) slot(a.commune.code_commune).a.push(a);
  for (const { f, a } of byC.values()) {
    if (f.length === 1 && a.length === 1) { usedF.add(f[0]); usedA.add(a[0]); out.push({ fr: f[0], ar: a[0] }); }
  }

  // step 2b: place-named types (EPH/EPSP/CHU…) — if exactly one fr and one ar are
  // still unpaired in this wilaya+type, they are the same place. EHS is excluded
  // (specialty-named: two different ones could be the lone leftovers).
  const remF = fr.filter((f) => !usedF.has(f));
  const remA = ar.filter((a) => !usedA.has(a));
  if (remF.length === 1 && remA.length === 1 && placeNamed(remF[0].type)) {
    // skip if they demonstrably resolve to different communes (≠ same place)
    const fc = remF[0].commune?.code_commune, ac = remA[0].commune?.code_commune;
    if (!(fc != null && ac != null && fc !== ac)) {
      usedF.add(remF[0]); usedA.add(remA[0]); out.push({ fr: remF[0], ar: remA[0] });
    }
  }

  for (const f of fr) if (!usedF.has(f)) out.push({ fr: f, ar: null });
  for (const a of ar) if (!usedA.has(a)) out.push({ fr: null, ar: a });
  return out;
}

// Locality tokens for FR↔AR matching (AR transliterated; wilaya name removed).
function postTokens(post, wset) {
  const base = post.lang === "ar" ? translitAr(post.locality) : post.locality.toLowerCase();
  const toks = base.split(" ").filter((t) => t.length >= 3 && !wset.has(t));
  if (post.specialty) toks.push("spec_" + post.specialty); // shared FR/AR specialty signal
  return toks;
}
function wilayaTokens(w) {
  const s = new Set();
  for (const t of norm(w.name_fr).toLowerCase().split(" ")) if (t.length >= 3) s.add(t);
  for (const t of translitAr(w.name_ar).split(" ")) if (t.length >= 3) s.add(t);
  return s;
}
function simTokens(ft, at) {
  if (!ft.length || !at.length) return 0;
  let hit = 0;
  for (const a of at) for (const f of ft) if (lev1(squash(f), squash(a)) <= 1) { hit++; break; }
  return hit / Math.min(ft.length, at.length);
}
const placeNamed = (t) => t === "eph" || t === "epsp" || t === "chu" || t === "hopital" || t === "clinique";

// Title-case a French establishment name that arrived UPPERCASED from the title.
function titleCaseFr(title) {
  const small = new Set(["de", "du", "des", "d", "la", "le", "les", "et", "en", "à", "au", "aux"]);
  return title
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .replace(/\bD /g, "d'")
    .trim();
}

// Upgrade commune-centroid coordinates to a precise OSM/Wikidata point. Within
// each commune, establishments and facilities are matched 1:1 — every facility
// is used at most once — by shared locality/specialty tokens, with the wilaya
// and commune names excluded (every facility in the commune carries them, so
// they can't tell two apart). A lone establishment + lone facility in a commune
// is matched even without a token overlap. This prevents one facility (e.g. the
// city CHU) from being stamped onto every establishment in the commune.
function refineWithFacilities(establishments, facilities, communesByWilaya, wil, stats) {
  // index facilities by nearest commune (skip null-coded communes)
  const facByCommune = new Map();
  const communeByCode = new Map();
  for (const f of facilities) {
    let best = null, bestD = Infinity;
    for (const [, list] of communesByWilaya) {
      const cosLat = Math.cos(f.lat * DEG);
      for (const e of list) {
        const dx = (e.c.longitude - f.lng) * cosLat;
        const dy = e.c.latitude - f.lat;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = e.c; }
      }
    }
    if (!best || best.code_commune == null) continue;
    f._tokens = facilityTokens(f.name, best, wil);
    communeByCode.set(best.code_commune, best);
    (facByCommune.get(best.code_commune) || facByCommune.set(best.code_commune, []).get(best.code_commune)).push(f);
  }

  const estByCommune = new Map();
  for (const e of establishments) {
    if (e.commune_code == null) continue;
    (estByCommune.get(e.commune_code) || estByCommune.set(e.commune_code, []).get(e.commune_code)).push(e);
  }

  const stamp = (e, f) => {
    e.lat = f.lat; e.lng = f.lng;
    e.geo_precision = f.kind === "wikidata" ? "wikidata_point" : "osm_point";
    e.wikidata = f.wikidata || e.wikidata;
    e.osm_id = f.osm_id || e.osm_id;
    e.source = f.kind === "wikidata"
      ? (e.osm_id ? "msp+osm+wikidata" : "msp+wikidata")
      : (e.wikidata ? "msp+osm+wikidata" : "msp+osm");
    stats.refined++;
  };

  for (const [code, ests] of estByCommune) {
    const facs = facByCommune.get(code);
    if (!facs || !facs.length) continue;
    const com = communeByCode.get(code);
    const pairs = [];
    for (const e of ests) {
      const et = estTokens(e, com, wil);
      for (const f of facs) pairs.push([overlapCount(et, f._tokens), e, f]);
    }
    pairs.sort((a, b) => b[0] - a[0]);
    const usedE = new Set(), usedF = new Set();
    for (const [sc, e, f] of pairs) {
      if (sc < 1 || usedE.has(e) || usedF.has(f)) continue;
      usedE.add(e); usedF.add(f); stamp(e, f);
    }
    // lone establishment + lone facility in the commune → the same place
    if (ests.length === 1 && facs.length === 1 && !usedE.has(ests[0])) stamp(ests[0], facs[0]);
  }
}
// Discriminating tokens of a place string, with wilaya + commune names removed.
function placeTokens(latin, com, wil) {
  const drop = new Set();
  const w = wil.byCode.get(com.wilaya_code);
  for (const s of [norm(w.name_fr).toLowerCase(), translitAr(w.name_ar), norm(com.name_fr).toLowerCase(), translitAr(com.name_ar)])
    for (const t of s.split(" ")) if (t.length >= 3) drop.add(t);
  return latin.split(" ").filter((t) => t.length >= 3 && !drop.has(t));
}
function estTokens(est, com, wil) {
  const fr = est.name_fr ? classify(est.name_fr).locality.toLowerCase() : "";
  const ar = est.name_ar ? translitAr(classify(est.name_ar).locality) : "";
  const toks = [...placeTokens(fr, com, wil), ...placeTokens(ar, com, wil)];
  const spec = specialtyCode(est.name_fr || "", "fr") || specialtyCode(est.name_ar || "", "ar");
  if (spec) toks.push("spec_" + spec);
  return toks;
}
function facilityTokens(name, com, wil) {
  if (!name) return [];
  const lang = isArabic(name) ? "ar" : "fr";
  const latin = lang === "ar" ? translitAr(name) : norm(name).toLowerCase();
  const toks = placeTokens(latin, com, wil);
  const spec = specialtyCode(name, lang);
  if (spec) toks.push("spec_" + spec);
  return toks;
}
function overlapCount(a, b) {
  if (!a.length || !b.length) return 0;
  let hit = 0;
  for (const x of a) for (const y of b) if (lev1(squash(x), squash(y)) <= 1) { hit++; break; }
  return hit;
}

// Stable id `{wilaya_code}-{type}-{seq}`, seq ordered by name for determinism.
function assignIds(rows) {
  const groups = new Map();
  for (const r of rows) {
    const k = `${r.wilaya_code}-${r.type}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  for (const [k, list] of groups) {
    // fixed "en" locale so ids don't churn with the build host's default locale
    list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "en"));
    list.forEach((r, i) => { r.id = `${k}-${String(i + 1).padStart(2, "0")}`; });
  }
  rows.sort((a, b) =>
    a.wilaya_code !== b.wilaya_code ? a.wilaya_code.localeCompare(b.wilaya_code, "en") : a.id.localeCompare(b.id, "en"),
  );
}

// --- writers ---------------------------------------------------------------
function toCSV(rows, cols) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => esc(r[c])).join(","));
  return lines.join("\n") + "\n";
}
function toGeoJSON(rows) {
  return {
    type: "FeatureCollection",
    features: rows
      .filter((r) => r.lat != null && r.lng != null)
      .map((r) => {
        const { lat, lng, ...props } = r;
        return { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: props };
      }),
  };
}
const writeJSON = (p, obj) => writeFileSync(join(OUT_DIR, p), JSON.stringify(obj, null, 2) + "\n");
const writeText = (p, txt) => writeFileSync(join(OUT_DIR, p), txt);

// --- main ------------------------------------------------------------------
async function main() {
  // Offline replay: rebuild from the committed MSP registry + OSM/Wikidata pulls with
  // no network (the MoH portal is behind broken TLS — see fetchMSP's custom-CA path —
  // so a live run is fragile; the cache keeps re-emission deterministic and offline).
  const OFFLINE = process.argv.includes("--cache");
  const { records, taxonomy } = OFFLINE
    ? {
        records: JSON.parse(readFileSync(join(RESEARCH_DIR, "msp-healthinstitution-raw.json"), "utf-8")),
        taxonomy: JSON.parse(readFileSync(join(RESEARCH_DIR, "msp-wilaya-taxonomy.json"), "utf-8")),
      }
    : await fetchMSP();
  const taxMap = new Map(taxonomy.map((t) => [t.id, t.name]));
  const wil = loadWilayas();
  const communesByWilaya = loadCommunes();

  const stats = { type_fail: 0, wilaya_fail: 0, wilaya_from_commune: 0, commune_fail: 0, paired: 0, refined: 0 };
  const rows = buildEstablishments(records, taxMap, wil, communesByWilaya, stats);
  console.log(`  built ${rows.length} establishments (${stats.paired} bilingual pairs, type_fail ${stats.type_fail}, wilaya_fail ${stats.wilaya_fail})`);

  const wdRaw = OFFLINE
    ? JSON.parse(readFileSync(join(RESEARCH_DIR, "wikidata-hospitals-raw.json"), "utf-8")).results.bindings
    : await fetchWikidata();
  const osmRaw = OFFLINE
    ? JSON.parse(readFileSync(join(RESEARCH_DIR, "osm-health-raw.json"), "utf-8")).elements
    : await fetchOSM();
  const facilities = normFacilities(wdRaw, osmRaw);
  console.log(`  ${facilities.length} OSM/Wikidata health facilities for refinement`);
  refineWithFacilities(rows, facilities, communesByWilaya, wil, stats);
  console.log(`  refined ${stats.refined} establishments to precise points`);

  assignIds(rows);

  // Emit v2 via the shared writer. Carry ids over by the stable OSM/Wikidata/MSP id
  // so the commune re-scoping shows up as corrected wilaya/commune, not id churn.
  const cfg = MIGRATIONS.sante;
  const today = new Date().toISOString().slice(0, 10);
  const { updated, retrieved } = OFFLINE ? committedDates(OUT_DIR) : { updated: today, retrieved: today };
  const v2 = rows.map(cfg.map);
  carryOverIds(v2, readCommitted(OUT_DIR, "sante.json"), (r) =>
    r.refs?.osm ? `osm:${r.refs.osm}` : r.refs?.wikidata ? `wd:${r.refs.wikidata}` : r.refs?.msp ? `msp:${r.refs.msp}` : null,
  );
  const { records: out, metadata } = writePackageV2({
    pkg: "sante",
    dir: OUT_DIR,
    files: [{ file: "sante.json", rows: v2 }],
    meta: cfg.meta,
    updated,
    retrieved,
  });
  console.log(
    `Wrote ${out.length} establishments → v2 (${metadata.wilayas_covered} wilayas, ${metadata.geocoded_count} geocoded).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
