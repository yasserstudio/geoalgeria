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
import {
  estTokens,
  facilityTokens,
  matchCommune,
  overlapCount,
  pairPosts,
  specialtyCode,
} from "../packages/sante/scripts/fetch.mjs";

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

// The second judgment in the generator: which OpenStreetMap or Wikidata facility
// is the establishment, so its commune centroid can be upgraded to a real point.
//
// The bug class: a shared word that every health facility carries is not evidence
// of identity, and a wrong stamp does not fail the schema. It moves a hospital to
// another building, and because @geoalgeria/cliniques must not republish an OSM
// element sante ships, it also evicts a published cliniques record and retires a
// public id for a place that still exists. The element way/1171998839 is
// amenity=clinic "Polyclinique Hai El Badr"; the record is the EHS cardiac-surgery
// Clinique Abderrahmani. Their only shared token was عيادة, "clinic".
test("facility matching: a shared facility-class word is not name evidence", () => {
  const com = { name_fr: "Bachedjerah", name_ar: "باش جراح", wilaya_code: "16", code_commune: 1619 };
  const wil = { byCode: new Map([["16", { name_fr: "Alger", name_ar: "الجزائر" }]]) };
  const est = { name_fr: null, name_ar: "المؤسسة الإستشفائية المتخصصة في جراحة القلب عيادة عبد الرحماني محمد" };
  const et = estTokens(est, com, wil);
  // the polyclinic that must NOT be stamped: shares only the word "clinic"
  assert.equal(overlapCount(et, facilityTokens("عيادة متعددة الخدمات حي البدر", com, wil)), 0);
  assert.equal(overlapCount(et, facilityTokens("Polyclinique Hai El Badr", com, wil)), 0);
  // the facility that names the clinic still matches
  assert.ok(overlapCount(et, facilityTokens("عيادة عبد الرحماني محمد", com, wil)) >= 1);
  // and so does a French record against a French facility name
  const etFr = estTokens(
    { name_fr: "Etablissement Hospitalier Spécialisé Chirurgie Cardiaque Clinique Mohamed Abderrahmani", name_ar: null },
    com,
    wil,
  );
  assert.equal(overlapCount(etFr, facilityTokens("Polyclinique Hai El Badr", com, wil)), 0);
  assert.ok(overlapCount(etFr, facilityTokens("Clinique Abderrahmani", com, wil)) >= 1);
});

test("facility matching: the class vocabulary is dropped in both languages", () => {
  const com = { name_fr: "Kouba", name_ar: "القبة", wilaya_code: "16", code_commune: 1620 };
  const wil = { byCode: new Map([["16", { name_fr: "Alger", name_ar: "الجزائر" }]]) };
  for (const generic of [
    "Polyclinique", "Clinique", "Hopital", "Centre de sante", "Salle de soins",
    "EPSP", "EPH", "EHS", "CHU", "Dispensaire",
    "عيادة", "مستشفى", "مركز صحي", "قاعة علاج", "المؤسسة العمومية للصحة الجوارية",
  ]) {
    assert.deepEqual(facilityTokens(generic, com, wil), [], `${generic} should leave no token`);
  }
  // a specialty is not class vocabulary: it discriminates and is kept, even when
  // the only word left is itself a facility class ("maternité" implies gynaeco)
  assert.ok(facilityTokens("Hôpital psychiatrique", com, wil).includes("spec_psy"));
  assert.deepEqual(facilityTokens("Maternite", com, wil), ["spec_gyneco"]);
});

// The lone-establishment/lone-facility fallback stamps a facility with no shared
// name token at all, because in a commune with exactly one of each the commune is
// the evidence. That holds only while the two names say nothing against each
// other. Reaching the fallback means the 1:1 loop found no specific token in
// common, so when BOTH names still carry specific tokens they are evidence
// AGAINST one place, and the fallback must decline. The case that forced this:
// the Setif anti-cancer centre was stamped on the city's tuberculosis and
// respiratory-disease service, a lone pair in the commune.
test("facility matching: a lone pair whose names contradict each other is refused", () => {
  const com = { name_fr: "Setif", name_ar: "سطيف", wilaya_code: "19", code_commune: 1901 };
  const wil = { byCode: new Map([["19", { name_fr: "Setif", name_ar: "سطيف" }]]) };
  const et = estTokens(
    { name_fr: "Etablissement Hospitalier Spécialisé Centre Anti Concereux Setif", name_ar: null },
    com,
    wil,
  );
  const ft = facilityTokens(
    "Service de Contrôle de la Tuberculose et des Maladies Respiratoires;مصلحة مكافحة السل والأمراض التنفسية",
    com,
    wil,
  );
  // both sides name something specific
  assert.ok(et.length > 0, "the anti-cancer centre keeps a specific token");
  assert.ok(ft.length > 0, "the tuberculosis service keeps a specific token");
  // and none of it agrees: the fallback's refusal condition
  assert.equal(overlapCount(et, ft), 0);
  // the words that make a facility a service for a class of disease are class
  // vocabulary in both languages, so they cannot be what a match rests on
  for (const generic of [
    "Service", "Controle", "Maladies", "Prevention", "Depistage",
    "مصلحة", "مكافحة", "الأمراض",
  ]) {
    assert.deepEqual(facilityTokens(generic, com, wil), [], `${generic} should leave no token`);
  }
});

// التنفسيه, respiratory, literally contains نفسيه, mental, so a psy pattern tested
// first reads every Arabic chest facility as psychiatric. It did: the Setif
// tuberculosis service carried spec_psy, a wrong specialty signal that the pairing
// and the facility matcher both read as evidence.
test("specialtyCode: an Arabic chest facility is pneumo, not psy", () => {
  assert.equal(specialtyCode("مصلحة مكافحة السل والأمراض التنفسية", "ar"), "pneumo");
  assert.equal(specialtyCode("المؤسسة الاستشفائية المتخصصة في الامراض الصدرية", "ar"), "pneumo");
  // and a genuinely psychiatric name still reads psy
  assert.equal(specialtyCode("المؤسسة الاستشفائية المتخصصة في الامراض العقلية", "ar"), "psy");
  assert.equal(specialtyCode("مستشفى الصحة النفسية", "ar"), "psy");
  assert.equal(specialtyCode("Etablissement Hospitalier Spécialisé en Psychiatrie", "fr"), "psy");
});
