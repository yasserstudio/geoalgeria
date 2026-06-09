#!/usr/bin/env node
/**
 * Fetch Algeria post offices + ATMs from Algérie Poste (baridimap.poste.dz)
 * and emit JSON, CSV, and GeoJSON to ../data.
 *
 * Source API (public, unauthenticated):
 *   https://baridimap-api.poste.dz/api/postoffices
 *   https://baridimap-api.poste.dz/api/atms
 *
 * Usage: node scripts/fetch.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Canonical output (this package) + a mirror inside the geoalgeria dataset so
// postal data also ships under geoalgeria/data/poste (alongside ecommerce,
// delivery, …). Both are written from this single fetch, so they never drift.
// The mirror is skipped when the dataset package isn't present (e.g. this
// package installed standalone), so we never create a stray sibling tree.
const DESTS = [
  join(__dirname, "..", "data"),
  ...(existsSync(join(__dirname, "..", "..", "dataset"))
    ? [join(__dirname, "..", "..", "dataset", "data", "poste")]
    : []),
];
const API = "https://baridimap-api.poste.dz/api";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (geoalgeria-poste dataset builder)",
  Origin: "https://baridimap.poste.dz",
  Referer: "https://baridimap.poste.dz/",
  Accept: "application/json",
};

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const clean = (v) => (v === undefined ? null : v);

async function getJSON(path) {
  const res = await fetch(`${API}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  const body = await res.json();
  const rows = Array.isArray(body) ? body : body?.data;
  if (!Array.isArray(rows)) throw new Error(`${path} -> unexpected response shape`);
  return rows;
}

// --- normalizers ----------------------------------------------------------
function normPostOffice(o) {
  const c = o.commune || {};
  const w = c.wilaya || {};
  return {
    id: o.id,
    name: o.nom ?? null,
    name_ar: o.intitule_ar ?? null,
    class: o.classe ?? null,
    postal_code: o.cp ?? null,
    postal_code_old: o.cp_old ?? null,
    address: o.adresse ?? null,
    commune_code: c.code ?? null,
    commune_fr: c.name_fr ?? null,
    commune_ar: c.name_ar ?? null,
    wilaya_code: w.id ?? null,
    wilaya_fr: w.name_fr ?? null,
    wilaya_ar: w.name_ar ?? null,
    lat: num(o.gps?.lat),
    lng: num(o.gps?.lng),
  };
}

function normAtm(a) {
  return {
    id: clean(a.atm_id),
    name: a.name ?? null,
    status: clean(a.status),
    postal_code: a.cp ?? null,
    postal_code_old: a.cp_old ?? null,
    address: a.adresse ?? null,
    commune_fr: a.commune_fr ?? null,
    commune_ar: a.commune_ar ?? null,
    wilaya_code: a.wilaya_id ?? null,
    wilaya_fr: a.wilaya_fr ?? null,
    wilaya_ar: a.wilaya_ar ?? null,
    lat: num(a.latitude),
    lng: num(a.longitude),
  };
}

// --- writers ---------------------------------------------------------------
function toCSV(rows, cols) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    // Neutralize spreadsheet formula injection on TEXT fields from the external
    // API. Numbers (e.g. negative longitudes) must pass through untouched.
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
        return { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: props };
      }),
  };
}

const writeJSON = (dir, p, obj) => writeFileSync(join(dir, p), JSON.stringify(obj, null, 2) + "\n");
const writeText = (dir, p, txt) => writeFileSync(join(dir, p), txt);

function emit(dir, { offices, atms, officeCols, atmCols, officeGeo, atmGeo, metadata }) {
  mkdirSync(join(dir, "csv"), { recursive: true });
  mkdirSync(join(dir, "geojson"), { recursive: true });
  writeJSON(dir, "postoffices.json", offices);
  writeJSON(dir, "atms.json", atms);
  writeText(dir, "csv/postoffices.csv", toCSV(offices, officeCols));
  writeText(dir, "csv/atms.csv", toCSV(atms, atmCols));
  writeJSON(dir, "geojson/postoffices.geojson", officeGeo);
  writeJSON(dir, "geojson/atms.geojson", atmGeo);
  writeJSON(dir, "metadata.json", metadata);
}

// --- main ------------------------------------------------------------------
async function main() {
  console.log("Fetching post offices…");
  const offices = (await getJSON("/postoffices")).map(normPostOffice);
  console.log(`  ${offices.length} post offices`);

  console.log("Fetching ATMs…");
  const atms = (await getJSON("/atms")).map(normAtm);
  console.log(`  ${atms.length} ATMs`);

  const officeCols = ["id","name","name_ar","class","postal_code","postal_code_old","address","commune_code","commune_fr","commune_ar","wilaya_code","wilaya_fr","wilaya_ar","lat","lng"];
  const atmCols = ["id","name","status","postal_code","postal_code_old","address","commune_fr","commune_ar","wilaya_code","wilaya_fr","wilaya_ar","lat","lng"];

  const officeGeo = toGeoJSON(offices);
  const atmGeo = toGeoJSON(atms);
  console.log(`  GeoJSON: ${officeGeo.features.length}/${offices.length} offices and ${atmGeo.features.length}/${atms.length} ATMs have coordinates`);

  const metadata = {
    source: "Algérie Poste — baridimap.poste.dz",
    api: API,
    license: "Data © Algérie Poste; redistributed for reference. See README.",
    postoffices: offices.length,
    atms: atms.length,
    distinct_postal_codes: new Set(offices.map((o) => o.postal_code)).size,
    generated_at: new Date().toISOString().slice(0, 10),
  };

  const payload = { offices, atms, officeCols, atmCols, officeGeo, atmGeo, metadata };
  for (const dir of DESTS) emit(dir, payload);
  console.log(`Wrote JSON, CSV, and GeoJSON to ${DESTS.length} destination(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
