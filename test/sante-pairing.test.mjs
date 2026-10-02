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

// --- the registry's twin posts ---------------------------------------------
// The Ministry publishes each establishment twice, once per language, usually
// under consecutive post ids, and 132 records shipped as one language only
// because neither the locality nor the commune could pair them. Adjacency alone
// cannot: only 42.9% of French posts have an Arabic post at id+1, so a candidate
// has to pass a name check too, and the check has to cross two scripts.

import {
  mspCarryKey,
  pairTwinPosts,
  resolveTwinPairs,
  twinNameCheck,
  twinNameKey,
  twinTokens,
} from "../packages/sante/scripts/fetch.mjs";

const twinPost = (lang, msp, title, locality, extra = {}) => ({
  lang,
  msp_id: msp,
  title,
  locality,
  specialty: null,
  wilayaCode: "02",
  type: "eph",
  commune: null,
  communeHow: null,
  ...extra,
});

test("twinNameKey: the two scripts agree on consonants, not on vowels", () => {
  // Arabic writes no vowels, so the transliteration of الشرفة is "chrfh" and the
  // French post says "Chorfa": two edits apart, which simTokens reads as two
  // different places. The consonant skeleton is what they actually share.
  assert.equal(twinNameKey("chorfa"), twinNameKey("chrfh"));
  // ة surfaces as a trailing h, and a doubled consonant is one sound
  assert.equal(twinNameKey("massika"), twinNameKey("msikh"));
  assert.equal(twinNameKey("messaad"), twinNameKey("msaad"));
  // ق romanizes as g, q or k (Guelma / قالمة), so the three fold together
  assert.equal(twinNameKey("guettara"), twinNameKey("ktarh"));
  assert.equal(twinNameKey("mguel"), "mkl");
  // a translation is not a transliteration: the registry's own adjectives
  assert.equal(twinNameKey("ancien"), twinNameKey("kdim"));
  assert.equal(twinNameKey("nouvel"), twinNameKey("jdid"));
  // and two names that are not the same name stay apart
  assert.notEqual(twinNameKey("kantara"), twinNameKey("jmourh"));
  // a specialty code is already language-independent
  assert.equal(twinNameKey("spec_oph"), "spec_oph");
});

test("twinTokens: the facility class is not name evidence, the specialty is", () => {
  const wset = new Set(["chlef"]);
  // every establishment in the registry carries its class, in both languages
  assert.deepEqual(twinTokens(twinPost("fr", "1", "EPH", "HOPITAL CHLEF"), wset), []);
  // the specialty is read from the title, not from post.specialty: the generator
  // only records one for an EHS, and the ophthalmology hospitals of Bechar and
  // Djelfa are filed as EPH. Their halves share nothing else — one writes the
  // Greek root, the other "medicine of the eyes".
  assert.ok(
    twinTokens(twinPost("fr", "1", "Etablissement hospitalier Ophtalm Djelfa", "OPHTALM DJELFA"), new Set(["djelfa"]))
      .includes("spec_oph"),
  );
  assert.ok(
    twinTokens(twinPost("ar", "2", "المؤسسة الإستشفائية لطب العيون الجلفة", "لطب العيون الجلفه"), new Set(["djelfa"]))
      .includes("spec_oph"),
  );
});

test("twinNameCheck: silence is not a contradiction, a second name is", () => {
  const wset = new Set(["tiaret"]);
  // "EPH Tiaret" and "المؤسسة العمومية الإستشفائية تيارت" say nothing beyond the
  // wilaya name: nothing agrees, and nothing disagrees either.
  const fr = twinPost("fr", "3753", "Etablissement Public Hospitalier Tiaret", "TIARET", { type: "eph" });
  const ar = twinPost("ar", "3754", "المؤسسة العمومية الإستشفائية تيارت", "تيارت", { type: "eph" });
  assert.deepEqual(twinNameCheck(fr, ar, wset).reason, "no_contradiction");
  // but when both sides name something and none of it agrees, the names are
  // evidence AGAINST one facility: El Kantara is not Djemorah.
  const kantara = twinPost("fr", "4458", "EPSP El Kantara", "EL KANTARA");
  const djemorah = twinPost("ar", "4457", "المؤسسة العمومية للصحة الجوارية جمورة", "جموره");
  assert.equal(twinNameCheck(kantara, djemorah, new Set(["biskra"])).ok, false);
});

test("pairTwinPosts: an adjacent post id alone never pairs", () => {
  const wil = { byCode: new Map([["02", { code: "02", name_fr: "Chlef", name_ar: "الشلف" }]]) };
  const fr = [twinPost("fr", "4458", "EPSP El Kantara", "EL KANTARA")];
  const ar = [twinPost("ar", "4457", "المؤسسة العمومية للصحة الجوارية جمورة", "جموره")];
  const [only] = pairTwinPosts(fr, ar, wil);
  assert.equal(only.verdict.paired, false);
  assert.equal(only.verdict.reason, "name_conflict");
  // and a post two ids away is not even a candidate
  assert.deepEqual(pairTwinPosts([twinPost("fr", "4460", "EPH Chorfa", "CHORFA")], ar, wil), []);
});

test("pairTwinPosts: the better name match wins and a tie is refused", () => {
  const wil = { byCode: new Map([["05", { code: "05", name_fr: "Batna", name_ar: "باتنة" }]]) };
  // Merouana has two hospitals, Ali Nemer and Ziza Massika, and post 3896 is
  // adjacent to both French posts. Only the one whose name it shares pairs.
  const fr = [
    twinPost("fr", "3895", "EPH (ALI NEMER) MEROUANA", "ALI NEMER MEROUANA", { wilayaCode: "05" }),
    twinPost("fr", "3897", "EPH MEROUANA (ZIZA MASSIKA)", "MEROUANA ZIZA MASSIKA", { wilayaCode: "05" }),
  ];
  const ar = [
    twinPost("ar", "3896", "المؤسسة العمومية الإستشفائية علي نمر – مروانة", "علي نمر مروانه", { wilayaCode: "05" }),
    twinPost("ar", "3898", "المؤسسة العمومية الإستشفائية مروانة – زيزة مسيكة", "مروانه زيزه مسيكه", { wilayaCode: "05" }),
  ];
  const paired = pairTwinPosts(fr, ar, wil)
    .filter((c) => c.verdict.paired)
    .map((c) => `${c.verdict.msp_fr}/${c.verdict.msp_ar}`)
    .sort();
  assert.deepEqual(paired, ["3895/3896", "3897/3898"]);

  // Two candidates the name check cannot separate are not evidence of either
  // pair: both are refused rather than decided by whichever sorted first.
  const twins = [
    twinPost("fr", "10", "EPH Alpha", "ALPHA", { wilayaCode: "05" }),
    twinPost("fr", "12", "EPH Alpha", "ALPHA", { wilayaCode: "05" }),
  ];
  const one = [twinPost("ar", "11", "المؤسسة العمومية الإستشفائية", "", { wilayaCode: "05" })];
  const verdicts = pairTwinPosts(twins, one, wil).map((c) => c.verdict);
  assert.deepEqual(verdicts.map((v) => v.paired), [false, false]);
  assert.deepEqual([...new Set(verdicts.map((v) => v.reason))], ["ambiguous_equal_name_match"]);
});

test("pairTwinPosts: a commune reached on a name fragment cannot veto a pair", () => {
  const wil = { byCode: new Map([["19", { code: "19", name_fr: "Setif", name_ar: "سطيف" }]]) };
  // The Arabic half of the Setif CHU is "سعادنة محمد عبد النور", which lands in
  // a commune on the given name alone. That is not a second place.
  const fr = [twinPost("fr", "4748", "Centre Hospitalo Universitaire Setif", "SETIF", {
    wilayaCode: "19", type: "chu", commune: { code_commune: 1901, name_fr: "Setif" }, communeHow: "exact",
  })];
  const ar = [twinPost("ar", "4749", "المركز الاستشفائي الجامعي سعادنة محمد عبد النور", "سعادنه محمد عبد النور", {
    wilayaCode: "19", type: "chu", commune: { code_commune: 1904, name_fr: "Ain Arnat" }, communeHow: "token_partial",
  })];
  assert.equal(pairTwinPosts(fr, ar, wil)[0].verdict.paired, true);
  // a commune both sides named outright still vetoes
  ar[0].communeHow = "exact";
  const vetoed = pairTwinPosts(fr, ar, wil)[0].verdict;
  assert.equal(vetoed.paired, false);
  assert.equal(vetoed.reason, "different_commune");
});

// The residual from the same review: the carry-over key was `(fr || ar).msp_id`,
// the record's own primary post. A bilingual record stands for TWO registry
// posts, so that key moved whenever the pairing did — losing the French post
// flipped the key to the Arabic one, retired the published id, and minted a new
// one for a place that had not moved. Resolving the key through either post
// pins it in both directions.
test("mspCarryKey: losing or gaining a twin post keeps the published id", () => {
  const committed = [{ id: "01-eph-03", refs: { msp: "3584", msp_twin: "3585" } }];
  const keyOf = mspCarryKey(committed);
  // the committed record keys to itself
  assert.equal(keyOf(committed[0]), "msp:3584");
  // the registry drops the French post: the surviving Arabic one keys the same
  assert.equal(keyOf({ refs: { msp: "3585" } }), "msp:3584");
  // and so does the pair, however the halves are ordered
  assert.equal(keyOf({ refs: { msp: "3584", msp_twin: "3585" } }), "msp:3584");
  // the merge itself: two committed half-records, one surviving pair, and the
  // older published id is the one that carries on
  const halves = [
    { id: "16-ehs-03", refs: { msp: "4660" } },
    { id: "16-ehs-13", refs: { msp: "4661" } },
  ];
  const merged = mspCarryKey(halves);
  assert.equal(merged({ refs: { msp: "4660", msp_twin: "4661" } }), "msp:4660");
  // a post the committed data never carried keys to itself, not to nothing
  assert.equal(keyOf({ refs: { msp: "9999" } }), "msp:9999");
  // and a record with no registry post at all still falls back to OSM/Wikidata
  assert.equal(keyOf({ refs: { osm: "way/1" } }), "osm:way/1");
});

test("resolveTwinPairs: the kept id is the older one and the absorbed one migrates", () => {
  const twins = [
    { paired: true, reason: "shared_key", wilaya_code: "16", type: "ehs", msp_fr: "4660", msp_ar: "4661" },
    { paired: false, reason: "name_conflict", wilaya_code: "16", type: "ehs", msp_fr: "4668", msp_ar: "4667" },
  ];
  const rows = [{ id: "16-ehs-03", refs: { msp: "4660", msp_twin: "4661" } }];
  const committed = [
    { id: "16-ehs-03", refs: { msp: "4660" } },
    { id: "16-ehs-13", refs: { msp: "4661" } },
  ];
  const { pairs, refused, migrations } = resolveTwinPairs(twins, rows, committed);
  assert.equal(refused.length, 1);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].kept_id, "16-ehs-03");
  assert.equal(pairs[0].absorbed_id, "16-ehs-13");
  assert.equal(migrations["16-ehs-13"].merged_into, "16-ehs-03");
  assert.deepEqual(migrations["16-ehs-13"].msp_posts, ["4660", "4661"]);
  assert.ok(migrations["16-ehs-13"].note.includes("Merged into 16-ehs-03"));

  // The ledger is append-only, and so is the report: once the Arabic half is
  // gone from the committed data, its id is recovered from the entry the merge
  // release wrote, matched on the pair's two registry posts.
  const replay = resolveTwinPairs(twins, rows, rows, migrations);
  assert.equal(replay.pairs[0].absorbed_id, "16-ehs-13");
  assert.deepEqual(replay.migrations, migrations);
});
