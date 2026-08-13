#!/usr/bin/env node
/**
 * Resumable local enrichment of observed MAHATATI route variants.
 *
 * The schedule collector records the route identifiers displayed in search
 * results. This script visits each unique public route-detail endpoint once
 * and preserves its ordered stops, fares, segment distances and SOGRAL
 * estimated segment durations. It never uses booking or passenger endpoints.
 *
 * Usage:
 *   node collect-itineraries.mjs --date 2026-08-12 --probe
 *   node collect-itineraries.mjs --date 2026-08-12 --run
 *   node collect-itineraries.mjs --date 2026-08-12 --run --limit 20
 *   node collect-itineraries.mjs --date 2026-08-12 --run --key 1:213-000019005:499
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  acquireCollectorLock,
  assertServiceDate,
  itineraryCheckpointHealth,
  positiveLimit,
  writeJsonAtomic,
} from "./collector-guards.mjs";

const BASE_URL = "https://mahatati.sogral.com";
const HERE = dirname(fileURLToPath(import.meta.url));
const USER_AGENT = "GeoAlgeria local research capture (contact@sogral.dz)";
const args = process.argv.slice(2);
const option = (name) => args.includes(name) ? args[args.indexOf(name) + 1] : null;
const date = option("--date");
const run = args.includes("--run");
const probe = args.includes("--probe");
const status = args.includes("--status");
const limit = positiveLimit(option("--limit"));
const selectedKey = option("--key");
const delayMs = 1_250;
assertServiceDate(date);
if ([run, probe, status].filter(Boolean).length !== 1) {
  throw new Error("Choose exactly one of --probe, --run or --status");
}

const scheduleInput = join(HERE, `mahatati-schedules-${date}.progress.json`);
const output = join(HERE, `mahatati-itineraries-${date}.json`);
const progressOutput = join(HERE, `mahatati-itineraries-${date}.progress.json`);
const sleep = (ms = delayMs) => new Promise((resolve) => setTimeout(resolve, ms));

async function readScheduleProgress() {
  if (!existsSync(scheduleInput)) throw new Error(`Missing ${scheduleInput}`);
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      return JSON.parse(readFileSync(scheduleInput, "utf8"));
    } catch (error) {
      if (attempt === 20) throw error;
      await sleep(150);
    }
  }
}

function routeKey(route) {
  return `${route.agency_id}:${route.head_of_line_id}:${route.route_id}`;
}

function observedRoutes(schedule) {
  const routes = new Map();
  for (const result of schedule.results ?? []) {
    for (const departure of result.departures ?? []) {
      if (!departure.agency_id || !departure.head_of_line_id || !departure.route_id) continue;
      const route = {
        agency_id: departure.agency_id,
        head_of_line_id: departure.head_of_line_id,
        route_id: departure.route_id,
      };
      routes.set(routeKey(route), route);
    }
  }
  return [...routes.values()];
}

async function fetchItinerary(route) {
  const path = [route.agency_id, route.head_of_line_id, route.route_id]
    .map((value) => encodeURIComponent(String(value)))
    .join("/");
  const response = await fetch(`${BASE_URL}/api/live/departures/infos/route/${path}`, {
    headers: { "User-Agent": USER_AGENT, Referer: `${BASE_URL}/` },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 240)}`);
  const stops = JSON.parse(body);
  if (!Array.isArray(stops) || stops.length < 2 || !stops.every((stop) => typeof stop?.P1 === "string")) {
    throw new Error("route response has no ordered stop list");
  }
  return stops;
}

if (probe) {
  const route = { agency_id: 1, head_of_line_id: "213-000019005", route_id: 499 };
  const stops = await fetchItinerary(route);
  console.log(JSON.stringify({ probe: route, stops: stops.length, sample: stops.slice(0, 2) }, null, 2));
  process.exit(0);
}

const schedule = await readScheduleProgress();
const allRoutes = observedRoutes(schedule);
const expectedKeys = allRoutes.map(routeKey);
const routes = selectedKey
  ? allRoutes.filter((route) => routeKey(route) === selectedKey)
  : allRoutes;
if (selectedKey && routes.length === 0) throw new Error(`Route ${selectedKey} is not present in the schedule checkpoint`);

if (status) {
  if (!existsSync(progressOutput)) throw new Error(`Missing ${progressOutput}`);
  const state = JSON.parse(readFileSync(progressOutput, "utf8"));
  console.log(JSON.stringify({ date, ...itineraryCheckpointHealth(state, { date, expectedKeys }) }, null, 2));
  process.exit(0);
}

const releaseLock = acquireCollectorLock(progressOutput);
const state = existsSync(progressOutput)
  ? JSON.parse(readFileSync(progressOutput, "utf8"))
  : { date, started_at: new Date().toISOString(), routes: {}, failures: [] };
itineraryCheckpointHealth(state, { date, expectedKeys });

let attempted = 0;
for (const route of routes) {
  const key = routeKey(route);
  if (state.routes[key]) continue;
  if (attempted++ >= limit) break;
  try {
    const stops = await fetchItinerary(route);
    state.routes[key] = { ...route, checked_at: new Date().toISOString(), stops };
    state.failures = state.failures.filter((failure) => failure.key !== key);
  } catch (error) {
    state.failures = state.failures.filter((failure) => failure.key !== key);
    state.failures.push({ key, checked_at: new Date().toISOString(), ...route, error: String(error.message ?? error) });
  }
  writeJsonAtomic(progressOutput, state);
  await sleep();
}

state.failures = state.failures.filter((failure) => !state.routes[failure.key]);
const health = itineraryCheckpointHealth(state, { date, expectedKeys });
if (health.complete && !state.completed_at) state.completed_at = new Date().toISOString();
writeJsonAtomic(progressOutput, state);

const report = {
  source_url: `${BASE_URL}/api/live/departures/infos/route/{agencyId}/{headOfLineId}/{routeId}`,
  date,
  updated_at: new Date().toISOString(),
  completed_at: state.completed_at ?? null,
  scope: "Local research only. Ordered route observations and estimates, not a timetable.",
  coverage: {
    observed_routes: allRoutes.length,
    captured_routes: Object.keys(state.routes).length,
    failed_requests: state.failures.length,
  },
  health,
  routes: state.routes,
  failures: state.failures,
};
writeJsonAtomic(output, report);
releaseLock();
console.log(JSON.stringify(report.coverage, null, 2));
