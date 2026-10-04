import test from "node:test";
import assert from "node:assert/strict";
import { base36ToBigInt, candidateFullnames, isUsable, uniformBigInt, uniformIndex } from "../src/random.js";

test("base36 conversion preserves old and current ID values", () => {
  assert.equal(base36ToBigInt("1"), 1n);
  assert.equal(base36ToBigInt("10"), 36n);
  assert.equal(base36ToBigInt("zzz"), 46655n);
});

test("uniformBigInt rejects out-of-range byte values instead of using biased modulo", () => {
  const values = [Uint8Array.of(255), Uint8Array.of(6)];
  assert.equal(uniformBigInt(0n, 9n, () => values.shift()), 6n);
});

test("candidate fullnames cover the inclusive lower and upper bounds", () => {
  const values = [Uint8Array.of(0), Uint8Array.of(9)];
  assert.deepEqual(candidateFullnames(10n, () => values.shift(), 2), ["t3_1", "t3_a"]);
});

test("uniformIndex includes zero and never uses a biased modulo", () => {
  assert.equal(uniformIndex(1, () => Uint8Array.of(0)), 0);
  const values = [Uint8Array.of(255), Uint8Array.of(2)];
  assert.equal(uniformIndex(10, () => values.shift()), 2);
});

test("SFW excludes ambiguous, NSFW, and non-public metadata", () => {
  const base = { kind: "t3", data: { name: "t3_a", id: "a", permalink: "/r/test/comments/a/x/", over_18: false, subreddit_type: "public" } };
  assert.equal(isUsable(base, true, ""), true);
  assert.equal(isUsable({ ...base, data: { ...base.data, over_18: true } }, true, ""), false);
  assert.equal(isUsable({ ...base, data: { ...base.data, subreddit_type: "restricted" } }, true, ""), false);
  assert.equal(isUsable({ ...base, data: { ...base.data, over_18: undefined } }, true, ""), false);
});
