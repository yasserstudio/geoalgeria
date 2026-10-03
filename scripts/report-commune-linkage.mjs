#!/usr/bin/env node
// What the commune/wilaya join actually changed, per package and per rule.
//
// WHY A SCRIPT AND NOT A PARAGRAPH. The first version of this batch disclosed "715
// wilaya moves" for 8,120 commune relabels, and left ecoles (1,923 relabels) and
// cliniques (295) out of the claim entirely, because the numbers were counted by hand
// from the packages someone happened to open. This recomputes all of them from the
// working tree against a git ref, so the changeset and the PR body quote a number a
// reader can reproduce with one command.
//
// WHAT IT REPORTS, per package:
//   records            located rows (finite lat/lng) in the working tree
//   commune_relabels   rows whose `commune_code` differs from the ref
//   wilaya_moves       rows whose `wilaya_code` differs from the ref
//   in_own_outline     rows inside the OpenStreetMap outline of the commune they name,
//                      as a share of the rows whose commune HAS an outline
//   rules              which clause of resolveCommune() decides each row now
//
// USAGE
//   node scripts/report-commune-linkage.mjs                  # vs origin/main, report
//   node scripts/report-commune-linkage.mjs --ref HEAD       # vs another ref
//   node scripts/report-commune-linkage.mjs --write          # also write the report

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { RECORD_FILES, recordsOf } from "../test/lib/wilaya-containment.mjs";
import { RESOLVE_RULES, communeResolver, loadCommunes, resolveCommune } from "./lib/build-utils.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const REF = argv.includes("--ref") ? argv[argv.indexOf("--ref") + 1] : "origin/main";
const WRITE = argv.includes("--write");
const OUT = join(ROOT, "research", "_commune-centres", "linkage-2026-09-29.json");

const communes = loadCommunes();
const R = communeResolver(communes);

/** The rows of one file at a git ref, keyed by id, or null when the file is new. */
function atRef(file) {
  try {
    const raw = execFileSync("git", ["show", `${REF}:${file}`], { cwd: ROOT, maxBuffer: 1 << 30 }).toString();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return new Map(parsed.filter((r) => r && r.id != null).map((r) => [r.id, r]));
  } catch {
    return null;
  }
}

const files = RECORD_FILES(ROOT);
const rows = [];
for (const file of files) {
  const located = recordsOf(ROOT, file);
  if (!located.length) continue;
  const now = JSON.parse(readFileSync(join(ROOT, file), "utf-8"));
  const ref = atRef(file);

  const rules = Object.fromEntries(RESOLVE_RULES.map((r) => [r, 0]));
  let relabels = 0, moves = 0, withOutline = 0, inOwn = 0, records = 0;
  const moved = [];
  for (const r of now) {
    if (!r || !Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
    records++;
    rules[resolveCommune(r.lat, r.lng, communes, r).rule]++;

    const inside = r.commune_code == null ? null : R.insideOwnOutline(r.lat, r.lng, r.commune_code);
    if (inside !== null) {
      withOutline++;
      if (inside) inOwn++;
    }

    const was = ref?.get(r.id);
    if (!was) continue;
    const relabel = String(was.commune_code ?? "") !== String(r.commune_code ?? "");
    const move = String(was.wilaya_code ?? "") !== String(r.wilaya_code ?? "");
    if (relabel) relabels++;
    if (move) moves++;
    if (relabel || move) {
      moved.push({
        id: r.id,
        from: { wilaya_code: was.wilaya_code, commune_code: was.commune_code, commune: was.commune },
        to: { wilaya_code: r.wilaya_code, commune_code: r.commune_code, commune: r.commune },
      });
    }
  }

  rows.push({
    file,
    package: file.split("/")[1],
    records,
    ref_records: ref?.size ?? null,
    commune_relabels: relabels,
    wilaya_moves: moves,
    with_outline: withOutline,
    in_own_outline: inOwn,
    in_own_outline_pct: withOutline ? Math.round((inOwn / withOutline) * 1000) / 10 : null,
    rules: Object.fromEntries(Object.entries(rules).filter(([, n]) => n > 0)),
    moved,
  });
}

const total = (k) => rows.reduce((n, r) => n + (r[k] ?? 0), 0);
const doc = {
  generated: "2026-09-29",
  ref: REF,
  note:
    "Per-package effect of the commune/wilaya join in scripts/lib/commune-resolver.mjs, recomputed from the working " +
    "tree against a git ref. `in_own_outline_pct` counts only the rows whose commune has an OpenStreetMap outline. " +
    "Regenerate with `node scripts/report-commune-linkage.mjs --write`.",
  totals: {
    records: total("records"),
    commune_relabels: total("commune_relabels"),
    wilaya_moves: total("wilaya_moves"),
    with_outline: total("with_outline"),
    in_own_outline: total("in_own_outline"),
    in_own_outline_pct: Math.round((total("in_own_outline") / total("with_outline")) * 1000) / 10,
  },
  packages: rows,
};

console.log(`vs ${REF}: ${doc.totals.records} located records, ${doc.totals.commune_relabels} commune relabels, ${doc.totals.wilaya_moves} wilaya moves, ${doc.totals.in_own_outline_pct}% inside their own commune outline`);
for (const r of rows) {
  if (!r.commune_relabels && !r.wilaya_moves) continue;
  console.log(
    `  ${r.package.padEnd(26)} ${String(r.records).padStart(6)} rows  ${String(r.commune_relabels).padStart(5)} relabels  ${String(r.wilaya_moves).padStart(4)} wilaya  ${String(r.in_own_outline_pct).padStart(5)}% in own outline  ${JSON.stringify(r.rules)}`,
  );
}
console.log("\nrules over every located record:");
const allRules = {};
for (const r of rows) for (const [k, n] of Object.entries(r.rules)) allRules[k] = (allRules[k] ?? 0) + n;
for (const k of RESOLVE_RULES) if (allRules[k]) console.log(`  ${k.padEnd(30)} ${allRules[k]}`);

if (WRITE) {
  writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`\nwrote ${OUT}`);
}
