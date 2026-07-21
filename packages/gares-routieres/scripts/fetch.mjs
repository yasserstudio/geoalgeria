// @geoalgeria/gares-routieres — build Algeria's intercity bus stations (gares
// routières) from the cleaned SOGRAL registry.
// Source: SOGRAL (live.sogral.com/api/live/agencies), staged + decoded in
// research/gares-routieres/. Here we fix 3 bad coords, spatial-join commune/wilaya
// against the geoalgeria commune set (which also reconciles SOGRAL's legacy
// 48-wilaya codes to the 58/69 model), assign ids, and emit JSON/CSV/GeoJSON.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadCommunes, attachCommune, round6 } from "../../../scripts/lib/build-utils.mjs";
import { MIGRATIONS, writePackageV2, committedDates } from "../../../scripts/lib/v2-transforms.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const DATA = join(HERE, "..", "data");
const SRC = join(ROOT, "research/gares-routieres/sogral-stations-clean.json");

// OSM-verified coordinate fixes for the 3 records SOGRAL ships broken.
const COORD_FIX = {
  86: { lat: 33.1064, lng: 6.0721, geo_precision: "exact" }, // TOUGGOURT
  87: { lat: 24.5532, lng: 9.4841, geo_precision: "exact" }, // DJANET
  // 85 GUELMA has no usable coord → filled from the Guelma commune centroid below.
};

const raw = JSON.parse(readFileSync(SRC, "utf-8"));
const communes = loadCommunes();
const guelma = communes.find((c) => c.name_fr === "Guelma");

const records = raw.map((r) => {
  let lat = r.lat, lng = r.lng, geo_precision = r.geo_precision;
  const fix = COORD_FIX[r.id];
  if (fix) { lat = fix.lat; lng = fix.lng; geo_precision = fix.geo_precision; }
  if (r.id === 85 && guelma) { lat = round6(guelma.latitude); lng = round6(guelma.longitude); geo_precision = "approx"; }
  return {
    id: null, // {wilaya}-{seq} assigned after commune join
    sogral_id: r.id,
    sogral_code: r.sogral_code,
    name: r.name,
    official_name: r.official_name,
    address: r.address,
    wilaya_code: r.wilaya_code, // provisional; overwritten by commune join
    commune: null,
    commune_code: null,
    lat, lng, geo_precision,
    surface_total_m2: r.surface_total_m2,
    surface_built_m2: r.surface_built_m2,
    source: "https://live.sogral.com/api/live/agencies",
  };
});

// Spatial-join commune + wilaya (reconciles legacy wilaya codes to geoalgeria).
attachCommune(records, communes);
// Fail loudly on any ungeocoded station — never ship an un-reconciled wilaya_code.
const ungeocoded = records.filter((r) => !Number.isFinite(r.lat) || !Number.isFinite(r.lng));
if (ungeocoded.length) {
  throw new Error(`${ungeocoded.length} ungeocoded station(s): ${ungeocoded.map((r) => r.name).slice(0, 5).join(", ")} — add a COORD_FIX entry or centroid fallback in fetch.mjs`);
}

// Stable ids: {wilaya}-{seq}, sorted by wilaya then sogral_id.
records.sort((a, b) => a.wilaya_code.localeCompare(b.wilaya_code) || a.sogral_id - b.sogral_id);
const seq = {};
for (const r of records) {
  seq[r.wilaya_code] = (seq[r.wilaya_code] || 0) + 1;
  r.id = `${r.wilaya_code}-${String(seq[r.wilaya_code]).padStart(2, "0")}`;
}

// ---- Emit v2 via the shared writer (map → canonical GeoRecord + metadata) ----
// Raws are staged (no live fetch), so the dates are always the committed ones.
const cfg = MIGRATIONS["gares-routieres"];
const { updated, retrieved } = committedDates(DATA);
const { records: final, metadata } = writePackageV2({
  pkg: "gares-routieres",
  dir: DATA,
  files: [{ file: "stations.json", rows: records.map(cfg.map) }],
  meta: cfg.meta,
  updated,
  retrieved,
});

console.log(`gares-routieres: ${final.length} stations → v2 · ${metadata.wilayas_covered} wilayas · geocoded ${metadata.geocoded_count}/${final.length}`);
