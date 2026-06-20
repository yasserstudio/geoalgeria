#!/usr/bin/env node
/**
 * Build @geoalgeria/enseignement-superieur — Algeria's higher-education network
 * (universities, grandes écoles, écoles normales supérieures, centres
 * universitaires) from the Ministère de l'Enseignement Supérieur (MESRS), and
 * emit JSON, CSV, and GeoJSON to ../data.
 *
 * Source (public): https://www.mesrs.dz/en/university-network/  (see mesrs.mjs)
 *   The ministry's listing gives each institution's official French name and its
 *   own website — but NO coordinates and no address. So this build supplies the
 *   geography itself, transparently:
 *
 *   - wilaya + commune come from the flagship `geoalgeria` dataset: every shipped
 *     coordinate is reconciled to its nearest flagship commune, and `wilaya_code`
 *     is that commune's — authoritative and in the 69-wilaya scheme.
 *   - coordinates are OSM/Nominatim campus geocodes captured once into
 *     scripts/seeds/coordinates.json (run `node scripts/geocode.mjs` to refresh).
 *     Each is cross-checked: if the geocoded point's wilaya disagrees with the
 *     wilaya named in the institution's title, the geocode is rejected and the
 *     record falls back to the wilaya centroid. `geo_precision` records which
 *     placement each row got: "campus" (geocoded point), or "wilaya" (centroid
 *     fallback). Names remain 100% MESRS; coordinates are a labelled enrichment.
 *
 * Usage: node scripts/fetch.mjs
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PAGE, getHtml, parseInstitutions, instKey, MIN_EXPECTED } from "./mesrs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const REF = join(__dirname, "..", "..", "dataset", "data", "geojson");
const SEED = join(__dirname, "seeds", "coordinates.json");
const OVERRIDES_FILE = join(__dirname, "seeds", "overrides.json");

// At least this share of records must carry a real campus geocode, else the build
// is assumed degraded (a missing/empty coordinate seed, or a geocode regression)
// and fails rather than silently shipping an all-centroid dataset. Headroom: the
// healthy build is ~55% campus.
const MIN_CAMPUS_RATIO = 0.4;

// Read a committed seed file, failing with the file path on corruption (vs a bare
// SyntaxError) — keeps the loud-and-clear failure style of the rest of the build.
function readSeed(path) {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`${path}: corrupt seed JSON — ${e.message}`);
  }
}

// Algeria's bounding box (matches the repo's other geocoded validators). An exact
// 0 on either axis is a placeholder, not a real reading.
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat !== 0 && lng !== 0 && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

// --- flagship geo reference -------------------------------------------------
const communeFC = JSON.parse(readFileSync(join(REF, "communes.geojson"), "utf8"));
const COMMUNES = communeFC.features
  .map((f) => ({
    lat: f.geometry?.coordinates?.[1],
    lng: f.geometry?.coordinates?.[0],
    code: Number(f.properties?.wilaya_code),
    name: f.properties?.name_fr,
  }))
  .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));

const wilayaFC = JSON.parse(readFileSync(join(REF, "wilayas.geojson"), "utf8"));
const WILAYA = new Map(); // code -> { name_fr, lat, lng }
for (const f of wilayaFC.features) {
  const code = Number(f.properties?.code);
  const [lng, lat] = f.geometry?.coordinates || [];
  WILAYA.set(code, { name_fr: f.properties?.name_fr, lat, lng });
}

// Place→wilaya text resolver. Matches the institution name against WILAYA NAMES
// only (not all 1,528 communes): wilaya names are distinctive and rarely appear
// as an honorific, so this stays free of the eponym false-matches that scanning
// every commune would invite ("Université de Béjaïa" → 06, but "…– Saad Dahlab"
// matches nothing). Used as a cross-check on each geocode and as the fallback.
const normTok = (s) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const WILAYA_BY_NAME = new Map();
for (const [code, w] of WILAYA) {
  const n = normTok(w.name_fr);
  if (n) WILAYA_BY_NAME.set(n, code);
}
function wilayaFromName(name) {
  const toks = normTok(name).split(" ").filter(Boolean);
  for (let i = toks.length; i > 0; i--) {
    for (let len = Math.min(3, i); len >= 1; len--) {
      const phrase = toks.slice(i - len, i).join(" ");
      if (WILAYA_BY_NAME.has(phrase)) return WILAYA_BY_NAME.get(phrase);
    }
  }
  return null;
}

// Commune lookup by (name, wilaya_code) for the curated overrides — resolves a
// hand-asserted commune to its flagship centroid + code (so override coordinates
// are still the authoritative flagship data, never typed by hand).
const COMMUNE_BY_NW = new Map();
for (const c of COMMUNES) COMMUNE_BY_NW.set(`${normTok(c.name)}|${c.code}`, c);
const communeByName = (name, code) => COMMUNE_BY_NW.get(`${normTok(name)}|${Number(code)}`) || null;

const toRad = (d) => (d * Math.PI) / 180;
function nearestCommune(lat, lng) {
  let best = null, bd = Infinity;
  for (const c of COMMUNES) {
    const x = toRad(lng - c.lng) * Math.cos(toRad((lat + c.lat) / 2));
    const y = toRad(lat - c.lat);
    const d = x * x + y * y;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// --- writers (shared verbatim with the other packages) ----------------------
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

// --- main -------------------------------------------------------------------
async function main() {
  console.log("Fetching MESRS university network…");
  const html = await getHtml();
  const insts = parseInstitutions(html);
  if (insts.length < MIN_EXPECTED) {
    throw new Error(`parsed ${insts.length} institutions; expected >= ${MIN_EXPECTED} — the listing markup may have changed`);
  }
  console.log(`  parsed ${insts.length} institutions`);

  const seed = readSeed(SEED);
  if (!Object.keys(seed).length) {
    console.warn("  ⚠️  no coordinate seed found — run `node scripts/geocode.mjs` first (the MIN_CAMPUS_RATIO guard below will fail this build)");
  }
  // Curated overrides for institutions Nominatim can't find AND whose title names
  // no wilaya (mostly Algiers/Koléa grandes écoles named by discipline). Each
  // asserts a commune (resolved to its flagship centroid) or, where the exact
  // commune is uncertain, just a wilaya. Keyed by instKey (website host).
  const overrides = readSeed(OVERRIDES_FILE);

  const records = [];
  const dropped = [];
  let nReject = 0; // geocodes rejected for landing in the wrong wilaya

  for (const inst of insts) {
    const nameW = wilayaFromName(inst.name); // cross-check / fallback
    const key = instKey(inst);
    const g = seed[key];
    let lat = null, lng = null, wilaya_code = null, commune = null, precision = null;

    // 1. Curated override — a commune (→ flagship centroid) or a bare wilaya. Takes
    // precedence: it both places the schools OSM can't find and CORRECTS the few
    // discipline-only names that geocode to a same-named school in another wilaya.
    if (overrides[key]) {
      const ov = overrides[key];
      const c = ov.commune ? communeByName(ov.commune, ov.wilaya_code) : null;
      if (c) {
        lat = c.lat; lng = c.lng; wilaya_code = c.code; commune = c.name; precision = "commune";
      } else if (ov.wilaya_code != null && WILAYA.has(Number(ov.wilaya_code))) {
        const w = WILAYA.get(Number(ov.wilaya_code));
        lat = w.lat; lng = w.lng; wilaya_code = Number(ov.wilaya_code); commune = null; precision = "wilaya";
      }
    }

    // 2. Trusted campus geocode (rejected if it lands in a different wilaya than the title names).
    if (wilaya_code == null && g && inAlgeria(g.lat, g.lng)) {
      const nc = nearestCommune(g.lat, g.lng);
      if (nc && (!nameW || nameW === nc.code)) {
        lat = g.lat; lng = g.lng; wilaya_code = nc.code; commune = nc.name; precision = "campus";
      } else if (nc && nameW && nameW !== nc.code) {
        nReject++; // geocode disagrees with the named wilaya → don't trust it
      }
    }

    // 3. Wilaya named in the title → its centroid.
    if (wilaya_code == null && nameW != null) {
      const w = WILAYA.get(nameW);
      if (w && inAlgeria(w.lat, w.lng)) {
        lat = w.lat; lng = w.lng; wilaya_code = nameW; commune = null; precision = "wilaya";
      }
    }

    if (wilaya_code == null) {
      dropped.push(`${inst.name} [${key}]`); // no geocode, override, or named wilaya
      continue;
    }

    records.push({
      name: inst.name,
      type: inst.type,
      type_fr: inst.type_fr,
      website: inst.website,
      commune,
      wilaya_code: String(wilaya_code).padStart(2, "0"),
      wilaya_name: WILAYA.get(wilaya_code)?.name_fr ?? null,
      lat,
      lng,
      geo_precision: precision,
      source: PAGE,
    });
  }

  // Stable ids: sort by type then name, number 1..N.
  const TYPE_ORDER = { universite: 0, grande_ecole: 1, ens: 2, centre_universitaire: 3 };
  records.sort((a, b) => (TYPE_ORDER[a.type] - TYPE_ORDER[b.type]) || a.name.localeCompare(b.name, "fr"));
  records.forEach((r, i) => (r.id = i + 1));

  // Guards — fail loudly on a malformed build.
  const missing = records.filter((r) => !r.name || !r.type || !r.wilaya_code || !r.wilaya_name || r.lat == null || r.lng == null);
  if (missing.length) throw new Error(`${missing.length} record(s) missing a required field (${missing.slice(0, 3).map((r) => r.name).join("; ")})`);
  const overflow = records.filter((r) => Number(r.wilaya_code) < 1 || Number(r.wilaya_code) > 69);
  if (overflow.length) throw new Error(`wilaya_code out of [1,69]: ${overflow.length} record(s)`);

  const byType = {};
  for (const r of records) byType[r.type] = (byType[r.type] || 0) + 1;
  const byPrecision = {};
  for (const r of records) byPrecision[r.geo_precision] = (byPrecision[r.geo_precision] || 0) + 1;
  const wilayasCovered = new Set(records.map((r) => r.wilaya_code)).size;

  // Fail loudly on a degraded build (missing/empty coordinate seed, or a geocode
  // regression) rather than silently shipping an all-centroid dataset.
  const campus = byPrecision.campus || 0;
  if (campus < records.length * MIN_CAMPUS_RATIO) {
    throw new Error(
      `only ${campus}/${records.length} records are campus-geocoded (< ${Math.round(MIN_CAMPUS_RATIO * 100)}%) — ` +
        `regenerate the coordinate seed with \`node scripts/geocode.mjs\` before building`,
    );
  }

  const cols = ["id", "name", "type", "type_fr", "website", "commune", "wilaya_code", "wilaya_name", "lat", "lng", "geo_precision", "source"];
  const ordered = records.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));
  const metadata = {
    source: "Ministère de l'Enseignement Supérieur et de la Recherche Scientifique (mesrs.dz)",
    origin: PAGE,
    license: "Data © MESRS; redistributed for reference. Coordinates are OSM-derived (see README). See README.",
    institutions: ordered.length,
    by_type: byType,
    by_precision: byPrecision,
    wilayas_covered: wilayasCovered,
    dropped: dropped.length,
    generated_at: new Date().toISOString().slice(0, 10),
  };

  mkdirSync(join(DATA, "csv"), { recursive: true });
  mkdirSync(join(DATA, "geojson"), { recursive: true });
  writeJSON("institutions.json", ordered);
  writeText("csv/institutions.csv", toCSV(ordered, cols));
  writeJSON("geojson/institutions.geojson", toGeoJSON(ordered));
  writeJSON("metadata.json", metadata);

  console.log(`\nType breakdown:`);
  for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`);
  console.log(`Precision: ${Object.entries(byPrecision).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  if (nReject) console.log(`Rejected ${nReject} geocode(s) that landed in the wrong wilaya (placed at the named wilaya's centroid).`);
  if (dropped.length) console.log(`Dropped ${dropped.length} unplaceable record(s): ${dropped.join("; ")}`);
  console.log(`\nWrote ${ordered.length} institutions across ${wilayasCovered} wilayas (all placed; ${campus} campus-geocoded) to ${DATA}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
