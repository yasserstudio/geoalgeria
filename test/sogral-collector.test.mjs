import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertServiceDate,
  itineraryCheckpointHealth,
  matrixPairs,
  positiveLimit,
  scheduleCheckpointHealth,
} from "../research/sogral/collector-guards.mjs";

const NOW = Date.parse("2026-08-12T12:00:00Z");

test("SOGRAL collector validates dates and bounded limits", () => {
  assert.equal(assertServiceDate("2026-08-12"), "2026-08-12");
  assert.throws(() => assertServiceDate("2026-02-30"), /Invalid service date/);
  assert.equal(positiveLimit("20"), 20);
  assert.equal(positiveLimit(null), Number.POSITIVE_INFINITY);
  assert.throws(() => positiveLimit("0"), /positive integer/);
  assert.throws(() => positiveLimit("2.5"), /positive integer/);
});

test("SOGRAL destination matrix health rejects stale and duplicate input", () => {
  const matrix = {
    retrieved_at: "2026-08-12T11:00:00Z",
    stations: [{
      agency_id: 1,
      name: "ALGER",
      destinations: [{ P1: "destination", S1: "ORAN" }],
    }],
  };
  assert.equal(matrixPairs(matrix, { now: NOW }).pairs.length, 1);
  assert.throws(
    () => matrixPairs({ ...matrix, retrieved_at: "2026-07-01T00:00:00Z" }, { now: NOW }),
    /matrix is stale/,
  );
  assert.throws(
    () => matrixPairs({
      ...matrix,
      stations: [{ ...matrix.stations[0], destinations: [
        { P1: "destination", S1: "ORAN" },
        { P1: "destination", S1: "ORAN" },
      ] }],
    }, { now: NOW }),
    /Duplicate station\/destination pair/,
  );
});

test("SOGRAL schedule health distinguishes complete, pending and corrupt checkpoints", () => {
  const expectedKeys = ["1:a", "1:b"];
  const complete = {
    date: "2026-08-12",
    completed: { "1:a": "ok", "1:b": "ok" },
    results: [
      { key: "1:a", checked_at: "2026-08-12T11:40:00Z" },
      { key: "1:b", checked_at: "2026-08-12T11:50:00Z" },
    ],
    failures: [],
  };
  assert.deepEqual(
    scheduleCheckpointHealth(complete, { date: "2026-08-12", expectedKeys, now: NOW }),
    {
      complete: true,
      expected_pairs: 2,
      completed_pairs: 2,
      pending_pairs: 0,
      unresolved_failures: 0,
      last_checked_at: "2026-08-12T11:50:00.000Z",
      checkpoint_age_minutes: 10,
      stalled: false,
      pending_sample: [],
    },
  );
  const pending = {
    ...complete,
    completed: { "1:a": "ok" },
    results: complete.results.slice(0, 1),
    failures: [{ key: "1:b", checked_at: "2026-08-12T11:20:00Z" }],
  };
  const pendingHealth = scheduleCheckpointHealth(pending, { date: "2026-08-12", expectedKeys, now: NOW });
  assert.equal(pendingHealth.complete, false);
  assert.equal(pendingHealth.unresolved_failures, 1);
  assert.equal(pendingHealth.stalled, false);
  assert.throws(
    () => scheduleCheckpointHealth({ ...complete, results: [...complete.results, complete.results[0]] }, { date: "2026-08-12", expectedKeys, now: NOW }),
    /Duplicate schedule result/,
  );
});

test("SOGRAL itinerary health ignores recovered failures and reports pending routes", () => {
  const state = {
    date: "2026-08-12",
    routes: { a: { checked_at: "2026-08-12T11:45:00Z" } },
    failures: [
      { key: "a", checked_at: "2026-08-12T11:00:00Z" },
      { key: "b", checked_at: "2026-08-12T11:55:00Z" },
    ],
  };
  const health = itineraryCheckpointHealth(state, {
    date: "2026-08-12",
    expectedKeys: ["a", "b"],
    now: NOW,
  });
  assert.equal(health.captured_routes, 1);
  assert.equal(health.pending_routes, 1);
  assert.equal(health.unresolved_failures, 1);
  assert.deepEqual(health.pending_sample, ["b"]);
});
