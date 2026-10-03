// The match classes: what a query and a name amount to, from the keys alone.
//
// Four classes, in the order a classifier decides them:
//
//   exact   the two Conservative keys are equal;
//   prefix  the name's Conservative key starts with the query's, at a word
//           boundary: every query word but the last equals the name's word at the
//           same position, and the last query word is a prefix of the name's word
//           there. So a query may stop part way through the word it is still
//           typing, and only there. Equivalently, and because a key is its tokens
//           joined by single spaces: the name's key starts with the query's key;
//   loose   neither of the above by the Conservative keys, but equal or prefix by
//           the Loose keys, so exactly one of the two loose rules made the match;
//   none    none of the above.
//
// The classification stops here. Turning a class plus a name kind into a ranking
// tier is private in the products' shared core, by foundation invariant, and no
// case in this file has an opinion about which result should come first.
//
// `proves` names the Rules that made a loose case loose. It is empty for the other
// classes, whose cases prove the shape of the decision rather than a Rule.

/**
 * @type {ReadonlyArray<{
 *   id: string,
 *   query: string,
 *   name: string,
 *   class: "exact" | "prefix" | "loose" | "none",
 *   proves: readonly string[],
 *   note: string,
 * }>}
 */
export const matchCases = Object.freeze([
  // Exact: the two Conservative keys are equal, whatever the two spellings were.
  {
    id: "exact.latn.accents",
    query: "bejaia",
    name: "Béjaïa",
    class: "exact",
    proves: [],
    note: "an unaccented query is an exact match for the accented name, because both fold to the same Conservative key",
  },
  {
    id: "exact.latn.separators",
    query: "sidi-bel-abbes",
    name: "Sidi Bel Abbès",
    class: "exact",
    proves: [],
    note: "hyphens are separators, so the hyphenated spelling of a three-word name is the same query as the spaced one",
  },
  {
    id: "exact.ar.harakat",
    query: "قسنطينة",
    name: "قُسَنْطِينَة",
    class: "exact",
    proves: [],
    note: "a name written with harakat is an exact match for the query written without them",
  },

  // Prefix: the query stops early, either at a word boundary or inside the word it
  // is still typing.
  {
    id: "prefix.latn.whole-word",
    query: "Sidi Bel",
    name: "Sidi Bel Abbès",
    class: "prefix",
    proves: [],
    note: "two complete words of a three-word name: the query ends exactly at a word boundary",
  },
  {
    id: "prefix.latn.partial-word",
    query: "Tlem",
    name: "Tlemcen",
    class: "prefix",
    proves: [],
    note: "a half-typed single word still completes, which is why the boundary rule lets the last query word be a prefix",
  },
  {
    id: "prefix.latn.partial-last-word",
    query: "sidi b",
    name: "Sidi Bel Abbès",
    class: "prefix",
    proves: [],
    note: "one complete word and one letter of the next: the words before the last must match whole, the last need not",
  },
  {
    id: "prefix.ar.partial-word",
    query: "قسنطين",
    name: "قسنطينة",
    class: "prefix",
    proves: [],
    note: "an Arabic name typed up to its last letter is a prefix, and no loose rule is needed to see it",
  },
  {
    id: "prefix.ar.whole-word",
    query: "عين",
    name: "عين تموشنت",
    class: "prefix",
    proves: [],
    note: "the first of two Arabic words, ending at the boundary",
  },

  // Loose: the Conservative keys refuse it and exactly one of the two loose rules
  // rescues it. These are the cases a ranking must be able to place below an exact
  // match, which is the whole reason the loose tier exists.
  {
    id: "loose.taa-marbuta-haa.equal",
    query: "قسنطينه",
    name: "قسنطينة",
    class: "loose",
    proves: ["ar.taa-marbuta-haa"],
    note: "Constantine typed with haa where the name has taa marbuta: the Conservative keys differ by that one letter and the Loose keys are equal",
  },
  {
    id: "loose.taa-marbuta-haa.prefix",
    query: "بلديه",
    name: "بلدية سيدي مصطفى",
    class: "loose",
    proves: ["ar.taa-marbuta-haa"],
    note: "a first word typed with haa: loose and a prefix at once, which is still one class, because a loose prefix is not an exact match",
  },
  {
    id: "loose.alef-maqsura-yaa.equal",
    query: "مصطفي",
    name: "مصطفى",
    class: "loose",
    proves: ["ar.alef-maqsura-yaa"],
    note: "Mustapha typed with yaa where the name ends in alef maqsura, the letter Algerian keyboards write either way",
  },
  {
    id: "loose.both-rules",
    query: "بلديه سيدي مصطفي",
    name: "بلدية سيدي مصطفى",
    class: "loose",
    proves: ["ar.taa-marbuta-haa", "ar.alef-maqsura-yaa"],
    note: "both loose rules in one query, and the whole name still reaches only the loose class",
  },

  // None: what the classes refuse. A substring that is not a prefix is the case
  // most worth writing down, because it is the one a naive matcher gets wrong.
  {
    id: "none.substring-not-prefix",
    query: "jaia",
    name: "Béjaïa",
    class: "none",
    proves: [],
    note: "a query that starts part way through a word is not a prefix: matching inside a word is not a class this package asserts",
  },
  {
    id: "none.word-order",
    query: "abbes sidi",
    name: "Sidi Bel Abbès",
    class: "none",
    proves: [],
    note: "the same words in another order are not a prefix, because the boundary rule is positional",
  },
  {
    id: "none.missing-middle-word",
    query: "sidi abbes",
    name: "Sidi Bel Abbès",
    class: "none",
    proves: [],
    note: "a word skipped in the middle breaks the match: no class here allows a gap",
  },
  {
    id: "none.different-name",
    query: "Oran",
    name: "Béjaïa",
    class: "none",
    proves: [],
    note: "two different names, the ordinary case the other classes are measured against",
  },
  {
    id: "none.loose-rules-do-not-rescue",
    query: "قسنطينه",
    name: "وهران",
    class: "none",
    proves: [],
    note: "a loose spelling of one name is still nothing against another: the loose rules widen a match, they do not invent one",
  },
]);
