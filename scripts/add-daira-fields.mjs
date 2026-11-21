#!/usr/bin/env node
// Give every row of data/dairas.json three fields that spec geoalgeria.com#357
// listed and #360 deferred:
//
// - `communes`: the member Commune codes, ascending, read from the Communes'
//   own `daira` field (the membership the Daira audit graded).
// - `seat_commune_code`: the member Commune the Daira is named after, as the
//   audit records it in research/_daira-audit/daira-audit.json. Where the audit
//   left it null (the 56 rows it did not grade by name), the same rule is
//   applied here: the one member whose Loose key equals the Daira's, or, for
//   five rows, the member listed in SPELLING_SEATS, the same name spelled
//   another way (the audit's `spelling_only` case). Null otherwise: Beni
//   Maouche (60), whose only member is Beni-Mallikeche. Nothing is guessed.
// - `kind`: "circonscription" for the 13 circonscriptions administratives of Algiers
//   (wilaya 16), "daira" everywhere else (CONTEXT.md, Circonscription
//   administrative).
//
// The fields are derived, so the script owns them: re-run it after any
// membership change.
//
// Usage:
//   node scripts/add-daira-fields.mjs            # dry-run report
//   node scripts/add-daira-fields.mjs --check    # exit 1 if dairas.json drifts
//   node scripts/add-daira-fields.mjs --write

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { looseKey } from "../packages/normalize/index.js";
import { canonicalCommunes } from "./lib/commune-index.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DAIRAS = join(ROOT, "packages", "dataset", "data", "dairas.json");
const AUDIT = join(ROOT, "research", "_daira-audit", "daira-audit.json");
const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE && CHECK) throw new Error("Choose either --write or --check");

const ALGIERS = 16;

// Reviewed 21 Nov 2026: the seat is the member named like the Daira under
// another spelling, which the Loose key does not fold.
const SPELLING_SEATS = new Map([
  [27, 425], // Aïn Fakroun: Ain Fekroun
  [180, 1634], // Birtouta: Bir Touta
  [273, 2422], // Hammam N'Bails: Hammam N'bail
  [274, 2427], // Houari Boumédiène: Houari Boumedienne
  [276, 2415], // Khezarra: Khezaras
]);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const dairas = readJson(DAIRAS);
const auditSeat = new Map(readJson(AUDIT).dairas.map((row) => [row.id, row.seat_commune_code]));

/** The member Communes of a Daira, ascending by code. */
function membersOf(daira, communes = canonicalCommunes) {
  return communes
    .filter((c) => c.wilaya_code === daira.wilaya_code && c.daira === daira.name_fr)
    .sort((a, b) => a.code_commune - b.code_commune);
}

/** The one member named like the Daira, by Loose key, or null. */
function namedSeat(daira, members) {
  const key = looseKey(daira.name_fr);
  const hits = members.filter((c) => looseKey(c.name_fr) === key);
  return hits.length === 1 ? hits[0].code_commune : null;
}

const report = { fromAudit: 0, byName: 0, none: [], kinds: { daira: 0, circonscription: 0 } };

const next = dairas.map((row) => {
  const members = membersOf(row);
  if (members.length !== row.commune_count) {
    throw new Error(`daira ${row.id} ${row.name_fr}: ${members.length} member communes, commune_count ${row.commune_count}`);
  }
  const fromAudit = auditSeat.get(row.id) ?? null;
  const spelled = SPELLING_SEATS.get(row.id) ?? null;
  if (spelled != null && !members.some((c) => c.code_commune === spelled)) {
    throw new Error(`daira ${row.id} ${row.name_fr}: listed seat ${spelled} is not a member`);
  }
  const seat = fromAudit ?? namedSeat(row, members) ?? spelled;
  if (fromAudit != null) report.fromAudit++;
  else if (seat != null) report.byName++;
  else report.none.push(`${row.id} ${row.name_fr} (w${row.wilaya_code})`);
  const kind = row.wilaya_code === ALGIERS ? "circonscription" : "daira";
  report.kinds[kind]++;

  // Existing fields keep their place; the three new ones follow commune_count.
  const { id, wilaya_code, name_fr, commune_count, communes: _c, seat_commune_code: _s, kind: _k, ...rest } = row;
  return {
    id,
    wilaya_code,
    name_fr,
    commune_count,
    communes: members.map((c) => c.code_commune),
    seat_commune_code: seat,
    kind,
    ...rest,
  };
});

const content = `${JSON.stringify(next, null, 2)}\n`;
const drift = content !== readFileSync(DAIRAS, "utf8");

console.log(
  `seats: ${report.fromAudit} from the audit, ${report.byName} by name, ${report.none.length} null` +
    `; kinds: ${report.kinds.daira} daira, ${report.kinds.circonscription} circonscription`,
);
if (report.none.length) console.log(`no seat: ${report.none.join("; ")}`);

if (CHECK) {
  if (drift) {
    console.error("dairas.json is out of date: run node scripts/add-daira-fields.mjs --write");
    process.exit(1);
  }
} else if (WRITE) {
  if (drift) {
    const tmp = `${DAIRAS}.tmp`;
    writeFileSync(tmp, content);
    renameSync(tmp, DAIRAS);
    console.log("wrote dairas.json");
  } else console.log("dairas.json already current");
} else console.log(drift ? "dry run: dairas.json would change" : "dry run: no change");
