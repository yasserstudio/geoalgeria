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
