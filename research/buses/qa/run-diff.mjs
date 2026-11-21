#!/usr/bin/env node
// P3: compares a fresh OSM pull with the previous one and with the shipped
// Directions, then matches each relation of a new candidate Line to one
// package Line identity (operator + line number) or lists it as unmatched.
// Writes research/buses/qa/osm-diff.json + OSM-DIFF.md. No network.
//
//   node research/buses/qa/run-diff.mjs --previous <old osm/raw> [--current research/buses/osm/raw]
//
// Run after collect-osm.mjs and analyze-candidates.mjs on the current pull.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { diffPulls } from "./diff-pulls.mjs";
import { matchRelations, promotableLines } from "./line-identity.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  if (!process.argv[i + 1]) throw new Error(`${name} needs a directory`);
  return resolve(process.argv[i + 1]);
}
const previousDir = arg("--previous");
if (!previousDir) throw new Error("--previous <old osm/raw directory> is required");
const currentDir = arg("--current", join(root, "research/buses/osm/raw"));

function loadPull(dir) {
  const elements = readdirSync(dir)
    .filter((f) => f === "relations.json" || /^members-\d+\.json$/.test(f))
    .flatMap((f) => readJson(join(dir, f)).elements);
  const stamps = Object.values(readJson(join(dir, "manifest.json")).responses)
    .map((r) => r.osm_timestamp)
    .filter(Boolean)
    .sort();
  if (!stamps.length) throw new Error(`${dir}: manifest has no osm_timestamp`);
  return { elements, from: stamps[0], to: stamps.at(-1) };
}
const previous = loadPull(previousDir);
const current = loadPull(currentDir);

const data = (name) => readJson(join(root, "packages/buses/data", `${name}.json`));
const lines = data("lines");
const directions = data("directions");
const diff = diffPulls(previous, current, directions);

const candidates = readJson(join(currentDir, "..", "candidate-lines.json"));
const relationTags = new Map(current.elements.filter((e) => e.type === "relation").map((e) => [e.id, e.tags ?? {}]));
const shippedRelations = new Set(directions.map((d) => d.osm_relation_id).filter((id) => id != null));

const added = matchRelations(diff.added, { lines, candidates }).map((m) => ({
  ...m,
  ref: relationTags.get(m.osm_relation_id).ref ?? null,
  name: relationTags.get(m.osm_relation_id).name ?? null,
}));
const promotable = promotableLines({ lines, candidates, shippedRelations });

const shippedTally = diff.shipped.reduce((t, r) => ({ ...t, [r.change]: (t[r.change] ?? 0) + 1 }), {});
const out = {
  generated_by: "research/buses/qa/run-diff.mjs",
  previous: { from: previous.from, to: previous.to },
  current: { from: current.from, to: current.to },
  summary: {
    relations: { previous: previous.elements.filter((e) => e.type === "relation").length, current: relationTags.size },
    added: diff.added.length,
    removed: diff.removed.length,
    changed: diff.changed.length,
    unchanged: diff.unchanged,
    shipped_directions: shippedTally,
    added_matched_to_line: added.filter((a) => a.match === "line").length,
    promotable_lines: promotable.length,
  },
  added,
  removed: diff.removed,
  changed: diff.changed,
  shipped: diff.shipped.filter((r) => r.change !== "unchanged"),
  promotable,
};
writeFileSync(join(here, "osm-diff.json"), `${JSON.stringify(out, null, 2)}\n`);

const lineName = new Map(lines.map((l) => [l.id, `${l.operator} ${l.line}`]));
const cell = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ");
const what = (c) => ["members", "geometry", "tags"].filter((k) => c[k]).join(", ");
const changedById = new Map(diff.changed.map((c) => [c.id, c]));
const md = [
  "# OSM refresh diff (P3)",
  "",
  `Previous pull ${out.previous.from.slice(0, 10)}, current pull ${out.current.from.slice(0, 10)}. Detail in \`osm-diff.json\`.`,
  "",
  "| Relations | Count |",
  "| --- | --- |",
  `| Previous / current | ${out.summary.relations.previous} / ${out.summary.relations.current} |`,
  `| Added | ${out.summary.added} |`,
  `| Removed | ${out.summary.removed} |`,
  `| Changed | ${out.summary.changed} |`,
  `| Unchanged | ${out.summary.unchanged} |`,
  "",
  `Shipped Directions: ${Object.entries(shippedTally).map(([k, v]) => `${v} ${k}`).join(", ")}.`,
  "",
  "## Shipped Directions whose relation moved",
  "",
  "| Line | Direction | Change | What moved |",
  "| --- | --- | --- | --- |",
  ...out.shipped.map((r) => {
    const d = directions.find((x) => x.id === r.direction_id);
    return `| ${lineName.get(d.line_id) ?? d.line_id} | ${r.direction_id} | ${r.change} | ${r.change === "changed" ? what(changedById.get(r.osm_relation_id)) : ""} |`;
  }),
  "",
  "## Added relations",
  "",
  "| Relation | ref | Name | Line |",
  "| --- | --- | --- | --- |",
  ...added.map((a) => `| ${a.osm_relation_id} | ${cell(a.ref)} | ${cell(a.name)} | ${a.line_id ?? a.match} |`),
  "",
  "## Removed relations",
  "",
  diff.removed.length ? diff.removed.join(", ") : "None.",
  "",
  "## Promotable: package Lines without a shape that now have an OSM geometry candidate",
  "",
  "Each must pass the P1 checks before it ships.",
  "",
  "| Line | Candidate | Relations |",
  "| --- | --- | --- |",
  ...promotable.map((p) => `| ${lineName.get(p.line_id)} | ${p.candidate} | ${p.relation_ids.join(", ")} |`),
  "",
].join("\n");
writeFileSync(join(here, "OSM-DIFF.md"), md);
console.log(JSON.stringify(out.summary, null, 2));
