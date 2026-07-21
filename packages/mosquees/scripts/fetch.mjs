#!/usr/bin/env node
/**
 * Build Algeria's mosque dataset as a Wikidata + OpenStreetMap composite and
 * emit JSON, CSV, and GeoJSON to ../data. Raw source pulls are cached under
 * research/mosquees/.
 *
 * Sources:
 *   - Wikidata (CC0): every item that is an instance of (a subclass of) "mosque"
 *     (Q32815) located in Algeria (P17=Q262), with its coordinate (P625). This
 *     is the comprehensive base — ~19k geocoded mosques, near the Ministry of Religious Affairs (MARW) national count of ~18,449.
 *   - OpenStreetMap (ODbL): amenity=place_of_worship + religion=muslim in
 *     Algeria. Adds precise coordinates, French names, and denomination, plus
 *     mosques Wikidata does not yet have.
 *
 * Merge: Wikidata is the canonical base. An OSM mosque within ~150 m of a
 * Wikidata mosque is treated as the same place and folded in (it lends its
 * French name / denomination / osm_id). OSM mosques with no Wikidata match
 * within 150 m are added as their own records. Each record carries a `source`
 * of "wikidata", "osm", or "wikidata+osm".
 *
 * Neither source carries commune/wilaya codes, so administrative linkage is
 * attached by nearest-centroid join against the flagship geoalgeria commune set
 * (wilaya effectively exact; commune best-effort).
 *
 * Usage: node scripts/fetch.mjs            # live pull
 *        node scripts/fetch.mjs --cache    # rebuild from research/mosquees/{wikidata,osm}-raw.json
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import https from "node:https";
import { MIGRATIONS, writePackageV2, committedDates, carryOverIds, readCommitted } from "../../../scripts/lib/v2-transforms.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");
const REPO_ROOT = join(__dirname, "..", "..", "..");
const RESEARCH_DIR = join(REPO_ROOT, "research", "mosquees");
const OFFICIAL_TOTAL = 18449; // MARW mosque count (national), for honest coverage framing
const MATCH_M = 150; // OSM↔Wikidata "same mosque" proximity threshold (metres)
// Sanity floors: a valid-but-truncated upstream response (a proxy returning a
// partial page) parses fine and would otherwise be silently accepted as the
// whole dataset. Reject anything grossly below the known order of magnitude
// (~19k Wikidata, ~7.9k OSM) and fall through to a retry / next endpoint.
const WD_MIN = 5000;
const OSM_MIN = 1000;
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

function httpRequest(url, { method = "GET", headers = {}, body = null, depth = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(u, { method, headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.destroy();
        if (depth >= MAX_REDIRECTS) return reject(new Error(`${url} -> too many redirects`));
        try {
          return resolve(httpRequest(safeRedirect(res.headers.location, url), { method, headers, body, depth: depth + 1 }));
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

// --- Wikidata (base) -------------------------------------------------------
const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const WD_QUERY = `SELECT ?item ?itemLabel ?arLabel ?frLabel ?coord WHERE {
  ?item wdt:P31/wdt:P279* wd:Q32815 .
  ?item wdt:P17 wd:Q262 .
  ?item wdt:P625 ?coord .
  OPTIONAL { ?item rdfs:label ?arLabel FILTER(LANG(?arLabel)="ar") }
  OPTIONAL { ?item rdfs:label ?frLabel FILTER(LANG(?frLabel)="fr") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,ar,en". }
}`;

async function fetchWikidata() {
  const body = "query=" + encodeURIComponent(WD_QUERY);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(`Querying Wikidata SPARQL (attempt ${attempt + 1})…`);
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
      if (status !== 200) {
        console.warn(`  HTTP ${status}; retrying…`);
        await sleep(4000 + attempt * 4000);
        continue;
      }
      const json = JSON.parse(out);
      const bindings = json.results?.bindings || [];
      if (bindings.length >= WD_MIN) {
        mkdirSync(RESEARCH_DIR, { recursive: true });
        writeFileSync(join(RESEARCH_DIR, "wikidata-raw.json"), JSON.stringify(json) + "\n");
        return bindings;
      }
      console.warn(`  only ${bindings.length} bindings (< ${WD_MIN}); treating as partial, retrying…`);
    } catch (e) {
      console.warn(`  err: ${e.message}; retrying…`);
      await sleep(4000 + attempt * 4000);
    }
  }
  throw new Error("Wikidata query failed (the comprehensive base is required)");
}

// --- OpenStreetMap (enrichment) --------------------------------------------
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const OSM_QUERY = `[out:json][timeout:300];
area["ISO3166-1"="DZ"][admin_level=2]->.dz;
(
  node["amenity"="place_of_worship"]["religion"="muslim"](area.dz);
  way["amenity"="place_of_worship"]["religion"="muslim"](area.dz);
  relation["amenity"="place_of_worship"]["religion"="muslim"](area.dz);
);
out center tags;`;

async function fetchOSM() {
  const body = "data=" + encodeURIComponent(OSM_QUERY);
  for (const ep of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`Querying Overpass: ${ep} (attempt ${attempt + 1})…`);
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
        if (status !== 200) {
          console.warn(`  HTTP ${status}; trying next…`);
          await sleep(3000 + attempt * 4000);
          continue;
        }
        const json = JSON.parse(out);
        if (Array.isArray(json.elements) && json.elements.length >= OSM_MIN) {
          mkdirSync(RESEARCH_DIR, { recursive: true });
          writeFileSync(join(RESEARCH_DIR, "osm-raw.json"), JSON.stringify(json) + "\n");
          return json.elements;
        }
        console.warn(`  only ${json.elements?.length ?? 0} elements (< ${OSM_MIN}); treating as partial, trying next…`);
      } catch (e) {
        console.warn(`  err: ${e.message}; trying next…`);
        await sleep(3000 + attempt * 4000);
      }
    }
  }
  console.warn("  OSM enrichment unavailable — building from Wikidata only.");
  return [];
}

// --- helpers ---------------------------------------------------------------
const str = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const wcode = (n) => (Number.isInteger(n) && n > 0 ? String(n).padStart(2, "0") : null);
const isArabic = (s) => typeof s === "string" && /[؀-ۿ]/.test(s);
const isQid = (s) => typeof s === "string" && /^Q\d+$/.test(s);
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

const DENOM = new Map([
  ["sunni", "sunni"], ["سني", "sunni"], ["مسجد_سني", "sunni"], ["مسجد_السنة", "sunni"],
  ["أَهْلُ_السُّنَّةِ_وَالجَمَاعَة", "sunni"], ["ibadi", "ibadi"], ["sufi", "sufi"],
]);
const normDenom = (v) =>
  v == null ? null : DENOM.get(String(v).trim().toLowerCase()) ?? DENOM.get(String(v).trim()) ?? null;

function normWikidata(bindings) {
  const byId = new Map();
  for (const x of bindings) {
    const qid = x.item.value.split("/").pop();
    if (byId.has(qid)) continue;
    const m = x.coord?.value.match(/Point\(([-0-9.]+) ([-0-9.]+)\)/);
    if (!m) continue;
    const lng = Number(m[1]);
    const lat = Number(m[2]);
    if (!inAlgeria(lat, lng)) continue;
    const itemLabel = isQid(x.itemLabel?.value) ? null : str(x.itemLabel?.value);
    const nameAr = str(x.arLabel?.value) || (isArabic(itemLabel) ? itemLabel : null);
    const nameFr = str(x.frLabel?.value) || (itemLabel && !isArabic(itemLabel) ? itemLabel : null);
    byId.set(qid, {
      source: "wikidata",
      wikidata: qid,
      osm_id: null,
      name: nameFr || nameAr || itemLabel,
      name_ar: nameAr,
      name_fr: nameFr,
      denomination: null,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    });
  }
  // collapse exact-coordinate duplicates (same mosque entered twice)
  const seen = new Set();
  const out = [];
  for (const r of byId.values()) {
    const k = `${r.lat},${r.lng}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function normOSM(elements) {
  const rows = [];
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!inAlgeria(lat, lng)) continue;
    const t = el.tags || {};
    const rawName = str(t.name);
    const nameAr = str(t["name:ar"]) || (isArabic(rawName) ? rawName : null);
    const nameFr = str(t["name:fr"]) || (rawName && !isArabic(rawName) ? rawName : null);
    rows.push({
      source: "osm",
      wikidata: str(t.wikidata),
      osm_id: `${el.type}/${el.id}`,
      name: rawName || nameFr || nameAr,
      name_ar: nameAr,
      name_fr: nameFr,
      denomination: normDenom(t.denomination),
      lat: Number(Number(lat).toFixed(6)),
      lng: Number(Number(lng).toFixed(6)),
    });
  }
  // conservative internal de-dup: identical non-empty name within ~40 m
  const kept = [];
  let dropped = 0;
  for (const r of rows) {
    if (!r.name) { kept.push(r); continue; }
    const key = r.name.trim().toLowerCase();
    const cosLat = Math.cos(r.lat * DEG);
    const dup = kept.some((k) => {
      if (!k.name || k.name.trim().toLowerCase() !== key) return false;
      const dx = (k.lng - r.lng) * cosLat * M_PER_DEG;
      const dy = (k.lat - r.lat) * M_PER_DEG;
      return dx * dx + dy * dy <= 40 * 40;
    });
    if (dup) dropped++;
    else kept.push(r);
  }
  if (dropped) console.log(`  OSM internal de-dup: ${dropped} same-name-within-40m record(s)`);
  return kept;
}

// --- spatial merge (Wikidata base ← OSM) -----------------------------------
const CELL = 0.005; // ~500 m grid for candidate lookup
const cellKey = (lat, lng) => `${Math.floor(lat / CELL)}:${Math.floor(lng / CELL)}`;

function mergeOSMintoWikidata(wd, osm) {
  const grid = new Map();
  wd.forEach((r, i) => {
    const k = cellKey(r.lat, r.lng);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  });

  const additions = [];
  let merged = 0;
  for (const o of osm) {
    // explicit wikidata cross-link on the OSM object takes precedence
    let bestIdx = -1;
    let bestD = Infinity;
    const baseLat = Math.floor(o.lat / CELL);
    const baseLng = Math.floor(o.lng / CELL);
    const cosLat = Math.cos(o.lat * DEG);
    for (let dlat = -1; dlat <= 1; dlat++) {
      for (let dlng = -1; dlng <= 1; dlng++) {
        const cand = grid.get(`${baseLat + dlat}:${baseLng + dlng}`);
        if (!cand) continue;
        for (const idx of cand) {
          const w = wd[idx];
          if (o.wikidata && w.wikidata === o.wikidata) { bestIdx = idx; bestD = 0; break; }
          const dx = (w.lng - o.lng) * cosLat * M_PER_DEG;
          const dy = (w.lat - o.lat) * M_PER_DEG;
          const d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; bestIdx = idx; }
        }
      }
    }
    if (bestIdx >= 0 && bestD <= MATCH_M * MATCH_M) {
      const w = wd[bestIdx];
      w.name_fr = w.name_fr || o.name_fr;
      w.name_ar = w.name_ar || o.name_ar;
      w.name = w.name || o.name;
      w.denomination = w.denomination || o.denomination;
      w.osm_id = w.osm_id || o.osm_id;
      if (w.source === "wikidata") { w.source = "wikidata+osm"; merged++; }
    } else {
      additions.push(o);
    }
  }
  console.log(`  merged ${merged} OSM↔Wikidata matches; ${additions.length} OSM-only additions`);
  return [...wd, ...additions];
}

// --- commune centroids (flagship geoalgeria) -------------------------------
function loadCommunes() {
  const dir = join(REPO_ROOT, "packages", "dataset", "data");
  const files = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"];
  const communes = [];
  for (const f of files) {
    for (const c of JSON.parse(readFileSync(join(dir, f), "utf-8"))) {
      if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) communes.push(c);
    }
  }
  if (!communes.length) throw new Error("no commune centroids loaded — check packages/dataset/data");
  return communes;
}
function attachCommune(rows, communes) {
  for (const r of rows) {
    let best = null;
    let bestD = Infinity;
    const cosLat = Math.cos(r.lat * DEG);
    for (const c of communes) {
      const dx = (c.longitude - r.lng) * cosLat;
      const dy = c.latitude - r.lat;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = c; }
    }
    r.wilaya_code = wcode(best.wilaya_code);
    r.commune_code = best.code_commune;
    r.commune = best.name_fr;
  }
}

// Stable id `{wilaya_code}-{seq}`, seq ordered by source key so re-fetches are deterministic.
function assignIds(rows) {
  const sortKey = (r) => r.wikidata || r.osm_id || "";
  const byWilaya = new Map();
  for (const r of rows) {
    const w = r.wilaya_code || "00";
    if (!byWilaya.has(w)) byWilaya.set(w, []);
    byWilaya.get(w).push(r);
  }
  for (const [w, list] of byWilaya) {
    list.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    list.forEach((r, i) => {
      r.id = `${w}-${String(i + 1).padStart(4, "0")}`;
    });
  }
}

// --- main ------------------------------------------------------------------
async function main() {
  // Offline replay: rebuild from the committed Wikidata + OSM pulls with no network.
  const OFFLINE = process.argv.includes("--cache");
  const wdRaw = OFFLINE
    ? JSON.parse(readFileSync(join(RESEARCH_DIR, "wikidata-raw.json"), "utf-8")).results.bindings
    : await fetchWikidata();
  const wd = normWikidata(wdRaw);
  console.log(`  Wikidata: ${wd.length} geocoded mosques (base)`);

  const osmRaw = OFFLINE
    ? JSON.parse(readFileSync(join(RESEARCH_DIR, "osm-raw.json"), "utf-8")).elements
    : await fetchOSM();
  const osm = normOSM(osmRaw);
  console.log(`  OSM: ${osm.length} geocoded mosques (enrichment)`);

  let rows = mergeOSMintoWikidata(wd, osm);

  const communes = loadCommunes();
  console.log(`  ${communes.length} commune centroids loaded`);
  attachCommune(rows, communes);

  rows = rows.filter((r) => r.wilaya_code); // drop anything that failed the commune join (should be none)
  assignIds(rows);

  // Emit v2 via the shared writer. Carry ids over by the stable OSM/Wikidata id so
  // the commune re-scoping shows up as corrected wilaya/commune, not id churn.
  const cfg = MIGRATIONS.mosquees;
  const today = new Date().toISOString().slice(0, 10);
  const { updated, retrieved } = OFFLINE ? committedDates(OUT_DIR) : { updated: today, retrieved: today };
  const v2 = rows.map(cfg.map);
  carryOverIds(v2, readCommitted(OUT_DIR, "mosquees.json"), (r) =>
    r.refs?.osm ? `osm:${r.refs.osm}` : r.refs?.wikidata ? `wd:${r.refs.wikidata}` : null,
    "mosquees",
  );
  const { records, metadata } = writePackageV2({
    pkg: "mosquees",
    dir: OUT_DIR,
    files: [{ file: "mosquees.json", rows: v2 }],
    meta: cfg.meta,
    updated,
    retrieved,
  });
  console.log(`Wrote ${records.length} mosques → v2 (${metadata.named} named, ${metadata.wilayas_covered} wilayas).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
