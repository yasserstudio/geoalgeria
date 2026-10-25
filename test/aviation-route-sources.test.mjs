// Every route in @geoalgeria/aviation ships `sources`, its citation list, and
// `source` stays the primary citation: the same url as the first entry
// (ADR 0002). These are the invariants a consumer may rely on, proved against
// the shipped data in all three formats, because a citation that exists in the
// JSON and not in the CSV is a citation a reader cannot check.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "aviation", "data");
const routes = JSON.parse(readFileSync(join(DATA, "routes.json"), "utf-8"));

/** The closed set of claims a citation may be about. */
const SUPPORTS = ["route", "status", "dates", "flight", "days"];

test("every route carries at least one citation", () => {
  const empty = routes.filter((r) => !Array.isArray(r.sources) || r.sources.length === 0);
  assert.deepEqual(empty.map((r) => r.id), [], "a route with no citation may not ship");
});

test("the first citation is the row's own `source`", () => {
  // The contract that lets `source` keep its meaning: a consumer reading one
  // citation and a consumer reading the list start from the same url.
  const disagree = routes.filter((r) => r.sources[0].url !== r.source);
  assert.deepEqual(disagree.map((r) => r.id), []);
});

test("every citation url is http(s)", () => {
  const bad = [];
  for (const r of routes)
    for (const s of r.sources)
      if (!/^https?:\/\/\S+$/.test(s.url ?? "")) bad.push(`${r.id}: ${JSON.stringify(s.url)}`);
  assert.deepEqual(bad, [], "a citation a reader cannot open is not a citation");
});

test("every citation names its publisher in plain words", () => {
  const bad = [];
  for (const r of routes)
    for (const s of r.sources)
      if (typeof s.publisher !== "string" || !s.publisher.trim()) bad.push(`${r.id}: ${s.url}`);
  assert.deepEqual(bad, []);
});

test("a citation date is a real ISO date, or null where the source publishes none", () => {
  // Null is deliberate and not a gap to fill later: an airline's or an airport's
  // destination page is a living document with no publication date, and dating
  // it would be an invention. A dated report carries its date.
  const bad = [];
  for (const r of routes)
    for (const s of r.sources) {
      if (s.date === null) continue;
      const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.date ?? "");
      const real =
        iso &&
        new Date(`${s.date}T00:00:00Z`).toISOString().slice(0, 10) === s.date;
      if (!real) bad.push(`${r.id}: ${JSON.stringify(s.date)}`);
    }
  assert.deepEqual(bad, []);
  assert.ok(
    routes.some((r) => r.sources.some((s) => s.date)),
    "at least one citation is dated, or the field is decoration",
  );
});

test("every citation says what it supports, from the closed set", () => {
  const bad = [];
  for (const r of routes)
    for (const s of r.sources) {
      if (!Array.isArray(s.supports) || s.supports.length === 0) {
        bad.push(`${r.id} ${s.url}: supports is empty`);
        continue;
      }
      for (const claim of s.supports)
        if (!SUPPORTS.includes(claim)) bad.push(`${r.id} ${s.url}: ${claim}`);
    }
  assert.deepEqual(bad, []);
});

test("a flight number and operating days are each backed by a citation that claims them", () => {
  // The whole point of the list: the row's fields and its provenance cannot
  // drift apart, so a flight number nothing in the list supports fails here.
  const uncited = [];
  for (const r of routes) {
    const backs = (claim) => r.sources.some((s) => s.supports.includes(claim));
    if (r.flight && !backs("flight")) uncited.push(`${r.id}: flight ${r.flight}`);
    if (r.days && !backs("days")) uncited.push(`${r.id}: days ${r.days.join(" ")}`);
  }
  assert.deepEqual(uncited, []);
});

test("the CSV mirror carries the list as JSON in one column", () => {
  const csv = readFileSync(join(DATA, "csv", "routes.csv"), "utf-8");
  const header = csv.split("\n")[0].split(",");
  assert.ok(header.includes("sources"), "the CSV has a sources column");
  assert.equal(header.indexOf("sources"), header.indexOf("source") + 1);
  // One row read back, to prove the documented format round-trips: the cell is
  // the JSON array, quoted by the CSV writer with its inner quotes doubled.
  const row = routes.find((r) => r.sources.length > 1);
  const cell = JSON.stringify(row.sources).replaceAll('"', '""');
  assert.ok(csv.includes(`"${cell}"`), `${row.id}: its citation list is not in the CSV`);
});

test("the GeoJSON mirror carries the list in its properties", () => {
  const fc = JSON.parse(readFileSync(join(DATA, "geojson", "routes.geojson"), "utf-8"));
  assert.equal(fc.features.length, routes.length);
  const byId = new Map(routes.map((r) => [r.id, r]));
  const missing = fc.features.filter(
    (f) =>
      JSON.stringify(f.properties.sources) !== JSON.stringify(byId.get(f.properties.id)?.sources),
  );
  assert.deepEqual(missing.map((f) => f.properties.id), []);
});

test("the 24 October 2026 statement is cited on the ten legs it announces", () => {
  // Conakry, Brazzaville, Lagos, Shanghai and Tripoli at Mitiga, both
  // directions of each. It supports the route and its launch dates, never a
  // flight number or a day, because the statement carries neither, and it is an
  // extra entry rather than the `source`, which stays the report covering the
  // fields each row ships.
  const url =
    "https://www.algerie360.com/air-algerie-nouvelles-destinations-conakry-shanghai-tripoli/";
  const cited = routes.filter((r) => r.sources.some((s) => s.url === url));
  assert.deepEqual(
    cited.map((r) => r.id).sort(),
    ["alg-bzv", "alg-cky", "alg-los", "alg-mji", "alg-pvg", "bzv-alg", "cky-alg", "los-alg", "mji-alg", "pvg-alg"],
  );
  for (const r of cited) {
    const entry = r.sources.find((s) => s.url === url);
    assert.notEqual(r.source, url, `${r.id}: the statement is not the primary citation`);
    assert.equal(entry.date, "2026-10-24");
    assert.deepEqual(entry.supports, ["route", "dates"]);
    assert.ok(r.planned, `${r.id}: an announcement never leaves plannedRoutes()`);
  }
});
