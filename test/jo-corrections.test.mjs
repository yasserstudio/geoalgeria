import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { loadBoundaries, pointInWilaya } from "../packages/schema/index.js";
import {
  communeDairaCorrections,
  communeNameCorrections,
  coordinateCorrections,
  wilayaNameCorrections,
} from "../scripts/lib/jo-2026-corrections.mjs";

const dataRoot = join(import.meta.dirname, "../packages/dataset/data");
const read = (...parts) => JSON.parse(readFileSync(join(dataRoot, ...parts), "utf8"));
const communes = [
  "communes_w1_w23.json",
  "communes_w24_w48.json",
  "communes_w49_w69.json",
].flatMap((file) => read(file));
const byCode = new Map(communes.map((commune) => [commune.code_commune, commune]));
const history = read("name-history.json");

test("every flagship carrier agrees with the JORA correction table", () => {
  assert.doesNotThrow(() =>
    execFileSync(process.execPath, [join(import.meta.dirname, "../scripts/fix-jo-corrections.mjs"), "--check"], {
      stdio: "pipe",
    }),
  );
});

test("each corrected name is the one the Official Journal prints", () => {
  for (const correction of communeNameCorrections) {
    const commune = byCode.get(correction.code_commune);
    assert.ok(commune, `commune ${correction.code_commune} is missing`);
    assert.equal(commune[correction.field], correction.to, `${correction.code_commune} ${correction.field}`);
    assert.match(correction.source, /^JORA n° \d+ \(\d{4}\), law [\w -]+ art\. [\w ]+, item \d+, p\. \d+$/);
  }
  const wilayas = read("wilayas.json").wilayas;
  for (const correction of wilayaNameCorrections) {
    const wilaya = wilayas.find((row) => row.code === correction.code);
    assert.equal(wilaya?.[correction.field], correction.to, `wilaya ${correction.code}`);
  }
});

test("every former spelling still reaches its record", () => {
  const geoalgeria = createRequire(import.meta.url)("../packages/dataset/index.js");
  for (const entry of history.communes) {
    assert.ok(entry.sources.length > 0, `${entry.code_commune} has no source`);
    for (const former of [...entry.former_names_fr, ...entry.former_names_ar]) {
      const hits = geoalgeria.findCommune(former);
      assert.ok(
        hits.some((commune) => commune.code_commune === entry.code_commune),
        `${former} no longer finds ${entry.code_commune}`,
      );
    }
  }
});

test("no commune coordinate duplicates another", () => {
  const points = communes.map((commune) => `${commune.latitude},${commune.longitude}`);
  assert.equal(new Set(points).size, communes.length);
});

test("each repaired point lies inside its own wilaya", () => {
  const boundaries = loadBoundaries(read("geojson", "wilaya-boundaries.geojson"));
  for (const correction of coordinateCorrections) {
    const commune = byCode.get(correction.code_commune);
    assert.deepEqual([commune.latitude, commune.longitude], correction.to, correction.label);
    assert.equal(
      pointInWilaya(
        commune.longitude,
        commune.latitude,
        String(correction.wilaya_code).padStart(2, "0"),
        boundaries,
      ),
      true,
      `${correction.label} is outside wilaya ${correction.wilaya_code}`,
    );
  }
});

test("the atlas GeoJSON names the wilaya its point belongs to", () => {
  const atlas = JSON.parse(
    readFileSync(join(import.meta.dirname, "../packages/dataset/algeria.geojson"), "utf8"),
  );
  const wilayas = new Map(read("algeria.json").map((wilaya) => [wilaya.code, wilaya]));
  assert.equal(atlas.features.length, 69);
  for (const feature of atlas.features) {
    const wilaya = wilayas.get(feature.properties.code);
    assert.ok(wilaya, `unknown wilaya ${feature.properties.code}`);
    assert.equal(feature.properties.name, `${wilaya.name_fr} — ${wilaya.name_ar}`);
  }
});

test("the delivery tables name the wilaya each code belongs to", () => {
  const wilayas = new Map(read("wilayas.json").wilayas.map((row) => [row.code, row.name_fr]));
  for (const provider of ["yalidine", "zr_express", "maystro"]) {
    const doc = read("delivery", `${provider}.json`);
    for (const zone of doc.zones) {
      assert.equal(zone.wilaya_name_fr, wilayas.get(zone.wilaya_code), `${provider} ${zone.wilaya_code}`);
    }
  }
});

test("a moved commune sits in its new daira and both counts follow", () => {
  const dairas = read("dairas.json");
  for (const move of communeDairaCorrections) {
    assert.equal(byCode.get(move.code_commune)?.daira, move.to, `${move.code_commune} daira`);
    for (const name of [move.from, move.to]) {
      const daira = dairas.find((row) => row.wilaya_code === move.wilaya_code && row.name_fr === name);
      const members = communes.filter((c) => c.wilaya_code === move.wilaya_code && c.daira === name);
      assert.equal(daira?.commune_count, members.length, `${name} commune_count`);
    }
  }
});

test("every published variant a correction replaces is kept as a former name", () => {
  const formerOf = (entries, key, code) =>
    entries.find((entry) => entry[key] === code)?.former_names_fr ?? [];
  for (const correction of communeNameCorrections.filter((c) => c.variants)) {
    for (const variant of correction.variants) {
      assert.ok(
        formerOf(history.communes, "code_commune", correction.code_commune).includes(variant),
        `${correction.code_commune} lacks former name ${variant}`,
      );
    }
  }
  for (const correction of wilayaNameCorrections.filter((c) => c.variants)) {
    for (const variant of correction.variants) {
      assert.ok(
        formerOf(history.wilayas, "code", correction.code).includes(variant),
        `wilaya ${correction.code} lacks former name ${variant}`,
      );
    }
  }
});
