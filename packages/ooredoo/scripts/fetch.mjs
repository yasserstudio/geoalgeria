#!/usr/bin/env node
/**
 * Build the Ooredoo Algérie retail network (Espaces Ooredoo / City Shops /
 * Espaces Services) from the operator's public "Trouvez-nous" JSON API, and emit
 * JSON, CSV, and GeoJSON to ../data. The raw pull is cached under research/ooredoo/.
 *
 * Source: Ooredoo Algérie — Liferay Headless "Objects" API behind
 *   https://www.ooredoo.dz/fr/particuliers/trouvez-nous
 *   - token:  POST /o/oauth2/token  (public client-credentials embedded in the
 *             page and served to every browser — not secrets, same status as the
 *             djezzy inline JSON / mobilis /map API)
 *   - stores: GET  /o/c/stores/?pageSize=…&page=…  (Bearer token)
 *   Each record carries a real lat/lng and the operator's own villaya/commune
 *   codes; we reconcile the wilaya to the flagship geoalgeria scheme by name and
 *   best-effort a commune code. geo_precision is "exact" (surveyed API points).
 *
 * Usage: node scripts/fetch.mjs            # live pull
 *        node scripts/fetch.mjs --cache    # rebuild from research/ooredoo/stores-raw.json
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import https from "node:https";
import { MIGRATIONS, writePackageV2, resolveDates } from "../../../scripts/lib/v2-transforms.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");
const REPO_ROOT = join(__dirname, "..", "..", "..");
const RESEARCH_DIR = join(REPO_ROOT, "research", "ooredoo");

const BASE = "https://www.ooredoo.dz";
// Public client-credentials embedded in the "Trouvez-nous" page (served to every
// browser — not secrets). Documented in research/ooredoo/SOURCE.md.
const CLIENT_ID = "id-7472c3ce-ff72-e3dc-886a-687f3efdc75";
const CLIENT_SECRET = "secret-51784c2a-3c2f-ea38-586b-7283faae14d";
const UA = "geoalgeria-data/1.0 (+https://geoalgeria.com)";
const MIN_STORES = 300; // sanity floor — reject a truncated pull
const MAX_BYTES = 64 * 1024 * 1024;

// Store type: API `type.key` (eO/cSO/eSO) -> code + bilingual label.
const TYPES = {
  eo: { code: "EO", fr: "Espace Ooredoo", ar: "فضاء أوريدو" },
  cso: { code: "CSO", fr: "City Shop Ooredoo", ar: "متجر أوريدو" },
  eso: { code: "ESO", fr: "Espace Services Ooredoo", ar: "فضاء خدمات أوريدو" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const deaccent = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const cnorm = (s) => deaccent(s).replace(/[^A-Za-z0-9]+/g, " ").trim().toUpperCase();
const str = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const wcode = (n) => (Number.isInteger(n) && n > 0 && n <= 69 ? String(n).padStart(2, "0") : null);
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;
// Title-case a SHOUTED place name ("ROUIBA" -> "Rouiba", "AIN DEFLA" -> "Ain Defla").
const titleCase = (s) =>
  !s ? null : s.toLowerCase().replace(/(^|[\s'-])([a-zà-ÿ])/g, (_, sep, c) => sep + c.toUpperCase());

// --- generic HTTPS ---------------------------------------------------------
function httpRequest(url, { method = "GET", headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(new URL(url), { method, headers }, (res) => {
      res.setEncoding("utf8");
      let data = "";
      res.on("data", (c) => {
        data += c;
        if (data.length > MAX_BYTES) { res.destroy(); reject(new Error(`${url} -> response too large`)); }
      });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.setTimeout(120_000, () => req.destroy(new Error(`${url} -> timed out`)));
    if (body) req.write(body);
    req.end();
  });
}

// --- Ooredoo API -----------------------------------------------------------
async function getToken() {
  const body =
    `grant_type=client_credentials&client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&client_secret=${encodeURIComponent(CLIENT_SECRET)}`;
  const { status, body: out } = await httpRequest(`${BASE}/o/oauth2/token`, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
      Accept: "application/json",
    },
    body,
  });
  if (status !== 200) throw new Error(`token endpoint HTTP ${status}`);
  const tok = JSON.parse(out).access_token;
  if (!tok) throw new Error("no access_token in token response");
  return tok;
}

async function fetchStores() {
  const token = await getToken();
  const headers = {
    "User-Agent": UA,
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Accept-Language": "fr-FR",
  };
  const items = [];
  let page = 1;
  let total = Infinity;
  while (items.length < total && page <= 30) {
    const { status, body } = await httpRequest(`${BASE}/o/c/stores/?pageSize=300&page=${page}`, { headers });
    if (status !== 200) throw new Error(`stores page ${page} HTTP ${status}`);
    const json = JSON.parse(body);
    total = Number(json.totalCount ?? json.items?.length ?? 0);
    const batch = json.items || [];
    if (!batch.length) break;
    items.push(...batch);
    page += 1;
    await sleep(400);
  }
  if (items.length < MIN_STORES) {
    throw new Error(`only ${items.length} stores (< ${MIN_STORES}) — refusing to write a partial dataset`);
  }
  mkdirSync(RESEARCH_DIR, { recursive: true });
  writeFileSync(join(RESEARCH_DIR, "stores-raw.json"), JSON.stringify({ totalCount: total, items }) + "\n");
  return items;
}

function readCache() {
  const p = join(RESEARCH_DIR, "stores-raw.json");
  const json = JSON.parse(readFileSync(p, "utf-8"));
  const items = json.items || json;
  if (!Array.isArray(items) || items.length < MIN_STORES) {
    throw new Error(`cache ${p} missing or too small — run without --cache to refetch`);
  }
  console.log(`Using cached pull: ${items.length} stores`);
  return items;
}

// --- flagship geoalgeria commune centroids ---------------------------------
// The API files stores under the legacy 48-wilaya scheme (a Timimoun store is
// tagged "Adrar"); since every record has a real lat/lng we instead attach the
// wilaya/commune by nearest-centroid join, which resolves to the current
// 69-wilaya scheme — same method as @geoalgeria/djezzy. The operator's own
// declared wilaya name is kept as `operator_wilaya` for transparency.
const DEG = Math.PI / 180;
function loadCommunes() {
  const wilayas = JSON.parse(readFileSync(join(REPO_ROOT, "packages", "dataset", "data", "algeria.json"), "utf-8"));
  const communes = [];
  for (const w of wilayas) {
    for (const c of w.communes || []) {
      if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) {
        communes.push({
          wilaya_code: c.wilaya_code, wilaya_fr: w.name_fr, wilaya_ar: w.name_ar,
          commune_fr: c.name_fr, code_commune: c.code_commune, lat: c.latitude, lng: c.longitude,
        });
      }
    }
  }
  if (!communes.length) throw new Error("no commune centroids loaded — check packages/dataset/data/algeria.json");
  return communes;
}

function nearestCommune(lat, lng, communes) {
  let best = null, bestD = Infinity;
  const cosLat = Math.cos(lat * DEG);
  for (const c of communes) {
    const dx = (c.lng - lng) * cosLat, dy = c.lat - lat, d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function normStores(items, communes) {
  const rows = [];
  const seen = new Set();
  for (const it of items) {
    const lat = Number(it.latitude);
    const lng = Number(it.longitude);
    if (!inAlgeria(lat, lng)) continue;
    if (it.id != null) {
      if (seen.has(it.id)) continue; // de-dup by API store id
      seen.add(it.id);
    }
    const t = TYPES[(it.type?.key || "").toLowerCase()] || null;
    const c = nearestCommune(lat, lng, communes);
    rows.push({
      source: "ooredoo.dz",
      ooredoo_id: it.id != null ? String(it.id) : null,
      name: str(it.name),
      type: t ? t.code : null,
      type_label_fr: t ? t.fr : null,
      type_label_ar: t ? t.ar : null,
      address: str(it.address),
      wilaya: c.wilaya_fr,
      wilaya_ar: c.wilaya_ar,
      wilaya_code: wcode(c.wilaya_code),
      commune: c.commune_fr,
      commune_code: c.code_commune,
      operator_wilaya: titleCase(it.villaya?.name),
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      geo_precision: "exact",
    });
  }
  return rows;
}

// Stable id `{wilaya_code}-{seq}`, seq ordered by ooredoo_id (then name) so
// re-pulls are deterministic.
function assignIds(rows) {
  const byW = new Map();
  for (const r of rows) {
    const w = r.wilaya_code || "00";
    if (!byW.has(w)) byW.set(w, []);
    byW.get(w).push(r);
  }
  for (const [w, list] of byW) {
    list.sort((a, b) => (a.ooredoo_id || "").localeCompare(b.ooredoo_id || "") || (a.name || "").localeCompare(b.name || ""));
    list.forEach((r, i) => { r.id = `${w}-${String(i + 1).padStart(3, "0")}`; });
  }
}

// --- main ------------------------------------------------------------------
async function main() {
  const raw = process.argv.includes("--cache") ? readCache() : await fetchStores();
  const communes = loadCommunes();
  let rows = normStores(raw, communes);
  assignIds(rows);
  rows.sort((a, b) => a.id.localeCompare(b.id));

  // A few operator points carry inaccurate coordinates in the source, which the
  // nearest-centroid join then places in the wrong wilaya. We don't auto-correct
  // (a bad coord that lands one wilaya over is indistinguishable from a legitimate
  // post-2019 split), but we surface gross outliers — coords far from the store's
  // own declared wilaya — so they can be eyeballed each pull. operator_wilaya
  // preserves Ooredoo's declared wilaya in the data regardless.
  const wPts = new Map();
  const wByName = new Map();
  for (const c of communes) {
    if (!wPts.has(c.wilaya_code)) wPts.set(c.wilaya_code, []);
    wPts.get(c.wilaya_code).push([c.lat, c.lng]);
    wByName.set(cnorm(c.wilaya_fr), c.wilaya_code);
  }
  const centroidOf = (code) => {
    const p = wPts.get(code);
    return p ? [p.reduce((s, x) => s + x[0], 0) / p.length, p.reduce((s, x) => s + x[1], 0) / p.length] : null;
  };
  let suspect = 0;
  for (const r of rows) {
    const opCode = r.operator_wilaya ? wByName.get(cnorm(r.operator_wilaya)) : null;
    const ctr = opCode ? centroidOf(opCode) : null;
    if (!ctr) continue;
    const dx = (ctr[1] - r.lng) * Math.cos(r.lat * DEG);
    const km = Math.round(Math.sqrt(dx * dx + (ctr[0] - r.lat) ** 2) * 111);
    if (km > 300) {
      suspect++;
      console.warn(`  ⚠ ${r.id} "${r.name}" is ${km} km from its declared wilaya (${r.operator_wilaya}) — likely a bad source coordinate`);
    }
  }
  if (suspect) console.warn(`  ${suspect} store(s) with suspect source coordinates flagged (operator_wilaya preserves the declared wilaya).`);

  // Emit v2 via the shared writer. On a `--cache` replay, preserve the committed
  // retrieved/updated dates; a live pull stamps the run's date.
  const cfg = MIGRATIONS.ooredoo;
  const OFFLINE = process.argv.includes("--cache");
  const { updated, retrieved } = resolveDates(OUT_DIR, OFFLINE);
  const { records, metadata } = writePackageV2({
    pkg: "ooredoo",
    dir: OUT_DIR,
    files: [{ file: "stores.json", rows: rows.map(cfg.map) }],
    meta: cfg.meta,
    updated,
    retrieved,
  });
  console.log(`Wrote ${records.length} Ooredoo stores → v2, ${metadata.wilayas_covered} wilayas.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
