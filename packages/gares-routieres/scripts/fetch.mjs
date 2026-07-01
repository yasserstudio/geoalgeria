// @geoalgeria/gares-routieres — build Algeria's intercity bus stations (gares
// routières) from the cleaned SOGRAL registry.
// Source: SOGRAL (live.sogral.com/api/live/agencies), staged + decoded in
// research/gares-routieres/. Here we fix 3 bad coords, spatial-join commune/wilaya
// against the geoalgeria commune set (which also reconciles SOGRAL's legacy
// 48-wilaya codes to the 58/69 model), assign ids, and emit JSON/CSV/GeoJSON.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { toCSV, toGeoJSON, loadCommunes, attachCommune, round6 } from "../../../scripts/lib/build-utils.mjs";

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

const wilayas = new Set(records.map((r) => r.wilaya_code));
const metadata = {
  source: "SOGRAL — EPE SOGRAL Spa, Société de Gestion des Gares Routières d'Algérie",
  origin: "https://live.sogral.com/api/live/agencies",
  license: "Data © SOGRAL; redistributed for reference. See LICENSE.",
  stations: records.length,
  wilayas_covered: wilayas.size,
  geocoded: records.filter((r) => r.lat != null).length,
  geo_precision_note: "Coordinates from SOGRAL; 3 were fixed (Touggourt/Djanet from OSM; Guelma is the commune centroid, geo_precision=approx).",
  linkage_note: "wilaya_code/commune are a nearest-centroid join against the geoalgeria commune set; this also reconciles SOGRAL's legacy 48-wilaya codes to the 58/69 model. Join wilaya_code against `geoalgeria` for names.",
  generated_at: new Date().toISOString().slice(0, 10),
};

const COLS = ["id","sogral_id","sogral_code","name","official_name","address","wilaya_code","commune","commune_code","lat","lng","geo_precision","surface_total_m2","surface_built_m2","source"];
mkdirSync(join(DATA, "csv"), { recursive: true });
mkdirSync(join(DATA, "geojson"), { recursive: true });
writeFileSync(join(DATA, "stations.json"), JSON.stringify(records, null, 2) + "\n");
writeFileSync(join(DATA, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n");
writeFileSync(join(DATA, "csv/stations.csv"), toCSV(records, COLS));
writeFileSync(join(DATA, "geojson/stations.geojson"), JSON.stringify(toGeoJSON(records), null, 2) + "\n");

console.log(`gares-routieres: ${records.length} stations · ${wilayas.size} wilayas · geocoded ${metadata.geocoded}/${records.length}`);
const byPrec = {}; records.forEach((r) => (byPrec[r.geo_precision] = (byPrec[r.geo_precision] || 0) + 1));
console.log("geo_precision:", JSON.stringify(byPrec));
console.log("sample:", JSON.stringify(records.find((r) => r.name === "ALGER")));
