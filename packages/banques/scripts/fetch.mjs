#!/usr/bin/env node
// Fetch bank branch locations from each bank's public locator → data/branches.json.
// Banks expose branches via different mechanisms (Joomla com_mymaplocations,
// WordPress store-locator plugins, …); each gets a `kind` handler that returns
// raw {name,address,phone,lat,lng,wilaya_name,srcid}, then a shared normalize()
// assigns wilaya_code and reconciles coordinates. .dz TLS certs are frequently
// misconfigured, so we fetch via `curl -k` with a browser UA. Run scripts/build.mjs
// afterwards to derive CSV + GeoJSON + metadata.
//
// Usage: node scripts/fetch.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { MIGRATIONS } from "../../../scripts/lib/v2-transforms.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const DATA = join(SCRIPTS, "..", "data");
const REF = join(SCRIPTS, "..", "..", "dataset", "data", "geojson");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

// ---- geo reference (from the flagship dataset) ---------------------------
const COMMUNES = JSON.parse(readFileSync(join(REF, "communes.geojson"), "utf8")).features
  .map((f) => ({ lat: f.geometry?.coordinates?.[1], lng: f.geometry?.coordinates?.[0], w: f.properties?.wilaya_code }))
  .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const WILAYAS = JSON.parse(readFileSync(join(REF, "wilayas.geojson"), "utf8")).features.map((f) => f.properties);
const WILAYA_BY_NAME = new Map(WILAYAS.map((p) => [norm(p.name_fr), p.code]));
const nameToCode = (name) => WILAYA_BY_NAME.get(norm(name)) ?? null;

// Arabic normalizer: drop harakat/tatweel, unify alef/ya/waw/ta-marbuta forms, keep only
// Arabic letters. Lets us match BEA's Arabic-only addresses against name_ar.
const normAr = (s) => String(s || "")
  .replace(/[ً-ٰٟـ]/g, "")
  .replace(/[إأآا]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ؤ/g, "و").replace(/ة/g, "ه")
  .replace(/[^؀-ۿ]/g, "");
const COMMUNE_PROPS = JSON.parse(readFileSync(join(REF, "communes.geojson"), "utf8")).features.map((f) => f.properties);
// Exact-token place lookups (commune + wilaya names → wilaya_code), French and Arabic. EXACT match
// on a whole token/phrase — never substring — so an eponymous street like "rue Colonel Amirouche"
// (Algiers) can't match the Amirouche commune elsewhere. Communes loaded first; wilaya names win on
// the bare canonical name.
const PLACE_LAT = new Map(), PLACE_AR = new Map();
for (const c of COMMUNE_PROPS) { const l = norm(c.name_fr), a = normAr(c.name_ar); if (l) PLACE_LAT.set(l, c.wilaya_code); if (a) PLACE_AR.set(a, c.wilaya_code); }
for (const w of WILAYAS) { const l = norm(w.name_fr), a = normAr(w.name_ar); if (l) PLACE_LAT.set(l, w.code); if (a) PLACE_AR.set(a, w.code); }
// Last-resort wilaya assignment for address-only banks (no coords, no stated wilaya). Algerian
// addresses end with the locality (street names honoring national figures appear earlier), so scan
// tokens RIGHT-TO-LEFT and return the first exact place match — trying the longest trailing phrase
// first so multi-word names ("Bordj Bou Arréridj", "برج بوعريرج") resolve. Returns null if unmatched.
function wilayaFromText(text) {
  if (!text) return null;
  const toks = String(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (let i = toks.length; i > 0; i--) {
    for (let len = Math.min(3, i); len >= 1; len--) {
      const phrase = toks.slice(i - len, i).join(" ");
      const l = norm(phrase); if (l && PLACE_LAT.has(l)) return PLACE_LAT.get(l);
      const a = normAr(phrase); if (a && PLACE_AR.has(a)) return PLACE_AR.get(a);
    }
  }
  return null;
}

const toRad = (d) => (d * Math.PI) / 180;
function wilayaFromCoords(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best = null, bd = Infinity;
  for (const c of COMMUNES) {
    const x = toRad(lng - c.lng) * Math.cos(toRad((lat + c.lat) / 2));
    const y = toRad(lat - c.lat);
    const d = x * x + y * y;
    if (d < bd) { bd = d; best = c.w; }
  }
  return best;
}

const num = (v) => { const n = parseFloat(String(v ?? "").trim()); return Number.isFinite(n) ? n : null; };
const decode = (s) =>
  String(s || "").replace(/&#?\w+;/g, (m) => ({ "&#44;": ",", "&nbsp;": " ", "&amp;": "&" }[m] ?? " "))
    .replace(/<[^>]+>/g, " ").replace(/\\(['’"])/g, "$1").replace(/\s+/g, " ").trim();
// Split an HTML fragment on <br>, decode each line, drop empties — shared by the address-only banks.
const brLines = (s) => String(s || "").split(/<br\s*\/?>/i).map(decode).filter(Boolean);
// curl via execFileSync with array args: nothing is shell-interpreted, so source
// values (incl. the remote-scraped BADR asset path) can't inject commands. -k:
// several .dz hosts serve broken TLS certs (see README » Provenance).
const curl = (args) => execFileSync("curl", ["-sk", "--proto", "=https", "--proto-redir", "=https", "-A", UA, "--max-time", "90", ...args], { maxBuffer: 1 << 27, encoding: "utf8" });

const inRange = (w) => Number.isInteger(w) && w >= 1 && w <= 69;
// Coordinates are trusted only inside Algeria's bounding box and never exactly on
// a zero axis (a common missing-value default) — guards against malformed source
// values such as a latitude that lost its decimal point, or lng:0.
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0 &&
  lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

// Assign wilaya_code and reconcile coordinates.
// - coordsAuth (default): coords are real positions → wilaya from coords, falling
//   back to a stated wilaya name only when the coords are invalid/out of bounds.
// - !coordsAuth (e.g. BNA, whose coords are geocoder output): trust the stated
//   wilaya name; keep coords only when they agree with it, else drop them.
function normalize(bank_id, r, coordsAuth = true) {
  let lat = num(r.lat), lng = num(r.lng);
  if (!inAlgeria(lat, lng)) { lat = null; lng = null; }
  const nameW = r.wilaya_name ? nameToCode(r.wilaya_name) : null;
  const coordW = wilayaFromCoords(lat, lng);
  let wilaya_code, keepCoords;
  if (coordsAuth) {
    wilaya_code = coordW ?? nameW;
    keepCoords = lat != null;
  } else {
    wilaya_code = nameW ?? coordW;
    keepCoords = lat != null && coordW != null && coordW === nameW;
  }
  // Address-only banks (no coords, no stated wilaya): resolve from the name/address text.
  if (!inRange(wilaya_code)) wilaya_code = wilayaFromText([r.name, r.address, r.wilaya_name].filter(Boolean).join(" "));
  return {
    id: `${bank_id}-${r.srcid}`,
    bank_id,
    name: r.name || null,
    address: r.address || null,
    phone: r.phone || null,
    wilaya_code,
    lat: keepCoords ? lat : null,
    lng: keepCoords ? lng : null,
  };
}

// ---- per-bank locator handlers -------------------------------------------
// Joomla com_mymaplocations → GeoJSON (CPA).
function mml(src) {
  const fc = JSON.parse(curl([src.url, "--data-urlencode", "searchzip=" + src.searchzip, "--data", src.body]));
  return (fc.features || []).filter((f) => f && Number(f.id) > 0 && f.geometry).map((f) => {
    const [lng, lat] = f.geometry.coordinates || [];
    const t = decode(f.properties?.fulladdress).replace(/route details/gi, " ").replace(/\s+/g, " ").trim();
    const phones = (t.match(/0\d{1,2}[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}/g) || []).map((p) => p.replace(/[\s.\-]+/g, " ").trim());
    const pm = t.match(/\b\d{5}\b/);
    const address = (pm ? t.slice(0, pm.index) : t).replace(/\bAlg[ée]rie\b/gi, "").replace(/[,\s]+$/, "").trim();
    return { srcid: f.id, name: decode(f.properties?.name), address: address || null, phone: phones.join(" / ") || null, lat, lng, wilaya_name: null };
  });
}

// WordPress AGILE Store Locator → JSON array (BNA). state = wilaya name.
function asl(src) {
  const arr = JSON.parse(curl([src.url]));
  return (Array.isArray(arr) ? arr : []).map((r) => ({
    srcid: r.id,
    name: String(r.title || "").replace(/^\s*\d+\s*-\s*/, "").trim() || null,
    address: String(r.street || "").trim() || null,
    phone: r.phone || null,
    lat: r.lat, lng: r.lng,
    wilaya_name: r.state || null,
  }));
}

// WordPress WP Store Locator → JSON array (Al Salam). No reliable wilaya name → coords.
function wpsl(src) {
  const arr = JSON.parse(curl([src.url]));
  return (Array.isArray(arr) ? arr : []).map((r) => ({
    srcid: r.id,
    name: r.store || null,
    address: r.address || null,
    phone: r.phone || null,
    lat: r.lat, lng: r.lng,
    wilaya_name: null,
  }));
}

// WordPress google-maps-easy plugin → markers embedded inline as an escaped
// JSON blob (Natixis). coord_x = lat, coord_y = lng.
function gmpeasy(src) {
  const un = curl([src.url]).split('\\"').join('"').split("\\/").join("/");
  const mi = un.indexOf('"markers":[');
  if (mi < 0) return [];
  let i = un.indexOf("[", mi), depth = 0, inStr = false, esc = false;
  const start = i;
  for (; i < un.length; i++) {
    const c = un[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === "[") depth++; else if (c === "]") { depth--; if (depth === 0) { i++; break; } }
  }
  const arr = un.slice(start, i);
  // The markers array is now true JSON; a few values carry stray escapes (\') that
  // break JSON.parse, so fall back to a sanitized parse.
  let markers = [];
  for (const c of [arr, arr.split("\\'").join("'").replace(/\\(?!["\\/bfnrtu])/g, "")]) {
    try { markers = JSON.parse(c); break; } catch { /* try next */ }
  }
  return markers
    .filter((m) => m && m.coord_x && m.coord_y)
    .map((m, k) => ({
      srcid: m.id || `m${k + 1}`,
      name: decode(String(m.title || "")),
      address: decode(String(m.address || "")) || null,
      phone: null,
      lat: parseFloat(m.coord_x),
      lng: parseFloat(m.coord_y),
      wilaya_name: null,
    }));
}

// WP Google Map Plugin → all places base64-encoded inline in window.wpgmp.mapdataN (Al Baraka).
function wpgmp(src) {
  const html = curl([src.url]);
  const m = html.match(/mapdata\d+\s*=\s*"([A-Za-z0-9+/=]+)"/);
  if (!m) return [];
  const json = JSON.parse(Buffer.from(m[1], "base64").toString("utf8"));
  return (json.places || []).map((p) => {
    const loc = p.location || {};
    const phones = (decode(p.content).match(/0\d{1,2}[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}/g) || [])
      .map((x) => x.replace(/[\s.\-]+/g, " ").trim());
    return { srcid: p.id, name: decode(p.title), address: decode(p.address) || null, phone: phones.join(" / ") || null, lat: parseFloat(loc.lat), lng: parseFloat(loc.lng), wilaya_name: null };
  });
}

// React/Vite SPA with the agency array bundled in its JS chunk (BADR). Objects
// are {code,name,address,contact,wilaya,lat,lng} with real coordinates.
function badr(src) {
  const page = curl([src.url]);
  const asset = (page.match(/src="(\/assets\/index-[^"]+\.js)"/) || [])[1];
  if (!asset) return [];
  const js = curl([new URL(asset, src.url).href]);
  const re = /\{code:(["'])(.*?)\1,name:(["'])(.*?)\3,address:(["'])(.*?)\5,contact:(["'])(.*?)\7,wilaya:(["'])(.*?)\9,lat:(-?[\d.]+),lng:(-?[\d.]+)\}/g;
  const out = [];
  let m;
  while ((m = re.exec(js))) {
    const phones = (m[8].match(/0\d{1,2}[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}/g) || [])
      .map((x) => x.replace(/[\s.\-]+/g, " ").trim());
    out.push({ srcid: m[2], name: decode(m[4]), address: decode(m[6]) || null, phone: phones.join(" / ") || null, lat: parseFloat(m[11]), lng: parseFloat(m[12]), wilaya_name: decode(m[10]) || null });
  }
  return out;
}

// Static HTML table (BNH /agences): each branch row is 5 <td>s — name, wilaya, address, phone,
// activity. Phone placeholder 000-00-00-00 means "none". No coordinates on the page.
function bnhtable(src) {
  const html = curl([src.url]);
  const out = [];
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    const tds = (tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map((c) => decode(c));
    if (tds.length !== 5) continue;
    const [name, wilaya, address, phone] = tds;
    if (!name || !wilaya) continue;
    out.push({
      srcid: norm(name) || null, name, address: address || null,
      phone: phone && phone.replace(/\D/g, "") !== "0000000000" ? phone : null,
      lat: null, lng: null, wilaya_name: wilaya,
    });
  }
  return out;
}

// HBTF homepage: branch cells hold <strong>NAME</strong><br/>address<br/>Tél : phone; the branch
// code lives in the preceding <img alt="NNN"> cell. No coordinates.
function hbtf(src) {
  const html = curl([src.url]);
  const out = [];
  let code = null;
  for (const cell of html.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || []) {
    const cm = cell.match(/alt="(\d{2,4})"/);
    if (cm) code = cm[1];
    const nm = cell.match(/<strong>([\s\S]*?)<\/strong>/i);
    if (!nm) continue;
    const name = decode(nm[1]);
    if (!/agence/i.test(name)) continue;
    const lines = brLines(cell.slice(cell.search(/<\/strong>/i)));
    let address = null, phone = null;
    for (const ln of lines) {
      if (/t[ée]l\s*:/i.test(ln)) phone = ln.replace(/.*t[ée]l\s*:\s*/i, "").trim() || null;
      else if (!address) address = ln;
    }
    out.push({ srcid: code, name, address, phone, lat: null, lng: null, wilaya_name: null });
  }
  return out;
}

// Fransabank reseau page: Elementor text-editor; each branch is <h3>NAME</h3><p>ADDRESS<br>Tél : …</p>.
// Region/HQ headers are <h1>, so matching only <h3> naturally drops the Direction Générale. No coords.
function fransabank(src) {
  const html = curl([src.url]);
  const out = [];
  const re = /<h3>([\s\S]{0,300}?)<\/h3>\s*<p>([\s\S]{0,2000}?)<\/p>/gi;
  let m;
  while ((m = re.exec(html))) {
    const name = decode(m[1]);
    const block = m[2];
    if (!/t[ée]l\s*:/i.test(block)) continue;
    const lines = brLines(block);
    let address = null, phone = null;
    for (const ln of lines) {
      if (/^t[ée]l/i.test(ln)) { if (!phone) phone = ln.replace(/^t[ée]l\s*:?\s*/i, "").split("/")[0].trim() || null; }
      else if (/^(fax|swift|e-?mail)/i.test(ln)) continue;
      else if (!address) address = ln.replace(/^adresse\s*:?\s*/i, "");
    }
    if (!name || !address) continue;
    out.push({ srcid: norm(name), name, address, phone, lat: null, lng: null, wilaya_name: null });
  }
  return out;
}

// BEA /contact: Bootstrap accordion. Offices are keyed by id (direction_generale / dga_<region>-N /
// agence_*); the address sits in the body's "العنوان" line. Arabic-only, no coordinates → wilaya is
// resolved from the Arabic text. Items without an address line (pure group headers) are skipped.
function bea(src) {
  const html = curl([src.url]);
  const out = [];
  const re = /aria-controls="collapse-([^"]+)">([^<]*)<\/button>[\s\S]{0,600}?<div class="accordion-body">([\s\S]{0,3000}?)<\/div>/gi;
  let m;
  while ((m = re.exec(html))) {
    const body = m[3];
    const am = body.match(/العنوان:\s*<\/strong>\s*([^<]+)/);
    if (!am) continue;
    const pm = body.match(/href="tel:([^"]+)"/) || body.match(/الهاتف:\s*<\/strong>\s*([^<]+)/);
    const phone = pm ? decode(pm[1]).replace(/^\+213\s*/, "0").replace(/^00/, "0").trim() : null;
    out.push({ srcid: m[1], name: decode(m[2]) || null, address: decode(am[1]) || null, phone: phone || null, lat: null, lng: null, wilaya_name: null });
  }
  return out;
}

// Bank ABC Algeria: markercontent.push({id,content:'…'}) blocks. Name in _dialog-title, address in
// the leading <span class=current>, phone in the .tel div, coordinates in the directions link.
function abc(src) {
  const html = curl([src.url]);
  const out = [];
  const re = /markercontent\.push\(\{id:(\d+),content:'((?:[^'\\]|\\.)*)'\}\)/g;
  let m;
  while ((m = re.exec(html))) {
    const c = m[2].replace(/\\'/g, "'").replace(/\\\//g, "/");
    const ll = c.match(/Current\+Location\/(-?[\d.]+),(-?[\d.]+)/);
    const tel = (c.match(/<div class="tel">([\s\S]*?)<\/div>/) || [])[1] || "";
    const phones = (decode(tel).match(/\(?\d[\d()\s]{6,}\d/g) || []).map((p) => p.replace(/\s+/g, " ").trim());
    out.push({
      srcid: m[1], name: decode((c.match(/_dialog-title>([^<]+)</) || [])[1] || "") || null,
      address: decode((c.match(/class=current>\s*([\s\S]*?)<br\s*\/?>\s*<br\s*\/?>/) || [])[1] || "") || null,
      phone: phones.join(" / ") || null,
      lat: ll ? parseFloat(ll[1]) : null, lng: ll ? parseFloat(ll[2]) : null, wilaya_name: null,
    });
  }
  return out;
}

// BNP Paribas El Djazaïr: inline `var locations = [[name,lat,lng,zoom,popupHTML], …]`. Popup carries
// the address (<p>) and a tel: link. Coordinates are real positions.
function bnp(src) {
  const html = curl([src.url]);
  const start = html.indexOf("var locations = [");
  if (start < 0) return [];
  const next = html.indexOf("var locations0", start);
  const seg = html.slice(start, next > start ? next : start + 400000);
  const out = [];
  const re = /\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"(-?[\d.]+)"\s*,\s*"(-?[\d.]+)"\s*,\s*"\d+"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\]/g;
  let m, i = 0;
  while ((m = re.exec(seg))) {
    const name = decode(m[1].replace(/\\"/g, '"'));
    const popup = m[4].replace(/\\"/g, '"').replace(/\\'/g, "'");
    const tel = (popup.match(/tel:([+\d\s]+)/) || [])[1];
    out.push({
      srcid: norm(name) || `bnp${++i}`, name: name || null,
      address: decode((popup.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || "") || null,
      phone: tel ? tel.replace(/\s+/g, " ").trim() : null,
      lat: parseFloat(m[2]), lng: parseFloat(m[3]), wilaya_name: null,
    });
  }
  return out;
}

// Arab Bank PLC Algeria: a global location tree at /branches/jsonmap (the body is JSON, sometimes
// JSON-string-wrapped). Only city-level points for Algeria — coordinates, no street address/phone.
function arabbank(src) {
  let data = JSON.parse(curl([src.url]));
  if (typeof data === "string") data = JSON.parse(data);
  const out = [];
  for (const cont of data.continents || [])
    for (const country of cont.countries || [])
      if (norm(country.name) === "algeria")
        for (const city of country.cities || [])
          for (const d of city.districts || [])
            out.push({
              srcid: d.id, name: d.name || city.name || null, address: null, phone: null,
              lat: parseFloat(d.latitude), lng: parseFloat(d.longitude), wilaya_name: city.name || null,
            });
  return out;
}

// Société Générale Algérie (TYPO3, server-rendered behind Imperva but plain curl works): the agences
// list links to per-wilaya pages; each lists branch cards (card__link = name, card__abstract =
// address / wilaya / phone over <br>). No coordinates. id 1350 is the city index, skipped.
function sga(src) {
  const list = curl([src.url]);
  const host = new URL(src.url).hostname;
  const urls = [...new Set(
    [...list.matchAll(/href="([^"]*tx_sgrecords_locationdetails%5Blocation%5D=(\d+)[^"]*)"/g)]
      .filter((m) => m[2] !== "1350").map((m) => m[1].replace(/&amp;/g, "&")),
  )].map((u) => { try { return new URL(u, src.url); } catch { return null; } })
    .filter((u) => u && u.hostname === host);
  const out = [];
  for (const u of urls) {
    let html;
    try { html = curl([u.href]); } catch { continue; }
    // The page heading is the wilaya these branches belong to — more reliable than the abstract's
    // line order, which varies (some cards omit the wilaya line).
    const wilaya = decode((html.match(/<h1[^>]*>([\s\S]{0,200}?)<\/h1>/i) || [, ""])[1]) || null;
    const re = /card__title>\s*<a href="([^"]+)"[^>]*class=card__link>([^<]*)<\/a>[\s\S]{0,800}?card__abstract>([\s\S]{0,800}?)<\/div>/gi;
    let m;
    while ((m = re.exec(html))) {
      const parts = brLines(m[3]);
      out.push({
        srcid: (m[1].match(/locations-details\/([^/?]+)\//) || [, null])[1] || norm(m[2]),
        name: decode(m[2]) || null, address: parts[0] || null,
        phone: parts.find((p) => /\d[\d\s().-]{6,}\d/.test(p)) || null,
        lat: null, lng: null, wilaya_name: wilaya,
      });
    }
  }
  return out;
}

// AGB (Gulf Bank Algérie) sits behind an F5/Shape JS challenge that plain curl can't solve, so its
// 63 branches are captured once via a headless browser into scripts/seeds/agb.json and merged here
// (refresh manually: re-run the browser capture and overwrite the seed). The seed lives under
// scripts/ — a scrape input, not part of the published data/ tree. See README » Provenance.
function seed(src) {
  return JSON.parse(readFileSync(join(SCRIPTS, "seeds", src.seed), "utf8"));
}

// Google My Maps custom map exported as KML (BDL): each Placemark carries ExtendedData
// AGENCE/ADRESSE/VILLE/WILAYA (French); only some have a <Point>. `forcekml=1` returns plain XML.
// `src.kml` reads a committed local export (vs `src.url` to fetch live).
function gmymaps(src) {
  const kml = src.kml ? readFileSync(join(SCRIPTS, "seeds", src.kml), "utf8") : curl([src.url]);
  const out = [];
  for (const p of kml.match(/<Placemark>[\s\S]{0,2000}?<\/Placemark>/g) || []) {
    const ext = (n) => decode((p.match(new RegExp(`name="${n}">\\s*<value>([^<]*)<`)) || [])[1] || "");
    const name = ext("AGENCE") || ext("VILLE") || ext("WILAYA") || null;
    if (!name) continue; // a few rows carry only an address; can't name them honestly → skip
    const code = decode((p.match(/<name>([^<]*)<\/name>/) || [])[1] || "").replace(/\.0+$/, "");
    const c = p.match(/<coordinates>\s*(-?[\d.]+),\s*(-?[\d.]+)/);
    out.push({
      srcid: code || norm(name), name, address: ext("ADRESSE") || null,
      phone: null, lat: c ? parseFloat(c[2]) : null, lng: c ? parseFloat(c[1]) : null,
      wilaya_name: ext("WILAYA") || ext("VILLE") || null,
    });
  }
  return out;
}

// KML where each Placemark is <name> + a CDATA <description> holding "address<br>Tél : …<br>Fax : …"
// and a <Point> (Trust Bank's My Maps export, captured locally as scripts/seeds/<src.kml>).
function kmldesc(src) {
  const kml = src.kml ? readFileSync(join(SCRIPTS, "seeds", src.kml), "utf8") : curl([src.url]);
  const out = [];
  for (const p of kml.match(/<Placemark>[\s\S]{0,4000}?<\/Placemark>/g) || []) {
    const name = decode((p.match(/<name>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/name>/) || [])[1] || "");
    if (!name) continue;
    const desc = (p.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || "";
    const lines = brLines(desc.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<img[^>]*>/gi, ""));
    let address = null, phone = null;
    for (const ln of lines) {
      if (/^t[ée]l/i.test(ln)) { if (!phone) phone = ln.replace(/^t[ée]l\s*:?\s*/i, "").split("/")[0].trim() || null; }
      else if (/^fax/i.test(ln)) continue;
      else if (!address) address = ln;
    }
    // Some rows pack "address ;TEL… ;FAX…" on one line — pull the phone out and trim the tail.
    if (!phone && address && /t[ée]l[^0-9]*\d/i.test(address)) {
      phone = (address.match(/t[ée]l[^0-9]*([0-9][0-9\s.\-]{5,})/i) || [])[1]?.trim() || null;
      address = address.replace(/[;,]?\s*t[ée]l[^0-9]*\d[\s\S]*$/i, "").trim() || address;
    }
    const c = p.match(/<coordinates>\s*(-?[\d.]+),\s*(-?[\d.]+)/);
    out.push({ srcid: norm(name), name, address, phone, lat: c ? parseFloat(c[2]) : null, lng: c ? parseFloat(c[1]) : null, wilaya_name: null });
  }
  return out;
}

const HANDLERS = { mml, asl, wpsl, gmpeasy, wpgmp, badr, bnhtable, hbtf, fransabank, bea, abc, bnp, arabbank, sga, seed, gmymaps, kmldesc };

const SOURCES = [
  { bank_id: "cpa", kind: "mml", url: "https://www.cpa-bank.dz/index.php/en/agences-cpa", searchzip: "Alger, Algérie",
    body: "task=search&radius=-1&option=com_mymaplocations&limit=0&component=com_mymaplocations&Itemid=283&zoom=5&format=json&limitstart=0&filter_order=distance" },
  { bank_id: "bna", kind: "asl", coordsAuth: false, url: "https://www.bna.dz/wp-admin/admin-ajax.php?action=asl_load_stores&load_all=1&layout=1" },
  { bank_id: "alsalam", kind: "wpsl", url: "https://www.alsalamalgeria.com/wp-admin/admin-ajax.php?action=store_search&lat=36.75&lng=3.06&max_results=500&search_radius=99999&lang=fr" },
  { bank_id: "natixis", kind: "gmpeasy", url: "https://www.natixis.dz/nous-connaitre/trouver-une-agence/" },
  { bank_id: "albaraka", kind: "wpgmp", url: "https://www.albaraka-bank.dz/agences-gab/" },
  { bank_id: "badr", kind: "badr", url: "https://badrbank.dz/trouver-une-agence" },
  { bank_id: "cnep", kind: "asl", url: "https://www.cnepbanque.dz/web/wp-admin/admin-ajax.php?action=asl_load_stores&load_all=1&lang=" },
  { bank_id: "bnh", kind: "bnhtable", url: "https://www.bnh.dz/agences" },
  { bank_id: "fransabank", kind: "fransabank", url: "https://www.fransabank.dz/nous-contacter/reseau-fransabank/" },
  { bank_id: "hbtf", kind: "hbtf", url: "https://www.housingbankdz.com/" },
  { bank_id: "bea", kind: "bea", url: "https://www.bea.dz/contact" },
  { bank_id: "abc", kind: "abc", url: "https://www.bank-abc.com/en/CountrySites/Algeria/branches" },
  { bank_id: "bnpparibas", kind: "bnp", url: "https://www.bnpparibas.dz/trouver-une-agence/" },
  { bank_id: "arabbank", kind: "arabbank", url: "https://www.arabbank.dz/mainmenu/home/ways-to-bank/branches/jsonmap" },
  { bank_id: "sga", kind: "sga", url: "https://particuliers.societegenerale.dz/fr/locations-details/agences/" },
  { bank_id: "agb", kind: "seed", seed: "agb.json", url: "https://www.agb.dz/" },
  // BDL — committed export of the bank's Google My Maps. Refresh:
  // curl 'https://www.google.com/maps/d/kml?mid=1wA-ijVkToyjzgG-d_EzHoC-GLU8&forcekml=1' > scripts/seeds/bdl.kml
  { bank_id: "bdl", kind: "gmymaps", kml: "bdl.kml" },
  { bank_id: "trustbank", kind: "kmldesc", kml: "trustbank.kml" },
  { bank_id: "citibank", kind: "seed", seed: "citibank.json" },
  { bank_id: "ziraat", kind: "seed", seed: "ziraat.json" },
  { bank_id: "hsbc", kind: "seed", seed: "hsbc.json" },
];

const all = [];
for (const src of SOURCES) {
  try {
    const raw = HANDLERS[src.kind](src);
    const recs = raw.map((r) => normalize(src.bank_id, r, src.coordsAuth !== false));
    // A handler that returns nothing usually means the bank changed its markup — surface it loudly
    // rather than silently shipping a smaller dataset.
    console.log(`${src.bank_id}: ${recs.length} branches${recs.length === 0 ? "  ⚠️  ZERO — locator markup may have changed" : ""}`);
    all.push(...recs);
  } catch (e) {
    console.log(`${src.bank_id}: FAILED — ${e.message.split("\n")[0]}`);
  }
}

// Drop any record without a valid wilaya_code — can't place it honestly; keeps the
// published set clean and the validator green regardless of source quirks.
const dropped = all.filter((r) => !inRange(r.wilaya_code));
if (dropped.length) console.log(`dropped ${dropped.length} record(s) with no valid wilaya_code: ${dropped.map((r) => r.id).join(", ")}`);
const records = all.filter((r) => inRange(r.wilaya_code));

// Guarantee unique ids across the whole set (some sources reuse ids).
const idSeen = new Map();
for (const r of records) {
  const n = idSeen.get(r.id) || 0;
  idSeen.set(r.id, n + 1);
  if (n > 0) r.id = `${r.id}-${n}`;
}

// Emit branches.json in the canonical v2 GeoRecord shape (the shared branches map).
// Run `node scripts/build.mjs` afterwards to refresh the CSV/GeoJSON/metadata.
const branchMap = MIGRATIONS.banques.files.find((f) => f.file === "branches.json").map;
const v2 = records.map(branchMap).sort((a, b) => (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0));
writeFileSync(join(DATA, "branches.json"), JSON.stringify(v2, null, 2) + "\n");

// inspection summary
const byBank = {};
for (const r of records) (byBank[r.bank_id] ??= { n: 0, geo: 0 }, byBank[r.bank_id].n++,
  (Number.isFinite(r.lat) && Number.isFinite(r.lng)) && byBank[r.bank_id].geo++);
console.log(`\ntotal ${records.length}`);
for (const [b, s] of Object.entries(byBank)) console.log(`  ${b}: ${s.n} | geocoded ${s.geo}`);
