// Guards the one judgment in the @geoalgeria/ecoles fetcher's name handling:
// that a raw OpenStreetMap name goes through withoutEmDash() before it is
// published.
//
// The bug class this exists for: every other check on this rule reads committed
// JSON. If cleanName() stops folding the em dash, the committed records stay
// clean, `pnpm validate` stays green, and the regression only surfaces whenever
// someone next refreshes the package and an OSM name happens to carry one. A
// merge is the likely way to lose it, since cleanName() is a one-line
// composition that two branches can touch at once: #286 replaces LEAD_MARKS with
// stripLeadingMarks() on the same line this PR wrapped in withoutEmDash(), and
// resolving that conflict by taking either side wholesale drops the other.
//
// So the fold is asserted against the function itself rather than against its
// output. That is why fetch.mjs exports cleanName and guards main() behind
// import.meta.url, the same shape packages/cliniques/scripts/fetch.mjs uses.

import { test } from "node:test";
import assert from "node:assert/strict";

import { cleanName } from "../packages/ecoles/scripts/fetch.mjs";
import { EM_DASH } from "../scripts/lib/no-em-dash.mjs";

test("cleanName folds an em dash out of a raw OSM name", () => {
  assert.equal(
    cleanName(`École primaire ${EM_DASH} Khaldi Mohammed`),
    "École primaire - Khaldi Mohammed",
  );
  // The two real OSM tags behind #281, in both scripts the source publishes.
  assert.equal(cleanName(`Primary school ${EM_DASH} Khaldi Mohammed`), "Primary school - Khaldi Mohammed");
  assert.equal(cleanName(`École primaire ${EM_DASH} Chouakri Ali`), "École primaire - Chouakri Ali");
  assert.ok(!cleanName(`مدرسة ${EM_DASH} الشهيد`).includes(EM_DASH));
});

test("cleanName still does the rest of its job", () => {
  assert.equal(cleanName("  Lycée   Malek   Ben Nabi "), "Lycée Malek Ben Nabi");
  assert.equal(cleanName("CEM Al Antari - Banich"), "CEM Al Antari - Banich");
  assert.equal(cleanName("6–7"), null, "no letter, so not a name");
  assert.equal(cleanName("ب"), null, "a single letter is not a name");
  assert.equal(cleanName(null), null);
});
