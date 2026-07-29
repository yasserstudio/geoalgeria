#!/usr/bin/env node
/**
 * Emit the nonstop route network to ../data as routes.json + CSV + GeoJSON.
 *
 * Input is `research/_flight-routes/route-dataset.json`, which is built and
 * reviewed there (see that directory's collection-rules.md for how a route earns
 * its way in). This script only shapes and emits; it decides nothing.
 *
 * A route is NOT a GeoRecord, and that is deliberate rather than a shortcut.
 * Every other file in this repo is a collection of places, one point per row.
 * A route is a link BETWEEN two places: it has two endpoints and a path, so
 * `lat`/`lng`/`geo_precision` have nothing to describe. Forcing it into the
 * GeoRecord shape would mean picking one end and calling it the record's
 * location, which would be false. So routes.json is declared a RELATION file and
 * validate-packages skips only the GeoRecord contract for it, keeping the count,
 * CSV, GeoJSON and unique-id checks.
 *
 * Directional by construction: ALG->BUD and BUD->ALG are separate rows, because
 * the Budapest triangle flies each way on a different day of the week and there
 * is never a same-day nonstop round trip.
 *
 * The GeoJSON draws each route as a great-circle LineString rather than a
 * straight lng/lat segment. On a globe the shortest path between Algiers and
 * Johannesburg is a curve, and a straight line in lng/lat space is simply the
 * wrong geometry; anything consuming this GeoJSON should get the real path.
 *
 * Usage: node scripts/build-routes.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { toCSV } from "../../schema/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const SRC = join(__dirname, "..", "..", "..", "research", "_flight-routes", "route-dataset.json");

/** Points along the great circle from a to b, so the drawn path is the real one. */
function greatCircle([lng1, lat1], [lng2, lat2], steps = 48) {
  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;
  const [φ1, λ1, φ2, λ2] = [rad(lat1), rad(lng1), rad(lat2), rad(lng2)];
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
      ),
    );
  if (d === 0) return [[lng1, lat1]];
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    out.push([deg(Math.atan2(y, x)), deg(Math.atan2(z, Math.hypot(x, y)))]);
  }
  return out;
}

function main() {
  const { routes, planned, endpoints, as_of: asOf } = JSON.parse(readFileSync(SRC, "utf-8"));
  // Validated BEFORE any write, same discipline as writePackageV2: a dataset
  // regenerated without a validity stamp must abort with the directory
  // untouched, not after four files are already on disk.
  if (!asOf) throw new Error("route-dataset.json carries no as_of; rebuild it");
  const ep = Object.fromEntries(endpoints.map((e) => [e.iata, e]));

  // One flat table: planned routes are marked rather than split into a second
  // file, because they share every column and a consumer filtering on
  // `planned` is simpler than one joining two files. plannedRoutes() does the
  // split at the API boundary, where the locked scope wants it.
  const rows = [
    ...routes.map((r) => ({ ...r, planned: false })),
    ...planned.map((r) => ({ ...r, planned: true })),
  ].map((r) => ({
    id: r.id,
    from: r.from,
    to: r.to,
    carrier: r.carrier,
    flight: r.flight ?? null,
    status: r.status,
    days: r.days ?? null,
    evidence: r.evidence,
    planned: r.planned,
    source: r.source,
    great_circle_km: r.great_circle_km,
  }));

  for (const r of rows) {
    if (!ep[r.from] || !ep[r.to]) throw new Error(`${r.id}: endpoint missing, cannot emit`);
  }
  const ids = new Set(rows.map((r) => r.id));
  if (ids.size !== rows.length) throw new Error("duplicate route id");

  mkdirSync(join(DATA, "csv"), { recursive: true });
  mkdirSync(join(DATA, "geojson"), { recursive: true });

  writeFileSync(join(DATA, "routes.json"), JSON.stringify(rows, null, 2) + "\n");

  const cols = ["id", "from", "to", "carrier", "flight", "status", "days", "evidence", "planned", "source", "great_circle_km"];
  writeFileSync(
    join(DATA, "csv", "routes.csv"),
    toCSV(rows.map((r) => ({ ...r, days: r.days ? r.days.join(" ") : null })), cols),
  );

  const fc = {
    type: "FeatureCollection",
    features: rows.map((r) => {
      const a = ep[r.from];
      const b = ep[r.to];
      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: greatCircle([a.lng, a.lat], [b.lng, b.lat]).map(([x, y]) => [
            Number(x.toFixed(5)),
            Number(y.toFixed(5)),
          ]),
        },
        properties: { ...r, from_name: a.name, to_name: b.name },
      };
    }),
  };
  writeFileSync(join(DATA, "geojson", "routes.geojson"), JSON.stringify(fc, null, 2) + "\n");

  // Endpoints ship too: a consumer drawing arcs needs both ends, and the foreign
  // ones are not in airports.json, which is Algeria only. The types declare the
  // three names non-optional, so a dataset regenerated without them (a checkout
  // predating localize_endpoint_names.py) must fail here, not in a consumer.
  for (const e of endpoints) {
    for (const f of ["iata", "name", "name_en", "name_ar", "lat", "lng", "country"]) {
      if (e[f] === undefined || e[f] === null || e[f] === "")
        throw new Error(`route-endpoints: ${e.iata ?? "?"} missing ${f}; rebuild route-dataset.json`);
    }
  }
  writeFileSync(join(DATA, "route-endpoints.json"), JSON.stringify(endpoints, null, 2) + "\n");

  // Routes churn seasonally, so the package carries a validity stamp instead of
  // reading as evergreen: `as_of` is the date the network was last checked
  // against schedules, set in the research dataset by a real verification pass.
  // Patched into metadata.json here (fetch.mjs preserves it), because the shared
  // writer that owns metadata.json runs from a live ANAC pull this script must
  // not trigger.
  const metaPath = join(DATA, "metadata.json");
  const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
  meta.routes = rows.length;
  meta.routes_as_of = asOf;
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");

  const verified = rows.filter((r) => r.evidence === "verified").length;
  console.log(
    `routes: ${rows.length} rows (${verified} verified, ` +
      `${rows.filter((r) => r.evidence === "listed").length} listed, ` +
      `${rows.filter((r) => r.planned).length} planned), ${endpoints.length} endpoints`,
  );
}

main();
