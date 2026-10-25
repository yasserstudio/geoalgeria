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

test("every route carries at least one citation", () => {
  const empty = routes.filter((r) => !Array.isArray(r.sources) || r.sources.length === 0);
  assert.deepEqual(empty.map((r) => r.id), [], "a route with no citation may not ship");
});

test("the first citation is the row's own `source`", () => {
  // The contract that lets `source` keep its meaning: a consumer reading one
  // citation and a consumer reading the list start from the same url.
  const disagree = routes.filter((r) => r.sources[0] !== r.source);
  assert.deepEqual(disagree.map((r) => r.id), []);
});

test("a citation is a plain url string, never an object", () => {
  // The shape, deliberately plain: a richer entry carrying a publisher, a
  // supports list and a publication date went out before the 2.9.0 release
  // (ADR 0002), so an object here is a regression, not an enrichment.
  const bad = [];
  for (const r of routes)
    for (const s of r.sources)
      if (typeof s !== "string") bad.push(`${r.id}: ${typeof s} ${JSON.stringify(s)}`);
  assert.deepEqual(bad, []);
});

test("every citation url is http(s)", () => {
  const bad = [];
  for (const r of routes)
    for (const s of r.sources)
      if (!/^https?:\/\/\S+$/.test(s ?? "")) bad.push(`${r.id}: ${JSON.stringify(s)}`);
  assert.deepEqual(bad, [], "a citation a reader cannot open is not a citation");
});

test("no route cites the same url twice", () => {
  const dupes = routes.filter((r) => new Set(r.sources).size !== r.sources.length);
  assert.deepEqual(dupes.map((r) => r.id), []);
});

test("the CSV mirror carries the list space-separated in one column", () => {
  const csv = readFileSync(join(DATA, "csv", "routes.csv"), "utf-8");
  const header = csv.split("\n")[0].split(",");
  assert.ok(header.includes("sources"), "the CSV has a sources column");
  assert.equal(header.indexOf("sources"), header.indexOf("source") + 1);
  // One row read back, to prove the documented format round-trips: a url carries
  // no space, so the cell splits cleanly on one.
  const row = routes.find((r) => r.sources.length > 1);
  assert.ok(csv.includes(row.sources.join(" ")), `${row.id}: its citation list is not in the CSV`);
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
  // directions of each. It is an extra entry rather than the `source`, which
  // stays the report covering the fields each row ships, because the statement
  // carries no flight number and no day name.
  const url =
    "https://www.algerie360.com/air-algerie-nouvelles-destinations-conakry-shanghai-tripoli/";
  const cited = routes.filter((r) => r.sources.includes(url));
  assert.deepEqual(
    cited.map((r) => r.id).sort(),
    ["alg-bzv", "alg-cky", "alg-los", "alg-mji", "alg-pvg", "bzv-alg", "cky-alg", "los-alg", "mji-alg", "pvg-alg"],
  );
  for (const r of cited) {
    assert.notEqual(r.source, url, `${r.id}: the statement is not the primary citation`);
    assert.ok(r.planned, `${r.id}: an announcement never leaves plannedRoutes()`);
  }
});
