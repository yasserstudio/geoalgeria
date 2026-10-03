/** One Golden corpus case: an input, the keys it must produce, and what it proves. */
export interface KeyCase {
  input: string;
  /** The Conservative key. */
  conservative: string;
  /** The Loose key, equal to the Conservative key when no loose rule fires. */
  loose: string;
  /** The words the Conservative key is joined from, in order. */
  tokens: readonly string[];
  /**
   * The Rule ids this case exercises, in the order the key path ran them. For a
   * Rule that folds something this is exactly `explain(input).applied`; a Rule that
   * states a fold the package does not apply is named here instead by the character,
   * or the article, surviving into the expected keys. Empty when no Rule touches the
   * name.
   */
  proves: readonly string[];
  note: string;
}

/** The Golden corpus every consumer asserts against. */
export declare const corpus: ReadonlyArray<KeyCase>;

/**
 * What a query and a name amount to. Four classes, decided in this order, from the
 * keys and their tokens alone. A key is its tokens joined by single spaces, so
 * "word" below means one element of that list.
 *
 * - `exact`: the two Conservative keys are equal.
 * - `prefix`: the query is a prefix of the name by the Conservative keys, at a word
 *   boundary. Precisely: the query has at least one word and no more words than the
 *   name; every query word but its last equals the name's word at the same
 *   position; and the query's last word is a prefix of the name's word at that
 *   position. So a query may stop part way through the word it is still typing, and
 *   only there: a query starting part way through a word is not a prefix.
 *   Equivalently, because a key is a space-joined token list: the name's
 *   Conservative key starts with the query's non-empty Conservative key.
 * - `loose`: neither of the above by the Conservative keys, but equal or prefix by
 *   the same two relations applied to the Loose keys, so one of the two loose Rules
 *   made the match and a ranking can place it below an exact one.
 * - `none`: none of the above.
 *
 * The package exports no classifier. Its reviewed root surface is the seven key and
 * Rule exports, and a fifteen-line decision that follows from them is not worth
 * a public commitment that can never be changed without a major. A consumer writes
 * the rule above and proves its implementation against `matchCases`, which is what
 * makes the four-way decision the same one everywhere.
 *
 * Ranking is not here. Turning a class plus a name kind into a tier is private in
 * the products' shared core.
 */
export type MatchClass = "exact" | "prefix" | "loose" | "none";

/** One match case: a query, a name, and the class the keys make of the pair. */
export interface MatchCase {
  id: string;
  query: string;
  name: string;
  class: MatchClass;
  /**
   * The Rule ids that made a `loose` case loose, one or both of
   * `ar.taa-marbuta-haa` and `ar.alef-maqsura-yaa`. Empty for every other class.
   */
  proves: readonly string[];
  note: string;
}

/** The match cases every consumer's classifier is held to. */
export declare const matchCases: ReadonlyArray<MatchCase>;
