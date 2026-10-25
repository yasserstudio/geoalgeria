#!/usr/bin/env node
/**
 * Build @geoalgeria/livraison: Algeria's COD / e-commerce delivery layer:
 *   1. carriers: a registry of delivery companies (scripts/carriers.seed.json,
 *                   augmented here with derived stop-desk stats).
 *   2. stopdesks: geocoded stop-desk / relay-point locations, merged from the two
 *                   sources that publish them openly.
 *   3. coverage: per-carrier stop-desk presence (which wilayas/communes each
 *                   carrier with open data physically reaches).
 *
 * Open stop-desk sources (no auth, no WAF):
 *   - Yalidine: https://yalidine-express.com.dz/nos-agences/  (static HTML table,
 *     one row per stop-desk: id / wilaya / commune / name[operator] / address /
 *     a maps.google ?q=lat,lng link).
 *   - Guepex:   https://www.guepex.dz/public/data/agences.json (open JSON, gps="lat,lng").
 * Both are federated relay maps sharing the same stop-desk `center_id` scheme, so we
 * dedupe by id. Each row is tagged with the operating carrier in "[...]", though
 * a renamed row sometimes loses the brackets: see splitName().
 *
 * Most Algerian COD carriers (Noest, ZR/Procolis, Maystro, DHL, …) do NOT publish an
 * open agency list: they live in carriers.json (registry) with open_agency_data:"none".
 * So the geocoded layer is the openly-published relay ecosystem, not all 90+ carriers;
 * the registry carries the breadth. (Recon: 2026-06-18.)
 *
 * wilaya_code is resolved by nearest flagship commune centroid (haversine) from the
 * geoalgeria dataset (same method as @geoalgeria/aviation) and cross-checked against
 * the source-provided wilaya where available.
 *
 * Usage: node scripts/fetch.mjs
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { MIGRATIONS, writePackageV2, readCommitted, readRetiredIds } from "../../../scripts/lib/v2-transforms.mjs";
import { wcode } from "../../../scripts/lib/commune-resolver.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const DATASET = join(__dirname, "..", "..", "dataset", "data");
const SEED = join(__dirname, "carriers.seed.json");
const CID_PINS = join(__dirname, "maps-cid-pins.json");

const YAL_URL = "https://yalidine-express.com.dz/nos-agences/";
const GUEPEX_URL = "https://www.guepex.dz/public/data/agences.json";
const ANDERSON_URL = "https://anderson-ecommerce.com/";
const NOEST_URL = "https://noest-dz.com/";
const MAYSTRO_URL = "https://maystro-delivery.com/Coverage.html";
const ZR_URL = "https://www.zrexpress.net/en/offices";
const SWIFT_URL = "https://www.swiftexpress.org/fr/offices";
const HHD_URL = "https://hhd.dz/";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";
// A non-browser UA: Google Maps short links 302 to a resolvable URL instead of the JS app.
const FB_UA = "facebookexternalhit/1.1";

// --- helpers ---------------------------------------------------------------
const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": " ", "&#039;": "'", "&#x27;": "'" };
const decode = (s) =>
  String(s ?? "")
    .replace(/&#0?39;|&#x27;|&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
const orNull = (s) => {
  const v = decode(s);
  return v === "" || /^(n\/?a|-|—)$/i.test(v) ? null : v;
};

// Map a bracketed operator tag to a carrier id (after stripping non-alphanumerics).
const OPERATOR_VARIANTS = {
  yalidine: "yalidine",
  ghanzohexpressbyyalidine: "yalidine",
  guepex: "guepex",
  easyandspeed: "easyandspeed",
  easyspeed: "easyandspeed",
  yalitec: "yalitec",
  wecanservices: "wecanservices",
  speedmail: "speedmail",
  zimouexpress: "zimou-express",
};
// Operators recognized in the relay tags but excluded from the dataset (e.g. a sub-brand
// folded out). Their tag is still parsed (so it isn't flagged "unknown"), then dropped.
const DROPPED_OPERATORS = new Set(["yalitec"]);
// Populated by splitName() when a bracketed tag maps to no known carrier; main() throws
// on any entries after parsing, so a new/renamed operator is never silently dropped.
const unknownOperators = new Set();
const lookupOperator = (tag) =>
  OPERATOR_VARIANTS[decode(tag).toLowerCase().replace(/[^a-z0-9]/g, "")] ?? null;
// Operator is tagged in "[...]" (always an operator) or trailing "(...)", but parens
// are also used for localities ("Agence El Hataba (Adrar)"), so a paren group counts
// as the operator only when it maps to a known carrier; otherwise it stays in the name.
export function splitName(raw) {
  const s = decode(raw);
  const br = s.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
  if (br) {
    const id = lookupOperator(br[2]);
    if (!id) unknownOperators.add(br[2].trim());
    return { name: br[1].trim(), operator: id };
  }
  const pr = s.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (pr) {
    const id = lookupOperator(pr[2]);
    if (id) return { name: pr[1].trim(), operator: id };
  }
  // Upstream sometimes loses one or both brackets while a row is being renamed
  // ("… La Gare Guepex", "… El-Kiffane EasyAndSpeed]"), which left the desk with
  // no operator at all and tripped the malformed guard in main(). A bare trailing
  // token counts as the tag under the same rule the paren form uses: only when it
  // maps to a known carrier, so an ordinary name that merely ends in a word keeps
  // it. Nothing is guessed; a token that maps to nothing is left in the name and
  // the guard still fires.
  const tr = s.match(/^(.*\S)\s+\[?([^\s[\]]+)\]?$/);
  if (tr) {
    const id = lookupOperator(tr[2]);
    if (id) return { name: tr[1].trim(), operator: id };
  }
  return { name: s, operator: null };
}

const toRad = (d) => (d * Math.PI) / 180;
function haversine(aLat, aLng, bLat, bLng) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

async function getText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Referer: new URL(url).origin } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

// --- parsers ---------------------------------------------------------------
export function parseYalidine(html) {
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const out = [];
  for (const tr of rows) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (cells.length < 6) continue; // header uses <th>, skipped
    const id = decode(cells[0]);
    const gps = cells[5].match(/maps\.google\.com\/\?q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/i);
    if (!/^\d+$/.test(id) || !gps) continue;
    const { name, operator } = splitName(cells[3]);
    out.push({
      id,
      operator,
      name,
      address: orNull(cells[4]),
      commune: orNull(cells[2]),
      wilaya_num: null, // Yalidine lists the wilaya by name only
      lat: Number(gps[1]),
      lng: Number(gps[2]),
      src: "yalidine",
    });
  }
  return out;
}

function parseGuepex(arr) {
  const out = [];
  for (const r of arr) {
    const gps = String(r.gps || "").match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if ((typeof r.center_id !== "number" && typeof r.center_id !== "string") || !gps) continue;
    const { name, operator } = splitName(r.name);
    out.push({
      id: String(r.center_id),
      operator,
      name,
      address: orNull(r.address),
      commune: orNull(r.commune_name),
      wilaya_num: typeof r.wilaya_id === "number" ? r.wilaya_id : null, // Guepex gives a numeric wilaya id
      lat: Number(gps[1]),
      lng: Number(gps[2]),
      src: "guepex",
    });
  }
  return out;
}

// --- Carded carriers (Anderson, Noest): independent networks geocoded from the Google
// Maps link on each agency card. Each parser returns normalized, merge-ready cards
// { id, name, commune, cardWilaya, address, link }. ---
// Capitalize the first letter of each word. Uses explicit separators (not \b, which is
// ASCII-only and would wrongly uppercase letters after accented chars like é/â/ï).
const titleCase = (s) =>
  decode(s).toLowerCase().replace(/(^|[\s\-'’«»().,/])([a-zà-ÿ])/g, (_, sep, ch) => sep + ch.toUpperCase()).replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
const slug = (s) =>
  decode(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const dmsToDec = (d, m, s, h) => {
  const v = Number(d) + Number(m) / 60 + Number(s) / 3600;
  return /[SW]/i.test(h) ? -v : v;
};
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;
// A card can link any of the Maps forms: a short goo.gl link, maps.google.com, or
// google.com/maps?q=<lat>,<lng> straight from the operator. Missing the last form skipped
// the card entirely, which is how Noest's 14C Ksar Chellala went unpublished (#306).
const MAPS_LINK = /href="(https?:\/\/[^"]*(?:maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.com|google\.com\/maps)[^"]*)"/;
// Locality inside a trailing « … » or ( … ); else the whole name.
const localityOf = (name) => {
  const m = name.match(/[«(]\s*(.*?)\s*[»)]\s*$/);
  return m ? m[1] : name;
};

// Anderson "Nos agences" cards: wilaya badge, title (wilaya + optional locality), address, Maps link.
function parseAnderson(html) {
  const out = [];
  for (const c of html.split(/class="col-md-4 card-spec"/).slice(1)) {
    const w = c.match(/widget-49-date-day">\s*(\d+)\s*</);
    const title = c.match(/card-title">([^<]+)</);
    const addr = c.match(/widget-49-meeting-points">\s*<i[^>]*><\/i>([\s\S]*?)<\/p>/);
    const link = c.match(MAPS_LINK);
    if (!w || !title || !link) continue;
    const name = decode(title[1]);
    const loc = localityOf(name);
    out.push({ id: `anderson-${w[1]}-${slug(loc) || "main"}`, name: `Anderson ${titleCase(name)}`, commune: titleCase(loc), cardWilaya: Number(w[1]), address: orNull(addr ? addr[1] : null), link: link[1] });
  }
  return out;
}

// Noest bureaux cards: code badge (e.g. "16E" → wilaya from leading digits), name, address, Maps link.
function parseNoest(html) {
  const out = [];
  for (const c of html.split(/class="[^"]*desk-card-wrapper[^"]*"/).slice(1)) {
    const code = c.match(/desk-card__code">\s*([^<]+?)\s*</);
    const nm = c.match(/desk-card__name">\s*([^<]+?)\s*</);
    const addr = c.match(/desk-card__address">\s*<i[^>]*><\/i>\s*<span>([\s\S]*?)<\/span>/);
    const link = c.match(MAPS_LINK);
    if (!code || !nm) continue;
    const wm = decode(code[1]).match(/^(\d+)/);
    if (!wm) continue;
    const name = decode(nm[1]);
    const loc = localityOf(name);
    // A card with no Maps link still comes through with link: null. It is a desk Noest
    // publishes, so it gets the same chance to keep a coordinate it already shipped as a
    // card whose link fails to resolve, and it is logged rather than silently skipped.
    out.push({ id: `noest-${slug(code[1])}`, name: `Noest ${titleCase(name)}`, commune: titleCase(loc), cardWilaya: Number(wm[1]), address: orNull(addr ? addr[1] : null), link: link ? link[1].trim() : null });
  }
  return out;
}

// ZR Express "Offices": one <a class="bureau-row"> per office, laid out as a grid of
// divs rather than a table. The pin is inline in the href the row itself links
// (`?api=1&query=<lat>,<lng>`), so no shortlink has to be resolved.
//
// The leading number is the row index of the list as rendered, 001..080 straight down a
// sort by wilaya, NOT a branch code: inserting one office in Adrar would renumber every
// office after it. So ids are minted the way a carrier without a code scheme gets them,
// from the wilaya and the office's own commune.
//
// The office name is published in Arabic only; the wilaya and commune columns are Latin,
// and the wilaya column is what the pin is cross-checked against, so it is mapped to a
// code here (wilayaCoder) exactly as Anderson's and Noest's badges are.
//
// Three of the 80 rows link a free-text place search ("query=Hub Dellys Dellys Boumerdès
// Algerie") instead of a coordinate. That is an address, not a pin, so the row is carried
// through with no link and a reason, never handed to Google to be geocoded.
export function parseZrExpress(html, wilayaCode) {
  const rows = [];
  for (const m of html.matchAll(/<a\s+href="([^"]*)"[^>]*class="[^"]*bureau-row[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = decode(m[1]);
    const body = m[2];
    const cols = [...body.matchAll(/<div style="font-size:14px[^"]*">([^<]*)<\/div>/gi)].map((c) => decode(c[1]));
    const nameAr = body.match(/font-size:17px[^>]*>([^<]+)</);
    if (cols.length < 2 || !nameAr) continue;
    const [wilaya, commune] = cols;
    const code = wilayaCode(wilaya);
    if (code == null || !commune) continue;
    const hasPin = /[?&]query=-?\d+(\.\d+)?(%2C|,)/i.test(href);
    rows.push({
      key: `zr-express-${wcode(code)}-${slug(commune)}`,
      name_ar: decode(nameAr[1]),
      name: `ZR Express ${titleCase(commune)}`,
      commune: titleCase(commune),
      cardWilaya: code,
      address: null,
      link: hasPin ? href : null,
      noPin: hasPin ? null : "row links a place-name search, not a coordinate",
    });
  }
  // Four ZR offices sit in the commune of Constantine and three in Oran, so the wilaya
  // and commune alone do not name an office. The only field that tells them apart is the
  // Arabic office name (مكتب زواغي, مكتب كاناستال …), which slugs to nothing in Latin, so
  // where a commune holds more than one office each id carries a short digest of that
  // name. The digest depends on the office's own name and nothing else, so it does not
  // move when ZR adds, drops or reorders a row; a commune that goes from one office to
  // two hands its old id back through carryRenamedIds, same as any rename.
  const shared = new Set();
  const seenKey = new Set();
  for (const r of rows) (seenKey.has(r.key) ? shared : seenKey).add(r.key);
  return rows.map(({ key, ...rest }) => ({
    id: shared.has(key) ? `${key}-${createHash("sha1").update(rest.name_ar).digest("hex").slice(0, 4)}` : key,
    ...rest,
  }));
}

// Wilaya name -> code, read from the flagship registry rather than hard-coded, so a
// carrier that publishes its wilaya in Latin (ZR Express) gets the same cross-check
// against its pin that a carrier publishing a numeric badge gets.
function wilayaCoder() {
  const { wilayas: rows } = JSON.parse(readFileSync(join(DATASET, "wilayas.json"), "utf8"));
  const by = new Map();
  for (const w of rows) for (const n of [w.name_fr, w.name_en]) if (n) by.set(slug(n), w.code);
  return (name) => by.get(slug(name)) ?? null;
}

// Swift Express "Nos agences": a Next.js app whose office list is rendered server-side
// and therefore arrives inside the page HTML, as a JSON array in the streamed RSC payload
// (`self.__next_f.push([1,"…\"offices\":[{…}]…"])`). One ordinary request to /fr/offices
// returns the whole network, so nothing is paged and no API has to be found: the array
// below IS the page's own data, read where the page itself reads it rather than scraped
// back out of the two card layouts it renders from it.
//
// Each office carries its own record id ("236"), which is a database key and not the
// display order (the first row is 236, the second 185), so ids come from it the way
// Noest's come from its branch code. `number` restates `city.id`; neither is a branch
// code. `city.id` is the wilaya code, `village` the commune, and the Maps link is a
// goo.gl shortlink, resolved over the network like Anderson's and Noest's.
export function parseSwift(html) {
  const KEY = '\\"offices\\":[';
  const at = html.indexOf(KEY);
  if (at < 0) return [];
  // The payload is a JSON array inside a JS string literal, so every quote in it is
  // escaped. Walk it quote-aware: `phoneNumbers` is an array, so a bracket count alone
  // is right only as long as no address ever contains one.
  let depth = 0, inStr = false, end = -1;
  for (let i = at + KEY.length - 1; i < html.length; i++) {
    const two = html.slice(i, i + 2);
    if (two === '\\\\') { i++; continue; } // an escaped backslash, not a delimiter
    if (two === '\\"') { inStr = !inStr; i++; continue; }
    if (inStr) continue;
    if (html[i] === "[") depth++;
    else if (html[i] === "]" && --depth === 0) { end = i; break; }
  }
  if (end < 0) return [];
  const offices = JSON.parse(JSON.parse(`"${html.slice(at + KEY.length - 1, end + 1)}"`));
  const out = [];
  for (const o of offices) {
    const code = Number(o?.city?.id);
    const commune = decode(o?.village);
    if (!o?.id || !Number.isInteger(code) || code < 1 || code > 69 || !commune) continue;
    out.push({
      id: `swift-express-${slug(o.id)}`,
      name: `Swift Express ${titleCase(commune)}`,
      commune: titleCase(commune),
      cardWilaya: code,
      address: orNull(o.address),
      link: o.locationUrl ? decode(o.locationUrl) : null,
    });
  }
  return out;
}

// HHD Express "Nos agences": a Next.js app whose home page renders the first six agencies
// server-side behind an "Afficher les 80 agences" button, so the markup is a preview and
// the list itself is a static array compiled into the client chunk that draws the section.
// Reading the preview would ship six of eighty; the array is read instead.
//
// Which chunk holds it is not guessed and not searched for across every script the page
// loads. The page names its own client components in the flight payload
// (`<id>:I[<module>,["…/chunks/<hash>.js", …],"AgencyDirectory"]`), so the directory
// component's own bundle is the last chunk of its own list, and the shared runtime
// chunks it also needs come before it. Candidates are tried in that order and the first
// one carrying the array wins: an ordinary GET of hhd.dz, then one of the chunk. The
// chunk hash changes on every deploy, which is exactly why it is read from the page.
export function hhdChunkCandidates(html) {
  const seen = new Set();
  const urls = [];
  const add = (p) => { if (!seen.has(p)) { seen.add(p); urls.push(new URL(p, HHD_URL).href); } };
  // The component's own chunk first (its list is dependency-first), then anything else
  // the page loads, so a renamed component still resolves instead of failing the run.
  const own = html.match(/:I\[\d+,\[([^\]]*)\],\\"AgencyDirectory\\"\]/);
  if (own) for (const p of (own[1].match(/\/_next\/static\/[^\\"]+\.js/g) || []).reverse()) add(p);
  for (const m of html.matchAll(/<script[^>]+src="(\/_next\/static\/[^"]+\.js)"/g)) add(m[1]);
  return urls;
}

// The array is a JS object literal, not JSON: its keys are bare and a value may be
// single-quoted (Chlef's address carries a double quote, so the minifier picked the other
// delimiter). It is converted here rather than evaluated; nothing from the network is run.
function jsLiteralToJson(src) {
  let out = "";
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'") {
      out += '"';
      for (i++; i < src.length && src[i] !== ch; i++) {
        // `\'` is legal in a single-quoted literal and illegal in JSON; every other
        // escape is already the JSON one and is copied through with its character.
        if (src[i] === "\\") { out += src[i + 1] === "'" ? "'" : src[i] + src[i + 1]; i++; continue; }
        out += src[i] === '"' ? '\\"' : src[i];
      }
      out += '"';
      continue;
    }
    const key = /^([A-Za-z_$][\w$]*)\s*:/.exec(src.slice(i));
    if (key) { out += `"${key[1]}":`; i += key[0].length - 1; continue; }
    out += ch;
  }
  return out;
}

// Each entry is {wilaya:"47", wilayaName:"Ghardaïa", city:"El Meniaa", name:"…",
// phones:[…], address:"…", map:"https://maps.app.goo.gl/…"}. `wilaya` is the wilaya the
// agency declares and is what the pin is cross-checked against in main(); `city` is the
// commune. Phones are not shipped. There is no record key anywhere in the entry, so ids
// are minted from the wilaya and the commune, the way ZR Express's are.
export function parseHhd(js) {
  const KEY = '[{wilaya:"';
  const at = js.indexOf(KEY);
  if (at < 0) return [];
  // Walk it quote-aware to the closing bracket: `phones` puts a real bracket inside every
  // entry, and an address is free text that may one day hold one too.
  let depth = 0, quote = null, end = -1;
  for (let i = at; i < js.length; i++) {
    const ch = js[i];
    if (quote) { if (ch === "\\") i++; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "[") depth++;
    else if (ch === "]" && --depth === 0) { end = i; break; }
  }
  if (end < 0) return [];
  const rows = [];
  for (const a of JSON.parse(jsLiteralToJson(js.slice(at, end + 1)))) {
    const code = Number(a?.wilaya);
    const commune = decode(a?.city);
    const name = decode(a?.name);
    if (!Number.isInteger(code) || code < 1 || code > 69 || !commune || !name) continue;
    rows.push({
      key: `hhd-express-${wcode(code)}-${slug(commune)}`,
      // The agency's own published name, not one built from the commune: it is what tells
      // Sétif's two offices apart ("El Hidhab", "El Hidhab 2"), and the commune alone would
      // name them both the same. Only the brand prefix is re-cased, because HHD writes it
      // "HHD Express" on some rows and "HHD EXPRESS" on others.
      name: `HHD Express ${titleCase(name.replace(/^hhd\s*express\s*/i, ""))}`.trim(),
      commune: titleCase(commune),
      cardWilaya: code,
      address: orNull(a.address),
      link: a.map ? decode(a.map) : null,
    });
  }
  // Two HHD agencies sit in the commune of Sétif, so the wilaya and commune alone do not
  // name one. Where a commune holds more than one, each id carries a short digest of the
  // agency's own published name, which does not move when HHD adds, drops or reorders a
  // row: the same rule ZR Express's shared communes use.
  const shared = new Set();
  const seenKey = new Set();
  for (const r of rows) (seenKey.has(r.key) ? shared : seenKey).add(r.key);
  return rows.map(({ key, ...rest }) => ({
    id: shared.has(key) ? `${key}-${createHash("sha1").update(rest.name).digest("hex").slice(0, 4)}` : key,
    ...rest,
  }));
}

// GET hhd.dz, then the one chunk that carries the agency array. Separate from parseHhd so
// the parser stays pure and the run makes two ordinary requests, not thirteen.
async function fetchHhdAgencyChunk() {
  const candidates = hhdChunkCandidates(await getText(HHD_URL));
  for (const url of candidates) {
    const js = await getText(url);
    if (js.includes('[{wilaya:"')) return js;
  }
  throw new Error(`no HHD chunk carries the agency array (tried ${candidates.length})`);
}

// Maystro tags each stop-desk with a wilaya "translation" slug rather than a code; map the
// classic 48 to their wilaya_code so the drop rule can catch its mislinked desks. Unknown
// slugs (no entry) skip the cross-check and fall back to the centroid result.
const MAYSTRO_WILAYA = {
  adrar: 1, chlef: 2, laghouat: 3, oum_el_bouaghi: 4, batna: 5, bejaia: 6, biskra: 7,
  bechar: 8, blida: 9, bouira: 10, tamenrasset: 11, tebessa: 12, tlemcen: 13, tiaret: 14,
  tizi_ouzou: 15, alger: 16, djelfa: 17, jijel: 18, setif: 19, saida: 20, skikda: 21,
  sidi_bel_abbes: 22, annaba: 23, guelma: 24, constantine: 25, medea: 26, mostaganem: 27,
  msila: 28, mascara: 29, ouargla: 30, ouergla: 30, oran: 31, el_bayadh: 32, illizi: 33,
  bordj_bou_arreridj: 34, boumerdes: 35, el_tarf: 36, tindouf: 37, tissemsilt: 38,
  el_oued: 39, khenchela: 40, souk_ahras: 41, souk_ahres: 41, tipaza: 42, mila: 43,
  ain_defla: 44, naama: 45, ain_temouchent: 46, ghardaia: 47, relizane: 48,
};

// Maystro "Coverage" → Stop-Desk list: each <span translation="wilaya"><a href=mapslink>City</a>.
// (Warehouses overlap stop-desks; third-party "pickup points" are excluded, not Maystro's own.)
function parseMaystro(html) {
  const start = html.indexOf('id="liststopdesk"');
  if (start < 0) return [];
  const end = html.indexOf('id="listpickuppoints"', start);
  const section = html.slice(start, end > start ? end : undefined);
  const out = [];
  const seen = new Set();
  for (const m of section.matchAll(/<span\s+translation="([^"]+)"\s*>\s*<a\s+href="\s*([^"]+?)\s*"[^>]*>([^<]+)<\/a>/gi)) {
    const slug0 = m[1].toLowerCase();
    const link = m[2].trim();
    const text = decode(m[3]);
    if (!/maps/i.test(link) || seen.has(link + "|" + text)) continue;
    seen.add(link + "|" + text);
    const loc = localityOf(text);
    out.push({ id: `maystro-${slug(text)}`, name: `Maystro ${titleCase(text)}`, commune: titleCase(loc), cardWilaya: MAYSTRO_WILAYA[slug0.replace(/_\d+$/, "")] ?? null, address: null, link });
  }
  return out;
}

// Committed pins for links that name a Maps place by cid and nothing else
// ("maps.google.com/?cid=<decimal>"). Such a link carries no coordinate and none of the
// tiers below can produce one, so without this the desk is dropped. Each entry is the
// operator's own linked place, read once and committed with its provenance; see the file.
const cidPins = (() => {
  const raw = JSON.parse(readFileSync(CID_PINS, "utf8"));
  return new Map(Object.entries(raw).filter(([k]) => /^\d+$/.test(k)));
})();
const cidPinFor = (link) => {
  const m = String(link).match(/[?&]cid=(\d+)/);
  const pin = m && cidPins.get(m[1]);
  return pin && inAlgeria(pin.lat, pin.lng) ? { lat: pin.lat, lng: pin.lng } : null;
};

// The decimal coordinate forms a Google Maps URL can carry, canonical first. `query=`
// is the `?api=1&query=<lat>,<lng>` form ZR Express links; it is also the form that can
// carry a free-text place search instead of a pair, which simply does not match here.
const COORD_IN_URL = [
  /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
  /\/maps\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/,
  /\/maps\/search\/(-?\d+\.\d+),\s*\+?\s*(-?\d+\.\d+)/,
  /[?&]q(?:uery)?=(-?\d+\.\d+),\s*\+?\s*(-?\d+\.\d+)/,
];
const coordsIn = (url) => {
  for (const p of COORD_IN_URL) {
    const m = String(url).match(p);
    if (m && inAlgeria(+m[1], +m[2])) return { lat: +m[1], lng: +m[2] };
  }
  return null;
};

// Resolve a Google Maps link to its pin via the redirect a non-browser UA receives.
// Tries the link itself, then the canonical (!3d!4d), decimal place/search/q, DMS
// place, then a static-map pin.
async function resolveMapsLink(link) {
  if (!link) return null; // card published no Maps link at all
  // ZR Express writes the pin straight into the href (`?api=1&query=<lat>,<lng>`), so
  // for 77 of its 80 offices the coordinate is already in hand. Read the link itself
  // before asking the network for it: nothing is gained by a request whose answer we
  // are holding, and 77 requests to Google are 77 requests not made.
  const inline = coordsIn(decodeURIComponent(link));
  if (inline) return inline;
  let url = "", body = "";
  for (let attempt = 0; attempt < 2 && !url; attempt++) {
    try {
      const res = await fetch(link, { headers: { "User-Agent": FB_UA }, redirect: "follow" });
      url = decodeURIComponent(res.url || "");
      body = await res.text();
    } catch { /* network blip: retry once */ }
  }
  const hit = coordsIn(url);
  if (hit) return hit;
  const d = url.match(/\/maps\/place\/(\d+)°(\d+)'([\d.]+)"([NS]).*?(\d+)°(\d+)'([\d.]+)"([EW])/);
  if (d) {
    const lat = dmsToDec(d[1], d[2], d[3], d[4]), lng = dmsToDec(d[5], d[6], d[7], d[8]);
    if (inAlgeria(lat, lng)) return { lat, lng };
  }
  const sm = [...body.matchAll(/staticmap\?center=(-?\d+\.\d+)%2C(-?\d+\.\d+)&(?:amp;)?zoom=(\d+)/g)]
    .map((x) => ({ lat: +x[1], lng: +x[2], z: +x[3] }))
    .filter((x) => x.z >= 15 && inAlgeria(x.lat, x.lng))
    .sort((a, b) => b.z - a.z)[0];
  if (sm) return { lat: sm.lat, lng: sm.lng };
  // Nothing in the URL or the body placed it. A cid-only place link is the known case,
  // and the live pin is preferred over the committed one, so this is checked last.
  return cidPinFor(link);
}

// Bounded-concurrency map (keeps Maps-link resolution polite + fast).
async function mapPool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
    })
  );
  return out;
}

/**
 * Decide the coordinate a still-published card ships with.
 *
 * A carded desk is re-geocoded from scratch on every run by resolving the carrier's own
 * Google Maps link, which makes its published coordinate hostage to one HTTP request:
 * #306 found a run that deleted two live stop-desks and retired their ids because their
 * links would not resolve that minute.
 *
 * A pin the operator itself publishes is treated as verified however far it moves the
 * desk, so a relocation lands as the carrier states it. The guard against a link that
 * points somewhere else entirely is the wilaya cross-check in main(), which drops a
 * carded desk whose pin lands outside the wilaya its card declares (see badPinDrop):
 * this carry covers a link that did not resolve at all, never one that resolved wrong.
 *
 * @param {{lat: number, lng: number}|null} pin  what the carrier's link resolved to
 * @param {{lat: number, lng: number}|undefined} prev  the record this id already ships
 * @returns {{lat: number, lng: number, verdict: "fresh"|"carried"}|null}
 */
export function pinFor(pin, prev) {
  if (pin) return { lat: pin.lat, lng: pin.lng, verdict: "fresh" };
  // The card is still published, so the desk exists; only its link failed. Keep the
  // coordinate and precision it already shipped rather than dropping the desk and
  // retiring its id.
  return prev ? { lat: prev.lat, lng: prev.lng, verdict: "carried" } : null;
}

/**
 * Which wilaya each reform wilaya was carved out of: code → parent code.
 *
 * Read from the flagship registry's own `mother_wilaya_code` rather than typed here, so
 * the 2021 reform (49-58) and the 2026 one (59-69) stay whatever the dataset says they
 * are. Both reforms split from the 48 of 1984, so no parent is itself a reform wilaya
 * and a single lookup is the whole chain.
 *
 * @returns {Map<number, number>}
 */
let motherByCode = null;
export function motherWilayas() {
  if (!motherByCode) {
    const { wilayas: rows } = JSON.parse(readFileSync(join(DATASET, "wilayas.json"), "utf8"));
    motherByCode = new Map(
      rows.filter((w) => w.mother_wilaya_code != null).map((w) => [Number(w.code), Number(w.mother_wilaya_code)]),
    );
    if (!motherByCode.size) throw new Error("no mother_wilaya_code in the flagship registry");
  }
  return motherByCode;
}

/**
 * Why a carded desk's freshly resolved pin disqualifies it, or null when it does not.
 *
 * A card declares its wilaya. When this run's pin lands in a DIFFERENT wilaya the
 * carrier's own link points where the card says the desk is not, and the run cannot tell
 * which of the two is right, so the desk is dropped (Owner decision, 2026-10-25). It is
 * NOT re-shipped at the coordinate it published last quarter: that would present a stale
 * point as this run's verified one, and the desk returns by itself on the run after the
 * link is fixed.
 *
 * The one disagreement that is not a contradiction is a card that has not caught up with
 * a reform: a wilaya created in 2021 (49-58) or in 2026 (59-69) against a card still
 * printing the wilaya it was carved out of. That is tested EXACTLY, against the parent
 * the registry records (see motherWilayas), never by code range. HHD files El Meniaa
 * (58, carved from Ghardaia in 2021) under card 47, which agrees and ships; Noest's
 * `noest-55a` resolves to 53 against card 55, which does not, because 53 was carved from
 * 11, and is dropped. A range test would have shipped the second and dropped the first.
 *
 * @param {{id: string, cardWilaya: number|null, lat: number, lng: number}} rec
 * @param {number} code  the wilaya this run's coordinate resolved to
 * @param {Map<number, number>} [mothers]  code → the wilaya it was carved out of
 * @returns {string|null} the run-log reason, naming the card id, the wilaya the card
 *                        declares and the coordinate that was resolved
 */
export function badPinDrop(rec, code, mothers = motherWilayas()) {
  if (rec.cardWilaya == null || code === rec.cardWilaya) return null;
  if (mothers.get(Number(code)) === Number(rec.cardWilaya)) return null;
  return `${rec.id}(card ${rec.cardWilaya}→pin ${code} at ${rec.lat},${rec.lng})`;
}

// --- the retired-id ledger -------------------------------------------------
// data/retired-ids.json is the list of ids no stop-desk may ever hold again. A
// stop-desk id is a public join key: handing a disappeared desk's id to a different
// desk would silently repoint every cached reference at another place.
//
// Module state rather than a parameter on every carded build: each carrier's build
// consults it, and a carrier parser added later must inherit it without a call-site
// change. main() loads it from disk; the pure functions below take it explicitly so a
// test can hand them their own set.
let retiredIds = new Set();

/** Load the ledger the rest of this run reserves against. */
export function setRetiredIds(ids) {
  retiredIds = new Set([...ids].map(String));
  return retiredIds;
}

/**
 * Reserve every id the package ships today that this run no longer carries.
 *
 * Append-only: a desk that disappears upstream retires its id here, and nothing ever
 * removes one, so the reservation outlives the record that earned it.
 *
 * @param {Set<string>} retired  the ledger, mutated
 * @param {Iterable<string>} committedIds  the ids the committed data ships
 * @param {Set<string>} liveIds  the ids this run emits
 * @param {Set<string>} [heldIds]  ids still listed by the carrier but dropped this run for a
 *   bad pin: held, not retired, so a fixed link brings the desk back under its own id
 * @returns {string[]} the ids retired by this run, for the run log
 */
export function appendRetiredIds(retired, committedIds, liveIds, heldIds = new Set()) {
  const added = [];
  for (const id of committedIds) {
    const key = String(id);
    if (liveIds.has(key) || heldIds.has(key) || retired.has(key)) continue;
    retired.add(key);
    added.push(key);
  }
  return added.sort();
}

/**
 * Settle the ids a carded build minted, so no two records share one and no record is
 * handed a retired id.
 *
 * A carded id is minted from the card's own title, so two cards titled alike mint the
 * same id, and a card can re-mint the id of a desk that disappeared in an earlier
 * release. Both get the same deterministic treatment: the ledger's ids count as taken,
 * and a collision takes the next `{id}-{n}` suffix, so a desk keeps its suffix across
 * runs and a retired id is never re-issued.
 *
 * @param {Array<{id: string}>} recs  mutated in place
 * @param {Set<string>} [retired]  the ledger; defaults to the one main() loaded
 * @returns {Array<{id: string}>} recs
 */
export function dedupeMintedIds(recs, retired = retiredIds) {
  const seen = new Map();
  for (const id of retired) seen.set(String(id), 1);
  for (const r of recs) {
    const n = (seen.get(r.id) || 0) + 1;
    seen.set(r.id, n);
    if (n > 1) r.id = `${r.id}-${n}`;
  }
  return recs;
}

// How close, in km (haversine's unit here), a new carded id must sit to a disappeared
// one before they are judged the same desk under a new card title. 100 m is tighter
// than any two desks of one operator are ever apart.
const RENAME_RADIUS_KM = 0.1;

// Does a committed desk's wilaya agree with the one its card declares?
//
// The committed record carries the wilaya its coordinate RESOLVED to, which for a desk in
// a wilaya a reform created is not the code the carrier's card still prints:
// `anderson-5-barika` ships "60" against card 05, `noest-26b` ships "67" against card 26,
// nine carded desks in all today. Comparing the two codes literally would refuse a rename
// in exactly those nine, retiring the id this function exists to keep. A reform code
// therefore agrees with the card that prints its PARENT, the same allowance main() and
// badPinDrop make, and with no other card: a range test ("code > 58") would let a desk
// 400 km away reclaim an id on a wilaya mismatch it was meant to catch.
// A card that declares no wilaya at all (Maystro prints a badge only for the wilayas in
// MAYSTRO_WILAYA) leaves the radius as the only test, which is the test that was really
// deciding anyway. Comparing against a missing badge refused every Maystro rename.
const wilayaAgrees = (committedCode, cardWilaya, mothers = motherWilayas()) =>
  cardWilaya == null ||
  committedCode === wcode(cardWilaya) ||
  mothers.get(Number(committedCode)) === Number(cardWilaya);

/**
 * Give a renamed card back the id it already published.
 *
 * A carded id is minted from the card's own title, so when a carrier retitles a card the
 * id changes with it: Anderson renamed "Sidi Abdellah" to "Sidi Abdellah - Zeralda" and
 * the same desk, 24 m away, would have retired `anderson-16-sidi-abdellah` and minted
 * `anderson-16-sidi-abdellah-zeralda` (#306). Ids follow places, so a new id that lands
 * on a disappeared one's spot takes that id back.
 *
 * Matched nearest first on operator, the wilaya the card declares (see wilayaAgrees, which
 * reads a reform wilaya the card has not caught up with), and RENAME_RADIUS_KM. Deliberately
 * NOT on the commune: a carded `commune` is parsed out of the same card title the rename
 * changed ("Sidi Abdellah" became "Sidi Abdellah - Zeralda"), so requiring it to match
 * would refuse exactly the renames this exists for. At 100 m the geometry is the stronger
 * test anyway, and the wilaya keeps it from ever reaching across the country.
 *
 * @param {Array<{id: string, name: string, commune: string|null, cardWilaya: number|null, lat: number, lng: number}>} recs  this run's records, mutated in place
 * @param {Map<string, {id: string, operator: string, wilaya_code: string, lat: number, lng: number}>} committed  what the package ships today
 * @param {string} operator  the carrier being built
 * @param {Set<string>} [retired]  the ledger; defaults to the one main() loaded
 * @returns {string[]} one line per id handed back, for the run log
 */
export function carryRenamedIds(recs, committed, operator, retired = retiredIds) {
  const live = new Set(recs.map((r) => r.id));
  // Ids this operator ships today that no card in this run claims. A retired id is not
  // among them, because the ledger reserves ids the package stopped shipping, but the
  // filter is kept so a reclaim can never resurrect one whatever the committed data says.
  const gone = [...committed.values()].filter(
    (p) => p.operator === operator && !live.has(p.id) && !retired.has(String(p.id)),
  );
  // Every plausible pairing, nearest first, so which card reclaims an id never depends on
  // the order the carrier happens to list its cards in.
  const pairs = [];
  for (const r of recs) {
    if (committed.has(r.id)) continue; // already its own id, nothing was renamed
    for (const p of gone) {
      if (!wilayaAgrees(p.wilaya_code, r.cardWilaya)) continue;
      const km = haversine(p.lat, p.lng, r.lat, r.lng);
      if (km <= RENAME_RADIUS_KM) pairs.push({ r, p, km });
    }
  }
  pairs.sort((a, b) => a.km - b.km || a.p.id.localeCompare(b.p.id) || a.r.id.localeCompare(b.r.id));
  const takenIds = new Set();
  const movedRecs = new Set();
  const renamed = [];
  for (const { r, p, km } of pairs) {
    if (takenIds.has(p.id) || movedRecs.has(r)) continue;
    renamed.push(`${p.id} kept as "${r.name}" (was ${r.id}, ${Math.round(km * 1000)}m)`);
    takenIds.add(p.id);
    movedRecs.add(r);
    r.id = p.id;
  }
  return renamed;
}

// Fetch a carded carrier's page, resolve every agency's Maps link to a pin, and return
// merge-ready records. A card whose link will not resolve keeps the coordinate it already
// shipped (and is dropped only when it has none); ids are de-collided deterministically
// so a desk keeps its suffix across runs.
async function buildCarded(label, url, parseFn, operator, minDesks = 60, committed = new Map(), text = null) {
  console.log(`Fetching ${label} agencies…`);
  // `text` is for a carrier whose list is not at `url` itself: HHD Express publishes it in
  // a client chunk whose name the page decides, so the fetch happens before the build.
  const cards = parseFn(text ?? await getText(url));
  console.log(`  ${cards.length} cards; resolving Maps links…`);
  const coords = await mapPool(cards, 6, (c) => resolveMapsLink(c.link));
  const recs = [];
  let fresh = 0;
  const carried = [];
  const skipped = [];
  cards.forEach((c, i) => {
    const pin = pinFor(coords[i], committed.get(c.id));
    // Named, not just counted. A skip here is a card the carrier still publishes that this
    // run cannot place, and when the card was also retitled the committed record is under
    // the OLD id, which carryRenamedIds below never sees because the record was never
    // pushed. That case retires a live id, so it has to be readable in the run log.
    // Two different failures with two different fixes: a card the carrier publishes with
    // no Maps link at all can only come back when the carrier adds one, while a link that
    // would not resolve this minute may well resolve on the next run. The run log has to
    // say which, or a permanent gap reads like a transient one.
    if (!pin) { skipped.push(`${c.id} (${c.noPin ?? (c.link ? "link did not resolve" : "card publishes no Maps link")})`); return; }
    if (pin.verdict === "carried") carried.push(c.id);
    else fresh++;
    recs.push({ id: c.id, operator, name: c.name, name_ar: c.name_ar ?? null, address: c.address, commune: c.commune, wilaya_num: null, cardWilaya: c.cardWilaya, lat: pin.lat, lng: pin.lng, src: operator });
  });
  // Before the sort, so a reclaimed id sorts under the id it keeps.
  const renamed = carryRenamedIds(recs, committed, operator);
  recs.sort((a, b) => a.id.localeCompare(b.id) || a.lat - b.lat || a.lng - b.lng);
  dedupeMintedIds(recs);
  console.log(`  ${recs.length} ${label} desks geocoded, ${skipped.length} skipped (nothing committed to carry)${skipped.length ? `: ${skipped.join(", ")}` : ""}`);
  if (carried.length) console.log(`  ${carried.length} ${label} desk(s) kept their committed coordinate, link did not resolve: ${carried.join(", ")}`);
  if (renamed.length) console.log(`  ${renamed.length} ${label} desk(s) kept their id through a card rename: ${renamed.join("; ")}`);
  // Counted on the freshly resolved desks only: carrying a coordinate over must never
  // make a total Maps-resolution outage look like a healthy run.
  if (fresh < minDesks) throw new Error(`only ${fresh} ${label} desks resolved fresh: Maps resolution may be blocked`);
  return recs;
}

// --- wilaya resolution (same as @geoalgeria/aviation) ----------------------
function loadCommunes() {
  if (!existsSync(DATASET)) {
    throw new Error(`geoalgeria commune data not found at ${DATASET}: run from the monorepo.`);
  }
  const files = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"];
  const out = [];
  for (const f of files) {
    for (const c of JSON.parse(readFileSync(join(DATASET, f), "utf8"))) {
      if (c.latitude == null || c.longitude == null) continue;
      out.push({ wilaya_code: c.wilaya_code, lat: c.latitude, lng: c.longitude });
    }
  }
  if (!out.length) throw new Error("no commune centroids in dataset");
  return out;
}
function resolveWilaya(lat, lng, communes, hint) {
  let best = null;
  let bestKm = Infinity;
  for (const c of communes) {
    const km = haversine(lat, lng, c.lat, c.lng);
    if (km < bestKm) { bestKm = km; best = c; }
  }
  // Tie-break: if the source declares a wilaya and one of ITS communes sits within ~1 km
  // of the nearest (a duplicate/near-duplicate centroid across wilayas: e.g. the flagship
  // lists "Ain Turk" under both Oran and Bouira), trust the source's declared wilaya.
  // Reform promotions (old code → 59-69) are unaffected: the old wilaya has no commune near.
  if (hint != null && best.wilaya_code !== hint) {
    const tie = communes.some((c) => c.wilaya_code === hint && haversine(lat, lng, c.lat, c.lng) <= bestKm + 1);
    if (tie) return { code: hint, km: bestKm };
  }
  return { code: best.wilaya_code, km: bestKm };
}

// --- writers (same conventions as @geoalgeria/aviation) --------------------
function toCSV(rows, cols) {
  // Neutralize spreadsheet formula injection per value, and per array element before
  // joining, even when the trigger char follows leading whitespace. Numbers pass through.
  const neutralize = (x) => (/^\s*[=+\-@\t\r]/.test(x) ? `'${x}` : x);
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return String(v);
    const s = Array.isArray(v) ? v.map((x) => neutralize(String(x))).join("|") : neutralize(String(v));
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}
const writeJSON = (p, obj) => writeFileSync(join(DATA, p), JSON.stringify(obj, null, 2) + "\n");
const writeText = (p, txt) => writeFileSync(join(DATA, p), txt);

// --- main ------------------------------------------------------------------
async function main() {
  const seed = JSON.parse(readFileSync(SEED, "utf8"));
  const carrierIds = new Set(seed.map((c) => c.id));

  console.log("Fetching Yalidine stop-desks…");
  const yal = parseYalidine(await getText(YAL_URL));
  console.log(`  ${yal.length} rows`);
  console.log("Fetching Guepex agencies…");
  const guepex = parseGuepex(JSON.parse(await getText(GUEPEX_URL)));
  console.log(`  ${guepex.length} rows`);

  // Per-source floors catch a partial/truncated fetch that still clears the merged total.
  if (yal.length < 150 || guepex.length < 120) {
    throw new Error(`source under-returned (yalidine ${yal.length}, guepex ${guepex.length}): possible partial fetch`);
  }

  if (unknownOperators.size) {
    throw new Error(`unknown operator tag(s): add to carriers.seed.json + OPERATOR_VARIANTS: ${[...unknownOperators].join(", ")}`);
  }

  // Anderson, Noest & Maystro: independent carriers with their own agency networks, geocoded
  // by resolving the Google Maps link on each agency card (the carrier's own published pin).
  // What each carded desk already ships, so a card whose Maps link will not resolve
  // keeps its coordinate instead of being dropped (see pinFor).
  const committed = new Map(
    readCommitted(DATA, "stopdesks.json").map((r) => [r.id, r]),
  );
  // Before the first carded build: every mint and every reclaim below reserves against it.
  const retired = setRetiredIds(readRetiredIds(DATA));
  const anderson = await buildCarded("Anderson", ANDERSON_URL, parseAnderson, "anderson", 60, committed);
  const noest = await buildCarded("Noest", NOEST_URL, parseNoest, "noest", 60, committed);
  const maystro = await buildCarded("Maystro", MAYSTRO_URL, parseMaystro, "maystro", 30, committed);
  const toWilaya = wilayaCoder();
  const zr = await buildCarded("ZR Express", ZR_URL, (h) => parseZrExpress(h, toWilaya), "zr-express", 60, committed);
  const swift = await buildCarded("Swift Express", SWIFT_URL, parseSwift, "swift-express", 45, committed);
  const hhdChunk = await fetchHhdAgencyChunk();
  const hhd = await buildCarded("HHD Express", HHD_URL, parseHhd, "hhd-express", 60, committed, hhdChunk);

  // Merge by stop-desk id (union). Prefer Yalidine (richer addresses); fill from Guepex.
  // Folded-out operators are dropped; Anderson ids are namespaced so they never collide.
  const byId = new Map();
  for (const r of [...yal, ...guepex, ...anderson, ...noest, ...maystro, ...zr, ...swift, ...hhd].filter((x) => !DROPPED_OPERATORS.has(x.operator))) {
    const cur = byId.get(r.id);
    if (!cur) { byId.set(r.id, { ...r, sources: [r.src] }); continue; }
    if (!cur.sources.includes(r.src)) cur.sources.push(r.src);
    cur.address = cur.address || r.address;
    cur.name_ar = cur.name_ar || r.name_ar;
    cur.commune = cur.commune || r.commune;
    cur.operator = cur.operator || r.operator;
    if (cur.wilaya_num == null) cur.wilaya_num = r.wilaya_num;
  }
  const merged = [...byId.values()];

  if (merged.length < 150) throw new Error(`only ${merged.length} stop-desks parsed: source layout may have changed`);

  console.log("Resolving wilaya_code by nearest commune centroid…");
  const communes = loadCommunes();
  // Cross-check the centroid result against Guepex's numeric wilaya id (where present).
  // A disagreement is expected when the desk's wilaya was promoted by a reform and the
  // source still prints the wilaya it was carved out of (source → its child, 49-58 in
  // 2021 or 59-69 in 2026); any other disagreement is a real error.
  const mothers = motherWilayas();
  let promoted = 0;
  const conflicts = [];
  const droppedPins = [];
  const heldIds = new Set();
  const stopdesks = merged
    .map((r) => {
      const w = resolveWilaya(r.lat, r.lng, communes, r.wilaya_num ?? r.cardWilaya);
      if (r.wilaya_num != null && r.wilaya_num !== w.code) {
        if (mothers.get(Number(w.code)) === Number(r.wilaya_num)) promoted++;
        else conflicts.push(`${r.id}(src ${r.wilaya_num}→${w.code})`);
      }
      // Carded sources (Anderson/Noest/ZR/Swift/HHD) declare their wilaya. If the resolved
      // pin lands in a DIFFERENT wilaya that is not the declared one's reform child (a
      // wrong/duplicated Maps link), drop the desk rather than ship a misplaced point. The
      // reason carries the coordinate, so it is checkable against the carrier's own link
      // without re-running the fetch (see badPinDrop).
      const badPin = badPinDrop(r, w.code, mothers);
      if (badPin) {
        droppedPins.push(badPin);
        heldIds.add(r.id);
        return null;
      }
      return {
        id: r.id,
        operator: r.operator,
        name: r.name,
        name_ar: r.name_ar ?? null,
        address: r.address,
        commune: r.commune,
        wilaya_code: w.code,
        lat: r.lat,
        lng: r.lng,
        sources: r.sources.sort(),
      };
    })
    .filter(Boolean);
  stopdesks.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  // Guards
  const ids = new Set(stopdesks.map((s) => s.id));
  if (ids.size !== stopdesks.length) throw new Error("duplicate stop-desk ids after merge");
  const nowRetired = appendRetiredIds(retired, committed.keys(), ids, heldIds);
  const bad = stopdesks.filter((s) => !s.operator || !s.name || s.wilaya_code < 1 || s.wilaya_code > 69 || !Number.isFinite(s.lat) || !Number.isFinite(s.lng));
  if (bad.length) throw new Error(`malformed stop-desks: ${bad.slice(0, 5).map((s) => s.id).join(", ")}`);
  const badCarrier = [...new Set(stopdesks.map((s) => s.operator))].filter((o) => !carrierIds.has(o));
  if (badCarrier.length) throw new Error(`stop-desk operators missing from registry: ${badCarrier.join(", ")}`);
  if (conflicts.length) throw new Error(`centroid wilaya conflicts with source (not a reform parent/child pair): ${conflicts.join(", ")}`);
  if (promoted) console.log(`  ${promoted} desk(s) in wilayas promoted by a reform (source → the wilaya carved out of it)`);
  // Every one of them, never an ellipsis: a truncated list is how an omission goes
  // unexplained in the release notes.
  if (droppedPins.length) console.log(`  ${droppedPins.length} carded desk(s) dropped: pin in a different wilaya than the card (bad/duplicate link): ${droppedPins.join(", ")}`);
  if (nowRetired.length) console.log(`  ${nowRetired.length} id(s) retired, the desk they named is gone from every source: ${nowRetired.join(", ")}`);

  // coverage, per operator that has stop-desks
  const covMap = new Map();
  for (const s of stopdesks) {
    if (!covMap.has(s.operator)) covMap.set(s.operator, { wilayas: new Set(), communes: new Set(), n: 0 });
    const c = covMap.get(s.operator);
    c.n++;
    // Zero-padded, the same key stopdesks.json carries, because coverage.json exists to
    // be joined to it. The v2 migration moved stop-desks to "01".."69" and 3fc4fd87
    // converted the committed coverage.json by hand without fixing this line, so the
    // next refresh was always going to put the integers back and break that join.
    c.wilayas.add(wcode(s.wilaya_code));
    if (s.commune) c.communes.add(s.commune);
  }
  const nameById = new Map(seed.map((c) => [c.id, c.name]));
  const coverage = [...covMap.entries()]
    .map(([operator, c]) => ({
      operator,
      carrier_name: nameById.get(operator),
      stopdesks: c.n,
      wilaya_count: c.wilayas.size,
      wilayas: [...c.wilayas].sort(),
      commune_count: c.communes.size,
    }))
    .sort((a, b) => b.stopdesks - a.stopdesks || a.operator.localeCompare(b.operator));

  // carriers: seed augmented with derived stop-desk stats
  const statById = new Map(coverage.map((c) => [c.operator, c]));
  const carriers = seed
    .map((c) => ({
      ...c,
      in_stopdesks: statById.has(c.id),
      stopdesk_count: statById.get(c.id)?.stopdesks ?? 0,
      stopdesk_wilaya_count: statById.get(c.id)?.wilaya_count ?? 0,
    }))
    .sort((a, b) => b.stopdesk_count - a.stopdesk_count || a.name.localeCompare(b.name));

  const wilayasCovered = new Set(stopdesks.map((s) => s.wilaya_code)).size;

  // carriers.json + coverage.json are auxiliary registry files (not GeoRecords),
  // written as-is. stopdesks.json is the canonical GeoRecord layer: emit it, its
  // CSV/GeoJSON and the derived metadata.json via the shared v2 writer. Write the
  // auxiliary files FIRST: the shared metadata's stats read carriers.json/
  // coverage.json off disk. Live-only source, so stamp the run's date.
  mkdirSync(join(DATA, "csv"), { recursive: true });
  writeJSON("carriers.json", carriers);
  writeJSON("coverage.json", coverage);
  writeText("csv/carriers.csv", toCSV(carriers, ["id", "name", "website", "type", "cod", "scope", "open_agency_data", "api", "in_stopdesks", "stopdesk_count", "stopdesk_wilaya_count", "notes"]));
  writeText("csv/coverage.csv", toCSV(coverage, ["operator", "carrier_name", "stopdesks", "wilaya_count", "wilayas", "commune_count"]));

  const cfg = MIGRATIONS.livraison;
  const today = new Date().toISOString().slice(0, 10);
  writePackageV2({
    pkg: "livraison",
    dir: DATA,
    files: [{ file: "stopdesks.json", rows: stopdesks.map(cfg.map) }],
    meta: cfg.meta,
    updated: today,
    retrieved: today,
    retiredIds: retired,
  });

  console.log(
    `\nWrote ${carriers.length} carriers, ${stopdesks.length} stop-desks → v2 ` +
      `(${carriers.filter((c) => c.in_stopdesks).length} carriers with open desks, ${wilayasCovered} wilayas), ` +
      `${coverage.length} coverage rows to ${DATA}.`,
  );
}

// Importable for the operator-tag test; only the direct invocation builds.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
