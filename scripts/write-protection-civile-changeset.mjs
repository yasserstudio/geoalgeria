#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { captureMeta } from "./lib/source-store.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const relativeDataPath =
  "packages/protection-civile/data/protection-civile.json";
const dataPath = join(repoRoot, relativeDataPath);
const packagePath = "packages/protection-civile";
const packageDiff = spawnSync(
  "git",
  ["diff", "--quiet", "HEAD", "--", packagePath],
  { cwd: repoRoot, stdio: "ignore" },
);
if (packageDiff.status === 0) {
  console.log("protection-civile changeset: published package is unchanged");
  process.exit(0);
}
if (packageDiff.status !== 1) {
  throw new Error(`could not inspect ${packagePath} (git exit ${packageDiff.status})`);
}

const current = JSON.parse(readFileSync(dataPath, "utf8"));
const previous = JSON.parse(
  execFileSync("git", ["show", `HEAD:${relativeDataPath}`], {
    cwd: repoRoot,
    encoding: "utf8",
  }),
);

const key = (unit) => String(unit.refs?.dgpc ?? unit.id);
const previousByKey = new Map(previous.map((unit) => [key(unit), unit]));
const currentByKey = new Map(current.map((unit) => [key(unit), unit]));
const added = current.filter((unit) => !previousByKey.has(key(unit))).length;
const removed = previous.filter((unit) => !currentByKey.has(key(unit))).length;
const updated = current.filter((unit) => {
  const old = previousByKey.get(key(unit));
  return old && JSON.stringify(old) !== JSON.stringify(unit);
}).length;

const receipt = captureMeta("protection-civile", "dgpc-units");
if (!receipt?.sha256) throw new Error("Protection Civile capture receipt is missing");
const bump = added > 0 ? "minor" : "patch";
const filename = `sync-protection-civile-${receipt.sha256.slice(0, 10)}.md`;
const output = join(repoRoot, ".changeset", filename);
const summary = [
  added ? `${added} added` : null,
  updated ? `${updated} updated` : null,
  removed ? `${removed} removed` : null,
]
  .filter(Boolean)
  .join(", ") || "metadata or generated artifacts updated";
const content = `---\n"@geoalgeria/protection-civile": ${bump}\n---\n\nRefresh the official DGPC unit directory (${summary}).\n`;

if (existsSync(output) && readFileSync(output, "utf8") !== content) {
  throw new Error(`${filename} already exists with different content`);
}
writeFileSync(output, content);
console.log(`protection-civile changeset: ${bump} -> .changeset/${filename}`);
