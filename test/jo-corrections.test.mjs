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
import { supersededCommunePoints } from "../scripts/lib/commune-corrections.mjs";

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

// A commune-centre ledger can supersede one of the JORA coordinate repairs, and then the
// published point is the ledger's value rather than the repair's. El Euch (3427) is the
// first case: the repair took it off a placeholder onto its relation's centroid, and the
// coordinate review of 2026-10-01 then moved it onto its own admin_centre node on three
// independent Votes. Both values are accepted, nothing else is, and the containment claim
// below is made about whichever one is published.
const supersededBy = supersededCommunePoints();

test("each repaired point lies inside its own wilaya", () => {
  const boundaries = loadBoundaries(read("geojson", "wilaya-boundaries.geojson"));
  for (const correction of coordinateCorrections) {
    const commune = byCode.get(correction.code_commune);
    const allowed = [correction.to, supersededBy.get(correction.code_commune)].filter(Boolean);
    assert.ok(
      allowed.some(([lat, lng]) => commune.latitude === lat && commune.longitude === lng),
      `${correction.label}: published [${commune.latitude}, ${commune.longitude}] is neither the JORA repair nor a later ledger's value`,
    );
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
    assert.equal(feature.properties.name, wilaya.name_fr);
    assert.equal(feature.properties.name_fr, wilaya.name_fr);
    assert.equal(feature.properties.name_ar, wilaya.name_ar);
    assert.ok(feature.properties.name_en, `wilaya ${wilaya.code} has no English name`);
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
      // A move that leaves its old daira with no commune removes that row rather
      // than writing commune_count 0, which the schema rejects anyway: El Alia
      // (5513) was the only commune filed under an "Ouargla" daira of wilaya 55,
      // and wilaya 55 has no such daira. So an absent row is correct exactly when
      // no commune claims the name, and a present one still has to count.
      if (!members.length) {
        assert.equal(daira, undefined, `${name} still has a row in wilaya ${move.wilaya_code} with no commune`);
        continue;
      }
      assert.equal(daira?.commune_count, members.length, `${name} commune_count`);
    }
  }
});

test("every extra Former name a correction replaces stays in the name history", () => {
  const formerOf = (entries, key, code) =>
    entries.find((entry) => entry[key] === code)?.former_names_fr ?? [];
  for (const correction of communeNameCorrections.filter((c) => c.former_names)) {
    for (const name of correction.former_names) {
      assert.ok(
        formerOf(history.communes, "code_commune", correction.code_commune).includes(name),
        `${correction.code_commune} lacks former name ${name}`,
      );
    }
  }
  for (const correction of wilayaNameCorrections.filter((c) => c.former_names)) {
    for (const name of correction.former_names) {
      assert.ok(
        formerOf(history.wilayas, "code", correction.code).includes(name),
        `wilaya ${correction.code} lacks former name ${name}`,
      );
    }
  }
});
