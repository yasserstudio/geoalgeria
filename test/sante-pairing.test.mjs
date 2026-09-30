// Guards the @geoalgeria/sante FR/AR post pairing, the one judgment in that
// generator: the Ministry of Health publishes each establishment twice, once per
// language, and the pairing decides which two posts are one facility.
//
// The bug class this exists for: a wrong pair does not fail the schema, it
// silently deletes an establishment. Two posts are paired on a shared commune,
// and a commune reached through the weakest match tier is a fragment of a
// multi-word commune name, which a person-named establishment hits by
// coincidence. "EHS Chirurgie Cardiaque Clinique Mohamed Abderrahmani" lands in
// the commune Mohamed Belouzdad on the given name alone, and the Algiers
// cardiology hospital that also lands there on a given name would then be folded
// into it as its Arabic half: one public record gone, and the surviving record
// bilingual in two different facilities. So the pairing must refuse a commune
// that only two such fragments agree on, while still pairing when at least one
// side names its commune outright.

import { test } from "node:test";
import assert from "node:assert/strict";
import { matchCommune, pairPosts } from "../packages/sante/scripts/fetch.mjs";

// The two wilayas the real regression came from: Alger (the wrong pair) and
// Naama (the right pair that must survive the guard).
const WILAYAS = {
  byCode: new Map([
    ["16", { code: "16", name_fr: "Alger", name_ar: "الجزائر" }],
    ["45", { code: "45", name_fr: "Naama", name_ar: "النعامة" }],
  ]),
};

const commune = (code, name_fr) => ({ code_commune: code, name_fr });
const post = (lang, msp, locality, c, communeHow, extra = {}) => ({
  lang,
  msp_id: msp,
  locality,
  specialty: null,
  wilayaCode: "16",
  type: "ehs",
  commune: c,
  communeHow,
  ...extra,
});
const pairKeys = (fr, ar, wil = WILAYAS) =>
  pairPosts(fr, ar, wil).map(({ fr: f, ar: a }) => `${f ? f.msp_id : "-"}/${a ? a.msp_id : "-"}`).sort();

test("pairPosts: two token_partial communes are not evidence of one facility", () => {
  const belouzdad = commune("1604", "Mohamed Belouzdad");
  const fr = [post("fr", "4660", "CHIRURGIE CARDIAQUE CLINIQUE MOHAMED ABDERRAHMANI", belouzdad, "token_partial")];
  const ar = [post("ar", "4669", "مستشفي امراض القلب الدكتور معوش محمد امقران", belouzdad, "token_partial")];
  assert.deepEqual(pairKeys(fr, ar), ["-/4669", "4660/-"]);
});

test("pairPosts: a token_partial commune still pairs when the other side names it", () => {
  const makmen = commune("4510", "Makmen Ben Amar");
  const wil = { byCode: new Map([["45", WILAYAS.byCode.get("45")]]) };
  const fr = [post("fr", "5421", "MEKMEN BENAMER", makmen, "token_partial", { wilayaCode: "45", type: "epsp" })];
  const ar = [post("ar", "5406", "مكمن بن عمار", makmen, "exact", { wilayaCode: "45", type: "epsp" })];
  assert.deepEqual(pairKeys(fr, ar, wil), ["5421/5406"]);
});

test("pairPosts: an exact shared commune pairs as before", () => {
  const kouba = commune("1620", "Kouba");
  const fr = [post("fr", "1", "KOUBA LES ANNASSER", kouba, "substr")];
  const ar = [post("ar", "2", "القبه العناصر", kouba, "exact")];
  assert.deepEqual(pairKeys(fr, ar), ["1/2"]);
});

test("matchCommune: the token tier reports how much of the commune name it matched", () => {
  const byWilaya = new Map([
    [
      "16",
      [
        // as loadCommunes() indexes them: norm() uppercases, squash() drops spaces
        { c: commune("1604", "Mohamed Belouzdad"), fr: "MOHAMED BELOUZDAD", frsq: "MOHAMEDBELOUZDAD", ar: "", arsq: "" },
      ],
    ],
    [
      "45",
      [{ c: commune("4502", "Negrine"), fr: "NEGRINE", frsq: "NEGRINE", ar: "", arsq: "" }],
    ],
  ]);
  // only the given name matched → the record is placed, but the match is weak
  assert.deepEqual(matchCommune("CLINIQUE MOHAMED ABDERRAHMANI", "fr", "16", byWilaya), {
    c: byWilaya.get("16")[0].c,
    how: "token_partial",
  });
  // the whole commune name is in the locality, one edit apart → a full match
  assert.deepEqual(matchCommune("NEGRIN CENTRE", "fr", "45", byWilaya), {
    c: byWilaya.get("45")[0].c,
    how: "token",
  });
  assert.equal(matchCommune("SIDI AISSA", "fr", "45", byWilaya), null);
});
