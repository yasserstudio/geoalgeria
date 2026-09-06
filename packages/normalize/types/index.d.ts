/**
 * The package's semver major, as a number. A change to what a key function
 * returns for any input is a major version.
 */
export declare const NORMALIZE_VERSION: number;

/**
 * The Conservative key for a name: the strict fold, as space-joined tokens.
 * Deterministic, host-independent and idempotent.
 */
export declare function conservativeKey(text: string): string;
