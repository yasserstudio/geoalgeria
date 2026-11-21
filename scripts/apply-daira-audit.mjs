#!/usr/bin/env node
// Write the daira audit (geoalgeria.com#360) into data/dairas.json: each row's
// `audit` grade and citation, its `name_ar` and where that name came from.
// The audit is read from research/_daira-audit/daira-audit.json, which pins
// every daira's communes as they stood at the commit it read. The audit adds
// fields only: a row whose communes no longer match the pinned list aborts the
// run instead of being graded, and no membership or seat is ever written here.
//
// Usage:
//   node scripts/apply-daira-audit.mjs            # dry-run report
//   node scripts/apply-daira-audit.mjs --check    # exit 1 if dairas.json drifts
//   node scripts/apply-daira-audit.mjs --write

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalCommunes } from "./lib/commune-index.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const RESEARCH = join(ROOT, "research", "_daira-audit", "daira-audit.json");
const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE && CHECK) throw new Error("Choose either --write or --check");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const research = readJson(RESEARCH);
const sourceByKey = new Map(research.sources.map((source) => [source.key, source]));
const auditById = new Map(research.dairas.map((row) => [row.id, row]));

const membersOf = (row) =>
  canonicalCommunes
    .filter((commune) => commune.wilaya_code === row.wilaya_code && commune.daira === row.name_fr)
    .map((commune) => commune.code_commune)
    .sort((a, b) => a - b);

/** A research citation ({source, article, page}) with its decree's text and URLs. */
function citationFor(cited) {
  const source = sourceByKey.get(cited.source);
  if (!source) throw new Error(`unknown source ${cited.source}`);
  const citation = {
    source: cited.source,
    decree: source.decree,
    journal_officiel: source.journal_officiel,
    article: cited.article,
    page: cited.page,
    url: source.url,
  };
  if (source.url_ar) citation.url_ar = source.url_ar;
  if (cited.amended_by) citation.amended_by = citationFor(cited.amended_by);
  return citation;
}

const STATUSES = new Set(["decree_table", "agrees_1991", null]);
const dairasPath = join(DATA, "dairas.json");
const dairas = readJson(dairasPath);
if (dairas.length !== auditById.size) {
  throw new Error(`dairas.json has ${dairas.length} rows, the audit ${auditById.size}`);
}

const next = dairas.map((row) => {
  const audited = auditById.get(row.id);
  if (!audited) throw new Error(`daira ${row.id} is not in the audit`);
  if (audited.wilaya_code !== row.wilaya_code || audited.name_fr !== row.name_fr) {
    throw new Error(`daira ${row.id} is ${row.wilaya_code} "${row.name_fr}", the audit read "${audited.name_fr}"`);
  }
  const held = membersOf(row);
  if (held.join() !== audited.communes.join()) {
    throw new Error(`daira ${row.id} "${row.name_fr}" holds [${held}], the audit read [${audited.communes}]`);
  }
  if (!STATUSES.has(audited.status)) throw new Error(`daira ${row.id}: unknown status ${audited.status}`);
  if ((audited.name_ar === null) !== (audited.name_ar_source === null)) {
    throw new Error(`daira ${row.id}: name_ar and name_ar_source must be set together`);
  }
  return {
    id: row.id,
    wilaya_code: row.wilaya_code,
    name_fr: row.name_fr,
    commune_count: row.commune_count,
    name_ar: audited.name_ar,
    name_ar_source: audited.name_ar_source,
    audit: {
      status: audited.status,
      citation: audited.status === null ? null : citationFor(audited.citation),
    },
  };
});

const content = `${JSON.stringify(next, null, 2)}\n`;
const drifts = readFileSync(dairasPath, "utf8") !== content;
const tally = (status) => next.filter((row) => row.audit.status === status).length;
console.log(
  `${next.length} dairas: ${tally("decree_table")} decree_table, ${tally("agrees_1991")} agrees_1991, ` +
    `${tally(null)} not graded; dairas.json ${drifts ? (WRITE ? "updated" : "needs an update") : "up to date"}`,
);
if (WRITE && drifts) {
  const tmp = `${dairasPath}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, dairasPath);
}
if (CHECK && drifts) process.exit(1);
