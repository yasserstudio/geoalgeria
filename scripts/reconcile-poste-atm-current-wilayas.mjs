#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { reconcileCurrentWilayaByCommune } from "./lib/current-wilaya-by-commune.mjs";
import { MIGRATIONS, writePackageV2 } from "./lib/v2-transforms.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = join(ROOT, "packages", "poste", "data");
const mirrorDir = join(ROOT, "packages", "dataset", "data", "poste");
const oldMeta = JSON.parse(readFileSync(join(packageDir, "metadata.json"), "utf8"));
const offices = JSON.parse(readFileSync(join(packageDir, "postoffices.json"), "utf8"));
const inputAtms = JSON.parse(readFileSync(join(packageDir, "atms.json"), "utf8"));
let changed = 0;
const atms = inputAtms.map((record) => {
  const linkage = reconcileCurrentWilayaByCommune(record);
  if (linkage.wilaya_code !== record.wilaya_code) changed++;
  return { ...record, ...linkage };
});
const retrieved = oldMeta.sources.find(({ key }) => key === "baridimap")?.retrieved;

for (const dir of [packageDir, mirrorDir]) {
  writePackageV2({
    pkg: "poste",
    dir,
    files: [
      { file: "postoffices.json", rows: structuredClone(offices) },
      { file: "atms.json", rows: structuredClone(atms) },
    ],
    meta: MIGRATIONS.poste.meta,
    updated: oldMeta.updated,
    retrieved,
    oldMeta,
  });
}

console.log(`poste: reconciled ${changed} ATM record(s)`);
