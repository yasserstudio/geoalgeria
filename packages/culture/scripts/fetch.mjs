#!/usr/bin/env node
/**
 * Build Algeria's cultural-atlas dataset and emit JSON, CSV, and GeoJSON to
 * ../data.
 *
 * Source (authoritative): the Ministry of Culture's "Cartes du Patrimoine
 * Culturel Algérien" portal (cartes.patrimoineculturelalgerien.org, Drupal 7 +
 * getlocations). The portal's FR and AR catalogs are disjoint node sets, so the
 * full bilingual dataset was assembled and translated once and is curated at
 * research/patrimoine/patrimoine-cultural-2026-06-28.json (1,090 places across
 * 11 typed layers, every place carrying a source coordinate + has_virtual_tour).
 * This script is the deterministic transform of that curated input into the
 * published package shape — it does NOT re-pull the portal (that would lose the
 * hand-built FR↔AR translations); a live refresh is a separate future step.
 *
 * Geography (layered on): each place is assigned to its current wilaya + commune
 * by nearest commune centroid over the flagship geoalgeria set (the portal files
 * places under pre-2019 wilaya codes; the source points are exact, so geography
 * is the reliable signal — this auto-tracks the flagship's administrative scheme,
 * incl. the 2019 + Law 26-06 reorganizations). The repo ships only centroids, not
 * boundary polygons, so commune is best-effort.
 *
 * Usage: node scripts/fetch.mjs
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");
const REPO_ROOT = join(__dirname, "..", "..", "..");
const CURATED = join(REPO_ROOT, "research", "patrimoine", "patrimoine-cultural-2026-06-28.json");
const PORTAL = "https://cartes.patrimoineculturelalgerien.org";
const DEG = Math.PI / 180;

// --- type taxonomy ---------------------------------------------------------
// layer (from the curated data) -> short id code, category, and bilingual label.
const TYPES = {
  "protected-cultural-property": { code: "bcp", category: "heritage", fr: "Bien culturel protégé", ar: "ممتلك ثقافي محمي" },
  "museum": { code: "museum", category: "heritage", fr: "Musée", ar: "متحف" },
  "museum-moudjahid": { code: "moudjahid", category: "heritage", fr: "Musée du Moudjahid", ar: "متحف المجاهد" },
  "theatre": { code: "theatre", category: "heritage", fr: "Théâtre", ar: "مسرح" },
  "library": { code: "library", category: "heritage", fr: "Bibliothèque", ar: "مكتبة" },
  "cultural-house": { code: "maison", category: "establishment", fr: "Maison de la culture", ar: "دار الثقافة" },
  "cultural-palace": { code: "palais", category: "establishment", fr: "Palais de la culture", ar: "قصر الثقافة" },
  "cultural-center": { code: "centre", category: "establishment", fr: "Centre culturel", ar: "مركز ثقافي" },
  "cultural-directorate": { code: "direction", category: "establishment", fr: "Direction de la culture", ar: "مديرية الثقافة" },
  "cinema": { code: "cinema", category: "establishment", fr: "Salle de cinéma", ar: "قاعة سينما" },
  "arts-school": { code: "ecole", category: "establishment", fr: "École d'art", ar: "مدرسة الفنون" },
};

// --- helpers ---------------------------------------------------------------
const num = (v) => (Number.isFinite(+v) ? +v : null);
const wcode = (n) => (Number.isInteger(n) && n > 0 ? String(n).padStart(2, "0") : null);
function slugify(s) {
  if (!s) return "";
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- reference data (flagship geoalgeria) ----------------------------------
function loadWilayas() {
  const wj = JSON.parse(readFileSync(join(REPO_ROOT, "packages", "dataset", "data", "wilayas.json"), "utf-8")).wilayas;
  const byCode = new Map();
  for (const w of wj) byCode.set(Number(w.code), { name_fr: w.name_fr, name_ar: w.name_ar });
  return byCode;
}
function loadCommunes() {
  const dir = join(REPO_ROOT, "packages", "dataset", "data");
  const files = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"];
  const byWilaya = new Map(); // wilaya_code(int) -> [{name_fr, code_commune, lat, lng}]
  const all = [];
  for (const f of files) {
    for (const c of JSON.parse(readFileSync(join(dir, f), "utf-8"))) {
      if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) continue;
      const e = { name_fr: c.name_fr, code_commune: c.code_commune ?? null, lat: c.latitude, lng: c.longitude, wilaya_code: c.wilaya_code };
      (byWilaya.get(c.wilaya_code) || byWilaya.set(c.wilaya_code, []).get(c.wilaya_code)).push(e);
      all.push(e);
    }
  }
  if (!all.length) throw new Error("no commune centroids loaded — check packages/dataset/data");
  return { byWilaya, all };
}
// Nearest commune centroid (equirectangular squared distance) over the WHOLE
// flagship commune set. The matched commune carries the CURRENT wilaya_code, so
// a place the portal tags "01- Adrar" but that sits in Timimoun is rescoped to
// wilaya 49, and one it tags "26- Médéa" sitting in Ksar El Boukhari to wilaya 67
// — without a hardcoded split map, auto-tracking the flagship scheme as it moves
// (2019 + Law 26-06). Source points are exact, so cross-border leakage is rare.
// Mirrors the nearest-commune join used by sibling packages (djezzy, mosquees).
function nearestCommune(lat, lng, communes) {
  const cosLat = Math.cos(lat * DEG);
  let best = null, bestD = Infinity;
  for (const e of communes.all) {
    const dx = (e.lng - lng) * cosLat, dy = e.lat - lat;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

// --- build -----------------------------------------------------------------
function build(curated, wilByCode, communes, stats) {
  const rows = [];
  for (const r of curated) {
    const t = TYPES[r.layer];
    if (!t) { stats.unknown_type++; continue; }
    const lat = num(r.lat), lng = num(r.lng);
    if (lat == null || lng == null) { stats.no_coords++; continue; }
    const legacyCode = parseInt(r.wilaya_code, 10);
    const nc = nearestCommune(lat, lng, communes);
    const code = nc ? nc.wilaya_code : legacyCode; // current wilaya scheme (from the matched commune)
    const w = wilByCode.get(code);
    if (!w) { stats.unknown_wilaya++; continue; }
    if (code !== legacyCode) stats.rescoped++;
    const commune = nc ? nc.name_fr : null;
    const commune_code = nc ? nc.code_commune : null;
    const name_fr = r.name_fr || null;
    const name_ar = r.name_ar || null;
    const name = name_fr || name_ar;
    const nidFr = r.nid_fr ? Number(r.nid_fr) : null;
    const nidAr = r.nid_ar ? Number(r.nid_ar) : null;
    // Canonical node URL (Drupal /node/{nid} resolves for every place).
    const url = nidFr ? `${PORTAL}/fr/node/${nidFr}` : nidAr ? `${PORTAL}/ar/node/${nidAr}` : null;
    rows.push({
      name,
      name_ar,
      name_fr,
      type: r.layer,
      category: t.category,
      type_label_fr: t.fr,
      type_label_ar: t.ar,
      has_virtual_tour: !!r.has_virtual_tour,
      wilaya: w.name_fr,
      wilaya_ar: w.name_ar,
      wilaya_code: wcode(code),
      commune,
      commune_code,
      source: "patrimoineculturel",
      geo_precision: "source_point",
      url,
      node_id_fr: nidFr,
      node_id_ar: nidAr,
      slug: slugify(name),
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    });
  }
  return rows;
}

// Drop exact duplicate nodes the portal lists twice (same name + type + point).
function dedupe(rows, stats) {
  const seen = new Set(), out = [];
  for (const r of rows) {
    const k = `${r.type}|${(r.name || "").toLowerCase()}|${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;
    if (seen.has(k)) { stats.dropped_dup++; continue; }
    seen.add(k);
    out.push(r);
  }
  return out;
}

// Stable id `{wilaya_code}-{type_code}-{seq}`, seq ordered by name for determinism.
function assignIds(rows) {
  const groups = new Map();
  for (const r of rows) {
    const k = `${r.wilaya_code}-${TYPES[r.type].code}`;
    (groups.get(k) || groups.set(k, []).get(k)).push(r);
  }
  for (const [k, list] of groups) {
    list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "en"));
    const width = Math.max(2, String(list.length).length); // widen if a group ever exceeds 99
    list.forEach((r, i) => { r.id = `${k}-${String(i + 1).padStart(width, "0")}`; });
  }
  rows.sort((a, b) =>
    a.wilaya_code !== b.wilaya_code ? a.wilaya_code.localeCompare(b.wilaya_code, "en") : a.id.localeCompare(b.id, "en"),
  );
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
const writeJSON = (p, obj) => writeFileSync(join(OUT_DIR, p), JSON.stringify(obj, null, 2) + "\n");
const writeText = (p, txt) => writeFileSync(join(OUT_DIR, p), txt);

// --- main ------------------------------------------------------------------
function main() {
  const curated = JSON.parse(readFileSync(CURATED, "utf-8"));
  console.log(`Loaded ${curated.length} curated cultural places from ${CURATED.replace(REPO_ROOT + "/", "")}`);
  const wilByCode = loadWilayas();
  const communes = loadCommunes();

  const stats = { unknown_type: 0, unknown_wilaya: 0, no_coords: 0, dropped_dup: 0, rescoped: 0 };
  let rows = build(curated, wilByCode, communes, stats);
  rows = dedupe(rows, stats);
  assignIds(rows);

  const cols = [
    "id", "name", "name_ar", "name_fr", "type", "category", "type_label_fr", "type_label_ar",
    "has_virtual_tour", "wilaya", "wilaya_ar", "wilaya_code", "commune", "commune_code",
    "source", "geo_precision", "url", "node_id_fr", "node_id_ar", "slug", "lat", "lng",
  ];
  const by = (k, v) => rows.filter((r) => r[k] === v).length;
  const geocoded = rows.filter((r) => r.lat != null).length;
  const bilingual = rows.filter((r) => r.name_ar && r.name_fr).length;
  const virtual_tours = rows.filter((r) => r.has_virtual_tour).length;
  const by_type = {};
  for (const k of Object.keys(TYPES)) by_type[k] = by("type", k);

  const metadata = {
    source: "Cartes du Patrimoine Culturel Algérien (cartes.patrimoineculturelalgerien.org) — the Ministry of Culture's cultural atlas",
    origin: "https://cartes.patrimoineculturelalgerien.org",
    license:
      "Factual public cultural listing from the Ministry of Culture (names, types, coordinates as published by the portal). Commune linkage derived from the GeoAlgeria commune set. See README for attribution.",
    culture: rows.length,
    by_type,
    by_category: { heritage: by("category", "heritage"), establishment: by("category", "establishment") },
    by_geo_precision: { source_point: by("geo_precision", "source_point") },
    wilayas_covered: new Set(rows.map((r) => r.wilaya_code)).size,
    geocoded,
    bilingual,
    virtual_tours,
    linkage_note:
      "Names, type, coordinates and virtual-tour flag are from the Patrimoine Culturel portal (the portal's FR and AR catalogs are disjoint node sets, unioned by coordinate proximity and translated to fill bilingual gaps). Wilaya is exact (from the portal); commune is the nearest GeoAlgeria commune centroid (the repo ships centroids, not boundary polygons), so commune is best-effort.",
    coverage_note: `${rows.length} cultural places from Algeria's official cultural atlas (Ministry of Culture) — protected heritage sites, museums, theatres, libraries, and cultural establishments (maisons & palais de culture, cinemas, culture directorates, arts schools). Every place carries a source coordinate; wilaya is exact, commune is best-effort. ${virtual_tours} offer a 360° virtual tour.`,
    generated_at: new Date().toISOString().slice(0, 10),
  };

  mkdirSync(join(OUT_DIR, "csv"), { recursive: true });
  mkdirSync(join(OUT_DIR, "geojson"), { recursive: true });
  writeJSON("culture.json", rows);
  writeText("csv/culture.csv", toCSV(rows, cols));
  writeJSON("geojson/culture.geojson", toGeoJSON(rows));
  writeJSON("metadata.json", metadata);
  console.log(
    `Wrote ${rows.length} cultural places (${metadata.wilayas_covered} wilayas, ${bilingual} bilingual, ${virtual_tours} virtual tours) — ` +
      `heritage ${metadata.by_category.heritage}, establishment ${metadata.by_category.establishment}; ` +
      `${stats.rescoped} rescoped to current wilaya; ` +
      `dropped ${stats.dropped_dup} dup, ${stats.no_coords} no-coords, ${stats.unknown_type} unknown-type, ${stats.unknown_wilaya} unknown-wilaya.`,
  );
}

main();
