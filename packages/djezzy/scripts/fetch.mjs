#!/usr/bin/env node
/**
 * Fetch Djezzy boutiques from the Djezzy store locator and emit JSON, CSV, and
 * GeoJSON to ../data.
 *
 * Source (Optimum Telecom Algérie — "Djezzy"):
 *   https://www.djezzy.dz/nos-boutiques/
 *
 * The locator is a WordPress page that ships the full boutique list inline as
 * an HTML-entity-encoded JSON array (no separate API, no WAF). Each store
 * object is flat and carries real coordinates:
 *   { cds, code, categorie, adresse, email, horaires_ouverture, vendredi,
 *     fetes, code_ouverture, latitude, longitude, comment }
 *
 * The source has NO commune/wilaya codes and NO Arabic — only an address string
 * and a "lat,lng" pair. We attach administrative linkage by nearest-centroid
 * join against the flagship `geoalgeria` commune centroids (1,528 communes):
 * the nearest commune yields its code_commune + name + wilaya_code. Wilaya
 * assignment is effectively exact (wilayas are large); commune is best-effort
 * (centroid proximity, not polygon containment) — stated honestly in the README.
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
const ORIGIN = "https://www.djezzy.dz";
const URL = `${ORIGIN}/nos-boutiques/`;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126 Safari/537.36";
const MAX_BYTES = 16 * 1024 * 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- fetch -----------------------------------------------------------------
const MAX_REDIRECTS = 5;
// Only follow a redirect that stays on https and on the same host — refuse
// cross-host / scheme-downgrade targets (SSRF guard) and cap the depth so a
// redirect loop can't recurse unbounded.
function safeRedirect(location, fromUrl) {
  const next = new URL(location, fromUrl);
  if (next.protocol !== "https:" || next.hostname !== new URL(fromUrl).hostname) {
    throw new Error(`refusing cross-host/insecure redirect to ${next.href}`);
  }
  return next.href;
}

function request(url, depth = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "fr,en;q=0.8",
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.destroy();
          if (depth >= MAX_REDIRECTS) return reject(new Error(`${url} -> too many redirects`));
          try {
            return resolve(request(safeRedirect(res.headers.location, url), depth + 1));
          } catch (e) {
            return reject(e);
          }
        }
        res.setEncoding("utf8");
        let body = "";
        res.on("data", (c) => {
          body += c;
          if (body.length > MAX_BYTES) {
            res.destroy();
            reject(new Error(`${url} -> response exceeds ${MAX_BYTES} bytes`));
          }
        });
        res.on("end", () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on("error", reject);
    req.setTimeout(30_000, () => req.destroy(new Error(`${url} -> timed out`)));
  });
}

async function getPage(tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const { status, body } = await request(URL);
      if (status === 200 && body.includes("latitude")) return body;
      console.warn(`  HTTP ${status} / no data (try ${i + 1}); retrying…`);
    } catch (e) {
      console.warn(`  err (try ${i + 1}): ${e.message}`);
    }
    await sleep(1500 + i * 1500);
  }
  throw new Error("gave up fetching the Djezzy boutiques page");
}

// --- extract ---------------------------------------------------------------
// The store list is HTML-entity-encoded JSON. Decode the entities, then pull
// each flat object that carries a `latitude` key. Objects are flat (no nested
// braces), so the brace match is unambiguous.
function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0?34;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&"); // last, so we don't re-introduce entities
}

function extractStores(html) {
  const decoded = decodeEntities(html);
  const matches = decoded.match(/\{[^{}]*?"latitude"[^{}]*?\}/g) || [];
  const stores = [];
  for (const m of matches) {
    try {
      stores.push(JSON.parse(m));
    } catch {
      /* skip an unparseable fragment rather than abort the whole run */
    }
  }
  return stores;
}

// --- commune centroids (flagship geoalgeria) -------------------------------
function loadCommunes() {
  const dir = join(REPO_ROOT, "packages", "dataset", "data");
  const files = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"];
  const communes = [];
  for (const f of files) {
    const arr = JSON.parse(readFileSync(join(dir, f), "utf-8"));
    for (const c of arr) {
      if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) communes.push(c);
    }
  }
  if (!communes.length) throw new Error("no commune centroids loaded — check packages/dataset/data");
  return communes;
}

// Equirectangular squared distance is monotonic with great-circle distance at
// this scale and avoids trig per candidate — fine for a nearest-centroid pick.
const DEG = Math.PI / 180;
function nearestCommune(lat, lng, communes) {
  let best = null;
  let bestD = Infinity;
  const cosLat = Math.cos(lat * DEG);
  for (const c of communes) {
    const dx = (c.longitude - lng) * cosLat;
    const dy = c.latitude - lat;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

// --- helpers ---------------------------------------------------------------
const str = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const wcode = (n) => (Number.isInteger(n) && n > 0 ? String(n).padStart(2, "0") : null);
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

function normalize(s, communes) {
  const lat = Number(s.latitude);
  const lng = Number(s.longitude);
  if (!inAlgeria(lat, lng)) return null; // can't geocode → can't attach wilaya → drop
  const com = nearestCommune(lat, lng, communes);
  return {
    id: null, // assigned in assignIds()
    code: str(s.code),
    type: "boutique",
    name: str(s.cds),
    category: str(s.categorie),
    address: str(s.adresse),
    hours: str(s.horaires_ouverture),
    code_ouverture: str(s.code_ouverture),
    wilaya_code: wcode(com.wilaya_code),
    commune_code: com.code_commune,
    commune: com.name_fr,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

// Stable, unique id `{wilaya_code}-{seq}`, seq ordered by Djezzy's own `code`
// so re-fetches are deterministic regardless of source order.
function assignIds(rows) {
  const byWilaya = new Map();
  for (const r of rows) {
    const w = r.wilaya_code || "00";
    if (!byWilaya.has(w)) byWilaya.set(w, []);
    byWilaya.get(w).push(r);
  }
  for (const [w, list] of byWilaya) {
    // Sort by source code, then coords as a tiebreaker so the seq (and thus the
    // id) stays deterministic even if the source ever ships a duplicate/empty code.
    list.sort(
      (a, b) =>
        String(a.code).localeCompare(String(b.code)) || a.lat - b.lat || a.lng - b.lng,
    );
    list.forEach((r, i) => {
      r.id = `${w}-${String(i + 1).padStart(3, "0")}`;
    });
  }
  return rows;
}

// --- writers ---------------------------------------------------------------
function toCSV(rows, cols) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`; // formula-injection guard
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
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lng, lat] },
          properties: props,
        };
      }),
  };
}

const writeJSON = (p, obj) => writeFileSync(join(OUT_DIR, p), JSON.stringify(obj, null, 2) + "\n");
const writeText = (p, txt) => writeFileSync(join(OUT_DIR, p), txt);

// --- main ------------------------------------------------------------------
async function main() {
  console.log("Fetching Djezzy boutiques…");
  const html = await getPage();
  const raw = extractStores(html);
  console.log(`  extracted ${raw.length} boutique objects`);
  if (raw.length < 50) throw new Error(`only ${raw.length} boutiques extracted — page shape may have changed`);

  const communes = loadCommunes();
  console.log(`  ${communes.length} commune centroids loaded`);

  const dropped = [];
  const rows = [];
  for (const s of raw) {
    const r = normalize(s, communes);
    if (r) rows.push(r);
    else dropped.push(s.cds || s.code || "(unknown)");
  }
  if (dropped.length) console.warn(`  dropped ${dropped.length} boutique(s) without valid coordinates: ${dropped.join(", ")}`);

  assignIds(rows);

  const cols = [
    "id", "code", "type", "name", "category", "address", "hours",
    "code_ouverture", "wilaya_code", "commune_code", "commune", "lat", "lng",
  ];

  const metadata = {
    source: "Djezzy — Optimum Telecom Algérie (djezzy.dz/nos-boutiques)",
    origin: ORIGIN,
    license: "Data © Optimum Telecom Algérie (Djezzy); redistributed for reference. See README.",
    boutiques: rows.length,
    wilayas_covered: new Set(rows.map((r) => r.wilaya_code).filter(Boolean)).size,
    boutiques_geocoded: rows.filter((r) => r.lat != null).length,
    note:
      "Commune/wilaya linkage is derived by nearest-centroid join against the geoalgeria commune set; wilaya is effectively exact, commune is best-effort.",
    generated_at: new Date().toISOString().slice(0, 10),
  };

  mkdirSync(join(OUT_DIR, "csv"), { recursive: true });
  mkdirSync(join(OUT_DIR, "geojson"), { recursive: true });
  writeJSON("boutiques.json", rows);
  writeText("csv/boutiques.csv", toCSV(rows, cols));
  writeJSON("geojson/boutiques.geojson", toGeoJSON(rows));
  writeJSON("metadata.json", metadata);
  console.log(`Wrote ${rows.length} boutiques (${metadata.wilayas_covered} wilayas) to data/.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
