#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBoundaries } from "../packages/schema/index.js";
import { buildProtectionCivileReview } from "./lib/protection-civile-review.mjs";
import { captureMeta, readCapture } from "./lib/source-store.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

const dataDir = join(repoRoot, "packages", "protection-civile", "data");
const metadata = JSON.parse(readFileSync(join(dataDir, "metadata.json"), "utf8"));
const checkedAt = valueAfter("--checked-at") ?? metadata.updated;
const outputPath = resolve(
  repoRoot,
  valueAfter("--output") ?? "research/protection-civile/review-candidates.json",
);
const check = args.includes("--check");

const records = JSON.parse(readFileSync(join(dataDir, "protection-civile.json"), "utf8"));
const rawFeatureCollection = readCapture("protection-civile", "dgpc-units");
const rawCaptureMeta = captureMeta("protection-civile", "dgpc-units");
if (!rawCaptureMeta?.sha256) throw new Error("DGPC source capture is missing its manifest receipt");
const boundaryFeatureCollection = JSON.parse(
  readFileSync(
    join(repoRoot, "packages", "dataset", "data", "geojson", "wilaya-boundaries.geojson"),
    "utf8",
  ),
);

const review = buildProtectionCivileReview({
  records,
  rawFeatureCollection,
  boundaries: loadBoundaries(boundaryFeatureCollection),
  checkedAt,
  sourceUrl: rawCaptureMeta.url,
  sourceSha256: rawCaptureMeta.sha256,
  sourceRetrieved: rawCaptureMeta.retrieved,
});
const content = `${JSON.stringify(review, null, 2)}\n`;

if (check) {
  if (!existsSync(outputPath) || readFileSync(outputPath, "utf8") !== content) {
    throw new Error(`${outputPath} is stale; rebuild it without --check`);
  }
  console.log(`Protection Civile review corpus is current: ${review.summary.candidates} candidates.`);
} else {
  writeFileSync(outputPath, content);
  console.log(
    `Protection Civile review corpus: ${review.summary.candidates} candidates ` +
      `(${review.summary.reviewed_candidates} reviewed, ${review.summary.unreviewed_candidates} open) → ${outputPath}`,
  );
}
