import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { loadBoundaries, pointInWilaya } from "../packages/schema/index.js";

const dataRoot = join(import.meta.dirname, "../packages/dataset/data");
const read = (...parts) => JSON.parse(readFileSync(join(dataRoot, ...parts), "utf8"));
const communes = [
  "communes_w1_w23.json",
  "communes_w24_w48.json",
  "communes_w49_w69.json",
].flatMap((file) => read(file));
const schools = JSON.parse(
  readFileSync(join(import.meta.dirname, "../packages/ecoles/data/ecoles.json"), "utf8"),
);

test("the Tabelbala parent repair is reproducible", () => {
  assert.doesNotThrow(() =>
    execFileSync(process.execPath, [join(import.meta.dirname, "../scripts/fix-tabelbala-parent.mjs"), "--check"], {
      stdio: "pipe",
    }),
  );
});

test("Tabelbala belongs to Béni Abbès in every flagship administrative carrier", () => {
  const matches = communes.filter((commune) => commune.name_fr === "Tabelbala");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].wilaya_code, 52);
  assert.equal(matches[0].code_commune, 5206);

  const unified = read("algeria.json");
  assert.equal(unified.find((wilaya) => wilaya.code === 8).communes.some((c) => c.name_fr === "Tabelbala"), false);
  assert.equal(unified.find((wilaya) => wilaya.code === 52).communes.some((c) => c.name_fr === "Tabelbala"), true);

  const daira = read("dairas.json").find((row) => row.id === 86);
  assert.deepEqual(
    { name_fr: daira?.name_fr, wilaya_code: daira?.wilaya_code, commune_count: daira?.commune_count },
    { name_fr: "Tabelbala", wilaya_code: 52, commune_count: 1 },
  );

  const wilayas = read("wilayas.json").wilayas;
  assert.deepEqual(
    wilayas.filter((wilaya) => wilaya.code === 8 || wilaya.code === 52).map((wilaya) => ({
      code: wilaya.code,
      communes: wilaya.communes_count,
      dairas: wilaya.dairas_count,
    })),
    [
      { code: 8, communes: 11, dairas: 6 },
      { code: 52, communes: 10, dairas: 6 },
    ],
  );
});

test("Tabelbala keeps stable public ids while its parent changes", () => {
  const ecommerce = read("ecommerce", "communes.json").find((row) => row.id === 230);
  assert.equal(ecommerce?.commune_name_fr, "Tabelbala");
  assert.equal(ecommerce?.wilaya_code, 52);
  assert.equal(ecommerce?.wilaya_name_fr, "Béni Abbès");

  const sql = readFileSync(join(dataRoot, "sql/full.sql"), "utf8");
  assert.match(sql, /^\s*\(230, 'Tabelbala', 'تبلبالة', 52,/m);
});

test("schools located in Tabelbala use its current commune and wilaya", () => {
  const rows = schools.filter((school) =>
    ["08-00001", "08-00008", "08-00083"].includes(school.id),
  );
  assert.equal(rows.length, 3);
  for (const school of rows) {
    assert.equal(school.wilaya_code, "52", school.id);
    assert.equal(school.commune_code, "5206", school.id);
    assert.equal(school.commune, "Tabelbala", school.id);
  }
});

test("Tabelbala's point is inside the Béni Abbès boundary", () => {
  const tabelbala = communes.find((commune) => commune.name_fr === "Tabelbala");
  const boundaries = loadBoundaries(read("geojson", "wilaya-boundaries.geojson"));
  assert.equal(pointInWilaya(tabelbala.longitude, tabelbala.latitude, "52", boundaries), true);
  assert.equal(pointInWilaya(tabelbala.longitude, tabelbala.latitude, "08", boundaries), false);
});
