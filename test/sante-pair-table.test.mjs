// The hand-asserted side of the FR/AR merge: the evidence-backed pair table.
//
// The automatic twin rule pairs a French post with an Arabic one only when the
// two registry post ids sit within two of each other, because post adjacency is
// all it has to go on and a wider window pairs the wrong facilities. Four cities
// publish their two halves much further apart, so those pairs are asserted by
// hand in packages/sante/scripts/twin-pair-table.mjs, each citing a source that
// is not the registry.
//
// The bug class this exists for: a hand-written pair is a public id retirement
// decided by a human, so nothing in the data checks it. If a row names a post
// the registry has since renamed, the table would merge two facilities that are
// no longer the ones it was written about; if a row cites only the registry, the
// pair rests on the same single source the gap rule already refused to trust;
// and if the table ever disagrees with the shipped data, the evidence the
// package publishes describes a merge that did not happen.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TWIN_PAIR_TABLE,
  UNPAIRED_CANDIDATES,
  assertPairTable,
  pairTableSides,
} from "../packages/sante/scripts/twin-pair-table.mjs";
import { pairPosts } from "../packages/sante/scripts/fetch.mjs";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const records = read("../packages/sante/data/sante.json");
const retired = read("../packages/sante/data/retired-ids.json");
const report = read("../quality/sante-twin-recovery.json");

const WIL = { byCode: new Map([["21", { code: "21", name_fr: "Skikda", name_ar: "سكيكدة" }]]) };

const post = (lang, msp, title, extra = {}) => ({
  lang,
  msp_id: msp,
  title,
  locality: "SKIKDA",
  specialty: null,
  wilayaCode: "21",
  type: "eph",
  commune: null,
  communeHow: null,
  ...extra,
});

const ROW = {
  wilaya_code: "21",
  type: "eph",
  msp_fr: "4804",
  msp_ar: "4809",
  expect_fr: "Etablissement Public Hospitalier Skikda",
  expect_ar: "المؤسسة العمومية الإستشفائية سكيكدة",
  facility: "EPH Skikda",
  evidence: [{ source: "openstreetmap", url: "https://www.openstreetmap.org/way/1", checked_at: "2026-10-22", note: "x" }],
};

const FR = post("fr", "4804", ROW.expect_fr);
const AR = post("ar", "4809", ROW.expect_ar);

test("pair table: a row pairs two posts the gap rule cannot reach", () => {
  // eleven ids apart, so pairTwinPosts never sees them as candidates at all
  const far = post("ar", "4825", "المؤسسة الإستشفائية سكيكدة");
  const paired = pairPosts([FR], [AR, far], WIL, null, [ROW]);
  assert.deepEqual(
    paired.map(({ fr, ar }) => `${fr ? fr.msp_id : "-"}/${ar ? ar.msp_id : "-"}`).sort(),
    ["-/4825", "4804/4809"],
  );
});

test("pair table: the row is reported as its own kind of decision, with its evidence", () => {
  const verdicts = [];
  pairPosts([FR], [AR], WIL, verdicts, [ROW]);
  const [verdict] = verdicts;
  assert.equal(verdict.paired, true);
  assert.equal(verdict.decided_by, "pair_table");
  assert.equal(verdict.reason, "second_source_evidence");
  assert.equal(verdict.msp_gap, 5);
  assert.deepEqual(verdict.evidence, ROW.evidence);
});

test("pair table: a row never loses either half to a weaker automatic match", () => {
  // the Arabic half of the OTHER Skikda hospital names the same city, so the
  // locality-similarity step would claim the French post first if the table did
  // not run before it
  const rival = post("ar", "4825", "المؤسسة الإستشفائية سكيكدة");
  const paired = pairPosts([FR], [rival, AR], WIL, null, [ROW]);
  assert.ok(paired.some((s) => s.fr === FR && s.ar === AR), "the table's own pair must survive");
});

test("pair table: a renamed registry post stops the build rather than mis-pairing", () => {
  const posts = [post("fr", "4804", "Etablissement Hospitalier Skikda"), AR];
  assert.throws(() => assertPairTable(posts, [ROW]), /4804/);
  // and a post the registry no longer publishes is just as loud
  assert.throws(() => assertPairTable([FR], [ROW]), /4809/);
  // a row whose posts are where it says they are passes
  assertPairTable([FR, AR], [ROW]);
});

test("pair table: every row cites a source that is not the registry", () => {
  assert.ok(TWIN_PAIR_TABLE.length > 0, "the table has to describe the pairs it claims");
  for (const row of TWIN_PAIR_TABLE) {
    assert.ok(row.evidence?.length, `${row.msp_fr}/${row.msp_ar} cites no evidence`);
    for (const e of row.evidence) {
      assert.match(e.url, /^https:\/\//, `${row.msp_fr}/${row.msp_ar} evidence url is not public`);
      assert.doesNotMatch(
        e.url,
        /sante\.gov\.dz|msprh|google\./i,
        `${row.msp_fr}/${row.msp_ar} cites the registry or Google, which is never the second source`,
      );
      assert.match(e.checked_at, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(e.note, `${row.msp_fr}/${row.msp_ar} evidence has no reading`);
    }
    // the two halves are the two languages, named once each
    assert.deepEqual(pairTableSides(row), ["fr", "ar"]);
    assert.notEqual(row.msp_fr, row.msp_ar);
  }
});

test("pair table: no post is claimed by two rows", () => {
  const owner = new Map();
  for (const row of TWIN_PAIR_TABLE)
    for (const post of [row.msp_fr, row.msp_ar]) {
      assert.equal(owner.has(post), false, `post ${post} is on two rows (${owner.get(post)})`);
      owner.set(post, `${row.msp_fr}/${row.msp_ar}`);
    }
});

test("pair table: every row shipped as one bilingual record with the absorbed id retired", () => {
  const byId = new Map(records.map((r) => [r.id, r]));
  const retiredIds = new Set(retired.ids);
  const byPosts = new Map(report.pairs.map((p) => [`${p.msp_fr}/${p.msp_ar}`, p]));
  for (const row of TWIN_PAIR_TABLE) {
    const key = `${row.msp_fr}/${row.msp_ar}`;
    const pair = byPosts.get(key);
    assert.ok(pair, `${key} (${row.facility}) is not in the twin report`);
    assert.equal(pair.decided_by, "pair_table");
    assert.deepEqual(pair.evidence, row.evidence, `${key} publishes evidence the table does not hold`);
    const record = byId.get(pair.kept_id);
    assert.ok(record, `${pair.kept_id} is not in the shipped data`);
    assert.equal(record.refs.msp, row.msp_fr);
    assert.equal(record.refs.msp_twin, row.msp_ar);
    assert.ok(record.name_fr && record.name_ar, `${pair.kept_id} kept only one language`);
    assert.ok(pair.absorbed_id, `${key} absorbed no id, so nothing was merged`);
    assert.equal(byId.has(pair.absorbed_id), false, `${pair.absorbed_id} is still live`);
    assert.ok(retiredIds.has(pair.absorbed_id), `${pair.absorbed_id} is not reserved`);
    const migration = retired.migrations?.[pair.absorbed_id];
    assert.ok(migration, `${pair.absorbed_id} retired with no migration entry`);
    assert.equal(migration.merged_into, pair.kept_id);
    assert.deepEqual(migration.msp_posts, [row.msp_fr, row.msp_ar]);
  }
});

// The national measurement the table was asked for: every FR/AR candidate still
// unpaired in the shipped data. It is what makes "no twin is missed" a fact this
// build re-establishes rather than a claim made once in a ticket, so it has to
// agree with the data and with the refusals recorded beside it.
test("pair table: the measurement lists every still-unpaired candidate and nothing it merged", () => {
  const leftovers = report.monolingual_leftovers;
  assert.ok(leftovers.length > 0, "the measurement has to be published, even when it is not empty");
  const byPosts = new Set(leftovers.map((c) => `${c.msp_fr}/${c.msp_ar}`));
  // a pair this release merged is no longer a leftover
  for (const row of TWIN_PAIR_TABLE)
    assert.equal(
      byPosts.has(`${row.msp_fr}/${row.msp_ar}`),
      false,
      `${row.msp_fr}/${row.msp_ar} was merged and is still listed as unpaired`,
    );
  // and every case the table refused IS one, so the refusal can be checked
  for (const row of UNPAIRED_CANDIDATES)
    assert.ok(
      byPosts.has(`${row.msp_fr}/${row.msp_ar}`),
      `${row.msp_fr}/${row.msp_ar} is recorded as left unpaired but is not an unpaired candidate`,
    );
  // the measurement is derived, so it has to match the records it is derived from
  const monolingual = new Set(records.filter((r) => !(r.name_fr && r.name_ar)).map((r) => r.id));
  for (const c of leftovers) {
    assert.ok(monolingual.has(c.id_fr), `${c.id_fr} is listed as French-only but is not`);
    assert.ok(monolingual.has(c.id_ar), `${c.id_ar} is listed as Arabic-only but is not`);
    assert.equal(c.msp_gap, Math.abs(Number(c.msp_fr) - Number(c.msp_ar)));
  }
});

// A forward has to land on a live record in ONE hop: a consumer resolves a
// retired id once and stops. Both merge sites write through forwardRetiredId for
// this reason (private tracker #292), so a target later absorbed by another
// merge re-points the earlier forward instead of chaining behind it.
test("pair table: no retirement forwards to another retired id", () => {
  const live = new Set(records.map((r) => r.id));
  for (const [from, entry] of Object.entries(retired.migrations ?? {})) {
    if (!entry?.merged_into) continue;
    assert.ok(
      live.has(entry.merged_into),
      `${from} forwards to ${entry.merged_into}, which is not a live record`,
    );
  }
});
