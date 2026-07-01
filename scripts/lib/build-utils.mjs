// Shared build helpers for GeoAlgeria data packages.
// Reused by the transport-sector build scripts (gares-routieres, ferroviaire,
// buses) so the CSV/GeoJSON/commune-join logic lives in one place. Existing
// per-package scripts keep their inlined copies; this is additive.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEG = Math.PI / 180;

/** Round to 6 decimals (≈0.1 m), or null. */
export const round6 = (n) =>
  n == null || !Number.isFinite(+n) ? null : Math.round(+n * 1e6) / 1e6;

/** Wilaya code → zero-padded 2-digit string ("16", 16, "1" → "16"/"01"). */
export const wcode = (c) => (c == null ? null : String(c).padStart(2, "0"));

/** RFC-4180 CSV with spreadsheet formula-injection guard. `cols` = ordered keys. */
export function toCSV(rows, cols) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") v = JSON.stringify(v);
    let s = String(v);
    if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => esc(r[c])).join(","));
  return lines.join("\n") + "\n";
}

/** Point FeatureCollection from rows with finite lat/lng (properties = full row). */
export function toGeoJSON(rows) {
  return {
    type: "FeatureCollection",
    features: rows
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
      .map((r) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.lng, r.lat] },
        properties: { ...r },
      })),
  };
}

/** Load geoalgeria commune centroids (all wilayas), finite coords only. */
export function loadCommunes() {
  const dir = join(REPO_ROOT, "packages", "dataset", "data");
  const files = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"];
  const out = [];
  for (const f of files) {
    for (const c of JSON.parse(readFileSync(join(dir, f), "utf-8"))) {
      if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) out.push(c);
    }
  }
  return out;
}

/** Nearest commune centroid to (lat,lng) — squared planar distance, cosLat-scaled. */
export function nearestCommune(lat, lng, communes) {
  let best = null, bestD = Infinity;
  const cosLat = Math.cos(lat * DEG);
  for (const c of communes) {
    const dx = (c.longitude - lng) * cosLat;
    const dy = c.latitude - lat;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

/** Attach wilaya_code/commune/commune_code by nearest centroid (mutates rows with lat/lng). */
export function attachCommune(rows, communes = loadCommunes()) {
  for (const r of rows) {
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
    const c = nearestCommune(r.lat, r.lng, communes);
    if (!c) continue;
    r.wilaya_code = wcode(c.wilaya_code);
    r.commune = c.name_fr;
    r.commune_code = c.code_commune ?? null;
  }
  return rows;
}

/** Great-circle distance in metres. */
export function haversine(aLat, aLng, bLat, bLng) {
  const dLat = (bLat - aLat) * DEG, dLng = (bLng - aLng) * DEG;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * DEG) * Math.cos(bLat * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
}
