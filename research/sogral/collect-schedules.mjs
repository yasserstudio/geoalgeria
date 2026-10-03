#!/usr/bin/env node
/**
 * Resumable local collection of public MAHATATI schedule-search results.
 *
 * This must run only after `--probe` has successfully validated the protected
 * search form. It makes one sequential request at a time, checkpoints each
 * result, and never classifies an HTTP/form failure as "no service".
 *
 * Usage:
 *   node collect-schedules.mjs --date 2026-08-12 --probe
 *   node collect-schedules.mjs --date 2026-08-12 --run
 *   node collect-schedules.mjs --date 2026-08-12 --run --limit 20
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  acquireCollectorLock,
  assertServiceDate,
  matrixPairs,
  positiveLimit,
  scheduleCheckpointHealth,
  writeJsonAtomic,
} from "./collector-guards.mjs";

const BASE_URL = "https://mahatati.sogral.com";
const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (name) => args.includes(name) ? args[args.indexOf(name) + 1] : null;
const date = option("--date");
const run = args.includes("--run");
const probe = args.includes("--probe");
const status = args.includes("--status");
const allowStaleMatrix = args.includes("--allow-stale-matrix");
const limit = positiveLimit(option("--limit"));
const delayMs = 1_250;
const PROBE_KEYS = [
  "1:213-000019001", // ALGER → SETIF
  "1:213-000025001", // ALGER → CONSTANTINE
  "10:213-000016000", // ADRAR → ALGER (original probe)
];
assertServiceDate(date);
if ([run, probe, status].filter(Boolean).length !== 1) {
  throw new Error("Choose exactly one of --probe, --run or --status");
}

const output = join(HERE, `mahatati-schedules-${date}.json`);
const progressOutput = join(HERE, `mahatati-schedules-${date}.progress.json`);
const matrix = JSON.parse(readFileSync(join(HERE, "mahatati-live.json"), "utf8"));
const { pairs, retrievedAt: matrixRetrievedAt } = matrixPairs(matrix, { allowStale: allowStaleMatrix });
const expectedKeys = pairs.map((pair) => `${pair.agency_id}:${pair.destination_id}`);
const USER_AGENT = "GeoAlgeria local research capture (contact@sogral.dz)";
const sleep = () => new Promise((resolve) => setTimeout(resolve, delayMs));

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cookies(response) {
  if (typeof response.headers.getSetCookie === "function") return response.headers.getSetCookie().map((item) => item.split(";", 1)[0]).join("; ");
  const value = response.headers.get("set-cookie");
  return value ? value.split(/,(?=[^;]+?=)/).map((item) => item.split(";", 1)[0]).join("; ") : "";
}

async function sessionPage() {
  const response = await fetch(`${BASE_URL}/`, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`homepage: HTTP ${response.status}`);
  const html = await response.text();
  const token = html.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/i)?.[1];
  if (!token) throw new Error("homepage: no anti-forgery token");
  return { token, cookie: cookies(response) };
}

function tokenFromHtml(html) {
  const token = html.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/i)?.[1];
  if (!token) throw new Error("response: no anti-forgery token for next search");
  return token;
}

function mergeCookies(existing, response) {
  const next = cookies(response);
  if (!next) return existing;
  const jar = new Map(existing.split(/;\s*/).filter(Boolean).map((item) => item.split("=", 2)));
  for (const item of next.split(/;\s*/).filter(Boolean)) {
    const [name, value] = item.split("=", 2);
    jar.set(name, value);
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

function departuresFromHtml(html, pair) {
  const rows = [];
  for (const row of html.matchAll(/<tr\s+data-content="([^"]+)"\s+class="DepartureInfos">([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => decodeHtml(cell[1]));
    const [agencyId, routeId, headOfLineId] = row[1].split(";");
    const capacity = cells[5]?.match(/(\d+)\s*\/\s*(\d+)/);
    rows.push({
      ...pair,
      agency_id: Number(agencyId),
      route_id: Number(routeId),
      head_of_line_id: headOfLineId,
      headsign: cells[1] || null,
      transporter: cells[2] || null,
      departure_text: cells[3] || null,
      zone: Number(cells[4]) || null,
      available_seats: capacity ? Number(capacity[1]) : null,
      total_seats: capacity ? Number(capacity[2]) : null,
      status: cells[6] || null,
    });
  }
  return rows;
}

async function search(pair, session) {
  const form = new URLSearchParams({
    AgencyId: String(pair.agency_id),
    DestinationId: pair.destination_id,
    Date: date,
    Periode: "0",
    __Invariant: "Date",
    __RequestVerificationToken: session.token,
  });
  const response = await fetch(`${BASE_URL}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: session.cookie,
      Origin: BASE_URL,
      Referer: `${BASE_URL}/`,
      "User-Agent": USER_AGENT,
    },
    body: form,
  });
  const html = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${decodeHtml(html).slice(0, 240)}`);
  if (!html.includes("DeparturesTable")) throw new Error("response has no departure table");
  session.token = tokenFromHtml(html);
  session.cookie = mergeCookies(session.cookie, response);
  return departuresFromHtml(html, pair);
}

if (probe) {
  const candidates = PROBE_KEYS.flatMap((key) => {
    const matching = pairs.find((pair) => `${pair.agency_id}:${pair.destination_id}` === key);
    return matching ? [matching] : [];
  });
  if (!candidates.length) throw new Error("all known probe pairs are missing from the current matrix");

  const session = await sessionPage();
  for (const matching of candidates) {
    const rows = await search(matching, session);
    if (!rows.length) continue;
    console.log(JSON.stringify({ probe: matching, departures: rows.length, sample: rows[0] }, null, 2));
    process.exit(0);
  }
  throw new Error("known probe pairs returned no rows: do not begin matrix collection");
}

if (status) {
  if (!existsSync(progressOutput)) throw new Error(`Missing ${progressOutput}`);
  const state = JSON.parse(readFileSync(progressOutput, "utf8"));
  console.log(JSON.stringify({
    date,
    matrix_retrieved_at: matrixRetrievedAt,
    ...scheduleCheckpointHealth(state, { date, expectedKeys }),
  }, null, 2));
  process.exit(0);
}

const releaseLock = acquireCollectorLock(progressOutput);
const state = existsSync(progressOutput)
  ? JSON.parse(readFileSync(progressOutput, "utf8"))
  : { date, started_at: new Date().toISOString(), completed: {}, results: [], failures: [] };
scheduleCheckpointHealth(state, { date, expectedKeys });

let attempted = 0;
let session = await sessionPage();
for (const pair of pairs) {
  const key = `${pair.agency_id}:${pair.destination_id}`;
  if (state.completed[key]) continue;
  if (attempted++ >= limit) break;
  try {
    let rows;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        rows = await search(pair, session);
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        // Refresh the anti-forgery session once, then retry the same pair.
        session = await sessionPage();
        await sleep();
      }
    }
    state.results.push({ key, checked_at: new Date().toISOString(), pair, departures: rows });
    state.completed[key] = "ok";
    // A resumed run may recover a previously failed pair. Keep only unresolved
    // failures so final coverage describes the current state, not retry history.
    state.failures = state.failures.filter((failure) => failure.key !== key);
  } catch (error) {
    state.failures = state.failures.filter((failure) => failure.key !== key);
    state.failures.push({ key, checked_at: new Date().toISOString(), pair, error: String(error.message ?? error) });
  }
  writeJsonAtomic(progressOutput, state);
  await sleep();
}

// Also repairs checkpoints written by older collector versions after every
// pair has already succeeded, without making another network request.
state.failures = state.failures.filter((failure) => !state.completed[failure.key]);
const health = scheduleCheckpointHealth(state, { date, expectedKeys });
if (health.complete && !state.completed_at) state.completed_at = new Date().toISOString();
writeJsonAtomic(progressOutput, state);

const report = {
  source_url: `${BASE_URL}/`,
  date,
  updated_at: new Date().toISOString(),
  completed_at: state.completed_at ?? null,
  matrix_retrieved_at: matrixRetrievedAt,
  scope: "Local research only. Point-in-time search observations, not a reusable timetable.",
  coverage: {
    total_pairs: pairs.length,
    completed_pairs: Object.keys(state.completed).length,
    successful_pairs: state.results.length,
    failed_pairs: state.failures.length,
    departure_rows: state.results.reduce((total, result) => total + result.departures.length, 0),
  },
  health,
  results: state.results,
  failures: state.failures,
};
writeJsonAtomic(output, report);
releaseLock();
console.log(JSON.stringify(report.coverage, null, 2));
