// The 23 reviewed Arabic commune-name repairs, upstreamed from the Web app's own
// copy of the flagship table (private tracker #239).
//
// WHY THEY WERE NOT HERE. The app kept a fork of this table and repaired the
// names in it, because a search snippet renders what the data says. The 2026-08-13
// snippet audit found 22 names carrying U+0640 ARABIC TATWEEL, the presentational
// kashida that stretches a joined letter for justification: it is typography, not
// orthography, and a reader never sees it as a letter, so a name that carries it
// folds and renders differently from the same name written without it. The 23rd,
// Souk El Tenine (608), had lost the alef of its definite article. Retiring the
// fork means these repairs have to live here, which is what this file is.
//
// `from` is the spelling this repository shipped, asserted by
// scripts/fix-commune-name-ar.mjs so a carrier that has drifted somewhere else
// fails loudly instead of being rewritten; `to` is the repaired spelling. A row
// already at its `to` is a no-op, so the set is replayable and a carrier that
// missed an earlier run still fails.
//
// SOURCES.
//   tatweel: Unicode 16.0 section 9.2, ARABIC TATWEEL (U+0640) is a justification
//            glyph; removing it changes no letter a reader sees. The repaired
//            spellings are the app's, reviewed in its 2026-08-13 snippet audit.
//   article: 1557 Souk-El-Tenine (wilaya 15) carries the same name as 608 and has
//            always spelled it سوق الاثنين. 608's سوق لإثنين drops the alef of
//            the article and moves the hamza onto the lam, which is neither the
//            Arabic for "Monday" nor what this repository says anywhere else.
//
// Shared so the fix script and test/commune-name-ar.test.mjs cannot disagree
// about which repairs are applied.

/** Oldest-first is meaningless here: one reviewed set, ordered by code_commune. */
export const NAME_AR_REPAIRS = [
  { code_commune: 608, wilaya_code: 6, name_fr: "Souk El Tenine", from: "سوق لإثنين", to: "سوق الاثنين", repair: "article" },
  { code_commune: 1505, wilaya_code: 15, name_fr: "Souama", from: "صوامـــع", to: "صوامع", repair: "tatweel" },
  { code_commune: 1507, wilaya_code: 15, name_fr: "Irdjen", from: "إيرجـــن", to: "إيرجن", repair: "tatweel" },
  { code_commune: 1508, wilaya_code: 15, name_fr: "Timizart", from: "تيمـيزار", to: "تيميزار", repair: "tatweel" },
  { code_commune: 1516, wilaya_code: 15, name_fr: "Beni Zmenzer", from: "بنــــي زمنزار", to: "بني زمنزار", repair: "tatweel" },
  { code_commune: 1517, wilaya_code: 15, name_fr: "Iferhounene", from: "إفــرحــونان", to: "إفرحونان", repair: "tatweel" },
  { code_commune: 1519, wilaya_code: 15, name_fr: "Illoula Oumalou", from: "إيلولة أومـــالو", to: "إيلولة أومالو", repair: "tatweel" },
  { code_commune: 1520, wilaya_code: 15, name_fr: "Yakourene", from: "إعــكورن", to: "إعكورن", repair: "tatweel" },
  { code_commune: 1521, wilaya_code: 15, name_fr: "Larbaa Nath Irathen", from: "الأربعــاء ناث إيراثن", to: "الأربعاء ناث إيراثن", repair: "tatweel" },
  { code_commune: 1529, wilaya_code: 15, name_fr: "Maatkas", from: "معـــاتقة", to: "معاتقة", repair: "tatweel" },
  { code_commune: 1533, wilaya_code: 15, name_fr: "Illilten", from: "إيلـيــلتـن", to: "إيليلتن", repair: "tatweel" },
  { code_commune: 1534, wilaya_code: 15, name_fr: "Bouzeguene", from: "بوزقــن", to: "بوزقن", repair: "tatweel" },
  { code_commune: 1535, wilaya_code: 15, name_fr: "Ait Aggouacha", from: "أيت عقـواشة", to: "أيت عقواشة", repair: "tatweel" },
  { code_commune: 1538, wilaya_code: 15, name_fr: "Tigzirt", from: "تيقـزيرت", to: "تيقزيرت", repair: "tatweel" },
  { code_commune: 1545, wilaya_code: 15, name_fr: "Yatafene", from: "يطــافن", to: "يطافن", repair: "tatweel" },
  { code_commune: 1546, wilaya_code: 15, name_fr: "Beni-Zikki", from: "بني زيكــي", to: "بني زيكي", repair: "tatweel" },
  { code_commune: 1549, wilaya_code: 15, name_fr: "Idjeur", from: "إيجــار", to: "إيجار", repair: "tatweel" },
  { code_commune: 1550, wilaya_code: 15, name_fr: "Mekla", from: "مقــلع", to: "مقلع", repair: "tatweel" },
  { code_commune: 1554, wilaya_code: 15, name_fr: "Iflissen", from: "إفليـــسن", to: "إفليسن", repair: "tatweel" },
  { code_commune: 1562, wilaya_code: 15, name_fr: "Mizrana", from: "ميزرانـــة", to: "ميزرانة", repair: "tatweel" },
  { code_commune: 1563, wilaya_code: 15, name_fr: "Imsouhal", from: "إمســوحال", to: "إمسوحال", repair: "tatweel" },
  { code_commune: 1565, wilaya_code: 15, name_fr: "Ait Bouaddou", from: "أيت بــوادو", to: "أيت بوادو", repair: "tatweel" },
  { code_commune: 3613, wilaya_code: 36, name_fr: "Drean", from: "الذرعـان", to: "الذرعان", repair: "tatweel" },
];

/** code_commune -> repair. */
export const repairsByCode = () => new Map(NAME_AR_REPAIRS.map((r) => [r.code_commune, r]));

/** "wilaya_code|name_fr" -> repair, for the carriers that hold no commune code. */
export const repairsByName = () =>
  new Map(NAME_AR_REPAIRS.map((r) => [`${r.wilaya_code}|${r.name_fr}`, r]));

/** U+0640 ARABIC TATWEEL, which no commune name_ar may carry once this is applied. */
export const TATWEEL = "ـ";
