import test from "node:test";
import assert from "node:assert/strict";
import { isSfw, pickPost, randomIndex } from "../picker.js";

const safe = { id: "safe", permalink: "/r/test/comments/a/safe", over18: false, subredditOver18: false };
const adult = { id: "adult", permalink: "/r/nsfw/comments/b/adult", over18: true, subredditOver18: true };
const bytes = (value) => () => Uint8Array.of(0, 0, 0, value);

test("random index rejects values that would cause modulo bias", () => {
  const values = [Uint8Array.of(255, 255, 255, 255), Uint8Array.of(0, 0, 0, 4)];
  assert.equal(randomIndex(10, () => values.shift()), 4);
});

test("SFW requires both recorded Reddit safety flags to be false", () => {
  assert.equal(isSfw(safe), true);
  assert.equal(isSfw(adult), false);
  assert.equal(isSfw({ ...safe, subredditOver18: true }), false);
});

test("SFW mode excludes NSFW catalog records", () => {
  assert.equal(pickPost([adult, safe], true, null, bytes(0)).id, "safe");
  assert.equal(pickPost([adult, safe], false, null, bytes(0)).id, "adult");
});

test("the immediately previous post is excluded when another entry exists", () => {
  assert.equal(pickPost([safe, adult], false, "safe", bytes(0)).id, "adult");
});
