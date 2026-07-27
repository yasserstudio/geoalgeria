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
 * every `name -> wilaya_code` row for a one-time eyeball.
 *
 * Second source (public domain): OurAirports' airports.csv, which does two jobs
 * ANAC cannot. ANAC publishes only OACI/ICAO, so every IATA code is backfilled
 * from OurAirports on an ICAO join; and ANAC's map omits three airports that the
 * route network needs as endpoints (Hassi R'Mel HRM, Mécheria MZW, Laghouat LOO),
 * which are appended from the same file. An ICAO join is not self-verifying, so
 * each match is confirmed by coordinate distance against ANAC's own point and the
 * build fails on anything past IATA_MAX_KM.
 *
 * Usage: node scripts/fetch.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MIGRATIONS, writePackageV2 } from "../../../scripts/lib/v2-transforms.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const DATASET = join(__dirname, "..", "..", "dataset", "data");

const PAGE = "https://www.anac.dz/en/carte-des-aeroports-3/";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const EXPECTED = 33; // ANAC lists 33 civil airports; fail loudly if that changes.
const ICAO_RE = /^DA[A-Z]{2}$/; // every Algerian OACI code is DAxx.

const OURAIRPORTS = "https://davidmegginson.github.io/ourairports-data/airports.csv";
// ANAC's marker is a terminal pin, OurAirports' is the aerodrome reference point,
// so the two never coincide exactly. Observed spread across all 33 is 0.31-2.15 km,
// the far end being Ouargla (DAUU/OGX), whose OurAirports entry is named after the
// Ain Beida aerodrome rather than the city. 5 km is comfortably past that and still
// far inside any plausible "wrong airport" gap.
const IATA_MAX_KM = 5;

// Airports absent from ANAC's map that the route network needs as endpoints. Only
// the ICAO and the French name are pinned here: coordinates, IATA and everything
// else come from OurAirports at build time, so this table cannot drift from its
// source. Laghouat is the one that matters most: it is the Algerian end of the
// JED-LOO arc.
const SUPPLEMENTS = [
  { icao: "DAFH", name: "Aéroport de Hassi R'Mel – Tilrhemt" },
  { icao: "DAAY", name: "Aéroport de Mécheria" },
  { icao: "DAUL", name: "Aéroport de Laghouat – Moulay Ahmed Medeghri" },
];

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
      source: "anac", // provenance key into metadata.sources[], not a URL
    });
  }
  airports.sort((a, b) => a.icao.localeCompare(b.icao));
  return airports;
}

// --- OurAirports -----------------------------------------------------------
/** Minimal RFC4180 reader. OurAirports quotes any field containing a comma and
 *  escapes an inner quote by doubling it; airport names do both. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') { field += '"'; i++; }
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

/** Algerian entries keyed by ICAO. `gps_code` is folded in because a handful of
 *  OurAirports rows carry the code there and leave `icao_code` empty. */
async function loadOurAirports() {
  const res = await fetch(OURAIRPORTS, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${OURAIRPORTS} -> HTTP ${res.status}`);
  const byIcao = new Map();
  for (const r of parseCSV(await res.text())) {
    if (r.iso_country !== "DZ") continue;
    const lat = Number(r.latitude_deg);
    const lng = Number(r.longitude_deg);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    for (const code of new Set([r.icao_code, r.gps_code])) {
      const k = (code || "").trim().toUpperCase();
      if (ICAO_RE.test(k) && !byIcao.has(k))
        byIcao.set(k, { icao: k, iata: orNull(r.iata_code), name: r.name, lat, lng });
    }
  }
  return byIcao;
}

/** Backfill `iata` on ANAC's records. An ICAO code matching is not on its own
 *  evidence that the two rows describe the same place, so every join is confirmed
 *  by distance against ANAC's published point. */
function backfillIata(airports, byIcao) {
  const unmatched = [];
  const far = [];
  for (const a of airports) {
    const oa = byIcao.get(a.icao);
    if (!oa || !oa.iata) { unmatched.push(a.icao); continue; }
    const km = haversine(a.lat, a.lng, oa.lat, oa.lng);
    if (km > IATA_MAX_KM) { far.push(`${a.icao}/${oa.iata} ${km.toFixed(2)} km`); continue; }
    a.iata = oa.iata;
    console.log(`  ${a.icao} -> ${oa.iata}  (${km.toFixed(2)} km from ANAC's point)`);
  }
  if (far.length)
    throw new Error(
      `OurAirports ICAO join lands too far from ANAC's own coordinate ` +
        `(> ${IATA_MAX_KM} km), so it is probably a different place: ${far.join(", ")}`
    );
  if (unmatched.length)
    throw new Error(`no OurAirports IATA code for ${unmatched.join(", ")}`);
}

/** The three airports ANAC's map omits, shaped like the ANAC records. They carry
 *  `source: "ourairports"` so the mixed provenance is legible per record rather
 *  than only in metadata.sources[]. ANAC's contact fields have no counterpart
 *  upstream, hence the nulls. */
function supplements(byIcao) {
  return SUPPLEMENTS.map(({ icao, name }) => {
    const oa = byIcao.get(icao);
    if (!oa) throw new Error(`${icao} is no longer in OurAirports' Algerian rows`);
    if (!oa.iata) throw new Error(`${icao} has no IATA code in OurAirports`);
    console.log(`  + ${icao}/${oa.iata}  ${name}`);
    return {
      id: icao.toLowerCase(), name, icao, iata: oa.iata,
      address: null, phone: null, website: null,
      wilaya_code: null, lat: oa.lat, lng: oa.lng, source: "ourairports",
    };
  });
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

  console.log("Fetching OurAirports and backfilling IATA codes…");
  const byIcao = await loadOurAirports();
  backfillIata(airports, byIcao);
  console.log("Appending the airports ANAC's map omits…");
  const all = [...airports, ...supplements(byIcao)];
  const allIds = new Set(all.map((a) => a.id));
  if (allIds.size !== all.length) throw new Error("a supplement collides with an ANAC airport");

  console.log("Resolving wilaya_code by nearest commune centroid…");
  const communes = loadCommunes();
  for (const a of all) {
    const w = resolveWilaya(a, communes);
    a.wilaya_code = w.code;
    console.log(
      `  ${a.icao}  ${String(a.name).padEnd(52)} -> w${w.code}  (${w.commune}, ${w.km.toFixed(1)} km)`
    );
  }
  // Algeria now has 69 wilayas (Law 26-06, Apr 2026 — codes 59-69 promoted from
  // delegated). The flagship geoalgeria models all 69, so derived codes can reach 69.
  const overflow = all.filter((a) => Number(a.wilaya_code) < 1 || Number(a.wilaya_code) > 69);
  if (overflow.length) {
    throw new Error(`wilaya_code out of [1,69]: ${overflow.map((a) => `${a.icao}=${a.wilaya_code}`).join(", ")}`);
  }

  // Emit v2 via the shared writer (live-only source, so stamp the run's date).
  const cfg = MIGRATIONS.aviation;
  const today = new Date().toISOString().slice(0, 10);
  const { records } = writePackageV2({
    pkg: "aviation",
    dir: DATA,
    files: [{ file: "airports.json", rows: all.map(cfg.map) }],
    meta: cfg.meta,
    updated: today,
    retrieved: today,
  });
  const wilayas = new Set(records.map((r) => r.wilaya_code)).size;
  console.log(`\nWrote ${records.length} airports across ${wilayas} wilayas → v2 to ${DATA}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
