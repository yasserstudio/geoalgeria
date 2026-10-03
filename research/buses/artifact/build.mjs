#!/usr/bin/env node
/**
 * Build a standalone, offline review atlas from the ignored local bus snapshot.
 *
 * This report is a research artifact only. It does not write package data.
 *
 * Usage:
 *   node research/buses/artifact/build.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUS_RESEARCH = join(HERE, "..");
const ROOT = join(BUS_RESEARCH, "..", "..");
const OSM = join(BUS_RESEARCH, "osm");
const OUTPUT_DIRECTORY = join(OSM, "artifact");
const OUTPUT = join(OUTPUT_DIRECTORY, "index.html");
const SCALE_X = 82;
const SCALE_Y = 100;

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readText = (path) => readFileSync(path, "utf8");

const candidates = readJson(join(OSM, "candidate-lines.json"));
const candidateGeojson = readJson(join(OSM, "candidate-lines.geojson"));
const stations = readJson(join(OSM, "stations.json"));
const readiness = readJson(join(OSM, "readiness.json"));
const coverage = readJson(join(OSM, "coverage.json"));
const sourceManifest = readJson(join(OSM, "operator-sources", "manifest.json"));
const registry = readJson(join(BUS_RESEARCH, "operator-registry.json"));
const wilayaBoundaries = readJson(join(ROOT, "packages", "dataset", "data", "geojson", "wilaya-boundaries.geojson"));
const wilayaCentres = readJson(join(ROOT, "packages", "dataset", "data", "geojson", "wilayas.geojson"));

if (candidates.length !== readiness.candidate_lines) {
  throw new Error("candidate-lines.json does not match readiness.json");
}
if (stations.length !== coverage.unique_stations) {
  throw new Error("stations.json does not match coverage.json");
}
const sourceCollectionReady = sourceManifest.collection_status === "complete"
  || (sourceManifest.collection_status === "complete_with_verified_cache"
    && sourceManifest.failures.every((failure) => failure.reused_verified_cache === true));
if (!sourceCollectionReady || sourceManifest.missing.length
  || sourceManifest.response_count !== sourceManifest.expected_response_count) {
  throw new Error("operator source collection is incomplete");
}

function project(coordinate) {
  return [coordinate[0] * SCALE_X, -coordinate[1] * SCALE_Y];
}

function formatNumber(value) {
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function pathFromLine(coordinates, close = false) {
  if (!coordinates.length) return "";
  const commands = coordinates.map((coordinate, index) => {
    const [x, y] = project(coordinate);
    return (index ? "L" : "M") + formatNumber(x) + "," + formatNumber(y);
  });
  if (close) commands.push("Z");
  return commands.join("");
}

function geometryPath(geometry) {
  if (!geometry) return "";
  if (geometry.type === "LineString") return pathFromLine(geometry.coordinates);
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.map((line) => pathFromLine(line)).join("");
  }
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map((ring) => pathFromLine(ring, true)).join("");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .flatMap((polygon) => polygon.map((ring) => pathFromLine(ring, true)))
      .join("");
  }
  throw new Error("unsupported geometry type: " + geometry.type);
}

function coordinatesFromGeometry(geometry) {
  const coordinates = [];
  function visit(value) {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
      coordinates.push(value);
      return;
    }
    for (const item of value) visit(item);
  }
  visit(geometry?.coordinates);
  return coordinates;
}

function boundsFromCoordinates(coordinates) {
  if (!coordinates.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const coordinate of coordinates) {
    const [x, y] = project(coordinate);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
  };
}

function paddedBounds(bounds, ratio = 0.04) {
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  return {
    minX: bounds.minX - width * ratio,
    minY: bounds.minY - height * ratio,
    maxX: bounds.maxX + width * ratio,
    maxY: bounds.maxY + height * ratio,
  };
}

const candidateFeatures = new Map(candidateGeojson.features.map((feature) => [feature.properties.id, feature]));
const allLineCoordinates = candidateGeojson.features.flatMap((feature) => coordinatesFromGeometry(feature.geometry));
const homeBounds = paddedBounds(boundsFromCoordinates(allLineCoordinates));

const lineData = candidates.map((candidate) => {
  const feature = candidateFeatures.get(candidate.id);
  const geometryCoordinates = coordinatesFromGeometry(feature?.geometry);
  return {
    id: candidate.id,
    ref: candidate.ref,
    refs: candidate.refs,
    name: candidate.name,
    directions: candidate.directions,
    relation_ids: candidate.relation_ids,
    relation_count: candidate.relation_count,
    operator_id: candidate.operator_id,
    operator_name_fr: candidate.operator_name_fr,
    operator_match_methods: candidate.operator_match_methods,
    wilaya_codes: candidate.wilaya_codes,
    classification: candidate.classification,
    map_readiness: candidate.map_readiness,
    station_readiness: candidate.station_readiness,
    station_member_count: candidate.station_member_count,
    min_length_km: candidate.min_length_km,
    max_length_km: candidate.max_length_km,
    colours: candidate.colours,
    quality_flags: candidate.quality_flags,
    path: feature ? geometryPath(feature.geometry) : null,
    bounds: geometryCoordinates.length ? boundsFromCoordinates(geometryCoordinates) : null,
  };
});

const relationToCandidate = new Map();
for (const candidate of candidates) {
  for (const relationId of candidate.relation_ids) relationToCandidate.set(String(relationId), candidate.id);
}

const stationData = stations.map((station) => {
  const [x, y] = project([station.lng, station.lat]);
  return {
    id: station.id,
    name: station.name ?? station.name_fr ?? station.name_ar,
    x,
    y,
    wilaya_code: station.wilaya_code,
    candidate_ids: [...new Set(station.relation_ids.map((id) => relationToCandidate.get(String(id))).filter(Boolean))],
  };
});

const boundaryData = wilayaBoundaries.features.map((feature) => ({
  code: String(feature.properties.code).padStart(2, "0"),
  path: geometryPath(feature.geometry),
}));

const centreData = wilayaCentres.features
  .filter((feature) => feature.geometry?.type === "Point")
  .map((feature) => {
    const [x, y] = project(feature.geometry.coordinates);
    return {
      code: String(feature.properties.code).padStart(2, "0"),
      name_fr: feature.properties.name_fr,
      name_ar: feature.properties.name_ar,
      x,
      y,
    };
  });

const operatorData = registry.operators.map((operator) => {
  const rollup = readiness.by_operator.find((row) => row.operator_id === operator.id);
  return {
    id: operator.id,
    name_fr: operator.name_fr,
    name_ar: operator.name_ar,
    wilaya_codes: operator.wilaya_codes,
    reuse_status: operator.reuse_status,
    available_data: operator.available_data,
    discovery_findings: operator.discovery_findings ?? [],
    candidate_lines: rollup?.candidate_lines ?? 0,
    relations: rollup?.relations ?? 0,
    geometry_candidates: rollup?.geometry_candidates ?? 0,
    with_station_members: rollup?.with_station_members ?? 0,
    sources: operator.sources.map((source) => ({
      id: source.id,
      url: source.url,
      evidence_type: source.evidence_type,
      kind: source.kind,
      claims: source.claims,
      reuse_status: source.reuse_status,
    })),
    discovery_leads: (operator.discovery_leads ?? []).map((lead) => ({
      id: lead.id,
      url: lead.url,
      kind: lead.kind,
      claims: lead.claims,
      reuse_status: lead.reuse_status,
    })),
  };
});

const comparisonReceiptClaims = {
  "dzairtransport-home": ["legacy_journey_planner", "web_version_no_longer_updated"],
  "dzairtransport-station-search-probe": ["station_codes_names_communes_and_modes", "no_coordinates"],
};
const comparisonReceipts = sourceManifest.responses
  .filter((response) => response.operator_id == null)
  .map((response) => ({
    id: response.id,
    url: response.source_url,
    kind: response.kind,
    claims: comparisonReceiptClaims[response.id] ?? [],
    reuse_status: response.reuse_status,
    retrieved_at: response.retrieved_at,
  }));
if (comparisonReceipts.length !== Object.keys(comparisonReceiptClaims).length
  || comparisonReceipts.some((receipt) => !comparisonReceiptClaims[receipt.id])) {
  throw new Error("unexpected global comparison-source receipts");
}

const artifact = {
  generated_at: new Date().toISOString(),
  snapshot_at: readiness.generated_from_osm_retrieved_at,
  registry_updated: registry.updated,
  summary: {
    ...readiness,
    drawable_candidate_lines: candidateGeojson.features.length,
    complete_geometry_relations: coverage.complete_geometry_relations,
    unique_stations: coverage.unique_stations,
    relations_with_stations: coverage.relations_with_stations,
    mapped_relation_km: coverage.mapped_relation_km,
    source_receipts: sourceManifest.response_count,
    source_collection_status: sourceManifest.collection_status,
  },
  home_bounds: homeBounds,
  boundaries: boundaryData,
  wilayas: centreData,
  lines: lineData,
  stations: stationData,
  operators: operatorData,
  comparison_sources: [{
    id: "dzairtransport",
    name: "DzairTransport",
    description: "Legacy Algiers journey-planning comparison source",
    limitations: [
      "The web version says it is no longer updated",
      "The bounded Station probe returned no coordinates",
      "No open reuse license was found",
    ],
    receipts: comparisonReceipts,
  }],
};

const serialized = JSON.stringify(artifact).replaceAll("<", "\\u003c");
const template = readText(join(HERE, "template.html"));
const styles = readText(join(HERE, "styles.css"));
const application = readText(join(HERE, "app.js"));
const html = template
  .replace("/*__ARTIFACT_STYLES__*/", styles)
  .replace("/*__ARTIFACT_DATA__*/", "window.BUS_ARTIFACT = " + serialized + ";")
  .replace("/*__ARTIFACT_APPLICATION__*/", application);

if (html.includes("__ARTIFACT_")) throw new Error("artifact template contains an unreplaced placeholder");

mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
writeFileSync(OUTPUT, html);

console.log("Bus research artifact built");
console.log("Candidate Lines: " + readiness.candidate_lines);
console.log("Stations: " + stations.length);
console.log("Output: " + OUTPUT);
