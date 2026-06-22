#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_PATH = join(ROOT, "research/formation-professionnelle/takwin-etab-raw.json");
const PKG = join(ROOT, "packages/formation-professionnelle");
const DATA = join(PKG, "data");

const TYPE_MAP = {
  4: "ifep",
  5: "dfep",
  6: "insfp",
  7: "iep",
  8: "cfpa",
  9: "annexe_cfpa",
  10: "annexe_cnfepd",
  11: "annexe_insfp",
  12: "prive",
  13: "infep",
};

const TYPE_LABELS = {
  4: "معهد التكوين والتعليم المهنيين",
  5: "مديرية التكوين والتعليم المهنيين",
  6: "معهد وطني متخصص في التكوين المهني",
  7: "معهد التعليم المهني",
  8: "مركز التكوين المهني والتمهين",
  9: "ملحقة مركز التكوين المهني والتمهين",
  10: "ملحقة المركز الوطني للتكوين والتعليم المهنيين عن بعد",
  11: "ملحقة معهد وطني متخصص في التكوين المهني",
  12: "مؤسسة خاصة معتمدة",
  13: "معهد وطني للتكوين والتعليم المهنيين",
};

const SWAPPED_IDS = new Set([1323, 1330]);
const NONSENSE_IDS = new Set([1997]);
const LAT_MIN = 18, LAT_MAX = 38, LNG_MIN = -9, LNG_MAX = 12;

function cleanCoords(raw) {
  let lat = parseFloat(raw.Latitude);
  let lng = parseFloat(raw.Longitude);

  if (SWAPPED_IDS.has(raw.IDetablissement)) {
    [lat, lng] = [lng, lat];
  }
  if (NONSENSE_IDS.has(raw.IDetablissement)) {
    return { lat: null, lng: null };
  }
  if (lat === 0 || lng === 0) {
    return { lat: null, lng: null };
  }
  if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) {
    return { lat: null, lng: null };
  }
  return { lat: round6(lat), lng: round6(lng) };
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

function parseCommune(communNom) {
  if (!communNom) return null;
  const idx = communNom.indexOf("_");
  return idx > 0 ? communNom.slice(0, idx).trim() : communNom.trim();
}

function parseVocations(raw) {
  if (!raw) return null;
  let parts = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1 && raw.includes(" - ")) {
    parts = raw.split(" - ").map((s) => s.trim()).filter(Boolean);
  }
  if (parts.length <= 1 && raw.includes(". ")) {
    parts = raw.split(". ").map((s) => s.trim()).filter(Boolean);
  }
  return parts.length > 0 ? parts : null;
}

function trimOrNull(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
}

function numOrNull(val) {
  return val && val !== 0 ? val : null;
}

function wilayaCode(iddfep) {
  if (iddfep === 99) return "16";
  return String(iddfep).padStart(2, "0");
}

// --- Main ---

const raw = JSON.parse(readFileSync(RAW_PATH, "utf-8")).data;
console.log(`Raw records: ${raw.length}`);

const filtered = raw.filter((r) => r.IDNature_etsF !== 1);
console.log(`After excluding ministry HQ: ${filtered.length}`);

const records = filtered.map((r) => {
  const { lat, lng } = cleanCoords(r);
  return {
    id: 0,
    name: trimOrNull(r.Nom) || trimOrNull(r.Code) || `ID-${r.IDetablissement}`,
    name_fr: trimOrNull(r.NomFr),
    type: TYPE_MAP[r.IDNature_etsF],
    type_label: TYPE_LABELS[r.IDNature_etsF],
    abreviation: trimOrNull(r.AbrFr) || trimOrNull(r.Abr),
    code: r.Code,
    secteur: r.IDNature_etsF === 12 ? "prive" : "public",
    commune: parseCommune(r.CommunnNom),
    wilaya_code: wilayaCode(r.IDDFEP),
    lat,
    lng,
    adresse: trimOrNull(r.Adres),
    adresse_fr: trimOrNull(r.adresFr),
    telephone: trimOrNull(r.Tel),
    fax: trimOrNull(r.Fax),
    email: trimOrNull(r.Email),
    site_web: trimOrNull(r.Site),
    facebook: trimOrNull(r.Fb),
    capacite: numOrNull(r.CapaciteT),
    capacite_reelle: numOrNull(r.CapaciteR),
    surface_m2: numOrNull(r.surface),
    internat: r.internat === 1,
    capacite_internat: numOrNull(r.CapaciteInternaT),
    vocations: parseVocations(r.Vocation),
    source: "takwin.dz (MFEP)",
  };
});

const TYPE_ORDER = Object.values(TYPE_MAP);
records.sort((a, b) => {
  if (a.wilaya_code !== b.wilaya_code) return a.wilaya_code.localeCompare(b.wilaya_code);
  const ta = TYPE_ORDER.indexOf(a.type), tb = TYPE_ORDER.indexOf(b.type);
  if (ta !== tb) return ta - tb;
  return 0;
});

records.forEach((r, i) => { r.id = i + 1; });

const geocoded = records.filter((r) => r.lat !== null).length;
const byType = {};
const bySecteur = { public: 0, prive: 0 };
const wilayaSet = new Set();
for (const r of records) {
  byType[r.type] = (byType[r.type] || 0) + 1;
  bySecteur[r.secteur]++;
  wilayaSet.add(r.wilaya_code);
}

const metadata = {
  source: "Ministère de la Formation et de l'Enseignement Professionnels (takwin.dz)",
  origin: "https://takwin.dz/tachbik/api/getlistofalletab_byiddfep_puball/",
  license: "Data © MFEP; redistributed for reference. See LICENSE.",
  establishments: records.length,
  by_type: byType,
  by_secteur: bySecteur,
  geocoded,
  wilayas_covered: wilayaSet.size,
  generated_at: new Date().toISOString().slice(0, 10),
};

// --- Write JSON ---

mkdirSync(join(DATA, "csv"), { recursive: true });
mkdirSync(join(DATA, "geojson"), { recursive: true });

writeFileSync(join(DATA, "establishments.json"), JSON.stringify(records, null, 2) + "\n");
writeFileSync(join(DATA, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n");
console.log(`JSON: ${records.length} establishments, ${geocoded} geocoded`);

// --- Write CSV ---

const CSV_FIELDS = [
  "id", "name", "name_fr", "type", "type_label", "abreviation", "code",
  "secteur", "commune", "wilaya_code", "lat", "lng",
  "adresse", "adresse_fr", "telephone", "fax", "email", "site_web", "facebook",
  "capacite", "capacite_reelle", "surface_m2", "internat", "capacite_internat",
  "vocations", "source",
];

function csvEscape(val) {
  if (val == null) return "";
  if (Array.isArray(val)) val = val.join("; ");
  if (typeof val === "boolean") val = val ? "true" : "false";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const csvHeader = CSV_FIELDS.join(",");
const csvRows = records.map((r) => CSV_FIELDS.map((f) => csvEscape(r[f])).join(","));
writeFileSync(join(DATA, "csv/establishments.csv"), csvHeader + "\n" + csvRows.join("\n") + "\n");
console.log(`CSV: ${csvRows.length} data rows`);

// --- Write GeoJSON ---

const geoFeatures = records
  .filter((r) => r.lat !== null && r.lng !== null)
  .map((r) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [r.lng, r.lat] },
    properties: { ...r },
  }));

const geojson = { type: "FeatureCollection", features: geoFeatures };
writeFileSync(join(DATA, "geojson/establishments.geojson"), JSON.stringify(geojson, null, 2) + "\n");
console.log(`GeoJSON: ${geoFeatures.length} features`);

console.log("\nMetadata:", JSON.stringify(metadata, null, 2));
