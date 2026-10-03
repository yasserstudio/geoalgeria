import test from "node:test";
import assert from "node:assert/strict";
import { assertSafeProtectionCivileRefresh } from "../scripts/lib/protection-civile-refresh-guard.mjs";

const units = (count) =>
  Array.from({ length: count }, (_, index) => ({
    name: `Unit ${index}`,
    lat: 36 + index / 10_000,
    lng: 3 + index / 10_000,
    refs: { dgpc: String(index + 1) },
  }));

test("Protection Civile refresh guard accepts a small reviewed-looking delta", () => {
  const previous = units(100);
  const next = structuredClone(previous);
  next[0].name = "Corrected unit name";
  assert.deepEqual(assertSafeProtectionCivileRefresh(previous, next), {
    carryHits: 100,
    materialChanges: 1,
  });
});

test("Protection Civile refresh guard rejects publisher-wide field corruption", () => {
  const previous = units(100);
  const next = structuredClone(previous);
  for (const unit of next.slice(0, 11)) unit.lat += 1;
  assert.throws(
    () => assertSafeProtectionCivileRefresh(previous, next),
    /materially changed 11\/100 units/,
  );
});

test("Protection Civile refresh guard rejects identifier churn and duplicate ids", () => {
  const previous = units(100);
  const churned = units(100).map((unit, index) => ({
    ...unit,
    refs: { dgpc: String(index + 1_000) },
  }));
  assert.throws(
    () => assertSafeProtectionCivileRefresh(previous, churned),
    /retained only 0\/100 DGPC object ids/,
  );

  const duplicated = structuredClone(previous);
  duplicated[1].refs.dgpc = duplicated[0].refs.dgpc;
  assert.throws(
    () => assertSafeProtectionCivileRefresh(previous, duplicated),
    /duplicate new key/,
  );
});
