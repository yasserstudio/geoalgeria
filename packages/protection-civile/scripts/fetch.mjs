#!/usr/bin/env node
/**
 * Build Algeria's Protection Civile (civil protection / fire & rescue) units
 * dataset from the DGPC's own published GeoJSON and emit JSON, CSV, and GeoJSON
 * to ../data. The raw source pull is cached under research/protection-civile/.
 *
 * Source (official-primary): the Direction Générale de la Protection Civile
 * publishes its national unit network as a point GeoJSON at
 * https://dgpc.dz/dgpc2/unite.geojson — 880 units, each with an Arabic name
 * (nom_ar), an address, phone/fax, a status tier (statut), a commune name
 * (commune_1) and a decimal x/y coordinate. This is the authoritative
 * "this unit exists here" source (evidence_type "official").
 *
 * The DGPC's own cod_wilaya is pre-2026-reform (codes "01".."58"), so it is NOT
 * trusted for wilaya_code: every unit's wilaya is re-derived by point-in-polygon
 * against the repo's 69 post-reform wilaya boundaries, so units now inside the 11
 * new 2026 wilayas (59..69) carry their correct new code. The DGPC's published
 * code is kept verbatim in refs.dgpc_wilaya as a receipt. Commune is best-effort:
 * the Arabic commune_1 name is matched against the flagship geoalgeria commune set
 * within the derived wilaya (nearest-centroid fallback). The source carries no
 * French name, so name_fr is left unset — nothing is machine-translated.
 *
 * Usage: node scripts/fetch.mjs            # live pull from dgpc.dz
 *        node scripts/fetch.mjs --cache    # rebuild from research/protection-civile/dgpc-unite-raw.geojson
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import https from "node:https";
import { round6, loadBoundaries, pointInGeometry } from "@geoalgeria/schema";
import {
  MIGRATIONS,
  writePackageV2,
  resolveDates,
  carryOverIds,
  readCommitted,
  readCacheFile,
} from "../../../scripts/lib/v2-transforms.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");
const REPO_ROOT = join(__dirname, "..", "..", "..");
const RESEARCH_DIR = join(REPO_ROOT, "research", "protection-civile");
const SRC_URL = "https://dgpc.dz/dgpc2/unite.geojson";
const RAW_FILE = "dgpc-unite-raw.geojson";
// Sanity floor: a truncated response parses fine and would otherwise be accepted
// as the whole network. The published set is 880 units — reject anything well below.
const MIN_FEATURES = 700;
// dgpc.dz serves the file only to a browser User-Agent (a bare CLI UA is blocked).
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MAX_BYTES = 32 * 1024 * 1024;
const DEG = Math.PI / 180;

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

function httpRequest(url, { method = "GET", headers = {}, depth = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(u, { method, headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.destroy();
        if (depth >= MAX_REDIRECTS) return reject(new Error(`${url} -> too many redirects`));
        try {
          return resolve(httpRequest(safeRedirect(res.headers.location, url), { method, headers, depth: depth + 1 }));
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
    req.setTimeout(120_000, () => req.destroy(new Error(`${url} -> timed out`)));
    req.end();
  });
}

async function fetchDGPC() {
  console.log(`Fetching DGPC units: ${SRC_URL} …`);
  const { status, body } = await httpRequest(SRC_URL, {
    headers: { "User-Agent": BROWSER_UA, Accept: "application/geo+json,application/json,*/*" },
  });
  if (status !== 200) throw new Error(`${SRC_URL} -> HTTP ${status}`);
  const json = JSON.parse(body);
  if (!Array.isArray(json.features) || json.features.length < MIN_FEATURES)
    throw new Error(`DGPC returned ${json.features?.length ?? 0} features (< ${MIN_FEATURES}); treating as partial`);
  mkdirSync(RESEARCH_DIR, { recursive: true });
  writeFileSync(join(RESEARCH_DIR, RAW_FILE), JSON.stringify(json) + "\n");
  console.log(`  ${json.features.length} unit features`);
  return json.features;
}

function readCache() {
  const json = JSON.parse(readCacheFile(RESEARCH_DIR, RAW_FILE, "protection-civile"));
  if (!Array.isArray(json.features) || json.features.length < MIN_FEATURES)
    throw new Error(`cache ${RAW_FILE} missing or too small — run without --cache to refetch`);
  console.log(`Using cached DGPC pull: ${json.features.length} unit features`);
  return json.features;
}

// --- text normalization ----------------------------------------------------
const str = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
// The DGPC address joins the street line and the commune with an underscore
// ("CITE 60LOGEMENTS_AIN TEDLES"); render it as a readable comma-separated line.
const cleanAddress = (v) => {
  const s = str(v);
  return s ? s.replace(/_+/g, ", ").replace(/\s+/g, " ").trim() : null;
};
// Phone/fax: drop internal whitespace and stray separators, keep digits/+().-.
const cleanTel = (v) => {
  const s = str(v);
  return s ? s.replace(/\s+/g, "") : null;
};
// Arabic name folding for commune matching (strip diacritics/tatweel, fold
// alef/ya/ta-marbuta variants) — same recipe as the sante generator.
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
const inBox = (lng, lat) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

// --- reference geography (repo boundaries + flagship commune set) -----------
function loadBoundaryIndex() {
  const fc = JSON.parse(
    readFileSync(join(REPO_ROOT, "packages", "dataset", "data", "geojson", "wilaya-boundaries.geojson"), "utf-8"),
  );
  return loadBoundaries(fc);
}

// Commune centroids grouped by post-reform wilaya code, plus a flat list for the
// nearest-wilaya fallback. Names carry a folded Arabic form for name matching.
function loadCommunes() {
  const wilayas = JSON.parse(
    readFileSync(join(REPO_ROOT, "packages", "dataset", "data", "algeria.json"), "utf-8"),
  );
  const byWilaya = new Map();
  const all = [];
  for (const w of wilayas) {
    for (const c of w.communes || []) {
      if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) continue;
      const wc = String(c.wilaya_code).padStart(2, "0");
      const entry = {
        wilaya_code: wc,
        name_fr: c.name_fr,
        name_ar_norm: normAr(c.name_ar),
        code_commune: c.code_commune,
        lat: c.latitude,
        lng: c.longitude,
      };
      if (!byWilaya.has(wc)) byWilaya.set(wc, []);
      byWilaya.get(wc).push(entry);
      all.push(entry);
    }
  }
  if (!all.length) throw new Error("no commune centroids loaded — check packages/dataset/data/algeria.json");
  return { byWilaya, all };
}

function nearestWilaya(lng, lat, communes) {
  let best = null, bestD = Infinity;
  const cosLat = Math.cos(lat * DEG);
  for (const c of communes.all) {
    const dx = (c.lng - lng) * cosLat;
    const dy = c.lat - lat;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best.wilaya_code;
}

// Point-in-polygon over the 69 post-reform boundaries. Exactly one containing
// wilaya is the normal case; 0 (a border-adjacent point just outside a simplified
// outline) or >1 (overlapping simplified outlines) fall back to the nearest
// commune centroid's wilaya, which disambiguates a genuine border point.
function assignWilaya(lng, lat, boundaries, communes, stats) {
  const inside = [];
  for (const [code, geom] of boundaries) if (pointInGeometry(lng, lat, geom)) inside.push(code);
  if (inside.length === 1) { stats.wilaya_polygon++; return inside[0]; }
  stats.wilaya_fallback++;
  return nearestWilaya(lng, lat, communes);
}

// Commune within the derived wilaya: first an exact folded-Arabic name match on
// commune_1, else the nearest commune centroid in that wilaya (best-effort).
function assignCommune(commune1, wcode, lng, lat, communes, stats) {
  const list = communes.byWilaya.get(wcode);
  if (!list || !list.length) return null;
  const key = normAr(commune1);
  if (key) {
    const hit = list.find((c) => c.name_ar_norm === key);
    if (hit) { stats.commune_name++; return hit; }
  }
  let best = null, bestD = Infinity;
  const cosLat = Math.cos(lat * DEG);
  for (const c of list) {
    const dx = (c.lng - lng) * cosLat;
    const dy = c.lat - lat;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = c; }
  }
  stats.commune_centroid++;
  return best;
}

// --- normalize DGPC features into internal rows ----------------------------
function normalize(features, boundaries, communes, stats) {
  const rows = [];
  for (const f of features) {
    const p = f.properties || {};
    let lng = round6(Number(p.x));
    let lat = round6(Number(p.y));
    // One record (objectid 876) has x/y transposed while its GeoJSON geometry is
    // correct; recover it when the plain pair is out of the box but the swap is in.
    if (!inBox(lng, lat) && inBox(lat, lng)) { [lng, lat] = [lat, lng]; stats.swapped++; }
    if (!inBox(lng, lat)) { stats.dropped_oob++; continue; }

    const wilaya_code = assignWilaya(lng, lat, boundaries, communes, stats);
    const commune = assignCommune(p.commune_1, wilaya_code, lng, lat, communes, stats);
    rows.push({
      objectid: p.objectid,
      cod_wilaya: str(p.cod_wilaya),
      statut: str(p.statut),
      name_ar: str(p.nom_ar),
      address: cleanAddress(p.adresse),
      tel: cleanTel(p.tel),
      fax: cleanTel(p.fax),
      wilaya_code,
      commune_code: commune ? commune.code_commune : null,
      commune: commune ? commune.name_fr : null,
      lat,
      lng,
    });
  }
  return rows;
}

// Stable id `{wilaya_code}-{seq}`, seq ordered by the DGPC objectid so re-fetches
// are deterministic and ids stay put across rebuilds.
function assignIds(rows) {
  const byWilaya = new Map();
  for (const r of rows) {
    if (!byWilaya.has(r.wilaya_code)) byWilaya.set(r.wilaya_code, []);
    byWilaya.get(r.wilaya_code).push(r);
  }
  for (const [w, list] of byWilaya) {
    list.sort((a, b) => a.objectid - b.objectid);
    list.forEach((r, i) => { r.id = `${w}-${String(i + 1).padStart(3, "0")}`; });
  }
}

// --- main ------------------------------------------------------------------
async function main() {
  const OFFLINE = process.argv.includes("--cache");
  const features = OFFLINE ? readCache() : await fetchDGPC();

  const boundaries = loadBoundaryIndex();
  const communes = loadCommunes();
  const stats = {
    swapped: 0, dropped_oob: 0, wilaya_polygon: 0, wilaya_fallback: 0,
    commune_name: 0, commune_centroid: 0,
  };
  const rows = normalize(features, boundaries, communes, stats);
  console.log(
    `  normalized ${rows.length} units (${stats.wilaya_polygon} wilaya by polygon, ` +
      `${stats.wilaya_fallback} by nearest, ${stats.swapped} coord swap fixed, ${stats.dropped_oob} dropped OOB)`,
  );
  console.log(`  commune: ${stats.commune_name} by name, ${stats.commune_centroid} by nearest centroid`);

  assignIds(rows);

  // Emit v2 via the shared writer. Carry ids over by the stable DGPC objectid so a
  // regeneration reproduces the same public join keys rather than re-sequencing.
  const cfg = MIGRATIONS["protection-civile"];
  const { updated, retrieved } = resolveDates(OUT_DIR, OFFLINE);
  const v2 = rows.map(cfg.map);
  carryOverIds(v2, readCommitted(OUT_DIR, "protection-civile.json"), (r) =>
    r.refs?.dgpc ? `dgpc:${r.refs.dgpc}` : null,
    "protection-civile",
  );
  const { records: out, metadata } = writePackageV2({
    pkg: "protection-civile",
    dir: OUT_DIR,
    files: [{ file: "protection-civile.json", rows: v2 }],
    meta: cfg.meta,
    updated,
    retrieved,
  });
  console.log(
    `Wrote ${out.length} units → v2 (${metadata.wilayas_covered} wilayas, ` +
      `${metadata.precision.exact} exact / ${metadata.precision.approximate} approximate).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
