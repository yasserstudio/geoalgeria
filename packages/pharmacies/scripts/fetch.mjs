#!/usr/bin/env node
/**
 * Build Algeria's pharmacies dataset from OpenStreetMap and emit JSON, CSV, and
 * GeoJSON to ../data. The raw source pull is cached under research/pharmacies/.
 *
 * Source:
 *   - OpenStreetMap (ODbL): amenity=pharmacy in Algeria. Wikidata carries
 *     essentially no geocoded Algerian pharmacies and there is no open official
 *     directory (the Ordre National des Pharmaciens site is down), so OSM is the
 *     sole source — published with honest partial-coverage framing (~3.8k real
 *     officines, after excluding an OSM bulk-import artifact, against an estimated
 *     ~11k nationally).
 *
 * OSM carries no commune/wilaya codes, so administrative linkage is attached by
 * nearest-centroid join against the flagship geoalgeria commune set (wilaya
 * effectively exact; commune best-effort). Useful contact tags (phone, hours,
 * operator) and a `dispensing` flag are kept where OSM has them.
 *
 * Usage: node scripts/fetch.mjs
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import https from "node:https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");
const REPO_ROOT = join(__dirname, "..", "..", "..");
const RESEARCH_DIR = join(REPO_ROOT, "research", "pharmacies");
// Approximate size of the national officine network for honest coverage framing.
// Deliberately round — a reference order-of-magnitude, not a claim of a registry.
const OFFICIAL_TOTAL = 11000;
// Sanity floor: a truncated upstream response parses fine and would otherwise be
// silently accepted as the whole dataset. Algeria has ~5.5k pharmacies in OSM;
// reject anything grossly below that and fall through to the next endpoint.
const OSM_MIN = 2500;
const UA = "geoalgeria-data/1.0 (+https://geoalgeria.com)";
const MAX_BYTES = 128 * 1024 * 1024;
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

// --- OpenStreetMap (sole source) -------------------------------------------
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const OSM_QUERY = `[out:json][timeout:300];
area["ISO3166-1"="DZ"][admin_level=2]->.dz;
(
  node["amenity"="pharmacy"](area.dz);
  way["amenity"="pharmacy"](area.dz);
  relation["amenity"="pharmacy"](area.dz);
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
          await sleep(4000 + attempt * 5000);
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
        await sleep(4000 + attempt * 5000);
      }
    }
  }
  throw new Error("Overpass unavailable on every endpoint — OSM is the sole source, so aborting rather than writing a partial dataset");
}

// --- helpers ---------------------------------------------------------------
const str = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const wcode = (n) => (Number.isInteger(n) && n > 0 ? String(n).padStart(2, "0") : null);
// True only for actual Arabic *letters* — excludes combining marks/punctuation.
const isArabic = (s) => typeof s === "string" && /[ء-يٱ-ۓۺ-ۿ]/.test(s);
const LEAD_MARKS = /^[̀-ͯؐ-ًؚ-ٰٟۖ-ۭ]+/;
const cleanName = (v) => {
  if (typeof v !== "string") return null;
  const x = v.replace(/\s+/g, " ").trim().replace(LEAD_MARKS, "").trim();
  return x.length >= 2 && /[A-Za-zء-يٱ-ۿ]/.test(x) ? x : null;
};
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

// OSM dispensing=yes/no -> boolean, else null (unknown).
function parseDispensing(t) {
  const d = (t.dispensing || "").toLowerCase();
  if (d === "yes") return true;
  if (d === "no") return false;
  return null;
}

// A single-line address from OSM addr:* tags, or null when none are present.
function parseAddress(t) {
  const line1 = [str(t["addr:housenumber"]), str(t["addr:street"]) || str(t["addr:place"])]
    .filter(Boolean)
    .join(" ");
  const line2 = [str(t["addr:city"]), str(t["addr:postcode"])].filter(Boolean).join(" ");
  const parts = [line1, line2].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function normOSM(elements) {
  const rows = [];
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!inAlgeria(lat, lng)) continue;
    const t = el.tags || {};
    const rawName = cleanName(t.name);
    const tagFr = cleanName(t["name:fr"]);
    const tagAr = cleanName(t["name:ar"]);
    // Route strictly by script so name_ar is always Arabic and name_fr always Latin,
    // even when OSM mis-tags them. Prefer the dedicated tag, then raw, then mis-tagged.
    const nameAr = (tagAr && isArabic(tagAr)) ? tagAr
      : (rawName && isArabic(rawName)) ? rawName
      : (tagFr && isArabic(tagFr)) ? tagFr
      : null;
    const nameFr = (tagFr && !isArabic(tagFr)) ? tagFr
      : (rawName && !isArabic(rawName)) ? rawName
      : (tagAr && !isArabic(tagAr)) ? tagAr
      : null;
    rows.push({
      source: "osm",
      osm_id: `${el.type}/${el.id}`,
      name: rawName || nameFr || nameAr,
      name_ar: nameAr,
      name_fr: nameFr,
      operator: cleanName(t.operator),
      phone: str(t.phone) || str(t["contact:phone"]) || str(t["contact:mobile"]),
      opening_hours: str(t.opening_hours),
      dispensing: parseDispensing(t),
      lat: Number(Number(lat).toFixed(6)),
      lng: Number(Number(lng).toFixed(6)),
      // node = surveyed point; way/relation = building centroid from `out center`.
      geo_precision: el.type === "node" ? "osm_node" : "osm_centroid",
      address: parseAddress(t),
    });
  }
  // Conservative internal de-dup: identical non-empty name within ~40 m (the same
  // pharmacy mapped as both a node and a building outline).
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

  // Second pass: collapse records at the exact same point (a pharmacy mapped twice
  // — a node and a building, or two spellings — that the name pass missed). Keep
  // the richest record.
  const richness = (r) =>
    (r.name ? 1 : 0) + (r.name_ar ? 1 : 0) + (r.name_fr ? 1 : 0) +
    (r.phone ? 1 : 0) + (r.opening_hours ? 1 : 0) + (r.address ? 1 : 0);
  const byPoint = new Map();
  const order = [];
  for (const r of kept) {
    const pk = `${r.lat},${r.lng}`;
    const prev = byPoint.get(pk);
    if (!prev) { byPoint.set(pk, r); order.push(pk); }
    else if (richness(r) > richness(prev)) byPoint.set(pk, r);
  }
  const deduped = order.map((pk) => byPoint.get(pk));
  const removed = kept.length - deduped.length;
  if (removed) console.log(`  OSM coord de-dup: ${removed} exact-coincident record(s)`);
  return dropBulkImports(deduped);
}

// Drop OSM bulk-import artifacts: a long run of consecutive-id, unnamed pharmacy
// *ways* packed into a tiny area is a machine dump, not real officines (e.g. the
// ~1,769-way import around Attatba/Tipaza that otherwise makes Tipaza the #1
// wilaya). Guarded three ways so legitimate mapping is never touched: the ids
// must be consecutive, the run must exceed a high floor, and it must be spatially
// tight. Real pharmacies are named and/or have non-adjacent ids spread across the
// country.
function dropBulkImports(rows) {
  const RUN_MIN = 20; // no real place is mapped as 20+ consecutive-id unnamed ways
  const MAX_SPAN = 0.5; // degrees (~55 km) — the whole run must sit in a tight box
  const ways = rows
    .map((r, i) => ({ i, lat: r.lat, lng: r.lng, id: r.osm_id.startsWith("way/") && !r.name ? Number(r.osm_id.slice(4)) : NaN }))
    .filter((x) => Number.isFinite(x.id))
    .sort((a, b) => a.id - b.id);
  const drop = new Set();
  let run = [];
  const flush = () => {
    if (run.length >= RUN_MIN) {
      const la = run.map((x) => x.lat);
      const lo = run.map((x) => x.lng);
      const tight = Math.max(...la) - Math.min(...la) < MAX_SPAN && Math.max(...lo) - Math.min(...lo) < MAX_SPAN;
      if (tight) for (const x of run) drop.add(x.i);
    }
    run = [];
  };
  for (const x of ways) {
    if (run.length && x.id - run[run.length - 1].id > 2) flush();
    run.push(x);
  }
  flush();
  if (drop.size) console.log(`  OSM bulk-import guard: dropped ${drop.size} consecutive-id unnamed-way artifact record(s)`);
  return rows.filter((_, i) => !drop.has(i));
}

// --- commune centroids + wilaya names (flagship geoalgeria) ----------------
function loadCommunes() {
  const wilayas = JSON.parse(
    readFileSync(join(REPO_ROOT, "packages", "dataset", "data", "algeria.json"), "utf-8"),
  );
  const communes = [];
  for (const w of wilayas) {
    for (const c of w.communes || []) {
      if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) {
        communes.push({
          wilaya_code: c.wilaya_code,
          wilaya_fr: w.name_fr,
          wilaya_ar: w.name_ar,
          commune_fr: c.name_fr,
          code_commune: c.code_commune,
          lat: c.latitude,
          lng: c.longitude,
        });
      }
    }
  }
  if (!communes.length) throw new Error("no commune centroids loaded — check packages/dataset/data/algeria.json");
  return communes;
}

function attachCommune(rows, communes) {
  for (const r of rows) {
    let best = null;
    let bestD = Infinity;
    const cosLat = Math.cos(r.lat * DEG);
    for (const c of communes) {
      const dx = (c.lng - r.lng) * cosLat;
      const dy = c.lat - r.lat;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = c; }
    }
    r.wilaya_code = wcode(best.wilaya_code);
    r.wilaya = best.wilaya_fr;
    r.wilaya_ar = best.wilaya_ar;
    r.commune = best.commune_fr;
    r.commune_code = best.code_commune;
  }
}

// Stable id `{wilaya_code}-{seq}`, seq ordered by osm_id so re-fetches are
// deterministic and ids stay put across rebuilds.
function assignIds(rows) {
  const byWilaya = new Map();
  for (const r of rows) {
    const w = r.wilaya_code || "00";
    if (!byWilaya.has(w)) byWilaya.set(w, []);
    byWilaya.get(w).push(r);
  }
  for (const [w, list] of byWilaya) {
    list.sort((a, b) => a.osm_id.localeCompare(b.osm_id));
    list.forEach((r, i) => {
      r.id = `${w}-${String(i + 1).padStart(5, "0")}`;
    });
  }
}

// --- writers ---------------------------------------------------------------
function toCSV(rows, cols) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    if (typeof v !== "number" && typeof v !== "boolean" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
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
// Reuse the cached raw pull (research/pharmacies/osm-raw.json) — a reproducible,
// offline rebuild that doesn't re-hit Overpass. Use: node scripts/fetch.mjs --cache
function readCache() {
  const p = join(RESEARCH_DIR, "osm-raw.json");
  const json = JSON.parse(readFileSync(p, "utf-8"));
  if (!Array.isArray(json.elements) || json.elements.length < OSM_MIN) {
    throw new Error(`cache ${p} missing or too small — run without --cache to refetch`);
  }
  console.log(`Using cached OSM pull: ${json.elements.length} elements`);
  return json.elements;
}

async function main() {
  const osmRaw = process.argv.includes("--cache") ? readCache() : await fetchOSM();
  let rows = normOSM(osmRaw);
  console.log(`  OSM: ${rows.length} geocoded pharmacies`);

  const communes = loadCommunes();
  console.log(`  ${communes.length} commune centroids loaded`);
  attachCommune(rows, communes);

  rows = rows.filter((r) => r.wilaya_code); // drop anything that failed the commune join (should be none)
  assignIds(rows);

  const cols = [
    "id", "source", "osm_id", "name", "name_ar", "name_fr",
    "operator", "phone", "opening_hours", "dispensing",
    "wilaya", "wilaya_ar", "wilaya_code", "commune", "commune_code", "address",
    "lat", "lng", "geo_precision",
  ];
  rows.sort((a, b) => a.id.localeCompare(b.id));

  const named = rows.filter((r) => r.name).length;
  const metadata = {
    source: "OpenStreetMap (ODbL) — pharmacies (amenity=pharmacy) in Algeria",
    origin: "https://www.openstreetmap.org",
    license:
      "OpenStreetMap data is © OpenStreetMap contributors, ODbL 1.0. See README for attribution.",
    pharmacies: rows.length,
    named,
    with_phone: rows.filter((r) => r.phone).length,
    with_hours: rows.filter((r) => r.opening_hours).length,
    with_address: rows.filter((r) => r.address).length,
    with_dispensing: rows.filter((r) => r.dispensing !== null).length,
    wilayas_covered: new Set(rows.map((r) => r.wilaya_code).filter(Boolean)).size,
    pharmacies_geocoded: rows.filter((r) => r.lat != null).length,
    official_total: OFFICIAL_TOTAL,
    coverage_note:
      `${rows.length} pharmacies compiled from OpenStreetMap, against an estimated ~${OFFICIAL_TOTAL} officines nationally (order-of-magnitude, no open official registry). A community-maintained extract — coverage is partial and uneven by wilaya, denser in the north.`,
    linkage_note:
      "Commune/wilaya linkage is derived by nearest-centroid join against the geoalgeria commune set; wilaya is effectively exact, commune is best-effort.",
    generated_at: new Date().toISOString().slice(0, 10),
  };

  mkdirSync(join(OUT_DIR, "csv"), { recursive: true });
  mkdirSync(join(OUT_DIR, "geojson"), { recursive: true });
  writeJSON("pharmacies.json", rows);
  writeText("csv/pharmacies.csv", toCSV(rows, cols));
  writeJSON("geojson/pharmacies.geojson", toGeoJSON(rows));
  writeJSON("metadata.json", metadata);
  console.log(
    `Wrote ${rows.length} pharmacies (${named} named, ${metadata.wilayas_covered} wilayas) — ` +
      `${metadata.with_phone} with phone, ${metadata.with_hours} with hours, ${metadata.with_address} with address.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
