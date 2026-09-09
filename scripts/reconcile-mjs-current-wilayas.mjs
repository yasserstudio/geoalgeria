#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { reconcileMjsCurrentWilaya } from "./lib/mjs-current-wilaya.mjs";
import { MIGRATIONS, writePackageV2 } from "./lib/v2-transforms.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const targets = [
  { pkg: "sports", file: "facilities.json" },
  { pkg: "jeunesse", file: "institutions.json" },
];

for (const { pkg, file } of targets) {
  const dir = join(ROOT, "packages", pkg, "data");
  const oldMeta = JSON.parse(readFileSync(join(dir, "metadata.json"), "utf8"));
  const input = JSON.parse(readFileSync(join(dir, file), "utf8"));
  let changed = 0;
  const rows = input.map((record) => {
    const linkage = reconcileMjsCurrentWilaya(record);
    if (linkage.wilaya_code !== record.wilaya_code) changed++;
    const next = { ...record, ...linkage };
    if (linkage.source_wilaya_code == null) delete next.source_wilaya_code;
    return next;
  });
  const retrieved = oldMeta.sources.find(({ key }) => key === "mjs")?.retrieved;
  writePackageV2({
    pkg,
    dir,
    files: [{ file, rows }],
    meta: MIGRATIONS[pkg].meta,
    updated: oldMeta.updated,
    retrieved,
    oldMeta,
  });
  console.log(`${pkg}: reconciled ${changed} record(s)`);
}
