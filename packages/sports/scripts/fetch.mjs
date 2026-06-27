#!/usr/bin/env node
/**
 * Fetch Algeria's sports infrastructure from the MJS GeoServer (kharitaDZ)
 * and emit JSON, CSV, and GeoJSON to ../data.
 *
 * Source: https://sig.mjs.gov.dz/dashboard/viewer
 *   The MJS (Ministry of Youth and Sports) runs a GeoServer behind a
 *   Nuxt dashboard. The "infrastructures_sportives" WMS layer is publicly
 *   queryable. We request all features as GeoJSON via the WMS GetMap endpoint
 *   (format=application/json;type=geojson), which bypasses the auth-gated WFS.
 *
 * Each raw record carries ~35 fields; we keep the ones useful to consumers:
 * name, type, address, commune/daira/wilaya, capacity, built/land area, year
 * of reception, operational status, PMR accessibility, and GPS coordinates.
 *
 * Wilaya names from the source are French (all-caps, no diacritics). We resolve
 * them to numeric wilaya_code using a normalisation map built from the flagship
 * dataset's 69 wilayas.
 *
 * Usage: node scripts/fetch.mjs
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const DATASET = join(__dirname, "..", "..", "dataset", "data");

const WMS_URL =
  "https://sig.mjs.gov.dz/api/v1.0/geoserver/public/wms?" +
  "service=WMS&version=1.1.1&request=GetMap" +
  "&layers=infrastructures_sportives" +
  "&bbox=-9,18,12,38&width=1&height=1&srs=EPSG:4326" +
  "&format=application/json;type=geojson";

const SOURCE = "https://sig.mjs.gov.dz/dashboard/viewer";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const MIN_EXPECTED = 4000;

// Infrastructure type codes — short, stable keys for the 27 types the source publishes.
const TYPE_MAP = {
  "Terrains Sportif de Proximité": { code: "TSP", fr: "Terrain sportif de proximité" },
  "Aire de Jeux Football": { code: "AJF", fr: "Aire de jeux football" },
  "Salle OMS": { code: "SOMS", fr: "Salle OMS" },
  "Salle Spécialisée": { code: "SS", fr: "Salle spécialisée" },
  "Bassin de Natation": { code: "BN", fr: "Bassin de natation" },
  "Piscine 25m": { code: "P25", fr: "Piscine 25 m" },
  "Piscine de Proximité": { code: "PP", fr: "Piscine de proximité" },
  "Terrain de football": { code: "TF", fr: "Terrain de football" },
  "Stade de Football": { code: "SF", fr: "Stade de football" },
  "Stade OMS": { code: "STOMS", fr: "Stade OMS" },
  "Stade  OMS": { code: "STOMS", fr: "Stade OMS" },
  "Piste d'athlétisme": { code: "PA", fr: "Piste d'athlétisme" },
  "Boulodrome": { code: "BL", fr: "Boulodrome" },
  "Court de tennis": { code: "CT", fr: "Court de tennis" },
  "Unité  d'hébergement, de soin et de réccupuration": { code: "UHR", fr: "Unité d'hébergement et de récupération" },
  "Unité d'hébergement, de soin et de réccupuration": { code: "UHR", fr: "Unité d'hébergement et de récupération" },
  "Piscine 50m": { code: "P50", fr: "Piscine 50 m" },
  "Stade d'Athletisme": { code: "SA", fr: "Stade d'athlétisme" },
  "Centre Equestre": { code: "CE", fr: "Centre équestre" },
  "Base Nautique": { code: "BNA", fr: "Base nautique" },
  "Complexes sportif": { code: "CXS", fr: "Complexe sportif" },
  "aire de jeux de loisirs": { code: "AJL", fr: "Aire de jeux de loisirs" },
  "Champ de tir": { code: "CDT", fr: "Champ de tir" },
  "Centre de regroupement et de préparation": { code: "CRP", fr: "Centre de regroupement et de préparation" },
  "Ecole de jeunes talents": { code: "EJT", fr: "École de jeunes talents" },
  "terrain de replique": { code: "TR", fr: "Terrain de réplique" },
  "REALISATION, EQUIPEMENT  D'UN  ETABLISSEMENT D'EDUCATION PHYSIQUE ET SPORTIVE": { code: "EPS", fr: "Établissement d'éducation physique et sportive" },
  "REALISATION, EQUIPEMENT D'UN ETABLISSEMENT D'EDUCATION PHYSIQUE ET SPORTIVE": { code: "EPS", fr: "Établissement d'éducation physique et sportive" },
  "Grand Stade": { code: "GS", fr: "Grand stade" },
  "centre de formation regional": { code: "CFR", fr: "Centre de formation régional" },
};

// Wilaya name normalisation: MJS uses uppercase ASCII French; the flagship
// uses accented Title Case. We strip diacritics and case to match.
function buildWilayaMap() {
  const wilayas = JSON.parse(readFileSync(join(DATASET, "wilayas.json"), "utf-8")).wilayas;
  const map = {};
  for (const w of wilayas) {
    const code = String(w.code).padStart(2, "0");
    map[normalise(w.name_fr)] = code;
  }
  return map;
}

function normalise(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// MJS uses variant names for some new wilayas; map them to the flagship form.
const WILAYA_ALIASES = {
  "AIN SALAH": "IN SALAH",
  "AIN GUEZZAM": "IN GUEZZAM",
  "EL MEGHAIER": "EL M GHAIR",
  "EL MENIA": "EL MENIAA",
};

// Algeria bounding box.
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat !== 0 && lng !== 0 &&
  lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

const clean = (s) => {
  if (s == null) return null;
  const v = String(s).replace(/\s+/g, " ").trim();
  return v === "" ? null : v;
};

// Strip the "uuid:" prefix the GIS puts on referential values.
const stripUUID = (s) => {
  if (s == null) return null;
  const v = String(s);
  const idx = v.indexOf(":");
  if (idx > 0 && idx < 40 && /^[0-9a-f-]+$/.test(v.slice(0, idx))) {
    return clean(v.slice(idx + 1));
  }
  return clean(v);
};

function parseYear(v) {
  const s = stripUUID(v);
  if (!s) return null;
  const m = s.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function parseCapacity(v) {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseSurface(v) {
  if (v == null) return null;
  const s = String(v).replace(/,/g, ".").replace(/[^\d.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// --- writers ---------------------------------------------------------------
function toCSV(rows, cols) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
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

const writeJSON = (p, obj) => writeFileSync(join(DATA, p), JSON.stringify(obj, null, 2) + "\n");
const writeText = (p, txt) => writeFileSync(join(DATA, p), txt);

// --- main ------------------------------------------------------------------
async function main() {
  console.log("Fetching MJS sports infrastructure from GeoServer…");
  const res = await fetch(WMS_URL, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`WMS request failed: HTTP ${res.status}`);
  const raw = await res.json();

  if (!raw.features || !Array.isArray(raw.features)) {
    throw new Error("unexpected response — no features array");
  }
  if (raw.features.length < MIN_EXPECTED) {
    throw new Error(`only ${raw.features.length} features; expected >= ${MIN_EXPECTED}`);
  }
  console.log(`  fetched ${raw.features.length} raw features`);

  const wilayaMap = buildWilayaMap();
  const facilities = [];
  const dropped = [];
  const unknownTypes = new Set();
  const unmappedWilayas = new Set();

  for (const feat of raw.features) {
    const p = feat.properties;
    if (p.deleted === true || p.deleted === "true") continue;

    // Coordinates
    const coords = feat.geometry?.coordinates;
    if (!coords) { dropped.push({ id: p.id, reason: "no geometry" }); continue; }
    let [lng, lat] = coords;
    if (!inAlgeria(lat, lng)) {
      if (inAlgeria(lng, lat)) { [lat, lng] = [lng, lat]; }
      else { dropped.push({ id: p.id, reason: "out of bounds" }); continue; }
    }

    // Type — try exact match first, then whitespace-normalised
    const typeRaw = stripUUID(p.type_de_linfrastructure);
    let typeEntry = typeRaw ? TYPE_MAP[typeRaw] : null;
    if (!typeEntry && typeRaw) {
      const norm = typeRaw.replace(/\s+/g, " ").replace(/[‘’“”]/g, "'").trim();
      typeEntry = TYPE_MAP[norm] || Object.entries(TYPE_MAP).find(
        ([k]) => k.replace(/\s+/g, " ").replace(/[‘’“”]/g, "'").trim() === norm,
      )?.[1] || null;
    }
    if (typeRaw && !typeEntry) unknownTypes.add(typeRaw);

    // Wilaya → code
    const wilayaName = stripUUID(p.wilaya);
    const normWilaya = wilayaName ? normalise(wilayaName) : null;
    const wilayaCode = normWilaya
      ? wilayaMap[normWilaya] || wilayaMap[WILAYA_ALIASES[normWilaya]] || null
      : null;
    if (wilayaName && !wilayaCode) unmappedWilayas.add(wilayaName);

    // Operational status
    const funcRaw = stripUUID(p.fonctionnelle);
    const operational = funcRaw
      ? funcRaw.toLowerCase().startsWith("fonctionnel") ? true
      : funcRaw.toLowerCase().includes("non") ? false
      : null
      : null;

    // PMR accessibility
    const pmrRaw = p["accessibilite_aux_personnes_a_mobilite_reduite(pmr)"];
    const pmr = pmrRaw === "true" || pmrRaw === true ? true
      : pmrRaw === "false" || pmrRaw === false ? false
      : null;

    facilities.push({
      id: p.id,
      name: clean(p.nomination_de_linfrastructure),
      type_code: typeEntry?.code ?? null,
      type_fr: typeEntry?.fr ?? typeRaw ?? null,
      address: clean(p.adresse_de_linfrastructure),
      commune: stripUUID(p.commune),
      daira: stripUUID(p.daira),
      wilaya_code: wilayaCode,
      wilaya_name: wilayaName,
      capacity: parseCapacity(p.capacite_daccueil),
      year: parseYear(p.annee_de_reception),
      operational,
      pmr,
      surface_built_m2: parseSurface(p.surface_batie_m),
      surface_land_m2: parseSurface(p.surface_dassiette__m),
      lat,
      lng,
      source: SOURCE,
    });
  }

  if (unknownTypes.size) {
    throw new Error(`unknown type(s): ${[...unknownTypes].join(", ")} — extend TYPE_MAP`);
  }
  if (unmappedWilayas.size) {
    throw new Error(`unmapped wilaya(s): ${[...unmappedWilayas].join(", ")} — extend WILAYA_ALIASES`);
  }

  // Sort by wilaya then type then name
  facilities.sort((a, b) =>
    (a.wilaya_code || "99").localeCompare(b.wilaya_code || "99") ||
    (a.type_code || "").localeCompare(b.type_code || "") ||
    (a.name || "").localeCompare(b.name || ""),
  );

  const overflow = facilities.filter(r => {
    const c = Number(r.wilaya_code);
    return !Number.isFinite(c) || c < 1 || c > 69;
  });
  if (overflow.length) {
    throw new Error(`wilaya_code out of [1,69]: ${overflow.length} record(s)`);
  }

  // Assign stable sequential ids
  facilities.forEach((f, i) => { f.id = i + 1; });

  // --- summaries ---
  const byType = {};
  for (const f of facilities) {
    const k = f.type_code || "OTHER";
    byType[k] = (byType[k] || 0) + 1;
  }
  const wilayasCovered = new Set(facilities.map((f) => f.wilaya_code).filter(Boolean)).size;

  const cols = [
    "id", "name", "type_code", "type_fr", "address",
    "commune", "daira", "wilaya_code", "wilaya_name",
    "capacity", "year", "operational", "pmr",
    "surface_built_m2", "surface_land_m2", "lat", "lng", "source",
  ];

  mkdirSync(join(DATA, "csv"), { recursive: true });
  mkdirSync(join(DATA, "geojson"), { recursive: true });
  writeJSON("facilities.json", facilities);
  writeText("csv/facilities.csv", toCSV(facilities, cols));
  writeJSON("geojson/facilities.geojson", toGeoJSON(facilities));
  writeJSON("metadata.json", {
    source: "Ministry of Youth and Sports — SIG (sig.mjs.gov.dz)",
    origin: SOURCE,
    license: "Data © Ministry of Youth and Sports; redistributed for reference. See README.",
    facilities: facilities.length,
    by_type: byType,
    wilayas_covered: wilayasCovered,
    dropped: dropped.length,
    generated_at: new Date().toISOString().slice(0, 10),
  });

  console.log(`\nType breakdown:`);
  for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    const entry = Object.values(TYPE_MAP).find((e) => e.code === k);
    console.log(`  ${String(v).padStart(5)}  ${k.padEnd(6)} ${entry?.fr || k}`);
  }
  if (dropped.length) {
    console.log(`\nDropped ${dropped.length} record(s).`);
  }
  console.log(
    `\nWrote ${facilities.length} facilities across ${wilayasCovered} wilayas to ${DATA}.`,
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
