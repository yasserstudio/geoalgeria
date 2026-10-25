// Guards how @geoalgeria/livraison dates a coordinate it did not read this run.
//
// A carded desk is re-geocoded on every run by resolving the carrier's own Google Maps
// link. When that link will not resolve the desk keeps the coordinate it already shipped
// (pinFor) rather than being dropped. `metadata.sources[].retrieved` dates the carrier's
// list, so without anything else the carried point reads as if it had been verified this
// run. Each one is therefore listed in `metadata.carried_pins` with the date of the run
// that really read it (Owner decision, 2026-10-25).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { carriedPinDate } from "../packages/livraison/scripts/fetch.mjs";

const DATA = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages",
  "livraison",
  "data",
);
const read = (file) => JSON.parse(readFileSync(join(DATA, file), "utf8"));
const metadata = read("metadata.json");
const stopdesks = read("stopdesks.json");

test("a pin carried again keeps the one run that read it, not the last refresh", () => {
  const committed = {
    sources: [{ key: "noest", retrieved: "2026-10-25" }],
    updated: "2026-10-25",
    carried_pins: [{ id: "noest-19b", name: "Noest Sétif «El Eulma»", retrieved: "2026-06-18" }],
  };
  // Ageing one refresh at a time is exactly the overclaim to avoid: the coordinate is
  // as old as the run that read it, however many refreshes have carried it since.
  assert.equal(carriedPinDate({ id: "noest-19b", source: "noest" }, committed), "2026-06-18");
});

test("a pin carried for the first time takes its source's committed retrieval date", () => {
  const committed = {
    sources: [
      { key: "anderson", retrieved: "2026-10-25" },
      { key: "swift-express", retrieved: "2026-09-01" },
    ],
    updated: "2026-10-25",
    carried_pins: [],
  };
  // The record was fresh in the committed data, so that data's own date for its source
  // is when the coordinate was read.
  assert.equal(
    carriedPinDate({ id: "swift-express-236", source: "swift-express" }, committed),
    "2026-09-01",
  );
});

test("the two desks carried before the list existed are dated by their last real read", () => {
  // Both have shipped the same coordinate since the 2026-06-18 pull, so the committed
  // metadata's 2026-10-25 would be a date no run ever read that pin on.
  const committed = { sources: [{ key: "noest", retrieved: "2026-10-25" }], updated: "2026-10-25" };
  assert.equal(carriedPinDate({ id: "noest-19b", source: "noest" }, committed), "2026-06-18");
  assert.equal(
    carriedPinDate({ id: "anderson-25-ali-mendjeli", source: "anderson" }, committed),
    "2026-06-18",
  );
});

test("the shipped metadata lists both carried desks, dated before the refresh", () => {
  assert.ok(Array.isArray(metadata.carried_pins));
  assert.deepEqual(
    metadata.carried_pins.map((p) => p.id),
    ["anderson-25-ali-mendjeli", "noest-19b"],
  );
  for (const pin of metadata.carried_pins) {
    assert.match(pin.retrieved, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(pin.retrieved < metadata.updated, `${pin.id} is stamped with the run's own date`);
  }
});

test("every carried pin joins a record the package ships, under its own name", () => {
  const byId = new Map(stopdesks.map((r) => [r.id, r]));
  for (const pin of metadata.carried_pins) {
    const record = byId.get(pin.id);
    assert.ok(record, `${pin.id} is listed as carried but is not shipped`);
    assert.equal(pin.name, record.name);
  }
});

test("a carried pin is dated before its own source's retrieval date", () => {
  const sourceDate = new Map(metadata.sources.map((s) => [s.key, s.retrieved]));
  for (const pin of metadata.carried_pins) {
    const record = stopdesks.find((r) => r.id === pin.id);
    assert.ok(
      pin.retrieved < sourceDate.get(record.source),
      `${pin.id} claims the date its source list was read`,
    );
  }
});
