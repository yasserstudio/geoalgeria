#!/usr/bin/env node
/** Collect Algerian bank premises from OpenStreetMap as review candidates.
 * OSM is supporting coordinate evidence only; publication still requires a
 * deterministic match to a branch from an official bank locator.
 * Run with: node research/banques/collect-osm.mjs
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { containingWilayaCode } from "../../scripts/lib/build-utils.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "osm");
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const QUERY = `[out:json][timeout:180];
area["ISO3166-1"="DZ"][admin_level=2]->.dz;
(
  nwr["amenity"="bank"](area.dz);
  nwr["office"="financial"](area.dz);
);
out body center;`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function fetchOverpass() {
  let last;
  for (let attempt = 1; attempt <= 2; attempt++) {
    for (const endpoint of ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": "geoalgeria-data/1.0 (+https://geoalgeria.com)",
          },
          body: new URLSearchParams({ data: QUERY }),
          signal: AbortSignal.timeout(240_000),
        });
        if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload.elements)) throw new Error(`${endpoint}: missing elements`);
        if (typeof payload.remark === "string" && payload.remark.trim()) {
          throw new Error(`${endpoint}: ${payload.remark.trim()}`);
        }
        return { endpoint, payload };
      } catch (error) {
        last = error;
        await sleep(1500 * attempt);
      }
    }
  }
  throw last;
}

const point = (element) =>
  element.type === "node"
    ? [element.lat, element.lon]
    : [element.center?.lat, element.center?.lon];
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

const run = async () => {
  const { endpoint, payload } = await fetchOverpass();
  const retrievedAt = new Date().toISOString();
  const records = payload.elements
    .map((element) => {
      const [lat, lng] = point(element);
      const tags = element.tags ?? {};
      return {
        candidate_id: `osm-${element.type}-${element.id}`,
        osm_id: `${element.type}/${element.id}`,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        wilaya_code:
          Number.isFinite(lat) && Number.isFinite(lng)
            ? containingWilayaCode(lat, lng)
            : null,
        precision: element.type === "node" ? "exact" : "approximate",
        source_url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
        tags,
      };
    })
    .filter((record) => record.lat !== null && record.lng !== null && record.wilaya_code !== null);

  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    join(OUT, "raw.json"),
    `${JSON.stringify({ retrieved_at: retrievedAt, endpoint, query: QUERY, ...payload }, null, 2)}\n`,
  );
  writeFileSync(
    join(OUT, "candidates.json"),
    `${JSON.stringify({ retrieved_at: retrievedAt, source: "OpenStreetMap", source_hash: hash(payload), records }, null, 2)}\n`,
  );
  console.log(`Captured ${records.length} OSM bank candidates inside known wilaya boundaries.`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

export { QUERY, point };
