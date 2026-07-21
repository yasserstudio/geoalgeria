// @geoalgeria/ferroviaire — build Algeria's rail + urban-transit node network.
// Composite: Wikidata (CC0, base geometry/names/line membership) + OpenStreetMap
// (ODbL, coord/name fill + additions, 150 m dedup) — the mosquees pattern.
// Operators stamped by mode/wilaya: SNTF (rail), SETRAM (tram), SEMA (metro).
// Bus stations are out of scope (see @geoalgeria/gares-routieres).
// Raws staged in research/ferroviaire/. Run: node scripts/fetch.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { attachCommune, round6 } from "../../../scripts/lib/build-utils.mjs";
import { MIGRATIONS, writePackageV2, committedDates } from "../../../scripts/lib/v2-transforms.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const DATA = join(HERE, "..", "data");
const RESEARCH = join(ROOT, "research/ferroviaire");

const DEG = Math.PI / 180, M_PER_DEG = 111320, MATCH_M = 150, DEDUP_M = 40;
const TRAM_NETWORK = { "16": "Alger", "31": "Oran", "25": "Constantine", "19": "Sétif", "30": "Ouargla", "55": "Ouargla", "22": "Sidi Bel Abbès", "27": "Mostaganem" };
const OPERATOR = { rail: "SNTF", tram: "SETRAM", metro: "SEMA" };

const wdType = (label) => {
  const l = (label || "").toLowerCase();
  if (l.includes("tram")) return "tram";
  if (l.includes("gondola")) return "gondola";
  if (l.includes("aerial")) return "aerial_tram";
  if (l.includes("bus")) return "bus";
  if (l.includes("metro") || l.includes("underground")) return "metro";
  return "rail";
};
const osmType = (t) => {
  if (t.railway === "tram_stop" || t.tram === "yes") return "tram";
  if (t.station === "subway" || t.subway === "yes") return "metro";
  if (t.aerialway) return t.aerialway === "gondola" ? "gondola" : "aerial_tram";
  return "rail";
};

// ---- Wikidata base (dedup multi-binding items by QID) ----
// A SPARQL result returns one binding per (item × P31 type × line); items with
// several types/lines yield multiple rows for the SAME entity. Collapse by QID so
// one Wikidata station = one record (union its lines; keep first-seen type/coord).
const wdRaw = JSON.parse(readFileSync(join(RESEARCH, "wikidata-transit-raw.json"), "utf-8")).results.bindings;
const wdMap = new Map();
for (const b of wdRaw) {
  const type = wdType(b.typeLabel?.value);
  if (type === "bus") continue; // out of scope
  const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(b.coord?.value || "");
  if (!m) continue;
  const qid = b.item.value.split("/").pop();
  const name_fr = b.name_fr?.value || null, name_ar = b.name_ar?.value || null;
  const line = b.lines?.value || null;
  const cur = wdMap.get(qid);
  if (cur) { // extra binding for the same entity — merge, don't duplicate
    cur.name_fr = cur.name_fr || name_fr;
    cur.name_ar = cur.name_ar || name_ar;
    cur.name = cur.name || name_fr || name_ar;
    if (line && !(cur.line || "").split(" | ").includes(line)) cur.line = cur.line ? `${cur.line} | ${line}` : line;
    continue;
  }
  wdMap.set(qid, {
    name: name_fr || name_ar, name_fr, name_ar, type,
    line, wikidata: qid, osm_id: null,
    lat: round6(+m[2]), lng: round6(+m[1]), source: "wikidata",
  });
}
const wd = [...wdMap.values()];

// ---- OSM enrichment ----
const osmRaw = JSON.parse(readFileSync(join(RESEARCH, "osm-transit-raw.json"), "utf-8")).elements || [];
const osm = [];
for (const e of osmRaw) {
  const t = e.tags || {};
  const lat = round6(e.lat ?? e.center?.lat), lng = round6(e.lon ?? e.center?.lon);
  if (lat == null || lng == null) continue;
  const type = osmType(t);
  const name_fr = t["name:fr"] || t.name || null, name_ar = t["name:ar"] || null;
  osm.push({
    name: name_fr || name_ar || t.name || null, name_fr, name_ar, type,
    line: t.line || t.route_ref || null,
    wikidata: t.wikidata || null, osm_id: `${e.type}/${e.id}`,
    lat, lng, source: "osm",
  });
}

// ---- Spatial merge: OSM → Wikidata within 150 m (grid-accelerated) ----
const CELL = 0.005;
const key = (lat, lng) => `${Math.floor(lat / CELL)}:${Math.floor(lng / CELL)}`;
const grid = new Map();
const wdByQid = new Map();
wd.forEach((r, i) => {
  const k = key(r.lat, r.lng);
  let cell = grid.get(k); if (!cell) grid.set(k, (cell = [])); cell.push(i);
  if (r.wikidata) wdByQid.set(r.wikidata, i);
});

const additions = [];
let merged = 0;
for (const o of osm) {
  let bestIdx = -1, bestD = Infinity;
  if (o.wikidata && wdByQid.has(o.wikidata)) {
    bestIdx = wdByQid.get(o.wikidata); bestD = 0; // same entity — match regardless of distance
  } else {
    const cosLat = Math.cos(o.lat * DEG);
    const bLat = Math.floor(o.lat / CELL), bLng = Math.floor(o.lng / CELL);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cand = grid.get(`${bLat + dy}:${bLng + dx}`);
      if (!cand) continue;
      for (const idx of cand) {
        const w = wd[idx];
        const mx = (w.lng - o.lng) * cosLat * M_PER_DEG, my = (w.lat - o.lat) * M_PER_DEG;
        const d = mx * mx + my * my;
        if (d < bestD) { bestD = d; bestIdx = idx; }
      }
    }
  }
  if (bestIdx >= 0 && bestD <= MATCH_M * MATCH_M) {
    const w = wd[bestIdx];
    w.name_ar = w.name_ar || o.name_ar;
    w.name_fr = w.name_fr || o.name_fr;
    w.name = w.name || o.name;
    w.line = w.line || o.line;
    w.osm_id = o.osm_id;
    if (w.source === "wikidata") w.source = "wikidata+osm";
    merged++;
  } else {
    additions.push(o);
  }
}

// dedup OSM-only additions against each other (~40 m, same non-empty name)
const kept = [];
for (const a of additions) {
  const dup = kept.find((k) => {
    if (!a.name || k.name !== a.name) return false;
    const cosLat = Math.cos(a.lat * DEG);
    const mx = (k.lng - a.lng) * cosLat * M_PER_DEG, my = (k.lat - a.lat) * M_PER_DEG;
    return mx * mx + my * my <= DEDUP_M * DEDUP_M;
  });
  if (!dup) kept.push(a);
}
const records = [...wd, ...kept];

// ---- Commune / wilaya spatial join (finite-coord guarded, shared helper) ----
attachCommune(records);

// ---- Operator / network tagging ----
for (const r of records) {
  r.operator = OPERATOR[r.type] || null;
  r.network = r.type === "tram" ? (TRAM_NETWORK[r.wilaya_code] || null)
    : r.type === "metro" ? "Métro d'Alger" : null;
}

// ---- Stable ids {wilaya}-{seq} ----
const TYPE_ORDER = ["rail", "metro", "tram", "aerial_tram", "gondola"];
records.sort((a, b) =>
  a.wilaya_code.localeCompare(b.wilaya_code) ||
  TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
  (a.wikidata || a.osm_id || "").localeCompare(b.wikidata || b.osm_id || ""));
const seq = {};
for (const r of records) {
  seq[r.wilaya_code] = (seq[r.wilaya_code] || 0) + 1;
  r.id = `${r.wilaya_code}-${String(seq[r.wilaya_code]).padStart(3, "0")}`;
}

// ---- Wilaya correction (applied after id assignment so the public id is stable) ----
// Gare de Hassi Khebi (on the Béchar–Tindouf line) sits deep in the Tindouf (37)
// desert per the boundary polygons, but nearest-commune snaps it to Tabelbala
// (Béchar, 08) — the only centroid for ~200 km, and Béchar no longer borders
// Tindouf. Pin it to the containing wilaya; commune is left unresolved. Keyed by
// the stable Wikidata id, run post-id so the record keeps id "08-016".
for (const r of records) {
  if (r.wikidata === "Q138457269") { r.wilaya_code = "37"; r.commune = null; r.commune_code = null; }
}

// ---- Emit v2 via the shared writer (map → canonical GeoRecord + metadata) ----
// Raws are staged (no live fetch), so the dates are always the committed ones.
const cfg = MIGRATIONS.ferroviaire;
const { updated, retrieved } = committedDates(DATA);
const { records: final } = writePackageV2({
  pkg: "ferroviaire",
  dir: DATA,
  files: [{ file: "stations.json", rows: records.map(cfg.map) }],
  meta: cfg.meta,
  updated,
  retrieved,
});

console.log(`ferroviaire: ${final.length} nodes → v2 · merged OSM↔WD ${merged} · OSM-only added ${kept.length}`);
