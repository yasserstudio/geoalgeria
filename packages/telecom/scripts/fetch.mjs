#!/usr/bin/env node
// @geoalgeria/telecom — regenerate the 5G coverage datasets from operator maps.
//
// Sources:
//   Djezzy  https://www.djezzy5g.dz/map.html  — markers in an XOR-encoded blob
//   Mobilis https://mobilis.dz/map/5g/data    — JSON endpoint (browser headers)
//   Ooredoo https://www.ooredoo.dz/.../5g      — /o/c/communes, read via a real
//           browser session (the site self-authenticates; see fetchOoredoo).
//           Requires the `agent-browser` CLI on PATH.
//
// Output (data/coverage/5g/, + csv/ + geojson/ mirrors + metadata.json):
//   sites.json   combined, all operators
//   <operator>.json per source
// Writes are all-or-nothing: if any operator fetch fails, nothing is overwritten
// (so a partial fetch can't silently clobber good committed data).
// Run: node scripts/fetch.mjs   (or: npm run fetch)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const PKG = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(PKG, "data");
const COVERAGE_5G = join(DATA, "coverage", "5g");
const TECH = "5G";

// ── wilaya name → zero-padded code, from the geoalgeria flagship ────────────
const WILAYAS = JSON.parse(
  readFileSync(join(PKG, "..", "dataset", "data", "wilayas.json"), "utf8"),
).wilayas;
const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const NAME_TO_CODE = new Map();
for (const w of WILAYAS) {
  for (const n of [w.name_fr, w.name_en]) if (n) NAME_TO_CODE.set(norm(n), w.code);
}
// Known operator-spelling → geoalgeria aliases (extend as sources drift).
const ALIASES = {
  alger: "Alger",
  bordjbouarreridj: "Bordj Bou Arreridj",
  insalah: "In Salah",
  timimoun: "Timimoun",
  touggourt: "Touggourt",
  tindouf: "Tindouf",
  elmeniaa: "El Meniaa",
  elmghair: "El M'Ghair",
  mostaghanem: "Mostaganem",
  djanet: "Djanet",
  beniabbes: "Beni Abbes",
  ouleddjellal: "Ouled Djellal",
};
const unmatched = new Set();
const dropped = { djezzy: 0, mobilis: 0, ooredoo: 0 };

function wilayaCode(name) {
  let code = NAME_TO_CODE.get(norm(name));
  if (code == null && ALIASES[norm(name)]) code = NAME_TO_CODE.get(norm(ALIASES[norm(name)]));
  if (code == null) {
    unmatched.add(name);
    return null;
  }
  return String(code).padStart(2, "0");
}

// Deterministic id, stable per operator + coordinates + label. Coords are
// fixed-precision so numeric/string formatting from a source can't shift the id;
// the label keeps two distinct sites at the same point apart.
const id = (operator, lat, lng, extra = "") =>
  `${operator}-${createHash("sha1")
    .update(`${TECH}|${operator}|${Number(lat).toFixed(6)}|${Number(lng).toFixed(6)}|${extra}`)
    .digest("hex")
    .slice(0, 10)}`;

// Algeria bounding box — reject coordinates outside it (catches comma-decimal or
// swapped lat/lng introduced by a source format change).
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15";
async function get(url, headers = {}) {
  const res = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res;
}

// ── Djezzy ──────────────────────────────────────────────────────────────────
async function fetchDjezzy() {
  const base = "https://www.djezzy5g.dz";
  const html = await (await get(`${base}/map.html`)).text();
  const version = (html.match(/data-version-id=["'](\d+)["']/) || [])[1] || "2025";
  // XOR key, reconstructed from the page constants (geo.js) + footer version.
  const key = "Djezzy5G" + Buffer.from("LU1hcEtleS0=", "base64").toString("binary") + version;
  const b64 = (await (await get(`${base}/wilayas.enc`)).text()).trim();
  const enc = Buffer.from(b64, "base64");
  const k = Buffer.from(key, "utf8");
  const out = Buffer.alloc(enc.length);
  for (let i = 0; i < enc.length; i++) out[i] = enc[i] ^ k[i % k.length];
  const byWilaya = JSON.parse(out.toString("utf8")); // throws if the key/version drifted

  const sites = [];
  for (const [wname, w] of Object.entries(byWilaya)) {
    const code = wilayaCode(wname);
    for (const m of w.markers || []) {
      if (!inAlgeria(m.lat, m.lng)) {
        dropped.djezzy++;
        continue;
      }
      sites.push({
        id: id("djezzy", m.lat, m.lng, m.name || ""),
        technology: TECH,
        operator: "djezzy",
        name: m.name || null,
        address: m.address || null,
        commune: null,
        commune_ar: null,
        commune_code: null,
        wilaya_code: code,
        lat: m.lat,
        lng: m.lng,
        source: `${base}/map.html`,
      });
    }
  }
  if (sites.length === 0) throw new Error("decoded 0 Djezzy sites (key/version drift?)");
  return sites;
}

// ── Mobilis ───────────────────────────────────────────────────────────────────
async function fetchMobilis() {
  const res = await get("https://mobilis.dz/map/5g/data", {
    "X-Requested-With": "XMLHttpRequest",
    Referer: "https://mobilis.dz/map/5g",
    Accept: "application/json, text/plain, */*",
  });
  const rows = await res.json();
  const sites = [];
  for (const r of rows) {
    const [latS, lngS] = String(r.coordonnes || "").split(",");
    const lat = Number(latS),
      lng = Number(lngS);
    if (!inAlgeria(lat, lng)) {
      dropped.mobilis++;
      continue;
    }
    sites.push({
      id: id("mobilis", lat, lng, r.commune || ""),
      technology: TECH,
      operator: "mobilis",
      name: r.commune || null,
      address: null,
      commune: r.commune || null,
      commune_ar: r.commune_ar || null,
      commune_code: null,
      wilaya_code: r.wilaya_id != null ? String(r.wilaya_id).padStart(2, "0") : wilayaCode(r.wilaya?.name),
      lat,
      lng,
      source: "https://mobilis.dz/map/5g",
    });
  }
  if (sites.length === 0) throw new Error("got 0 Mobilis sites");
  return sites;
}

// ── Ooredoo ─────────────────────────────────────────────────────────────────
// Ooredoo's 5G page authenticates itself client-side and exposes a public read
// API of its 5G-covered communes (/o/c/communes). We drive a real browser via
// the `agent-browser` CLI so the SITE performs its own auth, then read that
// endpoint from the page's session — we never handle or replay credentials.
// This step therefore requires the agent-browser CLI on PATH; without it the
// fetch aborts (rather than silently dropping Ooredoo). Coverage here is
// commune-level (one point per covered commune), unlike Djezzy/Mobilis sites.
function abEval(js) {
  const out = execFileSync("agent-browser", ["eval", js], {
    encoding: "utf8",
    timeout: 60000,
    maxBuffer: 64 * 1024 * 1024,
  });
  for (const line of out.split("\n").map((s) => s.trim()).reverse()) {
    if (!line || line.startsWith("✓") || line.startsWith("✗")) continue;
    try {
      let v = JSON.parse(line);
      if (typeof v === "string") v = JSON.parse(v); // agent-browser quotes string returns
      return v;
    } catch {
      /* keep scanning earlier lines */
    }
  }
  throw new Error("could not parse agent-browser eval output");
}

async function fetchOoredoo() {
  const url = "https://www.ooredoo.dz/fr/particuliers/internet/5g";
  const ab = (...args) => execFileSync("agent-browser", args, { encoding: "utf8", timeout: 60000 });
  let rows;
  try {
    ab("open", url);
    ab("wait", "5000");
    rows = abEval(
      "fetch(location.origin+'/o/c/communes?pageSize=3000&filter='+encodeURIComponent('(latitude ne 0 or longitude ne 0)')," +
        "{headers:{Authorization:sessionStorage.getItem('tokenbearer'),Accept:'application/json'}})" +
        ".then(r=>r.json()).then(d=>JSON.stringify(d.items.map(it=>({" +
        "w:it.villayaId&&it.villayaId.key,c:it.communeId&&it.communeId.name,lat:it.latitude,lng:it.longitude}))))",
    );
  } finally {
    try {
      ab("close", "--all");
    } catch {
      /* ignore */
    }
  }
  const sites = [];
  for (const r of rows) {
    const lat = Number(r.lat),
      lng = Number(r.lng);
    if (!inAlgeria(lat, lng)) {
      dropped.ooredoo++;
      continue;
    }
    sites.push({
      id: id("ooredoo", lat, lng, r.c || ""),
      technology: TECH,
      operator: "ooredoo",
      name: r.c || null,
      address: null,
      commune: r.c || null,
      commune_ar: null,
      commune_code: null,
      wilaya_code: r.w ? String(r.w).padStart(2, "0") : null,
      lat,
      lng,
      source: url,
    });
  }
  if (sites.length === 0) throw new Error("got 0 Ooredoo communes");
  return sites;
}

// ── outputs ───────────────────────────────────────────────────────────────────
const FIELDS = [
  "id", "technology", "operator", "name", "address",
  "commune", "commune_ar", "commune_code", "wilaya_code", "lat", "lng", "source",
];
const csvCell = (v) => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows) =>
  [FIELDS.join(","), ...rows.map((r) => FIELDS.map((f) => csvCell(r[f])).join(","))].join("\n") + "\n";
const toGeoJSON = (rows) => ({
  type: "FeatureCollection",
  features: rows
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [r.lng, r.lat] },
      properties: { ...r, lat: undefined, lng: undefined },
    })),
});
const writeJson = (p, obj) => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
};

async function main() {
  const extractors = { djezzy: fetchDjezzy, mobilis: fetchMobilis, ooredoo: fetchOoredoo };
  const perOperator = {};
  const failures = [];
  for (const [op, fn] of Object.entries(extractors)) {
    try {
      perOperator[op] = await fn();
      console.log(`  ${op}: ${perOperator[op].length} sites`);
    } catch (e) {
      failures.push(op);
      console.error(`  ${op}: FAILED — ${e.message}`);
    }
  }
  // All-or-nothing: never overwrite the combined data with a partial set.
  if (failures.length) {
    console.error(`Aborting (no files written): ${failures.join(", ")} failed.`);
    process.exit(1);
  }

  mkdirSync(COVERAGE_5G, { recursive: true });
  const all = [];
  for (const [op, sites] of Object.entries(perOperator)) {
    writeJson(join(COVERAGE_5G, `${op}.json`), sites);
    all.push(...sites);
  }
  writeJson(join(COVERAGE_5G, "sites.json"), all);
  mkdirSync(join(DATA, "csv", "coverage", "5g"), { recursive: true });
  writeFileSync(join(DATA, "csv", "coverage", "5g", "sites.csv"), toCsv(all));
  writeJson(join(DATA, "geojson", "coverage", "5g", "sites.geojson"), toGeoJSON(all));

  const byOperator = Object.fromEntries(Object.entries(perOperator).map(([k, v]) => [k, v.length]));
  const wilayas_covered = new Set(all.map((r) => r.wilaya_code).filter(Boolean)).size;
  writeJson(join(DATA, "metadata.json"), {
    license: "Data © respective operators; redistributed for reference. See README.",
    technologies: [TECH],
    sources: {
      djezzy: "https://www.djezzy5g.dz/map.html",
      mobilis: "https://mobilis.dz/map/5g",
      ooredoo: "https://www.ooredoo.dz/fr/particuliers/internet/5g",
    },
    coverage: { [TECH]: { total: all.length, by_operator: byOperator, wilayas_covered } },
    generated_at: new Date().toISOString().slice(0, 10),
    note: "5G presence points from each operator's published coverage map. Djezzy and Mobilis are cell-site level; Ooredoo is commune level (points within covered communes — a few communes carry several). Source-map circles are display-only, not measured RF coverage.",
  });

  console.log(`  combined: ${all.length} sites across ${wilayas_covered} wilayas`);
  if (unmatched.size) console.warn(`  ⚠ unmatched wilaya names: ${[...unmatched].join(", ")}`);
  const totalDropped = dropped.djezzy + dropped.mobilis + dropped.ooredoo;
  if (totalDropped)
    console.warn(
      `  ⚠ dropped ${totalDropped} out-of-Algeria point(s) (djezzy ${dropped.djezzy}, mobilis ${dropped.mobilis}, ooredoo ${dropped.ooredoo})`,
    );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
