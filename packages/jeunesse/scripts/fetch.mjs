#!/usr/bin/env node
/**
 * Fetch Algeria's youth & sports institutions from the Ministère de la Jeunesse
 * public map and emit JSON, CSV, and GeoJSON to ../data.
 *
 * Source (public): https://youthconnect.mjeunesse.gov.dz/institutions-map
 *   The map page (a Laravel app, Leaflet + markercluster) inlines every
 *   institution as a single `const insts = [ … ];` array in the HTML — no auth,
 *   no API call, no WAF. Each record carries id, name (Arabic), latitude,
 *   longitude, a `type` (code + Arabic label) and a `commune` join (commune /
 *   daira / wilaya names + wilaya_code). We parse that array directly.
 *
 * The ministry publishes names in Arabic only, so `name` is the Arabic name and
 * there is no French name to ship (the type carries an indicative French label).
 * `wilaya_code` comes straight from the ministry's own commune→wilaya join, so we
 * trust it (no nearest-centroid resolution needed) — it is ≤ 58 because the source
 * predates the 69-wilaya reform; that still joins the geoalgeria wilaya model.
 *
 * Coordinate hygiene: a slice of records have latitude/longitude transposed
 * (lat ≈ 3, lng ≈ 36). We detect any point outside Algeria's bounding box, try a
 * lat/lng swap, keep it if the swap lands in-country, and drop (with a log) the
 * few that are unrecoverable. Every shipped record is therefore geocoded.
 *
 * Usage: node scripts/fetch.mjs
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const DATASET = join(__dirname, "..", "..", "dataset", "data");

const PAGE = "https://youthconnect.mjeunesse.gov.dz/institutions-map";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Sanity floor — the ministry lists ~2,000 institutions; fail loudly if a reshape
// of the page leaves us with far fewer. It is a living dataset, so we don't pin an
// exact count (it grows), but a collapse to a handful means the parse broke.
const MIN_EXPECTED = 1500;

// The ministry's nine institution types (its own French acronyms). The Arabic
// label ships verbatim from the source; `type_fr` is an indicative French label
// for non-Arabic consumers, keyed by the source code. A code we've never seen is
// surfaced loudly so the map can be extended deliberately, not silently mislabeled.
const TYPE_FR = {
  MJ: "Maison de jeunes",
  AJ: "Auberge de jeunes",
  CC: "Centre culturel",
  CS: "Complexe sportif de proximité",
  SPA: "Salle polyvalente",
  CJ: "Camp de jeunes",
  CLS: "Centre de loisirs scientifiques",
  CLJ: "Club de jeunes",
  PAL: "Piscine de proximité",
};

// Algeria's bounding box (matches the repo's other geocoded validators). An exact
// 0 in either axis is a data-entry placeholder, not a real reading (Algeria grazes
// the prime meridian, but never at exactly 0.000000), so it is rejected too.
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat !== 0 && lng !== 0 &&
  lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

// Per-wilaya bounding boxes, derived from the flagship commune centroids. Used to
// repair records whose longitude lost its negative sign: a western point stored at
// +lng stays inside Algeria's national bbox but lands ~2·|lng|° east of its real
// home (e.g. Tlemcen city at 34.88,-1.32 arriving as 34.88,+1.32 plots near
// Laghouat). The national bbox can't catch that; the wilaya bbox can.
const BOX_MARGIN = 0.7; // degrees of slack around the commune-centroid extent
function loadWilayaBoxes() {
  const files = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"];
  const boxes = {};
  for (const f of files) {
    const fp = join(DATASET, f);
    if (!existsSync(fp)) continue;
    for (const c of JSON.parse(readFileSync(fp, "utf8"))) {
      if (c.latitude == null || c.longitude == null) continue;
      const w = Number(c.wilaya_code);
      const b = (boxes[w] ||= { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity });
      b.minLat = Math.min(b.minLat, c.latitude);
      b.maxLat = Math.max(b.maxLat, c.latitude);
      b.minLng = Math.min(b.minLng, c.longitude);
      b.maxLng = Math.max(b.maxLng, c.longitude);
    }
  }
  return boxes;
}
const inBox = (lat, lng, b) =>
  !!b &&
  lat >= b.minLat - BOX_MARGIN && lat <= b.maxLat + BOX_MARGIN &&
  lng >= b.minLng - BOX_MARGIN && lng <= b.maxLng + BOX_MARGIN;

const clean = (s) => {
  const v = s == null ? "" : String(s).replace(/\s+/g, " ").trim();
  return v === "" ? null : v;
};

async function getText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

// --- writers ---------------------------------------------------------------
function toCSV(rows, cols) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    // Neutralize spreadsheet formula injection on text fields; numbers pass through.
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
  console.log("Fetching Ministère de la Jeunesse institutions map…");
  const html = await getText(PAGE);
  const m = html.match(/const insts\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) throw new Error("could not find the `const insts = [...]` array on the map page");

  let raw;
  try {
    raw = JSON.parse(m[1]);
  } catch (e) {
    throw new Error(`failed to parse the institutions array: ${e.message}`);
  }
  if (!Array.isArray(raw) || raw.length < MIN_EXPECTED) {
    throw new Error(`parsed ${Array.isArray(raw) ? raw.length : "non-array"}; expected >= ${MIN_EXPECTED}`);
  }
  console.log(`  parsed ${raw.length} raw records`);

  const boxes = loadWilayaBoxes();
  if (!Object.keys(boxes).length) {
    throw new Error(
      `flagship commune data not found at ${DATASET} — run this from the monorepo; ` +
        `the longitude sign-repair needs the flagship per-wilaya bounding boxes.`,
    );
  }

  const institutions = [];
  const dropped = [];
  const unknownTypes = new Set();
  let signFixed = 0;

  for (const r of raw) {
    const code = r.type?.code ? String(r.type.code).trim().toUpperCase() : null;
    if (code && !(code in TYPE_FR)) unknownTypes.add(code);

    // Coordinate hygiene: accept as-is, else try a lat/lng swap, else drop.
    let lat = Number(r.latitude);
    let lng = Number(r.longitude);
    if (!inAlgeria(lat, lng)) {
      if (inAlgeria(lng, lat)) {
        [lat, lng] = [lng, lat];
      } else {
        dropped.push({ id: r.id, lat: r.latitude, lng: r.longitude });
        continue;
      }
    }

    const c = r.commune || {};

    // Repair a dropped longitude sign. The source only ever drops the minus sign,
    // so only repair a record whose wilaya lies ENTIRELY on one side of the meridian,
    // whose longitude has the wrong sign for it, and whose mirror lands back inside
    // the wilaya. Wilayas that straddle 0° (sign genuinely ambiguous — e.g. Adrar)
    // are left untouched, so correct near-meridian points are never flipped.
    const cw = c.wilaya_code != null ? Number(c.wilaya_code) : null;
    const box = cw != null ? boxes[cw] : null;
    if (box) {
      const wrongSign = (box.maxLng < 0 && lng > 0) || (box.minLng > 0 && lng < 0);
      if (wrongSign && inBox(lat, -lng, box)) {
        lng = -lng;
        signFixed++;
      }
    }

    institutions.push({
      id: r.id,
      name: clean(r.name), // Arabic — the ministry publishes names in Arabic only
      type_code: code,
      type_ar: clean(r.type?.name),
      type_fr: code ? TYPE_FR[code] ?? null : null,
      commune: clean(c.commune_name), // Arabic, from the source
      daira: clean(c.daira_name), // Arabic, from the source
      wilaya_code: c.wilaya_code != null ? String(c.wilaya_code).padStart(2, "0") : null,
      wilaya_name: clean(c.wilaya_name), // Arabic, from the source
      lat,
      lng,
      source: PAGE,
    });
  }

  // Guards — fail loudly if the source reshapes.
  if (unknownTypes.size) {
    throw new Error(
      `unknown institution type code(s): ${[...unknownTypes].join(", ")} — extend TYPE_FR before shipping`,
    );
  }
  const ids = institutions.map((r) => r.id);
  if (new Set(ids).size !== ids.length) throw new Error("duplicate institution id(s) parsed");
  const malformed = institutions.filter(
    (r) => !r.name || !r.type_code || !r.type_ar || !r.commune || !r.daira || !r.wilaya_code || !r.wilaya_name,
  );
  if (malformed.length) {
    throw new Error(`${malformed.length} record(s) missing a required field (ids: ${malformed.slice(0, 5).map((r) => r.id).join(", ")}…)`);
  }
  const overflow = institutions.filter((r) => Number(r.wilaya_code) < 1 || Number(r.wilaya_code) > 69);
  if (overflow.length) throw new Error(`wilaya_code out of [1,69]: ${overflow.length} record(s)`);

  institutions.sort((a, b) => a.id - b.id);

  // --- type / wilaya summaries ---
  const byType = {};
  for (const r of institutions) byType[r.type_code] = (byType[r.type_code] || 0) + 1;
  const wilayasCovered = new Set(institutions.map((r) => r.wilaya_code)).size;

  const cols = ["id","name","type_code","type_ar","type_fr","commune","daira","wilaya_code","wilaya_name","lat","lng","source"];
  const geo = toGeoJSON(institutions);
  const metadata = {
    source: "Ministère de la Jeunesse (youthconnect.mjeunesse.gov.dz)",
    origin: PAGE,
    license: "Data © Ministère de la Jeunesse; redistributed for reference. See README.",
    institutions: institutions.length,
    by_type: byType,
    wilayas_covered: wilayasCovered,
    dropped: dropped.length, // records with unrecoverable coordinates, excluded
    sign_corrected: signFixed, // records whose longitude sign was repaired
    generated_at: new Date().toISOString().slice(0, 10),
  };

  mkdirSync(join(DATA, "csv"), { recursive: true });
  mkdirSync(join(DATA, "geojson"), { recursive: true });
  writeJSON("institutions.json", institutions);
  writeText("csv/institutions.csv", toCSV(institutions, cols));
  writeJSON("geojson/institutions.geojson", geo);
  writeJSON("metadata.json", metadata);

  console.log(`\nType breakdown:`);
  for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(5)}  ${k}  ${TYPE_FR[k]}`);
  }
  if (signFixed) {
    console.log(`\nRepaired the longitude sign on ${signFixed} record(s) (western points stored without their minus sign).`);
  }
  if (dropped.length) {
    console.log(`\nDropped ${dropped.length} record(s) with unrecoverable coordinates: ${dropped.map((d) => d.id).join(", ")}`);
  }
  console.log(
    `\nWrote ${institutions.length} institutions across ${wilayasCovered} wilayas ` +
      `(all geocoded) to ${DATA}.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
