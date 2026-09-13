#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBoundaries, wilayaNeighbours, WILAYA_CODES } from "../packages/schema/index.js";
import { buildAccuracyReview, countReasons, isGeospatialEntity } from "./lib/accuracy-review.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
if (process.argv.slice(2).some((arg) => arg !== "--check")) throw new Error("Usage: build-accuracy-review.mjs [--check]");
const inputs = new Map();
function readInput(path) {
  const bytes = readFileSync(join(root, path));
  inputs.set(path, { path, sha256: createHash("sha256").update(bytes).digest("hex") });
  return JSON.parse(bytes);
}

const boundaryPath = "packages/dataset/data/geojson/wilaya-boundaries.geojson";
const boundaryCollection = readInput(boundaryPath);
const boundaryMetadata = readInput("packages/dataset/data/geojson/wilaya-boundaries.metadata.json");
const boundaries = loadBoundaries(boundaryCollection);
if (boundaries.size !== WILAYA_CODES.length || WILAYA_CODES.some((code) => !boundaries.has(code))) {
  throw new Error("Incomplete wilaya boundary coverage");
}
const neighbours = wilayaNeighbours(boundaryCollection);
const excludedEntities = new Map([
  ["aviation/routes.json", "Aviation routes describe service, not a point establishment"],
  ["aviation/route-endpoints.json", "Route endpoints include international airports outside this audit"],
  ["buses/lines.json", "Line coordinates represent a service, not a Station"],
  ["mobilis/pdv.json", "Points of sale are intentionally ungeocoded directory records"],
  ["banques/banks.json", "Bank institutions are intentionally ungeocoded directory records; branches are audited"],
  ["banques/institutions.json", "Financial institutions are intentionally ungeocoded directory records; branches are audited"],
]);
const excluded = [];
const entities = [];
const datasets = [];
const candidates = [];
const coordinateGroups = [];
for (const dataset of readdirSync(join(root, "packages")).sort()) {
  const dataPath = `packages/${dataset}/data`;
  const metadataPath = `${dataPath}/metadata.json`;
  if (!existsSync(join(root, metadataPath))) {
    if (existsSync(join(root, dataPath)) && dataset !== "dataset") {
      throw new Error(`${metadataPath} is missing for a package that ships data`);
    }
    excluded.push({ path: `packages/${dataset}`, reason: dataset === "dataset"
      ? "Administrative dataset uses a separate contract; outside discovery scope"
      : "Package has no data directory" });
    continue;
  }
  const metadata = readInput(metadataPath);
  // Multi-entity metadata declares canonical files. Single-entity packages
  // omit entities; inspect only top-level JSON, never generated mirrors.
  const files = metadata.entities
    ? metadata.entities.map((entity) => entity.file).sort()
    : readdirSync(join(root, dataPath)).filter((file) => file.endsWith(".json") && file !== "metadata.json").sort();
  const datasetCandidates = [];
  let totalRecords = 0;
  for (const file of files) {
    const path = `${dataPath}/${file}`;
    const records = readInput(path);
    const exclusion = excludedEntities.get(`${dataset}/${file}`);
    if (exclusion || !isGeospatialEntity(records)) {
      excluded.push({ path, reason: exclusion ?? "Not a geospatial record array" });
      continue;
    }
    const review = buildAccuracyReview({ dataset, entity: file, records, boundaries, neighbours });
    entities.push({ ...review.summary, path });
    datasetCandidates.push(...review.candidates);
    coordinateGroups.push(...review.coordinate_groups);
    totalRecords += records.length;
  }
  datasets.push({
    dataset,
    total_records: totalRecords,
    candidates: datasetCandidates.length,
    reasons: countReasons(datasetCandidates),
    metadata_path: metadataPath,
    metadata,
  });
  candidates.push(...datasetCandidates);
}

const common = {
  schema_version: 1,
  scope: "Canonical geospatial record arrays in packages with data/metadata.json; signals for human review, not verified errors",
  inputs: [...inputs.values()].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
};
const summary = {
  ...common,
  total_datasets: datasets.length,
  total_entities: entities.length,
  total_records: datasets.reduce((total, dataset) => total + dataset.total_records, 0),
  candidates: candidates.length,
  reasons: countReasons(candidates),
  datasets,
  entities,
  excluded,
  boundaries: { path: boundaryPath, metadata: boundaryMetadata },
};
const queue = { ...common, coordinate_groups: coordinateGroups, candidates };
const outputDir = join(root, "quality/accuracy-review");
if (!check) mkdirSync(outputDir, { recursive: true });
for (const [file, value] of [["summary.json", summary], ["candidates.json", queue]]) {
  const path = join(outputDir, file);
  // Keep the large queue diffable at one snapshot per line, without repeating
  // shared group members or inflating every record into dozens of lines.
  const content = file === "candidates.json"
    ? `{\n${Object.entries(value).map(([key, entry]) =>
      `  ${JSON.stringify(key)}: ${Array.isArray(entry)
        ? `[\n${entry.map((row) => `    ${JSON.stringify(row)}`).join(",\n")}\n  ]`
        : JSON.stringify(entry)}`,
    ).join(",\n")}\n}\n`
    : `${JSON.stringify(value, null, 2)}\n`;
  if (check) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== content) throw new Error(`${path} is stale; run pnpm review:accuracy`);
  } else writeFileSync(path, content);
}
console.log(`Accuracy review ${check ? "is current" : "built"}: ${candidates.length} candidates / ${summary.total_records} records, ${datasets.length} datasets, ${entities.length} entities.`);
