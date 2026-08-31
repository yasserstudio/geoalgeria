import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applyMobilisCoordFix,
  canonicalWilayaCodes,
} from "../packages/mobilis/scripts/fetch.mjs";

const canonical = JSON.parse(
  readFileSync(new URL("../packages/dataset/data/wilayas.json", import.meta.url), "utf8"),
).wilayas;

function currentMobilisWilayas() {
  const source = canonical.map((wilaya) => ({ id: wilaya.code, name: wilaya.name_ar }));
  const names = new Map([
    [11, "تمنغست"],
    [16, "الجزائر العاصمة"],
    [33, "ايليزي"],
    [37, "تيندوف"],
    [44, "عين الدفلة"],
    [46, "عين تيموشنت"],
    [48, "غيليزان"],
    [50, "برج باجي المختار"],
    [55, "تقرت"],
    [59, "أفلو"],
    [60, "الأبيض سيدي الشيخ"],
    [61, "العريشة"],
    [62, "القنطرة"],
    [63, "بريكة"],
    [64, "بوسعادة"],
    [65, "بئر العاتر"],
    [66, "قصر البخاري"],
    [67, "قصر الشلالة"],
    [68, "عين وسارة"],
    [69, "مسعد"],
  ]);
  for (const wilaya of source) wilaya.name = names.get(wilaya.id) ?? wilaya.name;
  return source;
}

test("Mobilis wilaya ids resolve through labels, not numeric coincidence", () => {
  const codes = canonicalWilayaCodes(currentMobilisWilayas());

  assert.equal(codes.get(59), "59");
  assert.equal(codes.get(60), "69");
  assert.equal(codes.get(63), "60");
  assert.equal(codes.get(69), "66");
  assert.equal(new Set(codes.values()).size, 69);
});

test("Mobilis wilaya joins fail closed on an unmatched label", () => {
  const source = currentMobilisWilayas();
  source[68] = { ...source[68], name: "ولاية غير معروفة" };

  assert.throws(() => canonicalWilayaCodes(source), /unmatched Mobilis wilaya 69/);
});

test("the known Constantine source outlier is demoted to its commune centroid", () => {
  const record = {
    code: "12346",
    wilaya_code: "66",
    commune_code: null,
    commune: null,
    lat: 34.125448,
    lng: 3.464264,
    geo_precision: "exact",
    geo_method: "mobilis",
  };
  const communes = [{
    code_commune: 2501,
    wilaya_code: 25,
    name_fr: "Constantine",
    latitude: 36.35,
    longitude: 6.6,
  }];

  assert.equal(applyMobilisCoordFix([record], communes), 1);
  assert.deepEqual(record, {
    code: "12346",
    wilaya_code: "25",
    commune_code: "2501",
    commune: "Constantine",
    lat: 36.35,
    lng: 6.6,
    geo_precision: "approximate",
    geo_method: "commune_centroid",
  });
});
