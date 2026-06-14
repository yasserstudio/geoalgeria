#!/usr/bin/env node
/**
 * Fetch Algeria's civil airports from ANAC's public map and emit JSON, CSV, and
 * GeoJSON to ../data.
 *
 * Source (public): https://www.anac.dz/en/carte-des-aeroports-3/
 *   The page embeds a Folium/Leaflet map in an iframe
 *   (carte_aeroports_algerie_fusion-<ver>.html). That static HTML carries every
 *   airport as an `L.marker([lat,lng])` wired to a popup `<div>` holding
 *   Nom / OACI / Adresse / Téléphone / Site web. We follow the iframe src from
 *   the parent page so an ANAC version bump (the `-1.21` suffix) doesn't break us.
 *
 * The same file also embeds ~25k boundary-polygon coords for Algeria's outline,
 * so we DON'T grab every `[lat,lng]` — we bind each airport's coords to its popup
 * through Folium's marker -> bindPopup -> setContent -> html hash wiring.
 *
 * wilaya_code is resolved by nearest commune centroid (haversine) from the
 * flagship geoalgeria commune data — the flagship ships only centroids, not
 * boundary polygons, so true point-in-polygon isn't possible. The build prints
 * all 33 `name -> wilaya_code` rows for a one-time eyeball.
 *
 * Usage: node scripts/fetch.mjs
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const DATASET = join(__dirname, "..", "..", "dataset", "data");

const PAGE = "https://www.anac.dz/en/carte-des-aeroports-3/";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const EXPECTED = 33; // ANAC lists 33 civil airports; fail loudly if that changes.
const ICAO_RE = /^DA[A-Z]{2}$/; // every Algerian OACI code is DAxx.

// --- helpers ---------------------------------------------------------------
const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": " ",
};
// Decode named entities via the table, and any numeric/hex entity generically —
// ANAC's French/Arabic labels can carry &#233; / &#x... that a fixed table misses.
const decodeEntity = (m) => {
  const named = ENTITIES[m.toLowerCase()];
  if (named !== undefined) return named;
  const num = m.match(/^&#(x?)([0-9a-f]+);$/i);
  if (num) {
    const code = parseInt(num[2], num[1] ? 16 : 10);
    if (Number.isFinite(code)) {
      try {
        return String.fromCodePoint(code);
      } catch {
        /* out-of-range code point — fall through and keep the literal */
      }
    }
  }
  return m;
};
const decode = (s) =>
  s
    .replace(/&#x?[0-9a-f]+;|&[a-z]+;/gi, decodeEntity)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const orNull = (s) => {
  const v = s == null ? "" : String(s).trim();
  return v === "" || /^(n\/?a|-|—)$/i.test(v) ? null : v;
};

const toRad = (d) => (d * Math.PI) / 180;
function haversine(aLat, aLng, bLat, bLng) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s)); // km
}

async function getText(url, referer) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Referer: referer, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

// --- parse -----------------------------------------------------------------
// Field value sits between the bold label and the next <br> (Site web is a link).
function popupField(html, label) {
  const m = html.match(
    new RegExp(`<b>\\s*${label}\\s*:\\s*</b>\\s*([\\s\\S]*?)<br>`, "i")
  );
  return m ? orNull(decode(m[1])) : null;
}
function popupWebsite(html) {
  const m = html.match(/<b>\s*Site web\s*:\s*<\/b>\s*<a[^>]*href=['"]([^'"]+)['"]/i);
  return m ? orNull(m[1]) : null;
}

function parseAirports(mapHtml) {
  // Build the Folium hash chain: marker -> coords, marker -> popup,
  // popup -> html, html -> field text.
  const coords = new Map(); // marker_id -> [lat, lng]
  for (const m of mapHtml.matchAll(
    /var (marker_[0-9a-f]+) = L\.marker\(\s*\[\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\]/g
  )) {
    coords.set(m[1], [Number(m[2]), Number(m[3])]);
  }
  const markerToPopup = new Map();
  for (const m of mapHtml.matchAll(
    /(marker_[0-9a-f]+)\.bindPopup\((popup_[0-9a-f]+)\)/g
  )) {
    markerToPopup.set(m[1], m[2]);
  }
  const popupToHtml = new Map();
  for (const m of mapHtml.matchAll(
    /(popup_[0-9a-f]+)\.setContent\((html_[0-9a-f]+)\)/g
  )) {
    popupToHtml.set(m[1], m[2]);
  }
  const htmlContent = new Map();
  for (const m of mapHtml.matchAll(
    /var (html_[0-9a-f]+) = \$\(`([\s\S]*?)`\)\[0\];/g
  )) {
    htmlContent.set(m[1], m[2]);
  }

  const airports = [];
  for (const [marker, [lat, lng]] of coords) {
    const html = htmlContent.get(popupToHtml.get(markerToPopup.get(marker)));
    if (!html) continue; // a marker with no popup isn't an airport entry
    const icao = (popupField(html, "OACI") || "").toUpperCase();
    if (!ICAO_RE.test(icao)) continue;
    airports.push({
      id: icao.toLowerCase(),
      name: popupField(html, "Nom"),
      icao,
      iata: null, // ANAC publishes only ICAO; left null for later enrichment.
      address: popupField(html, "Adresse"),
      phone: popupField(html, "Téléphone"),
      website: popupWebsite(html),
      wilaya_code: null, // filled by resolveWilaya()
      lat,
      lng,
      source: PAGE,
    });
  }
  airports.sort((a, b) => a.icao.localeCompare(b.icao));
  return airports;
}

// --- wilaya resolution -----------------------------------------------------
function loadCommunes() {
  if (!existsSync(DATASET)) {
    throw new Error(
      `geoalgeria commune data not found at ${DATASET} — run this from the monorepo; ` +
        `wilaya_code resolution needs the flagship dataset's commune centroids.`
    );
  }
  const files = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"];
  const out = [];
  for (const f of files) {
    const rows = JSON.parse(readFileSync(join(DATASET, f), "utf8"));
    for (const c of rows) {
      if (c.latitude == null || c.longitude == null) continue;
      out.push({ wilaya_code: c.wilaya_code, name: c.name_fr, lat: c.latitude, lng: c.longitude });
    }
  }
  if (!out.length) throw new Error("no commune centroids found in dataset");
  return out;
}

function resolveWilaya(airport, communes) {
  let best = null;
  let bestKm = Infinity;
  for (const c of communes) {
    const km = haversine(airport.lat, airport.lng, c.lat, c.lng);
    if (km < bestKm) {
      bestKm = km;
      best = c;
    }
  }
  return { code: String(best.wilaya_code).padStart(2, "0"), commune: best.name, km: bestKm };
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
  console.log("Fetching ANAC airports page…");
  const page = await getText(PAGE, "https://www.anac.dz/");
  const iframe = page.match(/<iframe[^>]*src=["']([^"']*carte_aeroports[^"']*)["']/i);
  if (!iframe) throw new Error("could not find the airports map iframe on the ANAC page");
  const mapUrl = new URL(iframe[1], PAGE).href;
  console.log(`  map: ${mapUrl}`);

  const mapHtml = await getText(mapUrl, PAGE);
  const airports = parseAirports(mapHtml);

  // Guards — fail loudly if ANAC reshapes the map.
  if (airports.length !== EXPECTED) {
    throw new Error(`expected ${EXPECTED} airports, parsed ${airports.length}`);
  }
  const ids = new Set(airports.map((a) => a.id));
  if (ids.size !== airports.length) throw new Error("duplicate ICAO codes parsed");
  const missing = airports.filter((a) => !a.name || !ICAO_RE.test(a.icao));
  if (missing.length) throw new Error(`malformed records: ${missing.map((a) => a.icao).join(", ")}`);

  console.log("Resolving wilaya_code by nearest commune centroid…");
  const communes = loadCommunes();
  for (const a of airports) {
    const w = resolveWilaya(a, communes);
    a.wilaya_code = w.code;
    console.log(
      `  ${a.icao}  ${String(a.name).padEnd(52)} -> w${w.code}  (${w.commune}, ${w.km.toFixed(1)} km)`
    );
  }
  // Algeria now has 69 wilayas (Law 26-06, Apr 2026 — codes 59-69 promoted from
  // delegated). The flagship geoalgeria models all 69, so derived codes can reach 69.
  const overflow = airports.filter((a) => Number(a.wilaya_code) < 1 || Number(a.wilaya_code) > 69);
  if (overflow.length) {
    throw new Error(`wilaya_code out of [1,69]: ${overflow.map((a) => `${a.icao}=${a.wilaya_code}`).join(", ")}`);
  }

  const cols = ["id","name","icao","iata","address","phone","website","wilaya_code","lat","lng","source"];
  const geo = toGeoJSON(airports);
  const metadata = {
    source: "ANAC — Autorité Nationale de l'Aviation Civile (anac.dz)",
    origin: PAGE,
    license: "Data © ANAC; redistributed for reference. See README.",
    airports: airports.length,
    wilayas_covered: new Set(airports.map((a) => a.wilaya_code)).size,
    generated_at: new Date().toISOString().slice(0, 10),
  };

  mkdirSync(join(DATA, "csv"), { recursive: true });
  mkdirSync(join(DATA, "geojson"), { recursive: true });
  writeJSON("airports.json", airports);
  writeText("csv/airports.csv", toCSV(airports, cols));
  writeJSON("geojson/airports.geojson", geo);
  writeJSON("metadata.json", metadata);

  console.log(
    `\nWrote ${airports.length} airports across ${metadata.wilayas_covered} wilayas ` +
      `(${geo.features.length} geocoded) to ${DATA}.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
