/**
 * The package's semver major, as a number. A change to what a key function
 * returns for any input is a major version.
 */
export declare const NORMALIZE_VERSION: number;

/** Both keys, the tokens, and whether a loose rule changed anything. */
export interface Keys {
  /** The Conservative key: the strict fold, as space-joined tokens. */
  conservative: string;
  /** The Loose key: the Conservative key plus the two loose equivalences. */
  loose: string;
  /** The words the Conservative key is joined from, in order. */
  tokens: string[];
  /** True when a loose rule actually changed something. */
  looseDiffers: boolean;
}

/**
 * The Conservative key for a name: the strict fold, as space-joined tokens.
 * Deterministic, host-independent and idempotent.
 */
export declare function conservativeKey(text: string): string;

/**
 * The Loose key for a name: the Conservative key with alef maqsura folded to yaa
 * and taa marbuta folded to haa, so a match they cause can be ranked below an
 * exact one.
 */
export declare function looseKey(text: string): string;

/**
 * The words a name folds to, in order: the split the full-text index is built
 * from. A word ends at whitespace, at an apostrophe, hyphen or dash variant, and
 * at punctuation, so a key never carries punctuation.
 */
export declare function tokenize(text: string): string[];

/** Both keys, the tokens and the loose flag, from one pass over the text. */
export declare function searchKeys(text: string): Keys;

/** The keys, plus the ids of the Rules that fired to produce them. */
export interface Explained extends Keys {
  /**
   * The Rules that fired, in the order they ran. A Rule is here when it changed at
   * least one codepoint or ended at least one word, so a name no Rule touches gives
   * an empty list, and a Rule that states a fold this package does not apply, the
   * pass-through and the two declined ones, is never here.
   */
  readonly applied: readonly string[];
}

/** One reviewed Rule: what it folds, why, and who signed that off. */
export interface Rule {
  /** The stable identifier, `ar.taa-marbuta-haa` or `latn.extended-a`. */
  id: string;
  /**
   * `canonical` resolves how one name was written, `conservative` merges spellings
   * a reader accepts as the same letter, `loose` is the extra tier only the Loose
   * key applies, and `declined` is a fold this package refuses to apply.
   */
  class: "canonical" | "conservative" | "loose" | "declined";
  script: "arab" | "latn" | "any";
  /** The codepoint sequences the Rule maps from, in table order. */
  from: readonly string[];
  /**
   * What each of them maps to, one for one with `from`. The empty string means the
   * character is removed, and a single space means it ends a word.
   */
  to: readonly string[];
  /** One sentence a speaker of the language can argue with. */
  why: string;
  /** Who reviewed that sentence, and when, as a YYYY-MM-DD date. */
  reviewed: { reviewedBy: string; reviewedAt: string };
}

/**
 * The keys plus the Rules that fired, so a loose match can say what made it loose.
 * The same code path as `searchKeys`, with the record switched on, so the two can
 * never disagree.
 */
export declare function explain(text: string): Explained;

/**
 * The reviewed Rule table, frozen: every fold this package applies, the exact
 * codepoint sequences it maps, the sentence it asserts about the script, and the
 * review record behind it. The two declined Rules are here too, with the fold they
 * decline, so what was refused is as legible as what was accepted.
 */
export declare const rules: readonly Rule[];
