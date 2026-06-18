#!/usr/bin/env node
/**
 * Build @geoalgeria/livraison — Algeria's COD / e-commerce delivery layer:
 *   1. carriers   — a registry of delivery companies (scripts/carriers.seed.json,
 *                   augmented here with derived stop-desk stats).
 *   2. stopdesks  — geocoded stop-desk / relay-point locations, merged from the two
 *                   sources that publish them openly.
 *   3. coverage   — per-carrier stop-desk presence (which wilayas/communes each
 *                   carrier with open data physically reaches).
 *
 * Open stop-desk sources (no auth, no WAF):
 *   - Yalidine: https://yalidine-express.com.dz/nos-agences/  (static HTML table,
 *     one row per stop-desk: id / wilaya / commune / name[operator] / address /
 *     a maps.google ?q=lat,lng link).
 *   - Guepex:   https://www.guepex.dz/public/data/agences.json (open JSON, gps="lat,lng").
 * Both are federated relay maps sharing the same stop-desk `center_id` scheme, so we
 * dedupe by id. Each row is tagged with the operating carrier in "[...]".
 *
 * Most Algerian COD carriers (Noest, ZR/Procolis, Maystro, DHL, …) do NOT publish an
 * open agency list — they live in carriers.json (registry) with open_agency_data:"none".
 * So the geocoded layer is the openly-published relay ecosystem, not all 90+ carriers;
 * the registry carries the breadth. (Recon: 2026-06-18.)
 *
 * wilaya_code is resolved by nearest flagship commune centroid (haversine) from the
 * geoalgeria dataset — same method as @geoalgeria/aviation — and cross-checked against
 * the source-provided wilaya where available.
 *
 * Usage: node scripts/fetch.mjs
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const DATASET = join(__dirname, "..", "..", "dataset", "data");
const SEED = join(__dirname, "carriers.seed.json");

const YAL_URL = "https://yalidine-express.com.dz/nos-agences/";
const GUEPEX_URL = "https://www.guepex.dz/public/data/agences.json";
const ANDERSON_URL = "https://anderson-ecommerce.com/";
const NOEST_URL = "https://noest-dz.com/";
const MAYSTRO_URL = "https://maystro-delivery.com/Coverage.html";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";
// A non-browser UA: Google Maps short links 302 to a resolvable URL instead of the JS app.
const FB_UA = "facebookexternalhit/1.1";

// --- helpers ---------------------------------------------------------------
const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": " ", "&#039;": "'" };
const decode = (s) =>
  String(s ?? "")
    .replace(/&#0?39;|&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
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
// Operator is tagged in "[...]" (always an operator) or trailing "(...)" — but parens
// are also used for localities ("Agence El Hataba (Adrar)"), so a paren group counts
// as the operator only when it maps to a known carrier; otherwise it stays in the name.
function splitName(raw) {
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
function parseYalidine(html) {
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
const MAPS_LINK = /href="(https?:\/\/[^"]*(?:maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.com)[^"]*)"/;
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
    if (!code || !nm || !link) continue;
    const wm = decode(code[1]).match(/^(\d+)/);
    if (!wm) continue;
    const name = decode(nm[1]);
    const loc = localityOf(name);
    out.push({ id: `noest-${slug(code[1])}`, name: `Noest ${titleCase(name)}`, commune: titleCase(loc), cardWilaya: Number(wm[1]), address: orNull(addr ? addr[1] : null), link: link[1].trim() });
  }
  return out;
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
// (Warehouses overlap stop-desks; third-party "pickup points" are excluded — not Maystro's own.)
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

// Resolve a Google Maps link to its pin via the redirect a non-browser UA receives.
// Tries the canonical (!3d!4d), decimal place/search/q, DMS place, then a static-map pin.
async function resolveMapsLink(link) {
  let url = "", body = "";
  for (let attempt = 0; attempt < 2 && !url; attempt++) {
    try {
      const res = await fetch(link, { headers: { "User-Agent": FB_UA }, redirect: "follow" });
      url = decodeURIComponent(res.url || "");
      body = await res.text();
    } catch { /* network blip — retry once */ }
  }
  const order = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /\/maps\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/,
    /\/maps\/search\/(-?\d+\.\d+),\s*\+?\s*(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),\s*\+?\s*(-?\d+\.\d+)/,
  ];
  for (const p of order) {
    const m = url.match(p);
    if (m && inAlgeria(+m[1], +m[2])) return { lat: +m[1], lng: +m[2] };
  }
  const d = url.match(/\/maps\/place\/(\d+)°(\d+)'([\d.]+)"([NS]).*?(\d+)°(\d+)'([\d.]+)"([EW])/);
  if (d) {
    const lat = dmsToDec(d[1], d[2], d[3], d[4]), lng = dmsToDec(d[5], d[6], d[7], d[8]);
    if (inAlgeria(lat, lng)) return { lat, lng };
  }
  const sm = [...body.matchAll(/staticmap\?center=(-?\d+\.\d+)%2C(-?\d+\.\d+)&(?:amp;)?zoom=(\d+)/g)]
    .map((x) => ({ lat: +x[1], lng: +x[2], z: +x[3] }))
    .filter((x) => x.z >= 15 && inAlgeria(x.lat, x.lng))
    .sort((a, b) => b.z - a.z)[0];
  return sm ? { lat: sm.lat, lng: sm.lng } : null;
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

// Fetch a carded carrier's page, resolve every agency's Maps link to a pin, and return
// merge-ready records. Cards with no resolvable link are dropped; ids are de-collided
// deterministically so a desk keeps its suffix across runs.
async function buildCarded(label, url, parseFn, operator, minDesks = 60) {
  console.log(`Fetching ${label} agencies…`);
  const cards = parseFn(await getText(url));
  console.log(`  ${cards.length} cards; resolving Maps links…`);
  const coords = await mapPool(cards, 6, (c) => resolveMapsLink(c.link));
  const recs = [];
  let skipped = 0;
  cards.forEach((c, i) => {
    if (!coords[i]) { skipped++; return; }
    recs.push({ id: c.id, operator, name: c.name, address: c.address, commune: c.commune, wilaya_num: null, cardWilaya: c.cardWilaya, lat: coords[i].lat, lng: coords[i].lng, src: operator });
  });
  recs.sort((a, b) => a.id.localeCompare(b.id) || a.lat - b.lat || a.lng - b.lng);
  const seen = new Map();
  for (const r of recs) { const n = (seen.get(r.id) || 0) + 1; seen.set(r.id, n); if (n > 1) r.id = `${r.id}-${n}`; }
  console.log(`  ${recs.length} ${label} desks geocoded, ${skipped} skipped (no/unresolvable link)`);
  if (recs.length < minDesks) throw new Error(`only ${recs.length} ${label} desks resolved — Maps resolution may be blocked`);
  return recs;
}

// --- wilaya resolution (same as @geoalgeria/aviation) ----------------------
function loadCommunes() {
  if (!existsSync(DATASET)) {
    throw new Error(`geoalgeria commune data not found at ${DATASET} — run from the monorepo.`);
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
  // of the nearest (a duplicate/near-duplicate centroid across wilayas — e.g. the flagship
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
  // Neutralize spreadsheet formula injection per value — and per array element before
  // joining — even when the trigger char follows leading whitespace. Numbers pass through.
  const neutralize = (x) => (/^\s*[=+\-@\t\r]/.test(x) ? `'${x}` : x);
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return String(v);
    const s = Array.isArray(v) ? v.map((x) => neutralize(String(x))).join("|") : neutralize(String(v));
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}
function toGeoJSON(rows) {
  return {
    type: "FeatureCollection",
    features: rows
      .filter((r) => r.lat != null && r.lng != null)
      .map(({ lat, lng, ...props }) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: props,
      })),
  };
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
    throw new Error(`source under-returned (yalidine ${yal.length}, guepex ${guepex.length}) — possible partial fetch`);
  }

  if (unknownOperators.size) {
    throw new Error(`unknown operator tag(s) — add to carriers.seed.json + OPERATOR_VARIANTS: ${[...unknownOperators].join(", ")}`);
  }

  // Anderson, Noest & Maystro — independent carriers with their own agency networks, geocoded
  // by resolving the Google Maps link on each agency card (the carrier's own published pin).
  const anderson = await buildCarded("Anderson", ANDERSON_URL, parseAnderson, "anderson");
  const noest = await buildCarded("Noest", NOEST_URL, parseNoest, "noest");
  const maystro = await buildCarded("Maystro", MAYSTRO_URL, parseMaystro, "maystro", 30);

  // Merge by stop-desk id (union). Prefer Yalidine (richer addresses); fill from Guepex.
  // Folded-out operators are dropped; Anderson ids are namespaced so they never collide.
  const byId = new Map();
  for (const r of [...yal, ...guepex, ...anderson, ...noest, ...maystro].filter((x) => !DROPPED_OPERATORS.has(x.operator))) {
    const cur = byId.get(r.id);
    if (!cur) { byId.set(r.id, { ...r, sources: [r.src] }); continue; }
    if (!cur.sources.includes(r.src)) cur.sources.push(r.src);
    cur.address = cur.address || r.address;
    cur.commune = cur.commune || r.commune;
    cur.operator = cur.operator || r.operator;
    if (cur.wilaya_num == null) cur.wilaya_num = r.wilaya_num;
  }
  const merged = [...byId.values()];

  if (merged.length < 150) throw new Error(`only ${merged.length} stop-desks parsed — source layout may have changed`);

  console.log("Resolving wilaya_code by nearest commune centroid…");
  const communes = loadCommunes();
  // Cross-check the centroid result against Guepex's numeric wilaya id (where present).
  // A disagreement is expected when the desk's wilaya was promoted by the 2026 reform
  // (source ≤58 → flagship 59-69); a disagreement where BOTH are ≤58 is a real error.
  let promoted = 0;
  const conflicts = [];
  const droppedPins = [];
  const stopdesks = merged
    .map((r) => {
      const w = resolveWilaya(r.lat, r.lng, communes, r.wilaya_num ?? r.cardWilaya);
      if (r.wilaya_num != null && r.wilaya_num !== w.code) {
        if (w.code > 58) promoted++;
        else conflicts.push(`${r.id}(src ${r.wilaya_num}→${w.code})`);
      }
      // Carded sources (Anderson/Noest) declare their wilaya. If the resolved pin lands in
      // a DIFFERENT ≤58 wilaya (a wrong/duplicated Maps link), drop the desk rather than
      // ship a misplaced point. Reform promotions (→59-69) are expected and kept.
      if (r.cardWilaya != null && w.code <= 58 && w.code !== r.cardWilaya) {
        droppedPins.push(`${r.id}(card ${r.cardWilaya}→pin ${w.code})`);
        return null;
      }
      return {
        id: r.id,
        operator: r.operator,
        name: r.name,
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
  const bad = stopdesks.filter((s) => !s.operator || !s.name || s.wilaya_code < 1 || s.wilaya_code > 69 || !Number.isFinite(s.lat) || !Number.isFinite(s.lng));
  if (bad.length) throw new Error(`malformed stop-desks: ${bad.slice(0, 5).map((s) => s.id).join(", ")}`);
  const badCarrier = [...new Set(stopdesks.map((s) => s.operator))].filter((o) => !carrierIds.has(o));
  if (badCarrier.length) throw new Error(`stop-desk operators missing from registry: ${badCarrier.join(", ")}`);
  if (conflicts.length) throw new Error(`centroid wilaya conflicts with source (both ≤58): ${conflicts.join(", ")}`);
  if (promoted) console.log(`  ${promoted} desk(s) in wilayas promoted by the 2026 reform (source ≤58 → flagship 59-69)`);
  if (droppedPins.length) console.log(`  ${droppedPins.length} carded desk(s) dropped — pin in a different wilaya than the card (bad/duplicate link): ${droppedPins.slice(0, 6).join(", ")}${droppedPins.length > 6 ? "…" : ""}`);

  // coverage — per operator that has stop-desks
  const covMap = new Map();
  for (const s of stopdesks) {
    if (!covMap.has(s.operator)) covMap.set(s.operator, { wilayas: new Set(), communes: new Set(), n: 0 });
    const c = covMap.get(s.operator);
    c.n++;
    c.wilayas.add(s.wilaya_code);
    if (s.commune) c.communes.add(s.commune);
  }
  const nameById = new Map(seed.map((c) => [c.id, c.name]));
  const coverage = [...covMap.entries()]
    .map(([operator, c]) => ({
      operator,
      carrier_name: nameById.get(operator),
      stopdesks: c.n,
      wilaya_count: c.wilayas.size,
      wilayas: [...c.wilayas].sort((a, b) => a - b),
      commune_count: c.communes.size,
    }))
    .sort((a, b) => b.stopdesks - a.stopdesks || a.operator.localeCompare(b.operator));

  // carriers — seed augmented with derived stop-desk stats
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
  const metadata = {
    source: "Yalidine + Guepex federated stop-desk relay plus the Anderson, Noest and Maystro agency networks; carrier registry compiled by GeoAlgeria",
    origin_stopdesks: [YAL_URL, GUEPEX_URL, ANDERSON_URL, NOEST_URL, MAYSTRO_URL],
    carriers_source: "CourierDZ (github.com/PiteurStudio/CourierDZ) + carrier websites + GeoAlgeria recon",
    license: "Stop-desk data © the respective carriers; carrier registry compiled by GeoAlgeria. Redistributed for reference. See README.",
    carriers: carriers.length,
    stopdesks: stopdesks.length,
    coverage: coverage.length,
    stopdesks_geocoded: stopdesks.length,
    wilayas_covered: wilayasCovered,
    generated_at: new Date().toISOString().slice(0, 10),
  };

  mkdirSync(join(DATA, "csv"), { recursive: true });
  mkdirSync(join(DATA, "geojson"), { recursive: true });
  writeJSON("carriers.json", carriers);
  writeJSON("stopdesks.json", stopdesks);
  writeJSON("coverage.json", coverage);
  writeJSON("metadata.json", metadata);
  writeText("csv/carriers.csv", toCSV(carriers, ["id", "name", "website", "type", "cod", "scope", "open_agency_data", "api", "in_stopdesks", "stopdesk_count", "stopdesk_wilaya_count", "notes"]));
  writeText("csv/stopdesks.csv", toCSV(stopdesks, ["id", "operator", "name", "address", "commune", "wilaya_code", "lat", "lng", "sources"]));
  writeText("csv/coverage.csv", toCSV(coverage, ["operator", "carrier_name", "stopdesks", "wilaya_count", "wilayas", "commune_count"]));
  writeJSON("geojson/stopdesks.geojson", toGeoJSON(stopdesks));

  console.log(
    `\nWrote ${carriers.length} carriers, ${stopdesks.length} stop-desks ` +
      `(${carriers.filter((c) => c.in_stopdesks).length} carriers with open desks, ${wilayasCovered} wilayas), ` +
      `${coverage.length} coverage rows to ${DATA}.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
