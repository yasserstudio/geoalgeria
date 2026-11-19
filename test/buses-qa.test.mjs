import test from "node:test";
import assert from "node:assert/strict";
import { checkDirection } from "../research/buses/qa/check-direction.mjs";

// A straight east-west path along latitude 36.75 in Algiers, about 1.8 km long.
// 0.001 degree of latitude is about 111 m.
const PATH = [[[3.0, 36.75], [3.01, 36.75], [3.02, 36.75]]];
const at = (id, lng, lat) => ({ id, lng, lat });
const rule = (verdict, name) => verdict.checks.find((c) => c.rule === name);

test("a Station more than 50 m from the path fails the near-path rule", () => {
  const verdict = checkDirection(PATH, [
    at("a", 3.0, 36.75),
    at("b", 3.01, 36.7511), // ~122 m north of the path
    at("c", 3.02, 36.75),
  ]);
  const near = rule(verdict, "near_path");
  assert.equal(near.pass, false);
  assert.deepEqual(near.failing, ["b"]);
  assert.equal(verdict.status, "inconsistent");
});

test("Stations in path order pass; a jump back of more than 100 m fails the order rule", () => {
  const inOrder = checkDirection(PATH, [at("a", 3.0, 36.75), at("b", 3.01, 36.75), at("c", 3.02, 36.75)]);
  assert.equal(rule(inOrder, "path_order").pass, true);
  assert.equal(inOrder.status, "consistent");

  // ~45 m back: tolerated (two platforms of one stop, GPS jitter)
  const jitter = checkDirection(PATH, [at("a", 3.0, 36.75), at("b", 3.0105, 36.75), at("b2", 3.01, 36.75), at("c", 3.02, 36.75)]);
  assert.equal(rule(jitter, "path_order").pass, true);

  const swapped = checkDirection(PATH, [at("a", 3.0, 36.75), at("c", 3.02, 36.75), at("b", 3.01, 36.75)]);
  assert.deepEqual(rule(swapped, "path_order").failing, ["b"]);
  assert.equal(swapped.status, "inconsistent");
});

test("on an out-and-back path, a Station on the return leg is not read as going backwards", () => {
  const outAndBack = [[[3.0, 36.75], [3.02, 36.75], [3.0, 36.75]]];
  const verdict = checkDirection(outAndBack, [at("a", 3.0, 36.75), at("turn", 3.02, 36.75), at("back", 3.01, 36.75)]);
  assert.equal(rule(verdict, "path_order").pass, true);
});

test("the first and last Stations must lie within 300 m of the path's ends", () => {
  const ok = checkDirection(PATH, [at("a", 3.002, 36.75), at("c", 3.018, 36.75)]); // ~180 m from each end
  assert.equal(rule(ok, "termini").pass, true);

  const short = checkDirection(PATH, [at("a", 3.0, 36.75), at("mid", 3.01, 36.75)]); // ends ~890 m early
  assert.deepEqual(rule(short, "termini").failing, ["mid"]);
  assert.equal(short.status, "inconsistent");
});

test("a break of more than 200 m between consecutive path parts fails the continuity rule", () => {
  const stations = [at("a", 3.0, 36.75), at("c", 3.02, 36.75)];
  const joined = checkDirection([[[3.0, 36.75], [3.01, 36.75]], [[3.0101, 36.75], [3.02, 36.75]]], stations); // ~9 m join
  assert.equal(rule(joined, "continuity").pass, true);

  const broken = checkDirection([[[3.0, 36.75], [3.008, 36.75]], [[3.012, 36.75], [3.02, 36.75]]], stations); // ~357 m hole
  assert.equal(rule(broken, "continuity").pass, false);
  assert.equal(rule(broken, "continuity").gaps, 1);
  assert.equal(broken.status, "inconsistent");
});

test("a Station off the path is not used to judge the order of the next one", () => {
  const verdict = checkDirection(PATH, [
    at("a", 3.0, 36.75),
    at("lost", 3.02, 36.7525), // ~280 m off the path, beside its far end
    at("b", 3.01, 36.75),
    at("c", 3.02, 36.75),
  ]);
  assert.deepEqual(rule(verdict, "near_path").failing, ["lost"]);
  assert.deepEqual(rule(verdict, "path_order").failing, []);
});
