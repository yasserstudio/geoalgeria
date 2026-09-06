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
