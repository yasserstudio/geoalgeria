// @geoalgeria/gares-routieres — build Algeria's intercity bus stations (gares
// routières) from the cleaned SOGRAL registry.
// Source: SOGRAL (live.sogral.com/api/live/agencies), staged + decoded in
// research/gares-routieres/. Here we fix 3 bad coords, spatial-join commune/wilaya
// against the geoalgeria commune set (which also reconciles SOGRAL's legacy
// 48-wilaya codes to the 58/69 model), assign ids, and emit JSON/CSV/GeoJSON.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadCommunes, attachCommune, round6, wcode } from "../../../scripts/lib/build-utils.mjs";
import {
  MIGRATIONS,
  writePackageV2,
  committedDates,
  carryOverIds,
  readCommitted,
} from "../../../scripts/lib/v2-transforms.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const DATA = join(HERE, "..", "data");
const SRC = join(ROOT, "research/gares-routieres/sogral-stations-clean.json");
// MAHATATI departure-agency ids per station name, staged from the public
// departure-station list (identifiers only; 73 of 74 stations serve as
// MAHATATI departure agencies, IN SALEH does not).
const AGENCIES = JSON.parse(
  readFileSync(join(ROOT, "research/gares-routieres/mahatati-agency-ids.json"), "utf-8"),
).agencies;

// OSM-verified coordinate fixes for the records SOGRAL ships broken.
//
// A wrong coordinate is never only a wrong dot here: `attachCommune` below
// derives wilaya and commune from the point and overwrites the source's own
// wilaya_code with them, so a station lands in the wrong wilaya AND is renamed
// after whatever commune it fell in. SOGRAL's EL OUED was published as
// "Krakda", 540 km away. In every case below the source's own wilaya_code,
// official_name and address already said where the station is; only the
// coordinate disagreed.
//
// The recurring corruption is a longitude that lost its sign. Where OSM has the
// gare mapped, it sits at the source's own latitude with the longitude negated,
// which is what confirms the diagnosis rather than merely fitting it.
const COORD_FIX = {
  86: { lat: 33.1064, lng: 6.0721, geo_precision: "exact" }, // TOUGGOURT
  87: { lat: 24.5532, lng: 9.4841, geo_precision: "exact" }, // DJANET
  // 85 GUELMA has no usable coord → filled from the Guelma commune centroid below.
  // TINDOUF ships with the longitude's sign flipped (+8.125 for a station at
  // 8.13°W), which also mis-derived wilaya 33/Illizi from the wrong point.
  // OSM node 4593158192 (سوقرال محطة تندوف).
  23: { lat: 27.6664, lng: -8.1254, geo_precision: "exact" },

  // Sign-flipped longitudes, all four confirmed against the source's own
  // wilaya_code (13, 13, 45, 45) which the bad points overrode.
  // MAGHENIA: OSM way 1214562347 "Maghnia Bus Station", the source's latitude
  // to 4 dp with the longitude negated. Published as "Faidja", 320 km away.
  81: { lat: 34.8415, lng: -1.7734, geo_precision: "exact" },
  // AIN SEFRA: OSM way 307745928 "Gare routière". Same latitude, negated
  // longitude. Published as "Labiodh Sidi Cheikh", 110 km away.
  26: { lat: 32.7636, lng: -0.5963, geo_precision: "exact" },
  // NAAMA: OSM way 304431817 "Gare routière de Nâama". Same latitude, negated
  // longitude. Published as "El Mehara", 58 km away.
  59: { lat: 33.2814, lng: -0.3072, geo_precision: "exact" },
  // SEBDOU: the one flip OSM cannot corroborate, because no gare is mapped at
  // Sebdou at all. This is the source's own coordinate with the sign restored,
  // which lands 2 km north of Sebdou town on the Cité Tebouda side its address
  // names. Published as "Naima", 241 km away.
  66: { lat: 34.6566, lng: -1.3082, geo_precision: "exact" },

  // Not sign flips: these two carry a longitude unrelated to the station.
  // EL OUED: OSM way 433835302 "المحطة البرية لنقل المسافرين المجاهد لخضر بن عمر",
  // which is this record's official_name. Source longitude 1.0277 for a station
  // at 6.86°E. Published as "Krakda", 542 km away.
  46: { lat: 33.3362, lng: 6.8612, geo_precision: "exact" },
  // RELIZANE: OSM way 293130423 "Gare routière Ouest Relizane", 600 m from OSM
  // node 869351826 "Bendaoud", the commune this record's address names ("Commune
  // de Ben Daoud Relizane"); Relizane's other gare, "Est", is not it. The source
  // kept the latitude and lost the longitude entirely (-0.2215 for 0.52°E).
  // Published as "Marsat El Hadjadj", 70 km away.
  64: { lat: 35.7228, lng: 0.5250, geo_precision: "exact" },
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
    mahatati_agency: AGENCIES[r.name] ?? null,
    surface_total_m2: r.surface_total_m2,
    surface_built_m2: r.surface_built_m2,
    source: "https://live.sogral.com/api/live/agencies",
  };
});

// Spatial-join commune + wilaya (reconciles legacy wilaya codes to geoalgeria).
attachCommune(records, communes);

// Commune overrides for stations the centroid join mislabels. Communes have no
// polygons here, so `attachCommune` assigns the nearest commune centre within
// the containing wilaya, and a station sitting between two centres can land on
// the wrong one even with a correct coordinate. Each case below is confirmed by
// OSM's admin_level-8 boundary containing the point, and in each the source's
// own record already named the commune the join contradicted.
// GHERDAIA: the new gare at Bouhraoua, the northern entrance of Ghardaïa on the
// RN1 (OSM maps a "Gare routière" 100 m from the point). 6.46 km from Dhayet
// Bendhahoua's centre vs 6.57 km from Ghardaïa's, so a 110 m margin published
// it as "Dhayet Bendhahoua" while the source's address says "Bouheraoua commune
// de ghardaia" and its city says GHARDAIA. Reader-reported (r/algeria,
// 2026-08-13).
// EL OUED: 2.6 km from Bayadha's centre vs 2.8 km from El-Oued's; OSM puts the
// point in El-Oued commune, where the source's own city field puts it too.
// BLIDA: published as "Ouled Yaich" on a 200 m margin. The source's city says
// BLIDA, its address says "Cité Ramoul Blida", and OSM's boundary agrees.
// DJAMAA: published as "Sidi Amrane". The source's city says DJAMAA, its
// address says "cité 19 Mars 1962 Djamaa", and OSM's boundary agrees.
// (An OSM sweep of every knife-edge join also disputes BISKRA, ALGER,
// ALI MENDJILI and BOUHNIFIFIA, but there OSM contradicts the source's own
// city field too, so those stay as joined until better evidence exists.)
const COMMUNE_FIX = { 47: "Ghardaia", 46: "El-Oued", 32: "Blida", 41: "Djamaa" };
for (const r of records) {
  const name = COMMUNE_FIX[r.sogral_id];
  if (!name) continue;
  const c = communes.find((x) => x.name_fr === name && wcode(x.wilaya_code) === r.wilaya_code);
  if (!c) throw new Error(`COMMUNE_FIX: no commune "${name}" in wilaya ${r.wilaya_code}`);
  r.commune = c.name_fr;
  r.commune_code = c.code_commune ?? null;
}

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

// Pin committed ids by station name so a resequencing can never renumber a
// neighbour. A retired id never pins and stays reserved forever: when a
// correction moves a station to its real wilaya (TINDOUF, 33-01 → 37-01),
// the old id is added to retired-ids.json so no future wilaya-33 station can
// silently inherit it.
const retired = JSON.parse(readFileSync(join(DATA, "retired-ids.json"), "utf-8")).ids;
carryOverIds(
  records,
  readCommitted(DATA, "stations.json")
    .filter((r) => !retired.includes(r.id))
    .concat(retired.map((id) => ({ id }))),
  (r) => r.name,
  "gares-routieres",
);

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
