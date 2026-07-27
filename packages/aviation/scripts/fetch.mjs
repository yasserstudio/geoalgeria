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
 * build fails on anything past IATA_MAX_KM. The three supplements have no ANAC
 * point to check against, so they are checked against a coarse pinned anchor
 * instead (ANCHOR_MAX_KM). See SUPPLEMENTS for why that is not optional.
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

const ANAC_EXPECTED = 33; // ANAC's map lists 33 civil airports; fail loudly if that changes.
const ICAO_RE = /^DA[A-Z]{2}$/; // every Algerian OACI code is DAxx.
const IATA_RE = /^[A-Z0-9]{3}$/; // IATA location codes are three alphanumerics.
const FETCH_TIMEOUT_MS = 60_000; // neither upstream should ever take this long.

const OURAIRPORTS = "https://davidmegginson.github.io/ourairports-data/airports.csv";
// ANAC's marker is a terminal pin, OurAirports' is the aerodrome reference point,
// so the two never coincide exactly. Observed spread across all 33 is 0.31-2.15 km,
// the far end being Ouargla (DAUU/OGX), whose OurAirports entry is named after the
// Ain Beida aerodrome rather than the city. 5 km is comfortably past that and still
// far inside any plausible "wrong airport" gap.
const IATA_MAX_KM = 5;

// Airports absent from ANAC's map that the route network needs as endpoints.
// Laghouat is the one that matters most: it is the Algerian end of the JED-LOO arc.
//
// The shipped coordinate still comes from OurAirports at build time, so the table
// cannot drift from its source. But `anchor` pins roughly where each airport is,
// because these three records are the only ones in the package with no second
// witness: an ANAC row can be checked against ANAC's own point, and a supplement
// has nothing to check against. Without an anchor, a volunteer re-keying DAUL
// upstream would emit the pinned French name on a foreign coordinate and the build
// would stay green, since wilaya_code is derived from that same coordinate and so
// agrees with the wrong point. The anchors are deliberately coarse (see
// ANCHOR_MAX_KM): they exist to catch an identity swap, not to second-guess a
// published coordinate.
const SUPPLEMENTS = [
  { icao: "DAFH", name: "Aéroport de Hassi R'Mel – Tilrhemt", anchor: [32.93, 3.31] },
  { icao: "DAAY", name: "Aéroport de Mécheria", anchor: [33.53, -0.24] },
  { icao: "DAUL", name: "Aéroport de Laghouat – Moulay Ahmed Medeghri", anchor: [33.76, 2.93] },
];
// Generous on purpose. An airport does not move; a wrong airport is tens or
// hundreds of km away. This only has to separate those two cases.
const ANCHOR_MAX_KM = 25;

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
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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
 *  escapes an inner quote by doubling it; airport names do both.
 *
 *  A quote only opens a quoted field at the START of a field, which is what
 *  RFC4180 says and what a naive reader gets wrong: treating a quote anywhere as
 *  significant means one stray unpaired `"` in an unquoted field swallows
 *  everything to the next quote or to EOF, and 85k rows come back as a handful.
 *  Inside an unquoted field a quote is just a character. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let atFieldStart = true;
  const endField = () => { row.push(field); field = ""; atFieldStart = true; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c === "\r" ? "" : c;
      else if (text[i + 1] === '"') { field += '"'; i++; }
      else quoted = false;
    } else if (c === '"' && atFieldStart) { quoted = true; atFieldStart = false; }
    else if (c === ",") endField();
    else if (c === "\n") { endField(); rows.push(row); row = []; }
    else if (c !== "\r") { field += c; atFieldStart = false; }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }

  const [header, ...body] = rows;
  const out = [];
  for (const [i, r] of body.entries()) {
    if (r.length === 1 && r[0] === "") continue; // blank line
    if (r.length !== header.length)
      throw new Error(
        `airports.csv row ${i + 2} has ${r.length} fields, header has ${header.length}. ` +
          `OurAirports changed the file's shape, or the download was truncated`
      );
    out.push(Object.fromEntries(header.map((h, j) => [h, r[j]])));
  }
  return out;
}

/** Algerian entries keyed by ICAO.
 *
 *  Only `icao_code` is read. An earlier version also folded in `gps_code` for the
 *  rows that leave `icao_code` empty, but that indexes a row under a code it does
 *  not claim as its ICAO: OurAirports' "Oum El Bouaghi Air Base" has an empty
 *  `icao_code`, `ident` DABO and `gps_code` DAEO, so the fold filed it under DAEO.
 *  Every airport this package needs carries a real `icao_code`, so the fold bought
 *  nothing and risked resolving a join to the wrong row.
 *
 *  Closed fields are skipped and a duplicate key is an error rather than
 *  first-wins: elsewhere this file throws on ambiguity, and a silent first-wins
 *  would let a stale row shadow the live one at the same airport, where the
 *  distance guard cannot tell them apart. */
async function loadOurAirports() {
  const res = await fetch(OURAIRPORTS, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${OURAIRPORTS} -> HTTP ${res.status}`);
  const byIcao = new Map();
  for (const r of parseCSV(await res.text())) {
    if (r.iso_country !== "DZ" || r.type === "closed") continue;
    const lat = Number(r.latitude_deg);
    const lng = Number(r.longitude_deg);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const k = (r.icao_code || "").trim().toUpperCase();
    if (!ICAO_RE.test(k)) continue;
    const prev = byIcao.get(k);
    if (prev)
      throw new Error(
        `OurAirports has two open Algerian rows claiming ICAO ${k}: ` +
          `"${prev.name}" and "${r.name}". The join key is ambiguous, pick one deliberately`
      );
    byIcao.set(k, { icao: k, iata: orNull(r.iata_code), name: r.name, lat, lng });
  }
  const dupes = [...byIcao.values()].filter((v) => v.iata).reduce((m, v) => m.set(v.iata, (m.get(v.iata) || 0) + 1), new Map());
  const clashing = [...dupes].filter(([, n]) => n > 1).map(([code]) => code);
  if (clashing.length)
    throw new Error(
      `OurAirports gives the same IATA code to more than one Algerian airport: ` +
        `${clashing.join(", ")}. An IATA code is a published join key and must be unique`
    );
  return byIcao;
}

/** Backfill `iata` on ANAC's records. An ICAO code matching is not on its own
 *  evidence that the two rows describe the same place, so every join is confirmed
 *  by distance against ANAC's published point. */
function backfillIata(airports, byIcao) {
  const absent = [];   // ICAO not in OurAirports' Algerian rows at all
  const noIata = [];   // row is there, but its iata_code is empty
  const badIata = [];  // row is there, but the code is not a plausible IATA code
  const far = [];      // row is there, but it is somewhere else
  for (const a of airports) {
    const oa = byIcao.get(a.icao);
    if (!oa) { absent.push(a.icao); continue; }
    if (!oa.iata) { noIata.push(a.icao); continue; }
    if (!IATA_RE.test(oa.iata)) { badIata.push(`${a.icao}/${JSON.stringify(oa.iata)}`); continue; }
    const km = haversine(a.lat, a.lng, oa.lat, oa.lng);
    if (km > IATA_MAX_KM) { far.push(`${a.icao}/${oa.iata} ${km.toFixed(2)} km`); continue; }
    a.iata = oa.iata;
    console.log(`  ${a.icao} -> ${oa.iata}  (${km.toFixed(2)} km from ANAC's point)`);
  }
  // Report every failure the run found, not just the first kind: each names a
  // different thing to go and look at, and surfacing them one build at a time
  // sends whoever hits this back to the same wall three times.
  const problems = [
    absent.length && `not in OurAirports' Algerian rows: ${absent.join(", ")}`,
    noIata.length && `no IATA code in OurAirports: ${noIata.join(", ")}`,
    badIata.length && `IATA code is not three alphanumerics: ${badIata.join(", ")}`,
    far.length && `join lands more than ${IATA_MAX_KM} km from ANAC's own coordinate, ` +
      `so it is probably a different place: ${far.join(", ")}`,
  ].filter(Boolean);
  if (problems.length)
    throw new Error(`OurAirports ICAO join failed :\n  ${problems.join("\n  ")}`);
}

/** The three airports ANAC's map omits, shaped like the ANAC records. They carry
 *  `source: "ourairports"` so the mixed provenance is legible per record rather
 *  than only in metadata.sources[]. ANAC's contact fields have no counterpart
 *  upstream, hence the nulls.
 *
 *  Each is checked against its pinned anchor, because these are the only records
 *  in the package with nothing else to check against. See SUPPLEMENTS. */
function supplements(byIcao) {
  return SUPPLEMENTS.map(({ icao, name, anchor }) => {
    const oa = byIcao.get(icao);
    if (!oa) throw new Error(`${icao} is no longer in OurAirports' Algerian rows`);
    if (!oa.iata) throw new Error(`${icao} has no IATA code in OurAirports`);
    if (!IATA_RE.test(oa.iata))
      throw new Error(`${icao}'s OurAirports IATA code ${JSON.stringify(oa.iata)} is not three alphanumerics`);
    const km = haversine(anchor[0], anchor[1], oa.lat, oa.lng);
    if (km > ANCHOR_MAX_KM)
      throw new Error(
        `${icao} ("${oa.name}") sits ${km.toFixed(1)} km from where this table says ` +
          `${name} is (max ${ANCHOR_MAX_KM} km). OurAirports has probably re-keyed the ` +
          `code onto a different airport. Confirm which is right before moving the anchor`
      );
    console.log(`  + ${icao}/${oa.iata}  ${name}  (${km.toFixed(1)} km from its anchor)`);
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
  const anacAirports = parseAirports(mapHtml);

  // Guards — fail loudly if ANAC reshapes the map.
  if (anacAirports.length !== ANAC_EXPECTED) {
    throw new Error(`expected ${ANAC_EXPECTED} airports on ANAC's map, parsed ${anacAirports.length}`);
  }
  const ids = new Set(anacAirports.map((a) => a.id));
  if (ids.size !== anacAirports.length) throw new Error("duplicate ICAO codes parsed");
  const missing = anacAirports.filter((a) => !a.name || !ICAO_RE.test(a.icao));
  if (missing.length) throw new Error(`malformed records: ${missing.map((a) => a.icao).join(", ")}`);

  console.log("Fetching OurAirports and backfilling IATA codes…");
  const byIcao = await loadOurAirports();
  backfillIata(anacAirports, byIcao);
  console.log("Appending the airports ANAC's map omits…");
  // `airports` is the merged set from here on, matching what the package's own
  // airports() export means. The ANAC-only slice keeps its own name above.
  const airports = [...anacAirports, ...supplements(byIcao)];
  const allIds = new Set(airports.map((a) => a.id));
  if (allIds.size !== airports.length) throw new Error("a supplement collides with an ANAC airport");
  // The published record count lives here, where it is produced, rather than only
  // in the hand-written .d.ts and README that quote it.
  if (airports.length !== ANAC_EXPECTED + SUPPLEMENTS.length)
    throw new Error(
      `expected ${ANAC_EXPECTED + SUPPLEMENTS.length} airports after merging ` +
        `(${ANAC_EXPECTED} from ANAC + ${SUPPLEMENTS.length} supplements), got ${airports.length}`
    );

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

  // Emit v2 via the shared writer (live-only source, so stamp the run's date).
  const cfg = MIGRATIONS.aviation;
  const today = new Date().toISOString().slice(0, 10);
  const { records } = writePackageV2({
    pkg: "aviation",
    dir: DATA,
    files: [{ file: "airports.json", rows: airports.map(cfg.map) }],
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
