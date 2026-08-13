#!/usr/bin/env node
/**
 * Local research capture for MAHATATI's public, no-login surfaces.
 *
 * This deliberately excludes the anti-forgery-protected search form and all
 * booking actions. See README.md for scope and reuse limits.
 *
 * Usage:
 *   node scrape-mahatati.mjs --write
 *   node scrape-mahatati.mjs --write --destinations
 *   node scrape-mahatati.mjs --status
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { matrixPairs, writeJsonAtomic } from "./collector-guards.mjs";

const BASE_URL = "https://mahatati.sogral.com";
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), "mahatati-live.json");
const captureDestinations = process.argv.includes("--destinations");
const shouldWrite = process.argv.includes("--write");
const status = process.argv.includes("--status");
const allowStaleMatrix = process.argv.includes("--allow-stale-matrix");
const delayMs = 350;
if (status && (shouldWrite || captureDestinations)) {
  throw new Error("--status cannot be combined with --write or --destinations");
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stationsFromPage(html) {
  const select = html.match(/<select[^>]+id="AgencyId"[\s\S]*?<\/select>/i)?.[0];
  if (!select) throw new Error("MAHATATI page has no AgencyId selector");
  const stations = [];
  for (const match of select.matchAll(/<option\s+value="(\d+)"[^>]*>([\s\S]*?)<\/option>/gi)) {
    const agencyId = Number(match[1]);
    // `0` is the form's "select a departure station" placeholder, not SOGRAL
    // infrastructure and must not inflate station coverage.
    if (agencyId > 0) stations.push({ agency_id: agencyId, name: decodeHtml(match[2]) });
  }
  return stations.sort((a, b) => a.agency_id - b.agency_id);
}

async function fetchJson(path) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        headers: { Accept: "application/json", "User-Agent": "GeoAlgeria research capture (contact@sogral.dz)" },
      });
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === 2) throw error;
      await sleep();
    }
  }
}

const sleep = () => new Promise((resolve) => setTimeout(resolve, delayMs));

if (status) {
  if (!existsSync(OUTPUT)) throw new Error(`Missing ${OUTPUT}`);
  const snapshot = JSON.parse(readFileSync(OUTPUT, "utf8"));
  const { pairs, retrievedAt, ageMs } = matrixPairs(snapshot, { allowStale: allowStaleMatrix });
  console.log(JSON.stringify({
    retrieved_at: retrievedAt,
    age_hours: Math.max(0, Math.round(ageMs / 3_600_000)),
    stations: snapshot.stations.length,
    destination_pairs: pairs.length,
    healthy: true,
  }, null, 2));
  process.exit(0);
}

const page = await fetch(`${BASE_URL}/`, { headers: { "User-Agent": "GeoAlgeria research capture (contact@sogral.dz)" } });
if (!page.ok) throw new Error(`MAHATATI page: HTTP ${page.status}`);

const stations = stationsFromPage(await page.text());
const snapshot = {
  source_url: `${BASE_URL}/`,
  retrieved_at: new Date().toISOString(),
  scope: "Local research only. Not licensed for redistribution or use as a timetable.",
  global_summary: await fetchJson("/api/live/summary"),
  stations,
};

if (captureDestinations) {
  for (const station of snapshot.stations) {
    await sleep();
    station.destinations = await fetchJson(`/api/live/destinations/${station.agency_id}`);
  }
}

const report = {
  stations: stations.length,
  destinations: captureDestinations
    ? stations.reduce((total, station) => total + station.destinations.length, 0)
    : "not requested",
  global_summary: snapshot.global_summary,
};

if (shouldWrite) {
  writeJsonAtomic(OUTPUT, snapshot);
  console.log(`Wrote ${OUTPUT}`);
}
console.log(JSON.stringify(report, null, 2));
