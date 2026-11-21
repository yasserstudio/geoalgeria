// Daira audit (geoalgeria.com#360): every daira carries the grade its commune
// list earned against the Journal officiel, and the audit changes no membership.
// research/_daira-audit/daira-audit.json pins each daira's communes as they
// stood at 79c7206d, the commit the audit read.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "..");
const dataRoot = join(ROOT, "packages/dataset/data");
const read = (...parts) => JSON.parse(readFileSync(join(dataRoot, ...parts), "utf8"));
const communes = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"].flatMap((file) =>
  read(file),
);
const communeByCode = new Map(communes.map((commune) => [commune.code_commune, commune]));
const dairas = read("dairas.json");
const research = JSON.parse(readFileSync(join(ROOT, "research/_daira-audit/daira-audit.json"), "utf8"));
const audited = new Map(research.dairas.map((row) => [row.id, row]));

const membersOf = (row) =>
  communes
    .filter((commune) => commune.wilaya_code === row.wilaya_code && commune.daira === row.name_fr)
    .map((commune) => commune.code_commune)
    .sort((a, b) => a - b);

const JORADP = /^https:\/\/www\.joradp\.dz\/FTP\/(jo-francais|JO-ARABE)\/\d{4}\/[AF]\d{7}\.pdf$/;

test("each status holds the count the Owner signed off", () => {
  const count = (status) => dairas.filter((row) => row.audit.status === status).length;
  assert.equal(dairas.length, 551);
  assert.equal(count("decree_table"), 210);
  assert.equal(count("agrees_1991"), 275);
  assert.equal(count(null), 66);
  assert.deepEqual(research.counts, { decree_table: 210, agrees_1991: 275, open: 66 });
});

test("every graded daira cites a decree, article, page and joradp.dz URL", () => {
  for (const row of dairas) {
    const { status, citation } = row.audit;
    if (status === null) {
      assert.equal(citation, null, `daira ${row.id}`);
      continue;
    }
    for (const key of ["decree", "journal_officiel", "article", "page"]) {
      assert.ok(citation[key], `daira ${row.id} has no citation ${key}`);
    }
    assert.match(citation.url, JORADP, `daira ${row.id}`);
    if (citation.url_ar) assert.match(citation.url_ar, JORADP, `daira ${row.id}`);
    if (status === "decree_table") {
      assert.ok(["decret-26-253", "decret-21-198"].includes(citation.source), `daira ${row.id}`);
      assert.equal(citation.amended_by, undefined, `daira ${row.id}`);
    } else {
      assert.equal(citation.source, "decret-91-306", `daira ${row.id}`);
      if (citation.amended_by) {
        assert.equal(citation.amended_by.source, "decret-92-66", `daira ${row.id}`);
        assert.match(citation.amended_by.url, JORADP, `daira ${row.id}`);
      }
    }
  }
});

test("no membership or seat changed against 79c7206d", () => {
  assert.equal(research.base_commit, "79c7206d");
  assert.deepEqual(
    dairas.map((row) => row.id),
    research.dairas.map((row) => row.id),
  );
  for (const row of dairas) {
    const pinned = audited.get(row.id);
    assert.deepEqual(
      Object.keys(row),
      ["id", "wilaya_code", "name_fr", "commune_count", "name_ar", "name_ar_source", "audit"],
      `daira ${row.id} gained a field beyond the audit`,
    );
    assert.equal(row.wilaya_code, pinned.wilaya_code, `daira ${row.id}`);
    assert.equal(row.name_fr, pinned.name_fr, `daira ${row.id}`);
    assert.deepEqual(membersOf(row), pinned.communes, `daira ${row.id} communes`);
    assert.equal(row.commune_count, pinned.communes.length, `daira ${row.id}`);
    if (pinned.seat_commune_code !== null) {
      assert.ok(pinned.communes.includes(pinned.seat_commune_code), `daira ${row.id} seat is not a member`);
    }
  }
  // The dataset carries no seat; a seat the decree prints apart from the
  // member named like the daira is reported, never applied.
  assert.deepEqual(
    research.seat_report.filter((entry) => entry.kind !== "spelling_only"),
    [],
  );
});

test("name_ar_source is set exactly when name_ar is", () => {
  const sources = new Set(["decree_26_253_ar", "decree_21_198_ar", "seat_commune"]);
  for (const row of dairas) {
    if (row.name_ar === null) {
      assert.equal(row.name_ar_source, null, `daira ${row.id}`);
      continue;
    }
    assert.ok(sources.has(row.name_ar_source), `daira ${row.id}: ${row.name_ar_source}`);
    const seat = audited.get(row.id).seat_commune_code;
    assert.equal(row.name_ar, communeByCode.get(seat).name_ar, `daira ${row.id}`);
    if (row.name_ar_source !== "seat_commune") assert.equal(row.audit.status, "decree_table", `daira ${row.id}`);
  }
  assert.equal(dairas.filter((row) => row.name_ar !== null).length, 494);
  assert.equal(dairas.find((row) => row.id === 474).name_ar, null);
});

test("Algiers and the weak 1991 matches carry no grade", () => {
  const algiers = dairas.filter((row) => row.wilaya_code === 16);
  assert.equal(algiers.length, 13);
  for (const row of algiers) assert.equal(row.audit.status, null, `daira ${row.id}`);
  for (const id of [158, 161, 170, 306]) {
    assert.equal(dairas.find((row) => row.id === id).audit.status, null, `daira ${id}`);
  }
  for (const row of research.dairas) {
    if (row.status === null) assert.ok(row.open_reason, `daira ${row.id} is open with no reason`);
  }
});

test("apply-daira-audit.mjs --check finds no drift", () => {
  assert.doesNotThrow(() =>
    execFileSync(process.execPath, [join(ROOT, "scripts/apply-daira-audit.mjs"), "--check"], { stdio: "pipe" }),
  );
});
