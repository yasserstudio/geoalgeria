// Daira fields (spec geoalgeria.com#357, deferred from #360): every daira lists
// its member communes, names the commune it is seated on, and says whether it
// is a daira or one of Algiers' circonscriptions administratives.
// scripts/add-daira-fields.mjs derives all three; these tests hold the rules.
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
const dairas = read("dairas.json");
const research = JSON.parse(readFileSync(join(ROOT, "research/_daira-audit/daira-audit.json"), "utf8"));

test("dairas.json matches what scripts/add-daira-fields.mjs derives", () => {
  execFileSync("node", [join(ROOT, "scripts/add-daira-fields.mjs"), "--check"], { stdio: "pipe" });
});

test("communes are the member codes, ascending, and match commune_count", () => {
  for (const d of dairas) {
    const members = communes
      .filter((c) => c.wilaya_code === d.wilaya_code && c.daira === d.name_fr)
      .map((c) => c.code_commune)
      .sort((a, b) => a - b);
    assert.deepEqual(d.communes, members, `daira ${d.id} ${d.name_fr}`);
    assert.equal(d.communes.length, d.commune_count, `daira ${d.id} ${d.name_fr}`);
  }
});

test("every commune belongs to exactly one daira", () => {
  const seen = new Map();
  for (const d of dairas) for (const code of d.communes) seen.set(code, (seen.get(code) ?? 0) + 1);
  assert.equal(seen.size, communes.length);
  assert.deepEqual([...seen.values()].filter((n) => n !== 1), []);
});

test("graded dairas list the same communes the audit read from the decree", () => {
  const byId = new Map(dairas.map((d) => [d.id, d]));
  for (const row of research.dairas) {
    if (row.status == null) continue;
    assert.deepEqual(byId.get(row.id).communes, row.communes, `daira ${row.id} ${row.name_fr}`);
  }
});

test("a seat is a member commune; the audit's seats are kept; only Beni Maouche has none", () => {
  const byId = new Map(dairas.map((d) => [d.id, d]));
  for (const d of dairas) {
    if (d.seat_commune_code != null) assert.ok(d.communes.includes(d.seat_commune_code), `daira ${d.id}`);
  }
  for (const row of research.dairas) {
    if (row.seat_commune_code != null) assert.equal(byId.get(row.id).seat_commune_code, row.seat_commune_code);
  }
  assert.deepEqual(
    dairas.filter((d) => d.seat_commune_code == null).map((d) => d.id),
    [60],
  );
});

test("Algiers' 13 districts are circonscriptions, every other row a daira", () => {
  for (const d of dairas) assert.equal(d.kind, d.wilaya_code === 16 ? "circonscription" : "daira", `daira ${d.id}`);
  assert.equal(dairas.filter((d) => d.kind === "circonscription").length, 13);
});
