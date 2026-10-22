// A retired sante id resolves to a live record in ONE hop, across releases.
//
// The bug class this exists for (private tracker #292): sante retires ids at two
// sites, the FR/AR twin merge and the same-language repeat merge, and a target
// of one can later be absorbed by the other. A release that merges twin A into B
// writes `A -> B` into the append-only ledger. If a later refresh then absorbs B
// into C and only writes `B -> C`, the ledger holds a chain: a consumer that
// resolves A arrives at B, which is retired too, and has to resolve again.
// `writePackageV2`'s own guard does not catch it either, because A and B are both
// legitimately retired.
//
// Both sites therefore write through `forwardRetiredId`, which re-points every
// earlier forward that aimed at the id now retiring. These tests drive that
// across-releases case directly: the earlier forward is in `priorMigrations`, as
// it would be after being read back from retired-ids.json, and the test fails if
// either site ever writes `migrations[absorbed]` by hand again.

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRepeatPairs, resolveTwinPairs } from "../packages/sante/scripts/fetch.mjs";

// The record that survives both merges, citing every post it absorbed.
const live = (refs) => [{ id: "99-eph-00", refs }];
// What the registry shipped on the release the earlier merge landed in.
const committed = [
  { id: "99-eph-00", refs: { msp: "100" } },
  { id: "99-eph-01", refs: { msp: "200" } },
];
// The forward an earlier release already wrote, aimed at the id about to retire.
const earlier = () => ({
  "99-eph-02": {
    merged_into: "99-eph-01",
    msp_posts: ["200", "300"],
    note: "Merged into 99-eph-01 by an earlier release, for reasons of its own.",
  },
});

const twinVerdict = {
  paired: true,
  decided_by: "rule",
  reason: "shared_key",
  wilaya_code: "99",
  type: "eph",
  msp_gap: 1,
  msp_fr: "100",
  msp_ar: "200",
};

const repeatVerdict = {
  merged: true,
  reason: "same_title",
  language: "fr",
  type: "eph",
  wilaya_code: "99",
  cross_wilaya: false,
  kept_because: "first_post",
  msp_kept: "100",
  msp_repeat: "200",
  wilaya_codes: ["99", "99"],
};

/** Every forward in the ledger lands on an id the ledger does not itself retire. */
const assertNoChain = (migrations) => {
  for (const [from, entry] of Object.entries(migrations))
    assert.equal(
      Object.hasOwn(migrations, entry.merged_into),
      false,
      `${from} forwards to ${entry.merged_into}, which is retired too: that is a chain`,
    );
};

test("sante retirements: a repeat merge re-points an earlier twin forward", () => {
  const migrations = earlier();
  const { migrations: out } = resolveRepeatPairs(
    [repeatVerdict],
    live({ msp: "100", msp_repeat: "200" }),
    committed,
    migrations,
  );
  // the merge itself
  assert.equal(out["99-eph-01"].merged_into, "99-eph-00");
  assert.match(out["99-eph-01"].note, /entered twice in French/);
  // and the forward the earlier release wrote now points past it, in one hop
  assert.equal(
    out["99-eph-02"].merged_into,
    "99-eph-00",
    "99-eph-02 still points at a retired id, so forwardRetiredId was bypassed",
  );
  // an earlier entry keeps its own note and its own upstream posts: why THAT id
  // was retired is not changed by its target retiring in turn
  assert.match(out["99-eph-02"].note, /by an earlier release/);
  assert.deepEqual(out["99-eph-02"].msp_posts, ["200", "300"]);
  assertNoChain(out);
});

test("sante retirements: a twin merge re-points an earlier repeat forward", () => {
  const migrations = earlier();
  const { migrations: out } = resolveTwinPairs(
    [twinVerdict],
    live({ msp: "100", msp_twin: "200" }),
    committed,
    migrations,
  );
  assert.equal(out["99-eph-01"].merged_into, "99-eph-00");
  assert.match(out["99-eph-01"].note, /are one establishment/);
  assert.equal(
    out["99-eph-02"].merged_into,
    "99-eph-00",
    "99-eph-02 still points at a retired id, so forwardRetiredId was bypassed",
  );
  assert.match(out["99-eph-02"].note, /by an earlier release/);
  assertNoChain(out);
});

test("sante retirements: the ledger handed in is not mutated into the one handed back", () => {
  // the caller's map is copied, so a run that throws later cannot leave a
  // half-written ledger behind: only the re-pointed entries are shared
  const migrations = earlier();
  const { migrations: out } = resolveTwinPairs(
    [twinVerdict],
    live({ msp: "100", msp_twin: "200" }),
    committed,
    migrations,
  );
  assert.equal(Object.hasOwn(migrations, "99-eph-01"), false);
  assert.notEqual(out, migrations);
});
