// The hand-asserted side of the FR/AR merge: the pair table.
//
// The automatic twin rule pairs a French post with an Arabic one only when the
// two registry post ids sit within two of each other, because post adjacency is
// all it has to go on and a wider window pairs the wrong establishments. Four
// pairs across three cities sit 4, 10, 14 and 1284 ids apart, so they are
// asserted by hand in packages/sante/scripts/twin-pair-table.mjs.
//
// The bug class this exists for: a hand-written pair is a public id retirement
// decided by a human, so nothing in the data checks it. If a row names a post
// the registry has since renamed, the table would merge two establishments that
// are no longer the ones it was written about; if a row claims more than its
// sources say, the published evidence describes a merge that rests on something
// else; and if the table ever disagrees with the shipped data, the package
// publishes a merge that did not happen.
//
// `second_source` is the claim each row makes, and the two levels are different
// claims (Owner decision, 2026-10-22, on #287), so they are checked differently:
// a `both` row has to carry an evidence entry that names the establishment in
// both scripts, and a `fr_only` row must carry none, and must instead record the
// translation and the one-candidate-left reading its Arabic half rests on.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TWIN_PAIR_TABLE,
  UNPAIRED_CANDIDATES,
  assertPairTable,
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
  establishment: "EPH Skikda",
  second_source: "both",
  translation: "the two titles say the same thing in the two languages",
  evidence: [
    {
      source: "openstreetmap",
      url: "https://www.openstreetmap.org/way/1",
      checked_at: "2026-10-22",
      names_both_scripts: true,
      note: "names the establishment in both scripts",
    },
  ],
};

const FR = post("fr", "4804", ROW.expect_fr);
const AR = post("ar", "4809", ROW.expect_ar);

test("pair table: a row pairs two posts the gap rule cannot reach", () => {
  // twenty-one ids from the French post, so pairTwinPosts never sees this
  // Arabic post as a candidate for it at all
  const far = post("ar", "4825", "المؤسسة الإستشفائية سكيكدة");
  const paired = pairPosts([FR], [AR, far], WIL, { table: [ROW] });
  assert.deepEqual(
    paired.map(({ fr, ar }) => `${fr ? fr.msp_id : "-"}/${ar ? ar.msp_id : "-"}`).sort(),
    ["-/4825", "4804/4809"],
  );
});

test("pair table: the row is reported as its own kind of decision, with its reading", () => {
  const verdicts = [];
  pairPosts([FR], [AR], WIL, { verdicts, table: [ROW] });
  const [verdict] = verdicts;
  assert.equal(verdict.paired, true);
  assert.equal(verdict.decided_by, "pair_table");
  assert.equal(verdict.second_source, "both");
  assert.equal(verdict.reason, "second_source_names_both");
  assert.equal(verdict.msp_gap, 5);
  assert.equal(verdict.establishment, ROW.establishment);
  assert.equal(verdict.translation, ROW.translation);
  assert.deepEqual(verdict.evidence, ROW.evidence);
  // and a French-half-only row says so, rather than publishing the stronger claim
  const frOnly = { ...ROW, second_source: "fr_only", only_candidate_left: "the one left in 21/eph" };
  const own = [];
  pairPosts([FR], [AR], WIL, { verdicts: own, table: [frOnly] });
  assert.equal(own[0].second_source, "fr_only");
  assert.equal(own[0].reason, "second_source_names_the_french_half");
  assert.equal(own[0].only_candidate_left, frOnly.only_candidate_left);
});

test("pair table: a row never loses either half to a weaker automatic match", () => {
  // the Arabic half of the OTHER Skikda hospital names the same city, so the
  // locality-similarity step would claim the French post first if the table did
  // not run before it
  const rival = post("ar", "4825", "المؤسسة الإستشفائية سكيكدة");
  const paired = pairPosts([FR], [rival, AR], WIL, { table: [ROW] });
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
        `${row.msp_fr}/${row.msp_ar} cites the registry or Google, which is never a second source`,
      );
      assert.match(e.checked_at, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(e.note, `${row.msp_fr}/${row.msp_ar} evidence has no reading`);
    }
    // the two halves are one French post and one Arabic post: a second entry in
    // the language a post already has is a Repeat post, which mergeRepeatPosts
    // handles and this table never does
    assert.ok(row.msp_fr && row.msp_ar, `${row.establishment} does not name both halves`);
    assert.notEqual(row.msp_fr, row.msp_ar);
    assert.ok(row.expect_fr && row.expect_ar, `${row.establishment} records no registry title to check against`);
  }
});

// The check that stops a row claiming more than its sources say. It is what
// would have caught the EHU of Oran citing the CHU's Wikidata item as if that
// item named the EHU in both scripts.
test("pair table: a row's evidence level matches the evidence it actually holds", () => {
  for (const row of TWIN_PAIR_TABLE) {
    const where = `${row.establishment} (${row.msp_fr}/${row.msp_ar})`;
    assert.ok(
      row.second_source === "both" || row.second_source === "fr_only",
      `${where} declares no evidence level`,
    );
    // every level rests on the titles being exact translations, so every row says so
    assert.ok(row.translation, `${where} records no translation reading`);
    const bothScripts = row.evidence.filter((e) => e.names_both_scripts === true);
    for (const e of row.evidence)
      assert.equal(
        typeof e.names_both_scripts,
        "boolean",
        `${where} evidence ${e.url} does not say whether it names both scripts`,
      );
    if (row.second_source === "both") {
      assert.ok(
        bothScripts.length > 0,
        `${where} claims a both-scripts source but no evidence entry names both scripts`,
      );
      assert.equal(
        row.only_candidate_left,
        undefined,
        `${where} states a both-scripts source, so it must not also lean on being the one candidate left`,
      );
    } else {
      assert.equal(
        bothScripts.length,
        0,
        `${where} is a French-half-only pair, so no evidence entry may claim both scripts`,
      );
      assert.ok(
        row.only_candidate_left,
        `${where} rests on the French half alone and records no one-candidate-left reading`,
      );
      // and that reading has to be true of the shipped data: a group that still
      // holds a Half-record had more than one candidate in it
      const open = report.half_record_candidates.filter(
        (c) => c.wilaya_code === row.wilaya_code && c.type === row.type,
      );
      assert.deepEqual(
        open,
        [],
        `${where} claims to be the one candidate left, but ${row.wilaya_code}/${row.type} still holds ${open.length}`,
      );
    }
  }
  // the counts the report publishes are the counts the table holds
  const level = (v) => TWIN_PAIR_TABLE.filter((r) => r.second_source === v).length;
  assert.equal(report.pair_table_second_source_both, level("both"));
  assert.equal(report.pair_table_second_source_fr_only, level("fr_only"));
  assert.ok(level("fr_only") > 0, "the fr_only branch has to be exercised by a real row");
  assert.ok(level("both") > 0, "the both branch has to be exercised by a real row");
});

test("pair table: no post is claimed by two rows", () => {
  const owner = new Map();
  for (const row of TWIN_PAIR_TABLE)
    for (const msp of [row.msp_fr, row.msp_ar]) {
      assert.equal(owner.has(msp), false, `post ${msp} is on two rows (${owner.get(msp)})`);
      owner.set(msp, `${row.msp_fr}/${row.msp_ar}`);
    }
});

test("pair table: every row shipped as one bilingual record with the absorbed id retired", () => {
  const byId = new Map(records.map((r) => [r.id, r]));
  const retiredIds = new Set(retired.ids);
  const byPosts = new Map(report.pairs.map((p) => [`${p.msp_fr}/${p.msp_ar}`, p]));
  for (const row of TWIN_PAIR_TABLE) {
    const key = `${row.msp_fr}/${row.msp_ar}`;
    const pair = byPosts.get(key);
    assert.ok(pair, `${key} (${row.establishment}) is not in the twin report`);
    assert.equal(pair.decided_by, "pair_table");
    assert.equal(pair.second_source, row.second_source, `${key} publishes the wrong evidence level`);
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
    // the ledger has to state the level too, so a reader of a retired id is not
    // told the pair rests on more than it does
    const says = row.second_source === "both" ? /names this establishment in both scripts/ : /confirms the FRENCH half only/;
    assert.match(migration.note, says, `${pair.absorbed_id}'s note misstates what the evidence covers`);
  }
});

// The national measurement the table was asked for: every FR/AR candidate
// pairing the shipped data still holds. It is what makes "no Twin post is left
// unpaired unnoticed" a fact this build re-establishes rather than a claim made
// once in a ticket, so it has to agree with the data and with the refusals
// recorded beside it.
test("pair table: the measurement lists every candidate still open and nothing it merged", () => {
  const candidates = report.half_record_candidates;
  assert.ok(candidates.length > 0, "the measurement has to be published, even when it is not empty");
  const byPosts = new Set(candidates.map((c) => `${c.msp_fr}/${c.msp_ar}`));
  // a pair this release merged is no longer a candidate
  for (const row of TWIN_PAIR_TABLE)
    assert.equal(
      byPosts.has(`${row.msp_fr}/${row.msp_ar}`),
      false,
      `${row.msp_fr}/${row.msp_ar} was merged and is still listed as open`,
    );
  // and every case the table refused IS one, so the refusal can be checked
  for (const row of UNPAIRED_CANDIDATES)
    assert.ok(
      byPosts.has(`${row.msp_fr}/${row.msp_ar}`),
      `${row.msp_fr}/${row.msp_ar} is recorded as left unpaired but is not an open candidate`,
    );
  // the measurement is derived, so it has to match the records it is derived from
  const halves = new Set(records.filter((r) => !(r.name_fr && r.name_ar)).map((r) => r.id));
  for (const c of candidates) {
    assert.ok(halves.has(c.id_fr), `${c.id_fr} is listed as a French Half-record but is not one`);
    assert.ok(halves.has(c.id_ar), `${c.id_ar} is listed as an Arabic Half-record but is not one`);
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
