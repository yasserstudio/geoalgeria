import { test } from "node:test";
import assert from "node:assert/strict";
import { findUncredited } from "../scripts/check-contributor-credit.mjs";

const pr = (number, login, is_bot = false) => ({ number, author: { login, is_bot } });

test("an outside PR with no #N anywhere is uncredited", () => {
  assert.deepEqual(findUncredited([pr(349, "dasezo")], "nothing here").map((p) => p.number), [349]);
});

test("a #N mention credits the PR", () => {
  assert.deepEqual(findUncredited([pr(349, "dasezo")], "Contributed by @dasezo in #349."), []);
});

test("#34 does not credit #349, nor #3490", () => {
  assert.equal(findUncredited([pr(34, "a")], "see #349").length, 1);
  assert.equal(findUncredited([pr(349, "a")], "see #3490").length, 1);
});

test("the owner and bots are never asked for credit", () => {
  assert.deepEqual(findUncredited([pr(1, "yasserstudio"), pr(2, "dependabot", true)], ""), []);
});
