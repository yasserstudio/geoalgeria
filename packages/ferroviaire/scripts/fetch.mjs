// @geoalgeria/ferroviaire: build Algeria's rail + urban-transit node network.
// Composite: Wikidata (CC0, base geometry/names/line membership) + OpenStreetMap
// (ODbL, coord/name fill + additions, 150 m dedup): the mosquees pattern.
// Operators stamped by mode/wilaya: SNTF (rail), SETRAM (tram), SEMA (metro).
// Bus stations are out of scope (see @geoalgeria/gares-routieres).
// Raws staged in research/ferroviaire/. Run: node scripts/fetch.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { attachCommuneWithRules, describeLinkage, round6 } from "../../../scripts/lib/build-utils.mjs";
import {
  MIGRATIONS,
  carryOverIds,
  committedDates,
  readCommitted,
  readRetiredIds,
  readRetiredMigrations,
  writePackageV2,
} from "../../../scripts/lib/v2-transforms.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const DATA = join(HERE, "..", "data");
const RESEARCH = join(ROOT, "research/ferroviaire");

const DEG = Math.PI / 180, M_PER_DEG = 111320, MATCH_M = 150, DEDUP_M = 40;
const TRAM_NETWORK = { "16": "Alger", "31": "Oran", "25": "Constantine", "19": "Sétif", "30": "Ouargla", "55": "Ouargla", "22": "Sidi Bel Abbès", "27": "Mostaganem" };
const OPERATOR = { rail: "SNTF", tram: "SETRAM", metro: "SEMA" };
// Wilaya corrections keyed by stable Wikidata id, applied post-id (see below).
// Q138457269 = Gare de Hassi Khebi: point-in-polygon places it in Tindouf (37);
// Wikidata P131 says Béchar, but the point sits outside Béchar's polygon (nearest-
// commune snaps it to Tabelbala, the only centroid for ~200 km, and Béchar no
// longer borders Tindouf). commune is left unresolved (no honest centroid out there).
const WILAYA_FIX = { Q138457269: "37" };
// Reviewed station points (batch 2026-15, ADR 0001). A merged station keeps its
// Wikidata coordinate, and for these that coordinate is rounded (35.65, -0.6075) or
// shared with a neighbour, so the record cannot be exact. Each value is the
// station's own OSM object, read from the OpenStreetMap API at the version named
// (a node's position, or a way's bounding-box centre). One open source, so each is
// one Vote (`single_open_source`) unless `votes` names a second, independent one.
const REVIEWED_POINT = {
  Q120282282: { osm: "way/305835618", version: 3, lat: 34.9207319, lng: -1.9398857, read_at: "2026-10-29" }, // Gare de Souani
  Q109312809: { osm: "node/12942126786", version: 2, lat: 36.6737614, lng: 3.0865845, read_at: "2026-10-29" }, // Mohamed Belarbi
  // Jardin's Wikidata P625 is Mohamed Belarbi's to the metre; OSM maps it as its own
  // future metro station "Berraki - Le Jardin", 1.3 km along line 1 (see OSM_MATCH_FIX).
  Q138494132: { osm: "node/12942126787", version: 2, lat: 36.6683089, lng: 3.0951274, read_at: "2026-10-29" }, // Jardin
  Q119072200: { osm: "node/3884932091", version: 6, lat: 35.6501075, lng: -0.6074682, read_at: "2026-10-29" }, // Es Senia
  Q119144784: { osm: "node/5416215334", version: 5, lat: 35.8472592, lng: -0.3200193, read_at: "2026-10-29" }, // Arzew
  Q119173066: { osm: "node/2042157379", version: 13, lat: 35.2983379, lng: -1.1400885, read_at: "2026-10-29" }, // Aïn Témouchent
  // Two Votes: the OSM node and Wikidata's own P625 for Q123498571, 59 m apart.
  Q123498571: { osm: "node/9358330035", version: 2, lat: 32.6143877, lng: -0.405841, read_at: "2026-10-29", votes: ["osm", "wikidata"] }, // Aïn El Hadjadi
};
// OSM nodes the 150 m merge would hand to the wrong item, or to none. Neither node
// carries a wikidata tag. node/9358330035 is tagged "Aïn El Hadjadi", and Wikidata
// gives Rouïba (Q123498570) the same coordinate as Aïn El Hadjadi (Q123498571), so the
// nearest-item test picked Rouïba by order alone. node/12942126787 is Jardin, 1.3 km
// from the copied Wikidata point, so it shipped as a second record of the same
// station (16-029) until 2026-10-29; it now merges and 16-029 forwards to 16-044.
const OSM_MATCH_FIX = { "node/9358330035": "Q123498571", "node/12942126787": "Q138494132" };
// Stations whose only coordinate is a copy of a neighbour's (Wikidata P625 equal to
// the other station's to the metre). The place is real and near, the point is not
// its own, so it ships approximate. Rouïba (the Moghrar line halt, not the Algiers
// station) copies Aïn El Hadjadi.
const COPIED_POINT = new Set(["Q123498570"]);

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
  if (cur) { // extra binding for the same entity: merge, don't duplicate
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
  const qid = OSM_MATCH_FIX[o.osm_id] ?? o.wikidata;
  if (qid && wdByQid.has(qid)) {
    bestIdx = wdByQid.get(qid); bestD = 0; // same entity: match regardless of distance
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

// Reviewed points replace the merged coordinate (see REVIEWED_POINT). A record
// already linked to a different OSM object, or a key that matched nothing, stops
// the build: the reviewed point belongs to that object only.
const reviewedHit = new Set();
for (const r of records) {
  const p = REVIEWED_POINT[r.wikidata];
  if (!p) continue;
  if (r.osm_id && r.osm_id !== p.osm) throw new Error(`ferroviaire: ${r.wikidata} is linked to ${r.osm_id}, REVIEWED_POINT names ${p.osm}`);
  // Six decimals, as every ingested point, so demoteSharedPoints still sees a
  // reviewed point that lands on another record's.
  r.lat = round6(p.lat); r.lng = round6(p.lng); r.osm_id = p.osm;
  if (r.source === "wikidata") r.source = "wikidata+osm";
  reviewedHit.add(r.wikidata);
}
const osmSeen = new Map();
for (const r of records) {
  if (!r.osm_id) continue;
  if (osmSeen.has(r.osm_id)) throw new Error(`ferroviaire: ${r.osm_id} is carried by two records (${osmSeen.get(r.osm_id)}, ${r.wikidata ?? r.name})`);
  osmSeen.set(r.osm_id, r.wikidata ?? r.name);
}
const reviewedMissed = Object.keys(REVIEWED_POINT).filter((k) => !reviewedHit.has(k));
if (reviewedMissed.length) throw new Error(`ferroviaire: REVIEWED_POINT key(s) [${reviewedMissed.join(", ")}] matched no record`);

// ---- Commune / wilaya spatial join (finite-coord guarded, shared helper) ----
// The commune and wilaya a station already shipped under are the claim the linkage
// KEEPS wherever geometry cannot contradict it (a coordinate too coarse to join, a
// commune OpenStreetMap ships no outline for, a point outside every wilaya polygon).
// Keyed on the station's Wikidata or OSM id, as carryOverIds is below.
const publishedStations = new Map(
  (readCommitted(DATA, "stations.json") ?? [])
    .map((r) => [r.refs?.wikidata ? `wd:${r.refs.wikidata}` : r.refs?.osm ? `osm:${r.refs.osm}` : null, r])
    .filter(([k]) => k),
);
const stationKey = (r) => (r.wikidata ? `wd:${r.wikidata}` : r.osm_id ? `osm:${r.osm_id}` : null);
console.log(
  `ferroviaire linkage: ${describeLinkage(
    attachCommuneWithRules(records, undefined, (r) => publishedStations.get(stationKey(r)) ?? r),
  )}`,
);

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
// WILAYA_FIX (declared above) pins desert stations the nearest-commune join snaps to
// the wrong wilaya. Run post-id so a corrected record keeps its id (e.g. "08-016").
const wilayaFixMatched = new Set();
for (const r of records) {
  const w = WILAYA_FIX[r.wikidata];
  if (w) { r.wilaya_code = w; r.commune = null; r.commune_code = null; wilayaFixMatched.add(r.wikidata); }
}
// Every WILAYA_FIX key must have hit a record; an unmatched key means the Wikidata
// id was renamed/retired upstream and the pin silently reverted.
const unmatchedFix = Object.keys(WILAYA_FIX).filter((k) => !wilayaFixMatched.has(k));
if (unmatchedFix.length) throw new Error(`ferroviaire: WILAYA_FIX key(s) [${unmatchedFix.join(", ")}] matched no record: the Wikidata id was renamed or retired upstream; update WILAYA_FIX in scripts/fetch.mjs.`);

// ---- Emit v2 via the shared writer (map → canonical GeoRecord + metadata) ----
// Raws are staged (no live fetch), so the dates are always the committed ones.
const cfg = MIGRATIONS.ferroviaire;
const { updated, retrieved } = committedDates(DATA);
const v2 = records.map(cfg.map);
const copiedHit = new Set();
for (const r of v2) {
  if (!COPIED_POINT.has(r.refs?.wikidata) || r.geo_precision == null) continue;
  r.geo_precision = "approximate";
  copiedHit.add(r.refs.wikidata);
}
const copiedMissed = [...COPIED_POINT].filter((k) => !copiedHit.has(k));
if (copiedMissed.length) throw new Error(`ferroviaire: COPIED_POINT key(s) [${copiedMissed.join(", ")}] matched no record`);

// Pin every still-present station back to the id it shipped under, keyed on its
// stable Wikidata or OSM id. The ids above are `{wilaya}-{seq}`, assigned from the
// commune join, so a station that re-joins re-sequences every later id in both
// wilayas: correcting the 18 stations that were in a wilaya whose polygon does not
// contain them retired and minted 18 public join keys on the first replay. A
// published id is never retired or renumbered unless the place itself is gone
// (Owner rule, 2026-09-29), which is why a station id can read "04-007" while its
// wilaya_code reads 41. It is the pattern cliniques, culture, ecoles, mosquees,
// ooredoo, pharmacies, djezzy and gares-routieres already use.
const retiredIds = readRetiredIds(DATA);
carryOverIds(
  v2,
  readCommitted(DATA, "stations.json"),
  (r) => (r.refs?.wikidata ? `wd:${r.refs.wikidata}` : r.refs?.osm ? `osm:${r.refs.osm}` : null),
  "ferroviaire",
  retiredIds,
);
// A committed OSM-only record whose node OSM_MATCH_FIX now merges into a Wikidata
// station retired above; forward its id to that station so the old key still lands.
const retiredMigrations = readRetiredMigrations(DATA);
const liveByQid = new Map(v2.filter((r) => r.refs?.wikidata).map((r) => [r.refs.wikidata, r]));
for (const old of readCommitted(DATA, "stations.json") ?? []) {
  const qid = !old.refs?.wikidata && OSM_MATCH_FIX[old.refs?.osm];
  const into = qid && liveByQid.get(qid);
  if (!into || !retiredIds.has(String(old.id)) || retiredMigrations[old.id]) continue;
  retiredMigrations[old.id] = {
    merged_into: into.id,
    osm: [old.refs.osm],
    note: `Merged into ${into.id}. OpenStreetMap ${old.refs.osm} and Wikidata ${qid} are the same station; the record now carries both.`,
  };
}
v2.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const { records: final } = writePackageV2({
  pkg: "ferroviaire",
  dir: DATA,
  files: [{ file: "stations.json", rows: v2 }],
  meta: cfg.meta,
  updated,
  retrieved,
  retiredIds,
  retiredMigrations,
});

console.log(`ferroviaire: ${final.length} nodes → v2 · merged OSM↔WD ${merged} · OSM-only added ${kept.length}`);
