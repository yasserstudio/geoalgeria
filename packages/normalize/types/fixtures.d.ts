/** One Golden corpus case: an input, the keys it must produce, and what it proves. */
export interface KeyCase {
  input: string;
  /** The Conservative key. */
  conservative: string;
  /** The Loose key, equal to the Conservative key when no loose rule fires. */
  loose: string;
  /** The words the Conservative key is joined from, in order. */
  tokens: readonly string[];
  /** The Rule ids this case exercises; empty when no Rule touches the name. */
  proves: readonly string[];
  note: string;
}

/** The Golden corpus every consumer asserts against. */
export declare const corpus: ReadonlyArray<KeyCase>;
