#!/usr/bin/env node
/**
 * Refresh the campus coordinate seed (scripts/seeds/coordinates.json) for the
 * MESRS higher-education institutions.
 *
 * The ministry's network page carries NO coordinates (only names + websites), so
 * coordinates are an enrichment layer, not source data. This script geocodes each
 * named campus once via OpenStreetMap Nominatim and writes the validated result to
 * a committed seed; fetch.mjs then reads that seed so the dataset build is
 * reproducible offline (the same pattern banques uses for its browser-captured
 * seeds). Coordinates are therefore OSM-derived and labelled `geo_precision:
 * "campus"` in the output; fetch.mjs cross-checks each one against the flagship
 * wilaya and falls back to a commune/wilaya centroid when a geocode is missing or
 * lands in the wrong wilaya.
 *
 * Run occasionally (not on every build):  node scripts/geocode.mjs
 *   SAMPLE=8 node scripts/geocode.mjs   # geocode only the first 8 (smoke test)
 *
 * Respects the Nominatim usage policy: a descriptive User-Agent and <= 1 req/sec.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getHtml, parseInstitutions, instKey, UA } from "./mesrs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED = join(__dirname, "seeds", "coordinates.json");
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0 &&
  lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

// De-noise a name into a clean locator: split a glued "Universitéd'Oran" and
// "Oran1" back apart, drop "ex …"/"alias …" tails, and trim punctuation. Returns
// an ordered list of query candidates (most specific first); the first that
// resolves inside Algeria wins. OSM indexes many of these schools under their
// short form, so we also try the name with the leading article removed.
function candidates(name) {
  let n = name
    .replace(/^l['’]\s*/i, "")                 // leading "L'École…"
    .replace(/([a-zà-ÿ])([A-ZÀ-Ý])/g, "$1 $2") // un-glue "Universitéd" → "Université d"
    .replace(/([a-zà-ÿ])(\d)/g, "$1 $2")        // "Oran1" → "Oran 1"
    .replace(/\b(ex|alias)\b[\s\S]*$/i, "")     // drop "ex EPST Annaba", "alias Kasdi Merbah"
    .replace(/\s+/g, " ")
    .trim();
  const noEponym = n.split(/\s+[–—-]\s+|,\s+/)[0].trim();
  const list = [noEponym, n];                   // try locator-only first, then full
  return [...new Set(list.filter((s) => s.length > 4))];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function query(q) {
  const url = `${NOMINATIM}?q=${encodeURIComponent(q + ", Algérie")}&format=jsonv2&countrycodes=dz&addressdetails=1&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": `geoalgeria-data/1.0 (+https://geoalgeria.com) ${UA}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arr = await res.json();
  if (!Array.isArray(arr) || !arr.length) return null;
  const r = arr[0];
  const lat = Number(r.lat), lng = Number(r.lon);
  if (!inAlgeria(lat, lng)) return null;
  return { lat, lng, state: r.address?.state || r.address?.province || null, display_name: r.display_name || null };
}

// Try each candidate query (rate-limited) until one resolves inside Algeria.
async function geocode(name) {
  for (const q of candidates(name)) {
    const g = await query(q);
    if (g) return { ...g, term: q };
    await sleep(1100);
  }
  return null;
}

async function main() {
  const html = await getHtml();
  const insts = parseInstitutions(html);
  console.log(`Parsed ${insts.length} institutions; geocoding via Nominatim (<=1 req/sec)…`);

  const limit = process.env.SAMPLE ? Number(process.env.SAMPLE) : insts.length;
  const seed = existsSync(SEED) ? JSON.parse(readFileSync(SEED, "utf8")) : {};
  const force = !!process.env.FORCE;
  let hits = 0, misses = 0, skipped = 0;

  for (let i = 0; i < Math.min(limit, insts.length); i++) {
    const inst = insts[i];
    const k = instKey(inst);
    if (!force && seed[k]) { skipped++; continue; } // already geocoded — FORCE=1 to refresh
    try {
      const g = await geocode(inst.name);
      if (g) {
        seed[k] = { lat: g.lat, lng: g.lng, state: g.state, display_name: g.display_name, term: g.term, name: inst.name };
        hits++;
        console.log(`  ✓ [${String(i + 1).padStart(3)}] ${g.term}  →  ${g.lat.toFixed(5)},${g.lng.toFixed(5)}  (${g.state || "?"})`);
      } else {
        misses++;
        console.log(`  ✗ [${String(i + 1).padStart(3)}] ${inst.name}  →  no result`);
      }
    } catch (e) {
      misses++;
      console.log(`  ! [${String(i + 1).padStart(3)}] ${inst.name}  →  ${e.message}`);
    }
    await sleep(1100);
  }
  if (skipped) console.log(`  (skipped ${skipped} already-seeded; FORCE=1 to refresh)`);

  mkdirSync(dirname(SEED), { recursive: true });
  writeFileSync(SEED, JSON.stringify(seed, null, 2) + "\n");
  console.log(`\nWrote ${Object.keys(seed).length} coordinate(s) to seeds/coordinates.json (${hits} hit, ${misses} miss this run).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
