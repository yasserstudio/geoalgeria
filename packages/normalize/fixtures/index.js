// The published fixture, at `@geoalgeria/normalize/fixtures`.
//
// A barrel over the two files the fixture is written in, the way index.js is a
// barrel over src/. Consumers, `packages/core`, the Content release generator and
// the device run under Hermes, import this subpath and assert against the same
// arrays the package tests itself with, so there is one corpus rather than three
// approximations of it.

/** The Golden corpus: an input, the keys it must produce, and what it proves. */
export { corpus } from "./corpus.js";

/** The match cases: what a query and a name amount to, from the keys alone. */
export { matchCases } from "./match-cases.js";
