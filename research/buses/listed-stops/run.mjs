#!/usr/bin/env node
/**
 * P4 desk step: match the ordered stop names ETUS Skikda and ETUS M'Sila publish
 * to a package Station or an OSM bus-stop node in the right commune.
 *
 * Research only. Reads the committed Source captures and package data, makes one
 * Overpass query (cached under the gitignored research/buses/osm/), and writes
 * matches.json + REVIEW.md next to this file. Nothing is promoted from here.
 *
 * Usage:
 *   node research/buses/listed-stops/run.mjs            # uses the cache when present
 *   node research/buses/listed-stops/run.mjs --refresh  # re-runs the Overpass query
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { containingCommuneCode, loadCommunes } from "../../../scripts/lib/build-utils.mjs";
import { candidateFromOsm, matchListedStops, networkCommunes } from "./match-stops.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const CACHE_FILE = join(ROOT, "research", "buses", "osm", "listed-stops-nodes.json");
const ENDPOINT = "https://overpass-api.de/api/interpreter";
const UA = "geoalgeria-data/1.0 (+https://geoalgeria.com)";
// Same rule as collect-osm.mjs: a mirror more than a week behind is refused.
const MAX_MIRROR_LAG_DAYS = 7;

// Bounding boxes (south, west, north, east) of the shipped wilaya 21 and 28
// polygons; nodes are then joined to a commune by outline, so the box only has to
// cover the wilaya, not fit it.
const BBOXES = { "21": [36.419, 6.239, 37.09, 7.404], "28": [35.27, 3.369, 36.043, 5.338] };

const OVERPASS_QUERY = `[out:json][timeout:180];
(
${Object.values(BBOXES)
  .map((b) => `  node["highway"="bus_stop"][~"^name(:ar|:fr)?$"~"."](${b.join(",")});
  node["public_transport"="platform"][~"^name(:ar|:fr)?$"~"."](${b.join(",")});`)
  .join("\n")}
);
out body;`;

async function fetchNodes() {
  console.log(`Querying ${ENDPOINT} …`);
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
    },
    body: new URLSearchParams({ data: OVERPASS_QUERY }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!response.ok) {
    throw new Error(`Overpass HTTP ${response.status} (Retry-After: ${response.headers.get("retry-after") ?? "none"})`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload.elements)) throw new Error("Overpass response has no elements array");
  if (payload.remark) throw new Error(`Overpass remark: ${payload.remark}`);
  const base = Date.parse(payload.osm3s?.timestamp_osm_base ?? "");
  if (!(Date.now() - base <= MAX_MIRROR_LAG_DAYS * 86_400_000)) {
    throw new Error(`stale mirror: OSM data as of ${payload.osm3s?.timestamp_osm_base ?? "unknown"}`);
  }
  const cache = {
    endpoint: ENDPOINT,
    query: OVERPASS_QUERY,
    retrieved_at: new Date().toISOString(),
    timestamp_osm_base: payload.osm3s.timestamp_osm_base,
    licence: "ODbL 1.0, (c) OpenStreetMap contributors",
    elements: payload.elements,
  };
  writeFileSync(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`);
  return cache;
}

async function loadNodes(refresh) {
  if (!refresh && existsSync(CACHE_FILE)) return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
  return fetchNodes();
}

const readJson = (...parts) => JSON.parse(readFileSync(join(ROOT, ...parts), "utf-8"));

// The two Operators with a published ordered list and no geometry. Neither source
// splits its list by direction of travel, so each Line has one list.
const skikda = readJson("sources", "buses", "etus-skikda-lines.json");
const NETWORKS = [
  {
    operator_id: "etus-skikda",
    source: "sources/buses/etus-skikda-lines.json",
    servedAreas: skikda.evidence.service_areas_ar,
    lines: skikda.lines,
  },
  {
    operator_id: "etus-msila",
    source: "sources/buses/etus-msila-lines.json",
    servedAreas: [],
    lines: readJson("sources", "buses", "etus-msila-lines.json"),
  },
];

const osm = await loadNodes(process.argv.includes("--refresh"));
console.log(`OSM nodes: ${osm.elements.length} (data as of ${osm.timestamp_osm_base})`);

const communes = loadCommunes();
const wilayaOfCommune = new Map(communes.map((c) => [Number(c.code_commune), String(c.wilaya_code).padStart(2, "0")]));
const packageLines = new Map(readJson("packages", "buses", "data", "lines.json").map((l) => [l.id, l]));
const stations = readJson("packages", "buses", "data", "stations.json");

// Every candidate, joined to the commune whose OSM outline holds it. A point no
// outline holds gets no commune and so can never match.
const allCandidates = [
  ...stations.map((s) => ({
    kind: "station",
    id: s.id,
    names: [...new Set([s.name_ar, s.name_fr, s.name].filter(Boolean))],
    lat: s.lat,
    lng: s.lng,
    commune_code: s.commune_code ?? containingCommuneCode(s.lat, s.lng),
  })),
  ...osm.elements.map((e) => candidateFromOsm(e, containingCommuneCode(e.lat, e.lon))),
];

const networks = NETWORKS.map((net) => {
  const sample = packageLines.get(`${net.operator_id}-${net.lines[0].ref}`);
  const wilayaCode = sample.wilaya_code;
  const communeCodes = networkCommunes(communes, { wilayaCode, network: sample.network, servedAreas: net.servedAreas });
  const pool = allCandidates.filter((c) => wilayaOfCommune.get(Number(c.commune_code)) === wilayaCode);
  return {
    operator_id: net.operator_id,
    source: net.source,
    wilaya_code: wilayaCode,
    network: sample.network,
    commune_codes: communeCodes,
    candidate_count: { in_wilaya: pool.length, in_communes: pool.filter((c) => communeCodes.includes(Number(c.commune_code))).length },
    lines: net.lines.map((line) => ({
      line_id: `${net.operator_id}-${line.ref}`,
      ref: line.ref,
      direction: null,
      stops: matchListedStops(
        line.stop_names_ar.map((name_ar, i) => ({ position: i + 1, name_ar, name_fr: null })),
        pool,
        { communeCodes },
      ),
    })),
  };
});

const out = {
  note:
    "Research output for accuracy plan P4 (ADR 0003). Each Listed stop is exact (one candidate in the Line's communes with the same stop key), ambiguous (several equal candidates, or fuzzy ones only; Owner review) or unmatched. Distance to the previous exact match only orders candidates. Neither source splits its list by direction, so direction is null. Nothing here is promoted.",
  osm: {
    endpoint: osm.endpoint,
    retrieved_at: osm.retrieved_at,
    timestamp_osm_base: osm.timestamp_osm_base,
    node_count: osm.elements.length,
    licence: osm.licence,
  },
  networks,
};
writeFileSync(join(HERE, "matches.json"), `${JSON.stringify(out, null, 2)}\n`);
writeFileSync(join(HERE, "REVIEW.md"), review(out, communes));
console.log("Wrote matches.json and REVIEW.md");

function review({ osm, networks }, communes) {
  const communeName = new Map(communes.map((c) => [Number(c.code_commune), `${c.name_fr} (${c.code_commune})`]));
  const count = (stops, outcome) => stops.filter((s) => s.outcome === outcome).length;
  const pct = (n, d) => `${d ? Math.round((n / d) * 100) : 0} %`;
  const lines = networks.flatMap((n) => n.lines.map((l) => ({ ...l, operator_id: n.operator_id })));
  const all = lines.flatMap((l) => l.stops);
  const md = [
    "# Listed stops: match review (P4)",
    "",
    `Generated by \`node research/buses/listed-stops/run.mjs\` from the committed Operator lists, \`packages/buses/data/stations.json\` and one Overpass pull (${osm.node_count} named \`highway=bus_stop\` / \`public_transport=platform\` nodes over wilayas 21 and 28, OSM data as of ${osm.timestamp_osm_base}). Research only: nothing here is promoted, and only exact or Owner-reviewed matches may be.`,
    "",
    "- **exact**: one candidate in the Line's communes has the same stop key (Arabic and French fold, stop word dropped).",
    "- **ambiguous**: several equal candidates, or only fuzzy ones (article dropped, or one name inside the other). Listed below for review.",
    "- **unmatched**: no candidate in the Line's communes (`no_candidate`), or the name exists only in another commune of the wilaya (`name_outside_communes`).",
    "",
    "Distance to the previous exact match orders the candidates; it never makes a match. Neither source splits its list by direction.",
    "",
    "## Communes searched",
    "",
    "| Operator | Communes | Candidates in wilaya | in these communes |",
    "| --- | --- | ---: | ---: |",
    ...networks.map((n) => `| ${n.operator_id} | ${n.commune_codes.map((c) => communeName.get(c)).join(", ")} | ${n.candidate_count.in_wilaya} | ${n.candidate_count.in_communes} |`),
    "",
    "## Match rate per Line",
    "",
    "| Line | Listed stops | exact | ambiguous | unmatched | exact rate |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...lines.map((l) => `| ${l.line_id} | ${l.stops.length} | ${count(l.stops, "exact")} | ${count(l.stops, "ambiguous")} | ${count(l.stops, "unmatched")} | ${pct(count(l.stops, "exact"), l.stops.length)} |`),
    `| **all** | ${all.length} | ${count(all, "exact")} | ${count(all, "ambiguous")} | ${count(all, "unmatched")} | ${pct(count(all, "exact"), all.length)} |`,
    "",
    "## Exact matches",
    "",
    "| Line | # | Listed stop | Matched to |",
    "| --- | ---: | --- | --- |",
    ...lines.flatMap((l) => l.stops.filter((s) => s.outcome === "exact").map((s) =>
      `| ${l.line_id} | ${s.position} | ${s.name_ar} | ${s.station_id ?? `node/${s.osm_node_id}`} |`)),
    "",
    "## Ambiguous matches for Owner review",
    "",
    "| Line | # | Listed stop | Why | Candidates (nearest to the previous exact match first) |",
    "| --- | ---: | --- | --- | --- |",
    ...lines.flatMap((l) => l.stops.filter((s) => s.outcome === "ambiguous").map((s) =>
      `| ${l.line_id} | ${s.position} | ${s.name_ar} | ${s.reason} | ${s.candidates.map((c) =>
        `${c.kind === "station" ? c.id : `node/${c.id}`} "${c.name}" (${c.match}${c.distance_m == null ? "" : `, ${c.distance_m} m`})`).join("; ")} |`)),
    "",
    "## Unmatched, by reason",
    "",
    "| Reason | Listed stops |",
    "| --- | ---: |",
    ...["no_candidate", "name_outside_communes"].map((r) => `| ${r} | ${all.filter((s) => s.reason === r).length} |`),
    "",
  ];
  return md.join("\n");
}
