#!/usr/bin/env node
/**
 * Fetch Mobilis agencies & approved points of sale from the Mobilis store
 * locator and emit JSON, CSV, and GeoJSON to ../data.
 *
 * Source (ATM Mobilis — state mobile operator):
 *   https://mobilis.dz/mapagence
 *
 * The locator is an Alpine.js component backed by four JSON endpoints, each
 * gated behind an `X-Requested-With: XMLHttpRequest` header:
 *   GET /map/categories                      → the 2 categories
 *   GET /map/wilayas                          → wilaya list (id + AR name)
 *   GET /map/communes?wilaya={id}             → communes of a wilaya
 *   GET /map/agencies?cat={EN}&wil={id}&com=0 → agencies/PDV for that wilaya
 *
 * Two source quirks handled here:
 *   1. The site is behind an Imperva WAF. Rapid unauthenticated requests are
 *      served an HTML "Request Rejected" page instead of JSON. We prime a
 *      cookie jar from the locator page (the WAF issues TS / XSRF-TOKEN cookies),
 *      reuse it, send a Referer, throttle, and on a rejection we re-prime and
 *      retry with backoff — never silently treat it as empty.
 *   2. `xy` is a single "lat, lng" string (note: lat first, the reverse of
 *      GeoJSON), and the decimal separator is inconsistent — most rows use "."
 *      ("36.76, 3.05") but a few use "," ("35,191261, -0,632265").
 *
 * Two categories, very different shape:
 *   - "Mobilis Agency"  → the operator's own agencies. Fully geocoded,
 *                          bilingual FR/AR name + address.
 *   - "Approved Agency" → third-party approved resellers (points de vente). FR
 *                          name + address + commune, but NO coordinates (xy is
 *                          null on every record) — a commune-level directory.
 *
 * `wil=0` returns []; you must loop wilayas. `cat` must be the English name —
 * the numeric category id returns [].
 *
 * Usage: node scripts/fetch.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import https from "node:https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");
const ORIGIN = "https://mobilis.dz";
const REFERER = `${ORIGIN}/mapagence?type_agence=Approved+Agency`;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120 Safari/537.36";

const CATEGORIES = [
  { cat: "Mobilis Agency", type: "agence", file: "agences" }, // category id 4
  { cat: "Approved Agency", type: "pdv", file: "pdv" }, //        category id 5
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_BYTES = 16 * 1024 * 1024;

// --- minimal cookie jar (Node https has none) ------------------------------
const jar = new Map();
function rememberCookies(res) {
  const set = res.headers["set-cookie"];
  if (!set) return;
  for (const c of set) {
    const kv = c.split(";")[0];
    const i = kv.indexOf("=");
    if (i > 0) jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim());
  }
}
const cookieHeader = () =>
  [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

function request(url, { xhr = true } = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      "User-Agent": UA,
      Accept: xhr ? "application/json, text/plain, */*" : "text/html",
      "Accept-Language": "fr,en;q=0.8",
      Referer: REFERER,
    };
    if (xhr) headers["X-Requested-With"] = "XMLHttpRequest";
    if (jar.size) headers.Cookie = cookieHeader();
    const req = https.get(url, { headers }, (res) => {
      rememberCookies(res);
      res.setEncoding("utf8");
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
        if (body.length > MAX_BYTES) {
          res.destroy();
          reject(new Error(`${url} -> response exceeds ${MAX_BYTES} bytes`));
        }
      });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.setTimeout(30_000, () => req.destroy(new Error(`${url} -> timed out`)));
  });
}

// Load the locator page so the WAF issues session cookies.
async function prime() {
  try {
    await request(REFERER, { xhr: false });
  } catch (e) {
    console.warn(`  prime warning: ${e.message}`);
  }
}

const looksLikeJson = (s) => {
  const t = s.trimStart();
  return t[0] === "[" || t[0] === "{";
};

async function getJSON(path, tries = 6) {
  const url = `${ORIGIN}/map/${path}`;
  for (let i = 0; i < tries; i++) {
    try {
      const { body } = await request(url);
      if (looksLikeJson(body)) return JSON.parse(body);
      // WAF rejection or HTML — re-prime and back off.
      const wait = Math.min(2000 + i * 2000, 12_000);
      console.warn(`  WAF/HTML on ${path} (try ${i + 1}); re-prime, wait ${wait}ms`);
      await sleep(wait);
      await prime();
    } catch (e) {
      const wait = Math.min(2000 + i * 2000, 12_000);
      console.warn(`  err ${path} (try ${i + 1}): ${e.message}; wait ${wait}ms`);
      await sleep(wait);
    }
  }
  throw new Error(`gave up fetching ${path}`);
}

// --- helpers ---------------------------------------------------------------
const str = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
// wilaya_id is a number 1..58; the ecosystem keys wilayas as "01".
const wcode = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? String(n).padStart(2, "0") : null;
};

/**
 * Parse Mobilis' `xy` field. It is "lat, lng" (lat first), and the decimal
 * separator is inconsistent: dot ("36.76, 3.05") or comma
 * ("35,191261, -0,632265"). The pair separator is a comma; when present it's
 * followed by whitespace, so split on /,\s+/ first. When there's no space after
 * the separator the only commas left are decimals + the one separator, so the
 * comma split is unambiguous by token count: 2 tokens = dot-decimal, 4 = comma-
 * decimal (recombine in pairs). Returns [lat, lng], or [null, null] for
 * null/garbage/out-of-Algeria values.
 */
function parseXY(xy) {
  if (typeof xy !== "string" || xy.trim() === "") return [null, null];
  const s = xy.trim();
  let parts = s.split(/,\s+/); // pair separator = comma + whitespace
  if (parts.length !== 2) {
    const p = s.split(",");
    if (p.length === 2) parts = p; // "a.b,c.d" — dot-decimal, no space
    else if (p.length === 4) parts = [`${p[0]}.${p[1]}`, `${p[2]}.${p[3]}`]; // "a,b,c,d" — comma-decimal, no space
    else return [null, null];
  }
  const lat = Number(parts[0].replace(",", ".").trim());
  const lng = Number(parts[1].replace(",", ".").trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [null, null];
  if (lat < 15 || lat > 40 || lng < -12 || lng > 14) return [null, null];
  return [lat, lng];
}

// --- normalizers -----------------------------------------------------------
// Mobilis' own `id` is unique & stable → kept as `code`. `id` is synthesized
// downstream as `{wilaya_code}-{seq}` for parity with the other packages.
function normAgence(a) {
  const [lat, lng] = parseXY(a.xy);
  return {
    id: null, // assigned in assignIds()
    code: a.id != null ? String(a.id) : null,
    type: "agence",
    name: str(a.name),
    name_ar: str(a.name_ar),
    address: str(a.adress), // source spells it "adress"
    address_ar: str(a.adress_ar),
    wilaya_code: wcode(a.wilaya_id),
    lat,
    lng,
  };
}

function normPdv(a) {
  const [lat, lng] = parseXY(a.xy); // always null for PDV, but parse defensively
  return {
    id: null,
    code: a.id != null ? String(a.id) : null,
    type: "pdv",
    name: str(a.name),
    address: str(a.adress),
    commune: str(a.communes),
    wilaya_code: wcode(a.wilaya_id),
    lat,
    lng,
  };
}

/**
 * Assign a stable, unique `id` per record: `{wilaya_code}-{seq}`, seq ordered by
 * the source's own numeric id so re-fetches are deterministic regardless of the
 * order the API returns rows in. "00" buckets a record with no wilaya code.
 */
function assignIds(rows) {
  const byWilaya = new Map();
  for (const r of rows) {
    const w = r.wilaya_code || "00";
    if (!byWilaya.has(w)) byWilaya.set(w, []);
    byWilaya.get(w).push(r);
  }
  for (const [w, list] of byWilaya) {
    // Order by the numeric source id; fall back to a string compare so the sort
    // stays total (and the ids deterministic) even if a code were non-numeric.
    list.sort(
      (a, b) =>
        Number(a.code) - Number(b.code) || String(a.code).localeCompare(String(b.code)),
    );
    list.forEach((r, i) => {
      r.id = `${w}-${String(i + 1).padStart(3, "0")}`;
    });
  }
  return rows;
}

// --- writers (mirrors @geoalgeria/emploi) ----------------------------------
function toCSV(rows, cols) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    // Neutralize spreadsheet formula injection on TEXT fields. Numbers pass.
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
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lng, lat] },
          properties: props,
        };
      }),
  };
}

const writeJSON = (p, obj) =>
  writeFileSync(join(OUT_DIR, p), JSON.stringify(obj, null, 2) + "\n");
const writeText = (p, txt) => writeFileSync(join(OUT_DIR, p), txt);

// --- main ------------------------------------------------------------------
async function main() {
  console.log("Priming Mobilis session (WAF cookies)…");
  await prime();
  console.log(`  cookies: ${[...jar.keys()].join(", ") || "(none)"}`);

  // The endpoint returns the full wilaya list (currently 69 under the 2019/2026
  // reforms); Mobilis only files records under codes 1–58, so 59–69 come back
  // empty. We still walk every returned id so new wilayas are picked up if/when
  // Mobilis starts populating them.
  const wilayas = await getJSON("wilayas");
  const ids = wilayas.map((w) => w.id).filter((n) => Number.isInteger(n)).sort((a, b) => a - b);
  console.log(`  ${ids.length} wilayas`);

  // Sanity-check the categories exist under their English names.
  const cats = await getJSON("categories");
  const known = new Set(cats.map((c) => c.name_en));
  for (const { cat } of CATEGORIES) {
    if (!known.has(cat)) throw new Error(`category "${cat}" not found in /map/categories`);
  }

  const out = {};
  for (const { cat, type, file } of CATEGORIES) {
    const q = encodeURIComponent(cat).replace(/%20/g, "+");
    const seen = new Set();
    const rows = [];
    for (const wil of ids) {
      const data = await getJSON(`agencies?cat=${q}&wil=${wil}&com=0`);
      await sleep(600);
      for (const a of data) {
        if (a.id == null || seen.has(a.id)) continue;
        seen.add(a.id);
        rows.push(type === "agence" ? normAgence(a) : normPdv(a));
      }
      process.stdout.write(`\r  [${file}] wilaya ${wil}/${ids.at(-1)} — ${rows.length} records   `);
    }
    process.stdout.write("\n");
    assignIds(rows);
    const geocoded = rows.filter((r) => r.lat != null).length;
    out[file] = { rows, geocoded };
    console.log(`  ${file}: ${rows.length} records (${geocoded} geocoded)`);
  }

  const agences = out.agences.rows;
  const pdv = out.pdv.rows;
  const agenceCols = ["id", "code", "type", "name", "name_ar", "address", "address_ar", "wilaya_code", "lat", "lng"];
  const pdvCols = ["id", "code", "type", "name", "address", "commune", "wilaya_code", "lat", "lng"];

  const metadata = {
    source: "Mobilis — ATM Mobilis (mobilis.dz/mapagence)",
    origin: ORIGIN,
    license: "Data © ATM Mobilis; redistributed for reference. See README.",
    agences: agences.length,
    pdv: pdv.length,
    total: agences.length + pdv.length,
    wilayas_covered: new Set([...agences, ...pdv].map((r) => r.wilaya_code).filter(Boolean)).size,
    agences_geocoded: out.agences.geocoded,
    pdv_geocoded: out.pdv.geocoded,
    generated_at: new Date().toISOString().slice(0, 10),
  };

  mkdirSync(join(OUT_DIR, "csv"), { recursive: true });
  mkdirSync(join(OUT_DIR, "geojson"), { recursive: true });
  writeJSON("agences.json", agences);
  writeJSON("pdv.json", pdv);
  writeText("csv/agences.csv", toCSV(agences, agenceCols));
  writeText("csv/pdv.csv", toCSV(pdv, pdvCols));
  // Only the agencies are geocoded → only they get a GeoJSON. The 12k PDV carry
  // no coordinates (commune-level only) and ship as JSON/CSV only.
  writeJSON("geojson/agences.geojson", toGeoJSON(agences));
  writeJSON("metadata.json", metadata);
  console.log("Wrote JSON, CSV, and GeoJSON to data/.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
