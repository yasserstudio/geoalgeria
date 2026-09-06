// The review gate over @geoalgeria/normalize's Rule table.
//
// The package publishes the orthographic equivalences GeoAlgeria asserts about
// Algerian names as data, so that someone who reads the language and not the code
// can argue with one. That is worth nothing unless a Rule cannot enter without a
// reviewer and without a corpus case proving it, which is what this checks. It
// reads the table and the corpus as data, the way the licence gate reads the three
// licence artefacts, and the shape of a Rule is the package's own tests' business.

/**
 * The reviewed order of the Rule table, committed here rather than derived from
 * the table it checks. "Stable order" is this list: the order the key path applies
 * the Rules in, the two declined ones last. The table is not sorted, because the
 * order carries meaning a sort would destroy, so reordering it, adding a Rule or
 * removing one is a change this file and packages/normalize/src/rules.js have to
 * agree on rather than one file rewriting its own expectation.
 *
 * @type {ReadonlyArray<string>}
 */
export const REVIEWED_RULE_ORDER = Object.freeze([
  "ar.presentation-forms-b",
  "ar.presentation-forms-a",
  "ar.lam-alef-ligature",
  "ar.tatweel",
  "ar.marks",
  "latn.combining-marks",
  "any.invisible",
  "ar.alef-variants",
  "ar.waw-hamza",
  "ar.yaa-hamza",
  "ar.indic-digits",
  "ar.extended-indic-digits",
  "latn.accents",
  "latn.extended-a",
  "latn.extended-b",
  "any.separators",
  "any.punctuation",
  "any.whitespace",
  "any.case",
  "any.pass-through",
  "ar.alef-maqsura-yaa",
  "ar.taa-marbuta-haa",
  "ar.definite-article",
  "latn.transliteration",
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Five ways the table and its corpus can be wrong, in one list of messages.
 *
 * @param {{
 *   rules: ReadonlyArray<Record<string, any>>,
 *   corpus: ReadonlyArray<{ input: string, proves: ReadonlyArray<string> }>,
 *   order?: ReadonlyArray<string>,
 * }} input
 * @returns {string[]} one message per problem, empty when the table is sound
 */
export function normalizeRuleErrors({ rules, corpus, order = REVIEWED_RULE_ORDER }) {
  const errors = [];
  const ids = rules.map((rule) => rule.id);
  const proved = new Set(corpus.flatMap((kase) => kase.proves));

  // 1. A Rule nobody signed off on. The record is the whole point of publishing
  //    the table: an equivalence asserted about a language with no reviewer behind
  //    it is an opinion the code happens to hold.
  for (const rule of rules) {
    const reviewed = rule.reviewed;
    if (!reviewed || typeof reviewed !== "object") {
      errors.push(`normalize/src/rules.js: ${rule.id} has no review record, so nobody signed off on what it asserts`);
      continue;
    }
    if (!reviewed.reviewedBy)
      errors.push(`normalize/src/rules.js: ${rule.id} has a review record with no reviewedBy, so nobody signed off on what it asserts`);
    if (!ISO_DATE.test(reviewed.reviewedAt ?? ""))
      errors.push(`normalize/src/rules.js: ${rule.id} has a review record whose reviewedAt is not a YYYY-MM-DD date (${JSON.stringify(reviewed.reviewedAt ?? null)})`);
  }

  // 2. A Rule no corpus case proves. A Rule cannot enter without a case, which is
  //    what keeps the corpus the contract rather than a sample.
  for (const id of ids) {
    if (!proved.has(id))
      errors.push(`normalize/fixtures/corpus.js: no corpus case proves ${id}, so the Rule is asserted and never exercised`);
  }

  // 3. A case claiming a Rule the table does not have: a renamed or deleted Rule
  //    leaving a case behind that proves nothing.
  const known = new Set(ids);
  for (const kase of corpus) {
    for (const id of kase.proves) {
      if (!known.has(id))
        errors.push(`normalize/fixtures/corpus.js: the case ${JSON.stringify(kase.input)} proves ${id}, which is not a Rule in the table`);
    }
  }

  // 4. A repeated id. An id is the name a corpus case, a review record and an
  //    `explain` record all hold on to, so it names one Rule.
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, count] of counts) {
    if (count > 1)
      errors.push(`normalize/src/rules.js: ${id} appears ${count} times in the Rule table, an id names one Rule`);
  }

  // 5. An order nobody reviewed. Insertions, deletions and reorderings all land
  //    here, so a Rule cannot arrive between two reviewed ones unnoticed. The
  //    message names the first place the two disagree rather than printing both
  //    lists, so a build log stays readable.
  const longest = Math.max(ids.length, order.length);
  let at = -1;
  for (let i = 0; i < longest; i++) {
    if (ids[i] !== order[i]) {
      at = i;
      break;
    }
  }
  if (at !== -1)
    errors.push(`normalize/src/rules.js: the Rule table order is not the reviewed one: position ${at + 1} is ${ids[at] ?? "nothing"}, the reviewed order has ${order[at] ?? "nothing"} (${ids.length} Rules against ${order.length} reviewed)`);

  return errors;
}
