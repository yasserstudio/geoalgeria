import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  ANNEXED_WILAYAS,
  CITATION,
  DAIRA_MEMBERS_BEFORE,
  DAIRA_RENAMES,
  DAIRA_RESEATS,
  DAIRA_ROWS_ADDED,
  DAIRA_ROWS_RETIRED,
  idTravel,
  membershipFromExtract,
  readExtract,
} from "../scripts/lib/decree-26-253.mjs";

const dataRoot = join(import.meta.dirname, "../packages/dataset/data");
const read = (...parts) => JSON.parse(readFileSync(join(dataRoot, ...parts), "utf8"));
const communes = [
  "communes_w1_w23.json",
  "communes_w24_w48.json",
  "communes_w49_w69.json",
].flatMap((file) => read(file));
const dairas = read("dairas.json");
const wilayasDoc = read("wilayas.json");
const extract = readExtract();
const annexed = new Set(ANNEXED_WILAYAS);
const { seatOf, seats, members } = membershipFromExtract(extract, communes, dairas);

test("the extract is the annex: 21 tabulated wilayas covering 1 to 69 with the notes", () => {
  assert.deepEqual(
    extract.wilayas.map((wilaya) => wilaya.wilaya_code),
    ANNEXED_WILAYAS,
  );
  const covered = [
    ...extract.wilayas.map((wilaya) => wilaya.wilaya_code),
    ...extract.unchanged.flatMap((entry) => entry.wilaya_codes),
  ].sort((a, b) => a - b);
  assert.deepEqual(covered, Array.from({ length: 69 }, (_, index) => index + 1));
  for (const entry of extract.unchanged) {
    assert.match(entry.note, /sans changement/);
  }
  assert.equal(extract.source.date, "2026-07-21");
  assert.equal(extract.wilayas.flatMap((wilaya) => wilaya.dairas).length, 142);
});

test("every annexed wilaya's daira list is the one the annex prints", () => {
  for (const wilaya of extract.wilayas) {
    const rows = dairas.filter((row) => row.wilaya_code === wilaya.wilaya_code);
    assert.deepEqual(
      rows.map((row) => row.name_fr).sort(),
      [...(seats.get(wilaya.wilaya_code) ?? [])].sort(),
      `wilaya ${wilaya.wilaya_code} seats`,
    );
    for (const row of rows) {
      const held = communes.filter(
        (commune) => commune.wilaya_code === wilaya.wilaya_code && commune.daira === row.name_fr,
      );
      assert.equal(held.length, row.commune_count, `${row.name_fr} commune_count`);
    }
    // Seat by seat, the members are the ones printed under it, in any order.
    for (const seat of seats.get(wilaya.wilaya_code) ?? []) {
      const printed = [...(members.get(`${wilaya.wilaya_code}|${seat}`) ?? [])].sort((a, b) => a - b);
      const held = communes
        .filter((commune) => commune.wilaya_code === wilaya.wilaya_code && commune.daira === seat)
        .map((commune) => commune.code_commune)
        .sort((a, b) => a - b);
      assert.deepEqual(held, printed, `wilaya ${wilaya.wilaya_code} daira ${seat}`);
    }
  }
});

test("no wilaya outside the annex is touched by it", () => {
  for (const commune of communes) {
    if (annexed.has(commune.wilaya_code)) continue;
    assert.equal(seatOf.has(commune.code_commune), false, `commune ${commune.code_commune}`);
  }
});

test("daira ids are stable: renamed rows keep them, dropped ones are reserved", () => {
  const byId = new Map(dairas.map((row) => [row.id, row]));
  for (const { wilaya_code, from, to } of DAIRA_RENAMES) {
    assert.equal(
      dairas.some((row) => row.wilaya_code === wilaya_code && row.name_fr === from),
      false,
      `wilaya ${wilaya_code} still has "${from}"`,
    );
    assert.ok(
      dairas.some((row) => row.wilaya_code === wilaya_code && row.name_fr === to),
      `wilaya ${wilaya_code} has no "${to}"`,
    );
  }
  for (const row of DAIRA_ROWS_ADDED) {
    assert.deepEqual(
      { wilaya_code: byId.get(row.id)?.wilaya_code, name_fr: byId.get(row.id)?.name_fr },
      { wilaya_code: row.wilaya_code, name_fr: row.name_fr },
      `daira id ${row.id}`,
    );
  }
  const ledger = read("retired-ids.json");
  for (const row of DAIRA_ROWS_RETIRED) {
    assert.equal(byId.has(row.id), false, `retired daira id ${row.id} is live`);
    assert.ok(ledger.ids.includes(String(row.id)), `id ${row.id} is not in the ledger`);
    assert.ok(ledger.reasons[String(row.id)], `id ${row.id} has no reason`);
  }
  assert.deepEqual(ledger.ids, [...ledger.ids].sort());
  for (const id of ledger.ids) assert.equal(byId.has(Number(id)), false, `retired id ${id} is live`);
});

test("a reseated daira keeps its id: 549 is Ouled Antar, not a retirement", () => {
  const byId = new Map(dairas.map((row) => [row.id, row]));
  const ledger = read("retired-ids.json");
  // The four the review named, so the reading is pinned and not merely consistent.
  assert.deepEqual(
    DAIRA_RESEATS.map((row) => row.id).sort((a, b) => a - b),
    [525, 537, 541, 549],
  );
  for (const { wilaya_code, id, from, to } of DAIRA_RESEATS) {
    const before = DAIRA_MEMBERS_BEFORE[`${wilaya_code}|${from}`];
    assert.ok(before, `"${from}" has no recorded 91-306 membership`);
    assert.equal(before.id, id, `"${from}" is id ${before.id}`);
    assert.deepEqual(
      { wilaya_code: byId.get(id)?.wilaya_code, name_fr: byId.get(id)?.name_fr },
      { wilaya_code, name_fr: to },
      `daira id ${id}`,
    );
    assert.equal(ledger.ids.includes(String(id)), false, `reseated id ${id} is in the retired ledger`);
    const now = members.get(`${wilaya_code}|${to}`) ?? [];
    const kept = before.communes.filter((code) => now.includes(code));
    assert.ok(
      kept.length * 2 > now.length,
      `"${to}" holds ${kept.length} of its ${now.length} communes from "${from}", not a majority`,
    );
  }
  assert.equal(byId.get(549)?.name_fr, "Ouled Antar");
  assert.deepEqual(
    [...(members.get("67|Ouled Antar") ?? [])].sort((a, b) => a - b),
    DAIRA_MEMBERS_BEFORE["67|Boghar"].communes,
    "the annex gives Ouled Antar exactly the communes Boghar held",
  );
});

test("the reseats, mints and retirements are the ones the inheritance rule derives", () => {
  const travel = idTravel(members, [
    ...DAIRA_ROWS_ADDED.map(({ wilaya_code, name_fr }) => ({ wilaya_code, name_fr })),
    ...DAIRA_RESEATS.map(({ wilaya_code, to }) => ({ wilaya_code, name_fr: to })),
  ]);
  assert.deepEqual(
    [...travel.inherits].map(([key, id]) => `${key}=${id}`).sort(),
    DAIRA_RESEATS.map((row) => `${row.wilaya_code}|${row.to}=${row.id}`).sort(),
  );
  assert.deepEqual(
    [...travel.mints].sort(),
    DAIRA_ROWS_ADDED.map((row) => `${row.wilaya_code}|${row.name_fr}`).sort(),
  );
  assert.deepEqual(
    [...travel.retiredIds].sort((a, b) => a - b),
    DAIRA_ROWS_RETIRED.map((row) => row.id).sort((a, b) => a - b),
  );
  // Every unseated daira is accounted for once, as a reseat or as a retirement.
  assert.equal(
    Object.keys(DAIRA_MEMBERS_BEFORE).length,
    DAIRA_RESEATS.length + DAIRA_ROWS_RETIRED.length,
  );
});

test("a minted id is a new grouping, and no retired id's commune set reappears under one", () => {
  const live = new Map(); // "wilaya|daira" -> code_commune[]
  for (const commune of communes) {
    const key = `${commune.wilaya_code}|${commune.daira}`;
    if (!live.has(key)) live.set(key, []);
    live.get(key).push(commune.code_commune);
  }
  const byId = new Map(dairas.map((row) => [row.id, row]));
  for (const row of DAIRA_ROWS_ADDED) {
    const set = members.get(`${row.wilaya_code}|${row.name_fr}`) ?? [];
    assert.ok(set.length, `minted daira ${row.id} has no communes`);
    for (const [key, before] of Object.entries(DAIRA_MEMBERS_BEFORE)) {
      if (Number(key.split("|")[0]) !== row.wilaya_code) continue;
      const kept = before.communes.filter((code) => set.includes(code));
      assert.ok(
        kept.length * 2 <= set.length,
        `minted ${row.id} "${row.name_fr}" takes ${kept.length} of ${set.length} communes from "${key}", so it should inherit id ${before.id}`,
      );
    }
  }
  for (const row of DAIRA_ROWS_RETIRED) {
    const before = DAIRA_MEMBERS_BEFORE[`${row.wilaya_code}|${row.name_fr}`].communes;
    for (const [key, held] of live) {
      if (Number(key.split("|")[0]) !== row.wilaya_code) continue;
      const seat = dairas.find(
        (daira) => daira.wilaya_code === row.wilaya_code && daira.name_fr === key.split("|")[1],
      );
      assert.notDeepEqual(
        [...held].sort((a, b) => a - b),
        [...before].sort((a, b) => a - b),
        `retired ${row.id} "${row.name_fr}" is live again as id ${seat?.id} "${key}"`,
      );
    }
  }
  assert.equal(byId.get(565)?.name_fr, "Oued Morra");
  assert.equal(byId.get(566)?.name_fr, "Faïdh El Botma");
  assert.equal(Math.max(...dairas.map((row) => row.id)), 566);
});

test("the stated total is the annex's 142 plus what the other 48 wilayas hold", () => {
  const fromDecree = dairas.filter((row) => annexed.has(row.wilaya_code)).length;
  const fromRepo = dairas.length - fromDecree;
  assert.equal(fromDecree, 142);
  assert.equal(fromRepo, 409);
  assert.equal(dairas.length, 551);
  assert.equal(wilayasDoc.metadata.total_dairas, dairas.length);
  const counted = new Map();
  for (const row of dairas) counted.set(row.wilaya_code, (counted.get(row.wilaya_code) ?? 0) + 1);
  for (const wilaya of wilayasDoc.wilayas) {
    assert.equal(wilaya.dairas_count, counted.get(wilaya.code) ?? 0, `wilaya ${wilaya.code}`);
    if (annexed.has(wilaya.code) && wilaya.code >= 59) {
      assert.equal(wilaya.dairas_source, CITATION, `wilaya ${wilaya.code} dairas_source`);
    }
  }
});

test("every carrier of the daira linkage agrees with the annex", () => {
  assert.doesNotThrow(() =>
    execFileSync(process.execPath, [join(import.meta.dirname, "../scripts/fix-dairas-26-253.mjs"), "--check"], {
      stdio: "pipe",
    }),
  );
});
