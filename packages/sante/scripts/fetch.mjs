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
 * The MoH carries no coordinates, address, or commune, only name + type
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
 * Usage: node scripts/fetch.mjs            # live pull
 *        node scripts/fetch.mjs --cache    # rebuild from research/sante/*-raw.json (+ msp taxonomy)
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import https from "node:https";
import http from "node:http";
import tls from "node:tls";
import { X509Certificate, createHash } from "node:crypto";
import { MIGRATIONS, TWIN_POSTS_NOTE, REPEAT_POSTS_NOTE, writePackageV2, resolveDates, carryOverIds, forwardRetiredId, readCommitted, readRetiredIds, readRetiredMigrations, readCacheFile } from "../../../scripts/lib/v2-transforms.mjs";
// The FR/AR pairs the gap rule below cannot reach, asserted by hand with a
// second source each (private tracker #287). Kept in its own module because the
// table IS the evidence, and is read by the standing test as well as this build.
import { TWIN_PAIR_TABLE, UNPAIRED_CANDIDATES, assertPairTable, pairTableFor } from "./twin-pair-table.mjs";
// The project's one fold, used for the repeat-post check, which compares two
// names written in the SAME script (see the repeat-post section). The
// conservative key decides; the loose key is reported beside it.
import { conservativeKey, looseKey } from "../../normalize/index.js";

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
// MITM-substituted CA won't match the digest and is rejected, so it can never
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
// WordPress title.rendered is HTML-encoded, so decode the entities that appear in
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
export function translitAr(s) {
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
  // OPHTALM, not OPHTALMO: the registry writes "Etablissement hospitalier
  // Ophtalm Djelfa", and the truncation is the only thing that record shares
  // with its Arabic twin, "المؤسسة الإستشفائية لطب العيون الجلفة".
  [/OPHTALM|\bYEUX\b|\bOEIL\b/, "oph"],
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
  // before psy: التنفسيه (respiratory) literally contains نفسيه (mental), so the
  // psy pattern would otherwise read every chest facility as psychiatric.
  [/الصدريه|الصدر|الرئه|التنفسيه/, "pneumo"],
  [/عقليه|نفسيه/, "psy"],
  [/النساء|النسا|التوليد|الام والطفل|الامومه|الولاده/, "gyneco"],
  [/العيون|عيون/, "oph"],
  [/القلب/, "cardio"],
  [/السرطان|سرطان|الاورام|اورام/, "cancer"],
  [/التاهيل|الترويض|الوظيفي|اعاده التربيه/, "reeduc"],
  [/الكلي|المسالك|البوليه|تصفيه الدم/, "nephro"],
  [/العظام|الرضوض/, "ortho"],
  [/المعديه|المتنقله/, "infect"],
  [/الحروق/, "brule"],
];
export function specialtyCode(title, lang) {
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
  if (!n) throw new Error("no commune centroids loaded; check packages/dataset/data");
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
export function matchCommune(locality, lang, wilayaCode, communesByWilaya) {
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
  // token-level fuzzy (handles multi-word localities with one fuzzy token). The
  // first commune with a token hit wins, as before; `how` now says how much of the
  // commune name that hit covered. `token` means every long token of the commune
  // name is in the locality, so the locality really does name that commune.
  // `token_partial` means only some of them are, so the match rests on a fragment
  // such as the given name in "Mohamed Belouzdad": enough to place the record,
  // not enough to identify the facility (see weakCommune).
  const toks = locality.split(" ").filter((t) => t.length >= 4);
  for (const e of list) {
    const cn = e[key];
    if (!cn) continue;
    const cts = cn.split(" ").filter((ct) => ct.length >= 4);
    if (!cts.length) continue;
    const hits = cts.filter((ct) => toks.some((t) => lev1(ct, t) <= 1)).length;
    if (hits) return { c: e.c, how: hits === cts.length ? "token" : "token_partial" };
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
// space-insensitive / one-edit only, strict, to avoid cross-wilaya false hits).
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
  console.warn("  Wikidata hospitals unavailable; coordinates from commune centroids only.");
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
  console.warn("  OSM health facilities unavailable; coordinates from commune centroids only.");
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
function buildEstablishments(records, taxMap, wil, communesByWilaya, stats, verdicts = null, repeats = null) {
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
    let communeHow = null;
    if (wilayaCode) {
      // try the wilaya-stripped locality first (resolves the specific town, not
      // the capital); fall back to the full locality (resolves capital-named
      // establishments like "EPH Oum El Bouaghi (Ibn Sina)")
      const matchLoc = stripWilayaSuffix(locality, wil.byCode.get(wilayaCode), lang);
      let cm = matchCommune(matchLoc, lang, wilayaCode, communesByWilaya);
      if (!cm && matchLoc !== locality) cm = matchCommune(locality, lang, wilayaCode, communesByWilaya);
      if (cm) { commune = cm.c; communeHow = cm.how; stats[`commune_${cm.how}`] = (stats[`commune_${cm.how}`] || 0) + 1; }
      else stats.commune_fail++;
    } else {
      // wilaya unknown: find the commune nationwide, take its wilaya
      const g = matchCommuneGlobal(locality, lang, globalCommunes);
      if (g) { commune = g; communeHow = "global"; wilayaCode = g.wilaya_code; stats.wilaya_from_commune++; }
      else { stats.wilaya_fail++; continue; } // truly unplaceable (no wilaya at all)
    }

    const specialty = type === "ehs" ? specialtyCode(title, lang) : null;
    posts.push({ lang, type, locality, specialty, wilayaCode, title, slug: str(r.slug), msp_id: r.id, commune, communeHow });
  }

  // 1b) the hand-asserted pairs have to still describe this registry: a post the
  //     Ministry renamed, moved to another wilaya or stopped publishing is no
  //     longer the establishment its evidence was gathered for, so the build
  //     stops rather than merge two records on a stale reading. Checked here,
  //     over every post, because a group never sees a row that belongs
  //     elsewhere.
  assertPairTable(posts);

  // 2) pair FR + AR posts within each (wilaya, type) group (see pairPosts): by
  //    the pair table, then by transliterated-locality similarity, then by an
  //    unambiguous shared commune. An ambiguous case stays a Half-record rather
  //    than risk a wrong pair.
  const groups = new Map(); // "wilaya|type" -> { fr:[], ar:[] }
  for (const p of posts) {
    const key = `${p.wilayaCode}|${p.type}`;
    const g = groups.get(key) || { fr: [], ar: [] };
    g[p.lang].push(p);
    groups.set(key, g);
  }

  const establishments = [];
  const wname = (code) => wil.byCode.get(code);
  const push = (fr, ar, repeat = null) => {
    const base = fr || ar;
    const w = wname(base.wilayaCode);
    const name_fr = fr ? titleCaseFr(fr.title) : null;
    const name_ar = ar ? ar.title : null;
    // Geography comes from the better-placed half, not from whichever half is
    // French. The two posts carry the same name in two spellings, and a commune
    // match is only as good as the spelling it was reached through: the Arabic
    // post of the Ain Amguel EPSP names its commune outright while the French
    // one, "IN M'GUEL", matches nothing, and taking the French half would ship
    // the merged record with no commune, no coordinate, and no commune for the
    // OpenStreetMap pass to find a facility in.
    const commune = betterPlaced(fr, ar).commune;
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
      // Every registry post the record stands for, all published, so the
      // carry-over key can be resolved through any of them (see mspCarryKey).
      msp_id: base.msp_id,
      msp_id_twin: fr && ar ? ar.msp_id : null,
      msp_id_repeat: repeat ? repeat.msp_id : null,
      slug: base.slug,
    });
  };

  // 3) the registry's repeat posts: an establishment entered a second time in a
  //    language it already had, which step 3 of the pairing cannot reach because
  //    it pairs one language with the other (see mergeRepeatPosts).
  const paired = [];
  for (const g of groups.values()) for (const slot of pairPosts(g.fr, g.ar, wil, { verdicts })) paired.push(slot);
  const merged = mergeRepeatPosts(paired);
  if (repeats) repeats.push(...merged.verdicts);
  for (const slot of merged.slots) {
    if (slot.fr && slot.ar) stats.paired++;
    push(slot.fr, slot.ar, slot.repeat);
  }

  return establishments;
}

// Pair FR and AR posts of one (wilaya, type) group. Step 0: the pair table.
// Step 1: transliterated-locality token similarity (≥ 0.5). Step 2: an
// unambiguous shared commune (exactly one remaining fr + one ar in it). Step 3:
// an adjacent MSP post id whose name does not contradict (see pairTwinPosts).
// Step 4: whatever is left stays a Half-record. The wilaya name is stripped from
// locality tokens, because inside the capital every establishment carries it and
// it cannot tell two of them apart.
//
// `options.verdicts`, when passed, collects the step-0 and step-3 decisions for
// the review report; `options.table` is the seam the pair-table test writes
// against. Both are options rather than positionals, so a caller never has to
// count arguments to reach the one it means.
export function pairPosts(fr, ar, wil, { verdicts = null, table = TWIN_PAIR_TABLE } = {}) {
  const out = [];
  if (!fr.length && !ar.length) return out;
  const wset = wilayaTokens(wil.byCode.get((fr[0] || ar[0]).wilayaCode));
  const usedF = new Set(), usedA = new Set();

  // step 0: a pair asserted by hand (see twin-pair-table.mjs). It runs before
  // every automatic step, because a read of OpenStreetMap or of a ministry page
  // is stronger evidence than any signal the registry alone offers, and because
  // the halves it names are exactly the ones a weaker step would otherwise
  // claim: in Oran the CHU's halves and the EHU's name nothing but the city
  // beyond their class, so the locality-similarity step pairs whichever two it
  // reaches first.
  for (const { fr: f, ar: a, verdict } of pairTableFor(fr, ar, table)) {
    if (verdicts) verdicts.push(verdict);
    usedF.add(f); usedA.add(a); out.push({ fr: f, ar: a });
  }

  const cands = [];
  for (const f of fr) {
    const ft = postTokens(f, wset);
    for (const a of ar) cands.push([simTokens(ft, postTokens(a, wset)), f, a]);
  }
  cands.sort((p, q) => q[0] - p[0]);
  for (const [s, f, a] of cands) {
    if (s < 0.5 || usedF.has(f) || usedA.has(a) || namesTwoCommunes(f, a)) continue;
    usedF.add(f); usedA.add(a); out.push({ fr: f, ar: a });
  }

  // step 1b: EHS, pair remaining by an unambiguous shared specialty in the
  // wilaya (a wilaya rarely has two specialized hospitals of the same specialty).
  const byS = new Map();
  const sslot = (k) => byS.get(k) || byS.set(k, { f: [], a: [] }).get(k);
  for (const f of fr) if (!usedF.has(f) && f.specialty) sslot(f.specialty).f.push(f);
  for (const a of ar) if (!usedA.has(a) && a.specialty) sslot(a.specialty).a.push(a);
  for (const { f, a } of byS.values()) {
    if (f.length === 1 && a.length === 1 && !namesTwoCommunes(f[0], a[0])) {
      usedF.add(f[0]); usedA.add(a[0]); out.push({ fr: f[0], ar: a[0] });
    }
  }

  const byC = new Map();
  const slot = (k) => byC.get(k) || byC.set(k, { f: [], a: [] }).get(k);
  // null commune codes (a few source communes lack one) can't disambiguate, so skip
  for (const f of fr) if (!usedF.has(f) && f.commune && f.commune.code_commune != null) slot(f.commune.code_commune).f.push(f);
  for (const a of ar) if (!usedA.has(a) && a.commune && a.commune.code_commune != null) slot(a.commune.code_commune).a.push(a);
  for (const { f, a } of byC.values()) {
    // A commune only two coincidental name fragments agree on is not evidence that
    // the two posts are one facility, so at least one side must name its commune
    // outright (see weakCommune).
    if (f.length === 1 && a.length === 1 && !(weakCommune(f[0]) && weakCommune(a[0]))) {
      usedF.add(f[0]); usedA.add(a[0]); out.push({ fr: f[0], ar: a[0] });
    }
  }

  // step 2b: place-named types (EPH/EPSP/CHU…): if exactly one fr and one ar are
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

  // step 3: the registry's own twin posts, an MSP post id within TWIN_MAX_GAP in the
  // opposite language whose name does not contradict (see pairTwinPosts).
  for (const { fr: f, ar: a, verdict } of pairTwinPosts(fr, ar, wil, usedF, usedA)) {
    if (verdicts) verdicts.push(verdict);
    if (!verdict.paired) continue;
    usedF.add(f); usedA.add(a); out.push({ fr: f, ar: a });
  }

  for (const f of fr) if (!usedF.has(f)) out.push({ fr: f, ar: null });
  for (const a of ar) if (!usedA.has(a)) out.push({ fr: null, ar: a });
  return out;
}

// --- the registry's twin posts ---------------------------------------------
// The Ministry publishes each establishment twice, once per language, and the
// two posts are usually consecutive WordPress ids. Adjacency alone is not
// evidence, since only 42.9% of French posts have an Arabic post at id+1, so a
// candidate must also pass a name check, and a post with two equally good
// candidates is left alone rather than guessed at.
//
// The name check cannot be a transliterated-string comparison: `translitAr`
// writes no vowels (Arabic does not), so "Chorfa" and the transliterated
// "chrfh" are two edits apart and `simTokens` reads them as different places.
// It compares CONSONANT SKELETONS instead (twinNameKey), which is what the two
// scripts actually agree on. @geoalgeria/normalize is not used here: its keys
// fold a name WITHIN one script, and this check has to cross two.
const TWIN_MIN_KEY = 2; // a one-consonant skeleton says nothing either way

// A translation is not a transliteration: "Ancien Hopital" and "المستشفى القديم"
// are one hospital whose skeletons share nothing. Only the handful of adjectives
// the registry itself uses, each a translation rather than a guess.
const TWIN_SYNONYMS = new Map([
  ["ncn", "age_old"],  // ancien
  ["kdm", "age_old"],  // قديم
  ["nvl", "age_new"],  // nouvel
  ["nv", "age_new"],   // nouveau
  ["jd", "age_new"],   // جديد
]);

/** The consonant skeleton two scripts can agree on: vowels dropped, `ch` read as
 *  the one consonant it is, the ق/g/q/k romanizations folded (Guelma, قالمة), a
 *  doubled consonant counted once, and the trailing h that ة surfaces as
 *  dropped. A `spec_*` specialty code is already language-independent. */
export function twinNameKey(token) {
  if (token.startsWith("spec_")) return token;
  let k = token
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    // ch is one consonant (ش, and the French spelling of it), so a doubled one
    // collapses with it later. kh and gh are deliberately NOT folded: translitAr
    // writes them for خ and غ, but it also writes a bare k beside a bare h, and
    // "msikh" (مسيكة) would then stop matching "Massika".
    .replace(/ch/g, "c")
    .replace(/[aeiouy]/g, "")
    .replace(/[gqk]/g, "k")
    .replace(/(.)\1+/g, "$1")
    .replace(/h$/, "");
  return TWIN_SYNONYMS.get(k) ?? k;
}

/** The keys of a post that could testify to its identity: its locality minus
 *  the wilaya name and the facility-class vocabulary every health facility
 *  carries, plus its specialty code. Skeletons shorter than TWIN_MIN_KEY are
 *  dropped, since they match almost anything and are neither for nor against. */
export function twinTokens(post, wset) {
  const keys = [];
  // The specialty, from the title and not from post.specialty: the generator
  // only records a specialty for an EHS, but "Hopital d'ophtalmologie Bechar"
  // and "المؤسسة الإستشفائية لطب العيون بشار" are both filed as EPH and have
  // nothing else in common: one writes the specialty in Greek roots, the other
  // as "medicine of the eyes". The code is the only thing the two scripts share.
  const spec = specialtyCode(post.title, post.lang);
  if (spec) keys.push("spec_" + spec);
  for (const t of postTokens(post, wset)) {
    if (isGeneric(t)) continue;
    const k = twinNameKey(t);
    if (k.length >= TWIN_MIN_KEY && !keys.includes(k)) keys.push(k);
  }
  return keys;
}

/** Does this French post and this Arabic post name the same facility?
 *  - they agree on a discriminating key → `shared_key`
 *  - one side names nothing discriminating → `no_contradiction`: silence, which
 *    is what "EPH Tiaret" / "المؤسسة العمومية الإستشفائية تيارت" is
 *  - both name something and none of it agrees → `name_conflict`, refused */
export function twinNameCheck(f, a, wset) {
  const ft = twinTokens(f, wset);
  const at = twinTokens(a, wset);
  const score = overlapCount(ft, at);
  if (score) return { ok: true, reason: "shared_key", score, fr_keys: ft, ar_keys: at };
  if (!ft.length || !at.length)
    return { ok: true, reason: "no_contradiction", score: 0, fr_keys: ft, ar_keys: at };
  return { ok: false, reason: "name_conflict", score: 0, fr_keys: ft, ar_keys: at };
}

// How far apart two twin posts may sit. A gap of 1 is the registry's own habit.
// A gap of 2 means a third post was published between them, which happens when
// one wilaya's establishments were entered out of order, so it is allowed only on
// stronger name evidence (see twinGapOk).
const TWIN_MAX_GAP = 2;

/** Is the name evidence strong enough for this gap? At a gap of 1 the name check
 *  decides alone. At 2 the pair also needs either a commune both halves name, with
 *  two keys agreeing, or a complete skeleton match, where everything the briefer
 *  side offers is matched. That is what separates the Bechar mother-and-child EHS
 *  and the Barika and Abalessa EPSPs from the Oran gynaecology EHS, which shares
 *  its specialty and the word "pines" with a different maternity two posts away. */
function twinGapOk(gap, check, f, a) {
  if (!check.ok) return false;
  if (gap <= 1) return true;
  const sameCommune =
    f.commune?.code_commune != null && f.commune.code_commune === a.commune?.code_commune;
  const complete =
    check.score > 0 && check.score === Math.min(check.fr_keys.length, check.ar_keys.length);
  return (sameCommune && check.score >= 2) || complete;
}

/** Recover the still-unpaired twin posts of one (wilaya, type) group. Returns
 *  every candidate with its verdict, so the refusals are reportable too. */
export function pairTwinPosts(fr, ar, wil, usedF = new Set(), usedA = new Set()) {
  const remF = fr.filter((f) => !usedF.has(f));
  const remA = ar.filter((a) => !usedA.has(a));
  if (!remF.length || !remA.length) return [];
  const wset = wilayaTokens(wil.byCode.get((remF[0] || remA[0]).wilayaCode));

  const cands = [];
  for (const f of remF)
    for (const a of remA) {
      const gap = Math.abs(Number(f.msp_id) - Number(a.msp_id));
      if (gap < 1 || gap > TWIN_MAX_GAP) continue;
      const check = twinNameCheck(f, a, wset);
      cands.push({
        fr: f,
        ar: a,
        gap,
        check,
        gated: twinGapOk(gap, check, f, a),
      });
    }

  // Best name match first, then the closer post id, then the id itself, so the
  // outcome never depends on the order the registry returned the posts in.
  const ranked = cands
    .filter((c) => c.gated)
    .sort(
      (p, q) =>
        q.check.score - p.check.score || p.gap - q.gap || Number(p.fr.msp_id) - Number(q.fr.msp_id),
    );
  const takenF = new Set(), takenA = new Set();
  for (const c of ranked) {
    if (takenF.has(c.fr) || takenA.has(c.ar)) { c.refusal = "claimed_by_a_better_name_match"; continue; }
    // Two free candidates the name check cannot separate are not evidence of
    // either pair: refuse both rather than let the sort decide.
    const tied = ranked.some(
      (o) =>
        o !== c && o.check.score === c.check.score && o.gap === c.gap &&
        !takenF.has(o.fr) && !takenA.has(o.ar) && (o.fr === c.fr || o.ar === c.ar),
    );
    if (tied) { c.refusal = "ambiguous_equal_name_match"; continue; }
    // Two communes that both halves name outright, and that differ, are evidence
    // of two places whatever the names agree on. A `token_partial` commune was
    // reached on a fragment of its name, which the Arabic half of the Setif CHU
    // hits on the given name in "Saadna Mohamed Abdenour", so it is not a second
    // place and cannot veto.
    if (namesTwoCommunes(c.fr, c.ar)) { c.refusal = "different_commune"; continue; }
    takenF.add(c.fr); takenA.add(c.ar);
  }

  return cands.map(({ fr: f, ar: a, gap, check, gated, refusal }) => ({
    fr: f,
    ar: a,
    verdict: {
      paired: gated && !refusal,
      decided_by: "rule",
      reason: refusal ?? (gated ? check.reason : check.ok ? "name_evidence_too_thin_for_the_gap" : check.reason),
      wilaya_code: wcode(f.wilayaCode),
      type: f.type,
      msp_gap: gap,
      msp_fr: String(f.msp_id),
      msp_ar: String(a.msp_id),
      name_fr: f.title,
      name_ar: a.title,
      fr_keys: check.fr_keys,
      ar_keys: check.ar_keys,
      shared_keys: check.score,
    },
  }));
}

// --- the registry's repeat posts -------------------------------------------
// A twin post is the SAME establishment in the OTHER language. A repeat post is
// the same establishment in the language it already had: the registry entered it
// twice under the one name. The twin rule cannot reach these, because it only
// ever pairs a French post with an Arabic one, so both copies ship as records and
// split the facility's coordinate and anything joined to it.
//
// The measurement that scoped this: of 1,258 registry posts, exactly 7 titles are
// published twice in one language. The gate reads a folded title, not the raw
// string, so a later refresh that enters a title again with a hamza or spacing
// variant is still caught. WordPress's own `-N` slug suffix is NOT evidence here:
// `post_name` is truncated, so the suffix marks a collision on the truncated stem
// and not on the title (the Ain Touta repeat pair carries -2 and -3, the
// Berrouaghia one -2 and -4). The report publishes both @geoalgeria/normalize
// keys per candidate instead, and the committed test asserts that the loose key
// agrees on every pair this merges and separates every pair it keeps apart.
//
// Unlike the twin rule, the whole title has to fold to the same key, which is the
// strongest form of the "complete match" the twin gate allows at a gap of two: a
// name the registry wrote differently is a refusal, whatever else the two agree
// on. That is what keeps the two Skikda hospitals ("Etablissement Hospitalier
// Skikda" and "Etablissement Public Hospitalier Skikda") and the two Ouargla ones
// apart; they are two facilities whose French and Arabic halves the twin rule
// could not reach either, not one facility entered twice.
//
// An EMPTY fold is not agreement. `conservativeKey` keeps no punctuation, so a
// placeholder title such as "-" or "..." folds to "", and two placeholders would
// otherwise read as the same name and retire a public id between them. The twin
// check already draws this line the same way, where a half left with no token
// contributes no key and cannot carry a pair on its own; here, with no second
// signal to lean on, an empty key is a refusal rather than silence.
const REPEAT_LANGS = ["fr", "ar"];

/** The whole title, folded. @geoalgeria/normalize is the project's one fold, and
 *  it applies here where it did not to the twin check: a repeat post is in the
 *  SAME script, which is exactly what a search key folds. The gate reads the
 *  conservative key; the loose key is published beside it as a second opinion
 *  the test holds the rule to, never as the thing that decides. */
export function repeatTitleKey(post) {
  return conservativeKey(post.title);
}
export function repeatTitleKeyLoose(post) {
  return looseKey(post.title);
}

/** The post a slot is published under, and the post that places it, the same two
 *  the record itself is built from (see push and betterPlaced). */
const slotPrimary = (slot) => slot.fr || slot.ar;
const slotPlacer = (slot) => betterPlaced(slot.fr, slot.ar);

/** Which of two duplicate entries keeps the record, and so keeps the public id
 *  the carry-over ledger has for its post. In order: the entry the registry
 *  itself vouched for by publishing both languages of it, then the entry whose
 *  commune match read more of the commune name, then the post the registry
 *  published first. The kept id is therefore the id that entry shipped under,
 *  which is not always the lower-sequence id of the two: the Ain Djasser EPSP
 *  keeps the record of post 3901, the first of the two, and retires the id its
 *  repeat post held. Takes and returns the candidate ENTRIES, `{ slot, post,
 *  lang }`, because the ledger has to name the post in the DUPLICATED language
 *  and not whichever post the slot happens to be published under. */
export function repeatKeeper(a, b) {
  const order = (keep, drop, because) => ({ keep, drop, because });
  const langs = (e) => (e.slot.fr ? 1 : 0) + (e.slot.ar ? 1 : 0);
  if (langs(a) !== langs(b))
    return langs(a) > langs(b) ? order(a, b, "both_languages") : order(b, a, "both_languages");
  const [ra, rb] = [communeRank(slotPlacer(a.slot)), communeRank(slotPlacer(b.slot))];
  if (ra !== rb) return ra > rb ? order(a, b, "better_placed") : order(b, a, "better_placed");
  return Number(a.post.msp_id) <= Number(b.post.msp_id)
    ? order(a, b, "first_post")
    : order(b, a, "first_post");
}

/** Why the kept post was kept, as the sentence the retirement note carries. */
const REPEAT_KEPT_BECAUSE = {
  both_languages: "it is the entry the registry published in both languages",
  better_placed: "its entry is the one that names the establishment's commune",
  first_post: "its post is the one the registry published first, and the other is the repeat post",
};

/**
 * Fold the registry's repeat posts into one record each. Returns the surviving
 * slots, each a fresh object carrying `repeat`, the post it absorbed, plus the
 * verdict on every candidate. The slots handed in are never mutated, so the
 * decision is the return value and not a side effect on the caller's data.
 *
 * Candidates come from the weaker signal the measurement started from, two slots
 * of one type and wilaya whose LOCALITY folds to the same key in the same
 * language, plus the stronger one that can cross a wilaya, two slots whose whole
 * TITLE folds to the same key. Reporting the weak signal too is what makes
 * "kept" a decision with a reason rather than an absence of one.
 *
 * A candidate is merged only on `same_title`, and refused otherwise:
 * - `names_differ`: the registry wrote two different names, and this rule never
 *   guesses which one the other was meant to be. The two Skikda and the two
 *   Ouargla hospitals are refused here.
 * - `different_commune`: both slots name a commune outright and the two differ,
 *   which is two places whatever the titles agree on (the twin rule's own veto).
 * - `different_wilaya`: the two slots sit in different wilayas and the placement
 *   does not point one way. A commune name repeats across Algeria, so an
 *   identical title is not evidence on its own. A cross-wilaya pair merges only
 *   as `same_title_one_placement`, and only when the KEPT side is the placed one
 *   and the absorbed side is placed nowhere, so a record is never moved into a
 *   wilaya nothing but a registry tag puts it in. That is the Jijel hospital the
 *   registry filed under Djelfa, whose own name reads جيجل.
 * - `absorbs_two_posts`: the absorbed slot is bilingual, so the merge would hand
 *   the record a repeat post in each language and `refs.msp_repeat` names one.
 *   Refused rather than silently dropping a post.
 * - `already_merged`: one of the two slots has already absorbed or been absorbed
 *   by a repeat post, so a third copy is left alone rather than chained.
 * - `no_name_key`: a title that folds to nothing, which a punctuation-only
 *   placeholder does. An empty key is not a name the two share, so it never
 *   buckets and never agrees.
 */
export function mergeRepeatPosts(slots) {
  const buckets = new Map();
  const bucket = (k) => buckets.get(k) || buckets.set(k, []).get(k);
  for (const slot of slots)
    for (const lang of REPEAT_LANGS) {
      const post = slot[lang];
      if (!post) continue;
      // the weak signal is wilaya-scoped, the strong one is national. Both carry
      // the type, so two entries in one bucket always share it. A key that folds
      // to nothing is not a key: it buckets nobody, so a placeholder title never
      // becomes a candidate at all.
      const locality = conservativeKey(post.locality);
      const title = repeatTitleKey(post);
      if (locality) bucket(`loc|${lang}|${post.type}|${wcode(post.wilayaCode)}|${locality}`).push({ slot, post, lang });
      if (title) bucket(`title|${lang}|${post.type}|${title}`).push({ slot, post, lang });
    }

  const cands = new Map(); // one candidate per (slot pair, language)
  for (const entries of buckets.values()) {
    if (entries.length < 2) continue;
    for (let i = 0; i < entries.length; i++)
      for (let j = i + 1; j < entries.length; j++) {
        const [x, y] = [entries[i], entries[j]];
        if (x.slot === y.slot) continue;
        const [lo, hi] =
          Number(x.post.msp_id) <= Number(y.post.msp_id) ? [x, y] : [y, x];
        cands.set(`${lo.lang}|${lo.post.msp_id}|${hi.post.msp_id}`, { lo, hi });
      }
  }

  // Decide in a fixed order, so the outcome never depends on the order the
  // registry returned the posts in.
  const ordered = [...cands.entries()].sort((p, q) => (p[0] < q[0] ? -1 : p[0] > q[0] ? 1 : 0));
  const dropped = new Set();
  const absorbed = new Map(); // kept slot -> the post it absorbs
  const verdicts = [];
  for (const [, { lo, hi }] of ordered) {
    let reason = null;
    // An empty fold is nothing in common, not a shared name, however the
    // candidate reached this loop: the gate never agrees on nothing.
    if (!repeatTitleKey(lo.post) || !repeatTitleKey(hi.post)) reason = "no_name_key";
    else if (repeatTitleKey(lo.post) !== repeatTitleKey(hi.post)) reason = "names_differ";
    else if ([lo, hi].some((e) => dropped.has(e.slot) || absorbed.has(e.slot))) reason = "already_merged";
    else if (namesTwoCommunes(slotPlacer(lo.slot), slotPlacer(hi.slot))) reason = "different_commune";

    let keep = null, drop = null, because = null, crossWilaya = false;
    if (!reason) {
      ({ keep, drop, because } = repeatKeeper(lo, hi));
      crossWilaya = slotPrimary(keep.slot).wilayaCode !== slotPrimary(drop.slot).wilayaCode;
      // across a wilaya the KEPT side has to be the placed one: merging into an
      // unplaced record would move the establishment into a wilaya nothing but a
      // registry tag puts it in.
      if (crossWilaya && !(slotPlacer(keep.slot).commune && !slotPlacer(drop.slot).commune))
        reason = "different_wilaya";
      // the absorbed slot would hand the record a post in each language, and a
      // record publishes one repeat post, so refuse rather than drop a post
      else if (drop.slot.fr && drop.slot.ar) reason = "absorbs_two_posts";
    }

    if (!reason) {
      absorbed.set(keep.slot, drop.post);
      dropped.add(drop.slot);
    }
    // Every array below describes the same two posts, in the same order, as the
    // ids beside it: [kept, absorbed] once a pair merges, and [first post,
    // second post] for a pair kept apart, which has no kept side.
    const sides = reason ? [lo, hi] : [keep, drop];
    verdicts.push({
      merged: !reason,
      reason: reason ?? (crossWilaya ? "same_title_one_placement" : "same_title"),
      language: lo.lang,
      type: lo.post.type,
      ...(reason
        ? { msp: sides.map((e) => String(e.post.msp_id)) }
        : {
            wilaya_code: wcode(slotPrimary(keep.slot).wilayaCode),
            cross_wilaya: crossWilaya,
            kept_because: because,
            msp_kept: String(keep.post.msp_id),
            msp_repeat: String(drop.post.msp_id),
          }),
      names: sides.map((e) => e.post.title),
      conservative_keys: sides.map((e) => repeatTitleKey(e.post)),
      loose_keys: sides.map((e) => repeatTitleKeyLoose(e.post)),
      wilaya_codes: sides.map((e) => wcode(e.post.wilayaCode)),
      communes: sides.map((e) => {
        const code = slotPlacer(e.slot).commune?.code_commune;
        return code == null ? null : String(code).padStart(4, "0");
      }),
    });
  }
  return {
    slots: slots
      .filter((slot) => !dropped.has(slot))
      .map((slot) => ({ fr: slot.fr, ar: slot.ar, repeat: absorbed.get(slot) ?? null })),
    verdicts,
  };
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

// A `token_partial` commune was reached on a fragment of a multi-word commune
// name, which a person-named establishment hits by coincidence: "Chirurgie
// Cardiaque Clinique Mohamed Abderrahmani" lands in the commune Mohamed
// Belouzdad on the given name alone. Such a commune still geocodes the record; it
// just carries too little of the name to testify that two posts are one facility.
const weakCommune = (post) => post.communeHow === "token_partial";

/** Do the two halves each name a commune outright, and different ones? Then they
 *  are two places whatever their names agree on. Every pairing step that reads
 *  names checks this: step 1 paired the Ain Djasser EPSP with the Arabic post of
 *  Ain Touta on the shared "ain" alone. Only a match that read the whole commune
 *  name can testify: a `token` match can rest on one word such as سيدي, which
 *  puts "بسيدي بلعباس" in Sidi Ali Benyoub. */
const namesCommuneOutright = (post) => post.communeHow !== "token" && !weakCommune(post);
const namesTwoCommunes = (f, a) => {
  if (!namesCommuneOutright(f) || !namesCommuneOutright(a)) return false;
  const fc = f.commune?.code_commune, ac = a.commune?.code_commune;
  return fc != null && ac != null && fc !== ac;
};

// How much of a commune name the match rested on, as a rank. `exact` and
// `squash` read the whole name; `global` is the same strictness applied
// nationwide; `substr`, `lev1` and `token` read all of it with an edit or some
// surrounding words; `token_partial` read a fragment, and no match at all is
// still better than nothing only in the sense that it ranks last.
const COMMUNE_RANK = { exact: 6, squash: 5, global: 5, substr: 4, lev1: 3, token: 3, token_partial: 1 };
const communeRank = (post) => (post?.commune ? COMMUNE_RANK[post.communeHow] ?? 2 : 0);

/** Does a `token` match name the commune and nothing else? Every long word of
 *  the locality has to belong to the commune name. "إن أمقل" is all Ain Amguel;
 *  "مصطفى باشا" hits Baba Hassen on باشا alone and keeps a given name over. */
function localityIsCommune(post) {
  const name = post.lang === "ar" ? normAr(post.commune.name_ar) : norm(post.commune.name_fr);
  const cts = name.split(" ").filter((t) => t.length >= 4);
  return post.locality
    .split(" ")
    .filter((t) => t.length >= 4)
    .every((t) => cts.some((ct) => lev1(ct, t) <= 1));
}

/** The half of one facility that places it. The French half does, unless the
 *  Arabic one names its commune more fully and names nothing else: a fragment
 *  match (`token_partial`), or a `token` match that leaves words over, is how a
 *  person's name reads as a commune, which put the Mustapha Pacha CHU in Baba
 *  Hassen and the Drid Hocine EHS in Hussein Dey. Ties keep the French half, so
 *  the choice is stable. */
export function betterPlaced(fr, ar) {
  if (!fr) return ar;
  if (!ar) return fr;
  if (ar.communeHow === "token_partial") return fr;
  if (ar.communeHow === "token" && !localityIsCommune(ar)) return fr;
  return communeRank(ar) > communeRank(fr) ? ar : fr;
}

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
// each commune, establishments and facilities are matched 1:1 (every facility
// is used at most once) by a shared SPECIFIC locality/specialty token. The
// wilaya name, the commune name and the facility-class vocabulary (GENERIC_TOKENS:
// clinique, hopital, عيادة, مركز …) are all excluded, because every facility in
// the commune carries them and they cannot tell two apart. A lone establishment +
// lone facility in a commune is matched even without a token overlap: there the
// commune itself is the evidence, and there is no second candidate to confuse it
// with. This prevents one facility (e.g. the
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
    // Lone establishment + lone facility in the commune → the same place, unless
    // the two names contradict each other. The 1:1 loop above has already taken
    // every pair with a specific token in common, so reaching here means they
    // share none. That is only silence when at least one side has no specific
    // token to give: a facility named just "Polyclinique", or the commune name,
    // or nothing at all. When BOTH sides name something specific and none of it
    // agrees, the names are evidence AGAINST one place, and stamping anyway put
    // the Setif anti-cancer centre on the city's tuberculosis service.
    if (ests.length === 1 && facs.length === 1 && !usedE.has(ests[0])) {
      const et = estTokens(ests[0], com, wil);
      if (!(et.length && facs[0]._tokens.length)) stamp(ests[0], facs[0]);
    }
  }
}
// The facility-class vocabulary: words that say what KIND of place this is, in
// French and in transliterated Arabic. Every health facility in the country
// carries some of them, so a shared one is not evidence that two names are the
// same place. Sharing only `aiadh` (عيادة, clinic) is what stamped the OSM
// polyclinic way/1171998839, amenity=clinic "Polyclinique Hai El Badr", onto the
// Arabic half-record of the EHS cardiac-surgery Clinique Abderrahmani: one generic
// token, no specific one, a different facility. The specialty signal
// (`spec_cardio` and friends) is NOT in here: it discriminates.
const GENERIC_TOKENS = new Set([
  // French / Latin
  "etablissement", "etablissements", "public", "publique", "hospitalier",
  "hospitaliere", "hospitalisation", "specialise", "specialisee", "sante",
  "proximite", "clinique", "cliniques", "clinic", "polyclinique", "polyclinic",
  "centre", "center", "hopital", "hospital", "dispensaire", "infirmerie",
  "salle", "soins", "medical", "medicale", "medico", "unite", "universitaire",
  "sanitaire", "cabinet", "maternite", "secteur", "ehs", "eph", "epsp", "epse",
  "chu", "ehu", "cht", "service", "controle", "lutte", "prevention", "maladie",
  "maladies", "malades", "traitement", "depistage",
  // transliterated Arabic (translitAr output)
  "moussh", "amoumih", "astchfaiih", "astchfai", "mtkhssh", "shh", "llshh",
  "jouarih", "aiadh", "mstchfi", "mrkz", "mtaddh", "khdmat", "kaah", "alaj",
  "mshh", "shi", "tbi", "jamai", "ouhdh", "toulid", "aalmtkhssh", "aaadh",
  "mslhh", "mkafhh", "amrad", "oualamrad", "alaamrad", "moukafhh", "ouhdat",
  // The locative elements Algerian place names are built from. They are not
  // facility classes, but they are just as shared: 121 of the 1,541 communes
  // begin "Ain", 96 "Sidi", 65 "Ouled". "EPSP Ouled Aiche" and the Arabic
  // "اولاد يعيش" agreeing on `ouled` says only that both are an Ouled something.
  // Counted from the commune set itself, every element carried by at least eight
  // commune names, in both the French spelling and the translitAr one.
  "ain", "sidi", "ouled", "oulad", "aoulad", "oued", "ouad", "ouadi",
  "beni", "bni", "ben", "hassi", "hasi", "haci", "bordj", "borj", "brj",
  "bir", "ait", "ayt", "hammam", "hmam", "souk", "oum", "tizi", "bou",
  "ksar", "ksr",
]);
const isGeneric = (t) => GENERIC_TOKENS.has(t) || GENERIC_TOKENS.has(squash(t));

// Discriminating tokens of a place string, with wilaya + commune names and the
// facility-class vocabulary removed.
// `arabic` says the tokens were transliterated out of Arabic, which is the only
// script the locative rule below applies to.
function placeTokens(latin, com, wil, arabic = false) {
  const drop = new Set();
  const w = wil.byCode.get(com.wilaya_code);
  for (const s of [norm(w.name_fr).toLowerCase(), translitAr(w.name_ar), norm(com.name_fr).toLowerCase(), translitAr(com.name_ar)])
    for (const t of s.split(" ")) if (t.length >= 3) drop.add(t);
  // A place name an ARABIC title reaches through a locative particle is still
  // that place name: translitAr writes بأدرار and بادرار ("at Adrar") as
  // "badrar", which `drop` does not hold, so the bare city name survived as if
  // it told two establishments of that city apart. It stamped the OpenStreetMap
  // EPSP of Adrar onto the EPH of Adrar the moment the EPH gained its Arabic
  // half. The particles are ب and ل, which attach to the following word, plus
  // the definite article ال.
  //
  // Only for Arabic, because in a Latin name a leading b or l is a letter of the
  // name and not a particle: stripping it there would swallow any place whose
  // name happens to be its commune's with a b or an l in front.
  const particled = (t) =>
    arabic && (((t[0] === "b" || t[0] === "l") && drop.has(t.slice(1))) || (t.startsWith("al") && drop.has(t.slice(2))));
  return latin.split(" ").filter((t) => t.length >= 3 && !drop.has(t) && !particled(t) && !isGeneric(t));
}
export function estTokens(est, com, wil) {
  const fr = est.name_fr ? classify(est.name_fr).locality.toLowerCase() : "";
  const ar = est.name_ar ? translitAr(classify(est.name_ar).locality) : "";
  const toks = [...placeTokens(fr, com, wil), ...placeTokens(ar, com, wil, true)];
  const spec = specialtyCode(est.name_fr || "", "fr") || specialtyCode(est.name_ar || "", "ar");
  if (spec) toks.push("spec_" + spec);
  return toks;
}
export function facilityTokens(name, com, wil) {
  if (!name) return [];
  const lang = isArabic(name) ? "ar" : "fr";
  const latin = lang === "ar" ? translitAr(name) : norm(name).toLowerCase();
  const toks = placeTokens(latin, com, wil, lang === "ar");
  const spec = specialtyCode(name, lang);
  if (spec) toks.push("spec_" + spec);
  return toks;
}
export function overlapCount(a, b) {
  if (!a.length || !b.length) return 0;
  let hit = 0;
  for (const x of a) for (const y of b) if (lev1(squash(x), squash(y)) <= 1) { hit++; break; }
  return hit;
}

// --- reviewed Wikidata identifications -------------------------------------
// Two Wikidata hospitals the token matcher cannot reach, keyed by MSP post id
// because that is the establishment's identity in the source of record. Both
// name a city with several establishments in it, so the matcher had put each on
// the wrong one and the wrong stamps were removed rather than corrected.
//
// Each item was read from the Wikidata entity itself before being pinned: its
// P31 (instance of), its P131 (located in) and its P625 coordinate all have to
// agree, and its label has to name THIS establishment and not a neighbouring
// one. The corroboration is independent of Wikidata: the Ministry of Health's
// own title for the post, which is the registry this dataset is built from. A
// Wikipedia article is not independent evidence here, since it is the same
// project's own sitelink.
const WIKIDATA_PINS = new Map([
  [
    "2359",
    {
      wikidata: "Q18785599",
      // P31 Q16917 hospital, P17 Q262 Algeria, P131 Q251181 Adrar, P571 1975,
      // fr label "hopital d'Adrar". The coordinate is 1.6 km from the Adrar
      // commune centre, inside the commune. Corroborated by the Ministry title
      // of post 2359, "Etablissement Public Hospitalier Adrar": the EPH of
      // Adrar, not the Nouveau Hopital (post 3584) the matcher had reached on
      // the shared city name, whose own title says so.
      expect_title: /HOSPITALIER ADRAR$/,
      note: "EPH Adrar; Wikidata hopital d'Adrar, inception 1975",
    },
  ],
  [
    "5139",
    {
      wikidata: "Q7894776",
      // P31 Q16917 hospital and Q3918 university, P131 Q131818 Oran, fr label
      // "centre hospitalier universitaire d'Oran", ar label
      // "المركز الإستشفائي الجامعي وهران". The coordinate is 1.7 km from the Oran
      // commune centre. Corroborated by the Ministry title of post 5139,
      // "Centre Hospitalo Universitaire Oran": the CHU, not the EHU (post 5158),
      // whose Ministry title reads "Etablissement Hospitalier Universitaire".
      expect_title: /^CENTRE HOSPITALO UNIVERSITAIRE/,
      note: "CHU Oran; Wikidata centre hospitalier universitaire d'Oran",
    },
  ],
]);

// Attach each pinned item to its establishment and, where the item carries a
// coordinate, let it place the record.
//
// A pin is a correction of WHICH record an item belongs to, so it also takes the
// item off whatever other record the matcher gave it to: leaving it there would
// publish one Wikidata hospital as two establishments, which is the error being
// corrected, only quieter. It refuses to overwrite a point this run matched from
// a different source, because that is a second disagreement to resolve rather
// than paper over, and it refuses to attach to a record whose Ministry title is
// not the one the pin was reviewed against, so a renamed or renumbered post
// fails the build instead of moving a hospital.
function applyWikidataPins(establishments, facilities) {
  const byItem = new Map();
  for (const f of facilities) if (f.kind === "wikidata" && f.wikidata) byItem.set(f.wikidata, f);
  for (const [post, pin] of WIKIDATA_PINS) {
    const target = establishments.find((e) => String(e.msp_id) === post);
    if (!target) throw new Error(`sante: MSP post ${post} is pinned to ${pin.wikidata} but is not in this build`);
    const title = norm(target.name_fr || target.name || "");
    if (!pin.expect_title.test(title))
      throw new Error(
        `sante: MSP post ${post} is pinned to ${pin.wikidata} but its Ministry title now reads ${JSON.stringify(title)}`,
      );
    if (target.wikidata && target.wikidata !== pin.wikidata)
      throw new Error(`sante: MSP ${post} is pinned to ${pin.wikidata} but matched ${target.wikidata}`);
    for (const other of establishments) {
      if (other === target || other.wikidata !== pin.wikidata) continue;
      other.wikidata = null;
      if (other.geo_precision === "wikidata_point") {
        other.lat = null;
        other.lng = null;
        other.geo_precision = "none";
      }
    }
    target.wikidata = pin.wikidata;
    const f = byItem.get(pin.wikidata);
    if (!f || target.osm_id) continue;
    target.lat = f.lat;
    target.lng = f.lng;
    target.geo_precision = "wikidata_point";
  }
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

/** Every kind of Ministry of Health post a record can cite, in the order a
 *  resolution tries them: its own primary post, the other-language twin post,
 *  and the same-language repeat post it absorbed. One list, so a further kind is
 *  added here and not at each site that walks them. */
export const MSP_POST_KEYS = ["msp", "msp_twin", "msp_repeat"];

/** The MSP post ids a record cites, in `MSP_POST_KEYS` order, as strings, with
 *  the kinds it does not carry left out. */
export const mspPosts = (record) =>
  MSP_POST_KEYS.map((key) => record?.refs?.[key])
    .filter((post) => post != null)
    .map(String);

/**
 * The carry-over key: the MSP post id the record SHIPPED under, found through
 * any of the posts it carries.
 *
 * A bilingual record stands for two registry posts, so the naive key, the
 * record's own primary post, moves the instant the pairing changes: when a
 * paired record loses its French post the key flips to the Arabic one, the
 * published id retires, and a place that never moved is handed a new public
 * join key. Resolving the key through any of `MSP_POST_KEYS` keeps it fixed in
 * every direction: gaining a twin, losing a twin, merging two half-records and
 * absorbing a repeat post all land on the id the place already had.
 *
 * Resolution is an assignment over all the rows, not a per-record lookup,
 * because one committed id cannot be handed to two records. A row whose OWN
 * primary post is the committed primary claims it first; a row that reaches it
 * only through its twin or repeat post claims it second, and only if it is still
 * free. So
 * if a merged pair is ever split back into two records, the French half keeps
 * the merged id and the Arabic half keys on its own post and takes a fresh id:
 * the id its half-record once had is retired for good and is never handed back,
 * which is the whole point of the retired ledger.
 *
 * @param {object[]} committed  the committed v2 records
 * @param {object[]} [rows]     the records being emitted, for the assignment
 * @returns {(r: object) => (string|null)} a keyOf for carryOverIds
 */
export function mspCarryKey(committed, rows = []) {
  const primaryByPost = new Map();
  for (const r of committed) {
    const primary = r.refs?.msp;
    if (primary == null) continue;
    for (const post of mspPosts(r))
      if (!primaryByPost.has(post)) primaryByPost.set(post, String(primary));
  }

  const assigned = new Map();
  const claimed = new Set();
  for (const r of rows) {
    const own = r.refs?.msp == null ? null : String(r.refs.msp);
    if (own && primaryByPost.get(own) === own && !claimed.has(own)) {
      assigned.set(r, `msp:${own}`);
      claimed.add(own);
    }
  }
  for (const r of rows) {
    if (assigned.has(r)) continue;
    for (const post of mspPosts(r)) {
      const primary = primaryByPost.get(post);
      if (primary && !claimed.has(primary)) {
        assigned.set(r, `msp:${primary}`);
        claimed.add(primary);
        break;
      }
    }
  }

  // A committed record is keyed on its own primary post, which is what the
  // assignment above pins the live rows back to.
  return (r) => {
    const pinned = assigned.get(r);
    if (pinned) return pinned;
    if (r.refs?.msp != null) return `msp:${r.refs.msp}`;
    return r.refs?.osm ? `osm:${r.refs.osm}` : r.refs?.wikidata ? `wd:${r.refs.wikidata}` : null;
  };
}

// --- main ------------------------------------------------------------------
async function main() {
  // Offline replay: rebuild from the committed MSP registry + OSM/Wikidata pulls with
  // no network (the MoH portal is behind broken TLS, see fetchMSP's custom-CA path,
  // so a live run is fragile; the cache keeps re-emission deterministic and offline).
  const OFFLINE = process.argv.includes("--cache");
  const { records, taxonomy } = OFFLINE
    ? {
        records: JSON.parse(readCacheFile(RESEARCH_DIR, "msp-healthinstitution-raw.json", "sante")),
        taxonomy: JSON.parse(readCacheFile(RESEARCH_DIR, "msp-wilaya-taxonomy.json", "sante")),
      }
    : await fetchMSP();
  const taxMap = new Map(taxonomy.map((t) => [t.id, t.name]));
  const wil = loadWilayas();
  const communesByWilaya = loadCommunes();

  const stats = { type_fail: 0, wilaya_fail: 0, wilaya_from_commune: 0, commune_fail: 0, paired: 0, refined: 0 };
  const twinVerdicts = [];
  const repeatVerdicts = [];
  const rows = buildEstablishments(records, taxMap, wil, communesByWilaya, stats, twinVerdicts, repeatVerdicts);
  console.log(`  built ${rows.length} establishments (${stats.paired} bilingual pairs, type_fail ${stats.type_fail}, wilaya_fail ${stats.wilaya_fail})`);
  console.log(
    `  twin posts: ${twinVerdicts.filter((v) => v.paired).length} recovered, ` +
      `${twinVerdicts.filter((v) => !v.paired).length} candidates refused`,
  );
  console.log(
    `  repeat posts: ${repeatVerdicts.filter((v) => v.merged).length} merged, ` +
      `${repeatVerdicts.filter((v) => !v.merged).length} candidates kept apart`,
  );

  const wdRaw = OFFLINE
    ? JSON.parse(readCacheFile(RESEARCH_DIR, "wikidata-hospitals-raw.json", "sante")).results.bindings
    : await fetchWikidata();
  const osmRaw = OFFLINE
    ? JSON.parse(readCacheFile(RESEARCH_DIR, "osm-health-raw.json", "sante")).elements
    : await fetchOSM();
  const facilities = normFacilities(wdRaw, osmRaw);
  console.log(`  ${facilities.length} OSM/Wikidata health facilities for refinement`);
  refineWithFacilities(rows, facilities, communesByWilaya, wil, stats);
  console.log(`  refined ${stats.refined} establishments to precise points`);
  applyWikidataPins(rows, facilities);

  assignIds(rows);

  // Emit v2 via the shared writer. Carry ids over by the MSP registry post id
  // first: it is the establishment's own identity in the source of record, and it
  // survives a re-pairing or a different OSM/Wikidata match. Keying on the OSM id
  // first made ids follow the geocoding match rather than the place, so a facility
  // that merely matched a different OSM way retired its published id and minted a
  // new one. OSM/Wikidata stay as fallbacks for a record the MSP pull never named.
  const cfg = MIGRATIONS.sante;
  const { updated, retrieved } = resolveDates(OUT_DIR, OFFLINE);
  const v2 = rows.map(cfg.map);
  const retiredIds = readRetiredIds(OUT_DIR);
  const committed = readCommitted(OUT_DIR, "sante.json");
  carryOverIds(v2, committed, mspCarryKey(committed, v2), "sante", retiredIds);
  // Both merges append to the one ledger, twins first, so a run that sees both
  // writes one `migrations` map and not two competing ones.
  const twinReport = resolveTwinPairs(twinVerdicts, v2, committed, readRetiredMigrations(OUT_DIR));
  const repeatReport = resolveRepeatPairs(repeatVerdicts, v2, committed, twinReport.migrations);
  const { records: out, metadata } = writePackageV2({
    pkg: "sante",
    dir: OUT_DIR,
    files: [{ file: "sante.json", rows: v2 }],
    meta: cfg.meta,
    updated,
    retrieved,
    retiredIds,
    retiredMigrations: repeatReport.migrations,
  });
  const candidates = halfRecordCandidates(out);
  writeTwinReport(twinReport, candidates);
  writeRepeatReport(repeatReport);
  console.log(
    `  half-records: ${candidates.length} FR/AR candidate pairing(s) still unmerged, ` +
      `${candidates.filter((c) => c.msp_gap <= TWIN_MAX_GAP).length} of them inside the gap the rule reads`,
  );
  console.log(
    `Wrote ${out.length} establishments → v2 (${metadata.wilayas_covered} wilayas, ${metadata.geocoded_count} geocoded).`,
  );
}

/**
 * Every FR/AR pairing candidate the shipped data still holds: each Half-record
 * of a wilaya and type crossed with every Half-record of the other language in
 * the same group, with the post gap between them.
 *
 * This is the national measurement behind #287, computed from what is actually
 * published rather than claimed once in a ticket. It answers "is any Twin post
 * still unpaired" on every build, so a registry refresh that leaves a new
 * far-apart pair behind shows up as a row here instead of as two records nobody
 * notices. A row is a candidate and nothing more: most of these are one group's
 * Half-records crossed with each other, and a pair only merges on the twin rule
 * or on the pair table.
 */
export function halfRecordCandidates(rows) {
  const groups = new Map();
  for (const r of rows) {
    if (r.name_fr && r.name_ar) continue;
    const key = `${r.wilaya_code}|${r.type}`;
    const g = groups.get(key) || groups.set(key, { fr: [], ar: [] }).get(key);
    g[r.name_fr ? "fr" : "ar"].push(r);
  }
  const out = [];
  for (const [key, { fr, ar }] of [...groups].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const [wilaya_code, type] = key.split("|");
    const post = (r) => String(r.refs?.msp ?? "");
    for (const f of [...fr].sort((a, b) => Number(post(a)) - Number(post(b))))
      for (const a of [...ar].sort((x, y) => Number(post(x)) - Number(post(y))))
        out.push({
          wilaya_code,
          type,
          msp_gap: Math.abs(Number(post(f)) - Number(post(a))),
          id_fr: f.id,
          id_ar: a.id,
          msp_fr: post(f),
          msp_ar: post(a),
          name_fr: f.name_fr,
          name_ar: a.name_ar,
        });
  }
  return out;
}

/** The evidence a hand-asserted pair rests on, as the clause its retirement note
 *  carries, so a consumer reading the ledger sees the source and not just the
 *  decision. */
const evidenceSentence = (evidence = []) =>
  evidence.map((e) => `${e.url} (read ${e.checked_at}): ${e.note}`).join(" ");

/** What a hand-asserted pair rests on, as the sentence its retirement note
 *  carries. The two evidence LEVELS are different claims and are never written
 *  as if they were the same one: `both` means a source that is not the registry
 *  names the establishment in both scripts, and `fr_only` means it confirms the
 *  French half, with the Arabic half carried by the titles being exact
 *  translations and by the pair being the one candidate left in its group
 *  (Owner decision, 2026-10-22, on #287). */
function pairTableReading(t) {
  const level =
    t.second_source === "both"
      ? `A source that is not the registry names this establishment in both scripts.`
      : `The second source confirms the FRENCH half only. The Arabic half rests on two further readings, ` +
        `recorded with it: the titles are exact translations of each other, and this is the one candidate left ` +
        `in its wilaya and type group.`;
  return (
    `${level} Translation: ${t.translation}` +
    (t.only_candidate_left ? ` Only candidate left: ${t.only_candidate_left}` : "") +
    ` Evidence: ${evidenceSentence(t.evidence)}`
  );
}

/**
 * Turn the pairing verdicts into the public record of the merge: which id each
 * merged record keeps, which id it absorbed, and the migration note that id
 * carries in retired-ids.json from now on.
 *
 * The kept id is the one the French post shipped under. Both halves of a pair
 * were first published in the same release, so neither id is older than the
 * other; what decides is that it is the LOWER-SEQUENCE id. `assignIds` numbers a
 * group by name, and the French name is Latin where the Arabic one is not, so
 * the French half always takes the lower sequence number.
 */
export function resolveTwinPairs(verdicts, rows, committed, priorMigrations = {}) {
  const liveByPost = new Map();
  for (const r of rows) for (const post of mspPosts(r)) liveByPost.set(post, r.id);
  // Where the Arabic half's id is read from, in order: the committed data on the
  // release that merges the pair, and the ledger itself on every run after it,
  // when that record is no longer in the data to look up. The ledger is
  // append-only for exactly this reason, and the pair is matched on its two
  // registry posts rather than on the kept id, which several ids may share.
  const shippedByPost = new Map();
  for (const r of committed) if (r.refs?.msp != null) shippedByPost.set(String(r.refs.msp), r.id);
  const ledgerByPosts = new Map();
  for (const [id, entry] of Object.entries(priorMigrations))
    if (Array.isArray(entry?.msp_posts)) ledgerByPosts.set(entry.msp_posts.map(String).join("/"), id);

  const sortKey = (t) => `${t.wilaya_code}|${t.type}|${t.msp_fr}|${t.msp_ar}`;
  const ordered = [...verdicts].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));

  const migrations = { ...priorMigrations };
  const pairs = ordered.filter((t) => t.paired).map((t) => {
    const kept_id = liveByPost.get(t.msp_fr) ?? null;
    const shipped = shippedByPost.get(t.msp_ar) ?? null;
    const absorbed_id =
      (shipped && shipped !== kept_id ? shipped : null) ??
      ledgerByPosts.get([t.msp_fr, t.msp_ar].join("/")) ??
      null;
    if (absorbed_id && kept_id)
      forwardRetiredId(
        migrations,
        absorbed_id,
        kept_id,
        `Merged into ${kept_id}, which carries both names. ${TWIN_POSTS_NOTE} Posts ${t.msp_fr} and ` +
          `${t.msp_ar} are one establishment` +
          (t.decided_by === "pair_table"
            ? `, paired by hand because the two sit ${t.msp_gap} post ids apart, beyond the reach of the ` +
              `registry's own adjacency. ${pairTableReading(t)}`
            : ".") +
          ` Both ids were first published together, so neither is older: ` +
          `${kept_id} is kept because it is the lower-sequence id of the two, which is always the one the ` +
          `French post holds, since ids are sequenced by name and a Latin name sorts before an Arabic one.`,
        { msp_posts: [t.msp_fr, t.msp_ar] },
      );
    return { kept_id, absorbed_id, ...t };
  });
  return { pairs, refused: ordered.filter((t) => !t.paired), migrations };
}

// The twin-post decisions, as a reviewable file rather than build-log noise:
// which pairs were merged into one record, which public id each merged record
// keeps, which id it absorbed, and every candidate refused with its reason.
// `decided_by` separates the two kinds of decision: "rule" is the automatic
// adjacency-plus-name recovery, "pair_table" is a pair asserted by hand, which
// publishes its evidence LEVEL and its reading here beside the ids it retires.
// Regenerated on every run, so it can never drift from the shipped data.
const TWIN_REPORT = join(REPO_ROOT, "quality", "sante-twin-recovery.json");
function writeTwinReport({ pairs, refused }, candidates = []) {
  mkdirSync(dirname(TWIN_REPORT), { recursive: true });
  const fromTable = pairs.filter((p) => p.decided_by === "pair_table");
  writeFileSync(
    TWIN_REPORT,
    JSON.stringify(
      {
        note:
          `${TWIN_POSTS_NOTE} The two posts usually sit at consecutive ids. This is what the twin-post ` +
          "recovery in packages/sante/scripts/fetch.mjs decided: the pairs it merged into one record, and " +
          "every nearby candidate it refused, with the reason. A near post id is not evidence on its own, " +
          "so a candidate must also pass a consonant-skeleton name check, a gap of two needs stronger name " +
          "evidence than a gap of one, and an ambiguous candidate is left alone rather than guessed at. " +
          "Four pairs across three cities sit 4, 10, 14 and 1284 post ids apart, too far for adjacency to " +
          'reach them at all; those carry `decided_by: "pair_table"`, are asserted by hand in ' +
          "packages/sante/scripts/twin-pair-table.mjs, and publish there what their evidence covers. " +
          "`second_source` is that evidence LEVEL and the two levels are not the same claim: `both` means a " +
          "source which is not the registry names the establishment in both scripts, so it states the pair " +
          "itself, and `fr_only` means the second source confirms the FRENCH half, with the Arabic half " +
          "carried by `translation` (the two titles are exact translations of each other) and by " +
          "`only_candidate_left` (it is the one candidate remaining in its wilaya and type group). The cases " +
          "that table was asked about and left alone are listed in `unpaired_candidates`, with what is " +
          "missing. `half_record_candidates` is the national measurement the same ticket asked for, " +
          "recomputed from the shipped data on every build: every Half-record crossed with every Half-record " +
          "of the other language in its own wilaya and type, with the post gap between them, so a refresh " +
          "that leaves a new far-apart pair behind shows up here rather than as two records nobody notices. " +
          "A row is a candidate and nothing more. Regenerated by `npm run fetch` in packages/sante.",
        dataset: "sante",
        recovered: pairs.length,
        recovered_by_rule: pairs.length - fromTable.length,
        recovered_from_pair_table: fromTable.length,
        pair_table_second_source_both: fromTable.filter((p) => p.second_source === "both").length,
        pair_table_second_source_fr_only: fromTable.filter((p) => p.second_source === "fr_only").length,
        refused: refused.length,
        pairs,
        refused_candidates: refused,
        unpaired_candidates: UNPAIRED_CANDIDATES,
        half_record_candidates: candidates,
      },
      null,
      2,
    ) + "\n",
  );
}

/**
 * Turn the repeat-post verdicts into the public record of the merge, the same
 * way `resolveTwinPairs` does for the twins: which id each merged record keeps,
 * which id it absorbed, and the note that id carries in retired-ids.json.
 *
 * The kept id is the one the SURVIVING post shipped under, chosen by
 * `repeatKeeper` and not by which id sorts first, because here the two posts are
 * not two halves published together: one entry carries the establishment's two
 * names and its commune and the other carries less, and the record has to stay
 * on the fuller one (see repeatKeeper).
 */
export function resolveRepeatPairs(verdicts, rows, committed, priorMigrations = {}) {
  const liveByPost = new Map();
  for (const r of rows) for (const post of mspPosts(r)) liveByPost.set(post, r.id);
  // Where the absorbed record's id is read from, in order: the committed data on
  // the release that merges the pair, and the append-only ledger on every run
  // after it, when that record is no longer in the data to look up.
  const shippedByPost = new Map();
  for (const r of committed) if (r.refs?.msp != null) shippedByPost.set(String(r.refs.msp), r.id);
  const ledgerByPosts = new Map();
  for (const [id, entry] of Object.entries(priorMigrations))
    if (Array.isArray(entry?.msp_posts)) ledgerByPosts.set(entry.msp_posts.map(String).join("/"), id);

  const sortKey = (t) =>
    `${t.language}|${t.type}|${t.msp_kept ?? t.msp[0]}|${t.msp_repeat ?? t.msp[1]}`;
  const ordered = [...verdicts].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));

  const migrations = { ...priorMigrations };
  const pairs = ordered
    .filter((t) => t.merged)
    .map((t) => {
      const kept_id = liveByPost.get(t.msp_kept) ?? null;
      const shipped = shippedByPost.get(t.msp_repeat) ?? null;
      const absorbed_id =
        (shipped && shipped !== kept_id ? shipped : null) ??
        ledgerByPosts.get([t.msp_kept, t.msp_repeat].join("/")) ??
        null;
      if (absorbed_id && kept_id)
        forwardRetiredId(
          migrations,
          absorbed_id,
          kept_id,
          `Merged into ${kept_id}, which carries the establishment's names and its commune. ` +
            `${REPEAT_POSTS_NOTE} Posts ${t.msp_kept} and ${t.msp_repeat} are the same establishment, ` +
            `entered twice in ${t.language === "fr" ? "French" : "Arabic"} under the same name` +
            (t.cross_wilaya
              ? `, and the absorbed entry's wilaya tag contradicts the name both posts carry, which is ` +
                `the establishment's own place; nothing but that tag put it in wilaya ${t.wilaya_codes[1]}`
              : "") +
            `. ${kept_id} is kept because ${REPEAT_KEPT_BECAUSE[t.kept_because]}.`,
          { msp_posts: [t.msp_kept, t.msp_repeat] },
        );
      return { kept_id, absorbed_id, ...t };
    });
  return { pairs, kept: ordered.filter((t) => !t.merged), migrations };
}

// The repeat-post decisions, as a reviewable file rather than build-log noise:
// which pairs the rule merged, which public id each merged record keeps, which id
// it absorbed, and every candidate it kept apart with the reason. Regenerated on
// every run, so it can never drift from the shipped data.
const REPEAT_REPORT = join(REPO_ROOT, "quality", "sante-repeat-posts.json");
function writeRepeatReport({ pairs, kept }) {
  mkdirSync(dirname(REPEAT_REPORT), { recursive: true });
  writeFileSync(
    REPEAT_REPORT,
    JSON.stringify(
      {
        note:
          "A repeat post is an establishment the Ministry of Health registry entered a second time in the " +
          "language it already had, which the twin-post recovery cannot reach because it only ever pairs a " +
          `French post with an Arabic one. ${REPEAT_POSTS_NOTE} This is what the repeat-post merge in ` +
          "packages/sante/scripts/fetch.mjs decided: the pairs it folded into one record, and every " +
          "candidate it kept apart, with the reason. Candidates come from two signals, two posts of one " +
          "type and wilaya whose locality folds to the same @geoalgeria/normalize key, and two posts whose " +
          "whole title folds to the same key; only the second merges, so a name the registry wrote " +
          "differently stays two records. `conservative_keys` is what the gate reads and `loose_keys` is " +
          "the second opinion test/sante-repeat-posts.test.mjs holds it to: the loose key has to agree on " +
          "every pair merged here and to separate every pair kept apart. WordPress's `-N` slug suffix is " +
          "not used as evidence, because post_name is truncated and the suffix marks a collision on the " +
          "truncated stem rather than on the title. Every array describes the same two posts, in the same " +
          "order, as the ids beside it. Regenerated by `npm run fetch` in packages/sante.",
        dataset: "sante",
        merged: pairs.length,
        kept: kept.length,
        pairs,
        kept_candidates: kept,
      },
      null,
      2,
    ) + "\n",
  );
}

// Importable for the pairing tests; only the direct invocation builds.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
