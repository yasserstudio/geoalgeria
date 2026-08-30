import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const units = JSON.parse(
  readFileSync(
    new URL(
      "../packages/protection-civile/data/protection-civile.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

test("Protection Civile telephone fields never publish separator placeholders", () => {
  for (const unit of units) {
    for (const field of ["tel", "fax"]) {
      const value = unit[field];
      assert.ok(
        value == null || /\d/.test(value),
        `${unit.id}.${field} must be null or contain a dialable digit`,
      );
    }
  }
});
