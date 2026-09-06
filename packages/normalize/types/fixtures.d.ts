/** One Golden corpus case: an input, the key it must produce, and the rule it proves. */
export interface KeyCase {
  input: string;
  conservative: string;
  note: string;
}

/** The Golden corpus every consumer asserts against. */
export declare const corpus: ReadonlyArray<KeyCase>;
