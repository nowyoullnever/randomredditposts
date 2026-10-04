import test from "node:test";
import assert from "node:assert/strict";
import { MAX_POST_ID_BASE36, base36ToBigInt, createSessionId, drawPostId, markedPermalinkFor, permalinkFor, uniformBigInt } from "../random.js";

test("the configured maximum is a real base-36 range endpoint", () => {
  assert.equal(base36ToBigInt("10"), 36n);
  assert.ok(base36ToBigInt(MAX_POST_ID_BASE36) > 1n);
});

test("uniform draw rejects values that would cause modulo bias", () => {
  const values = [Uint8Array.of(255), Uint8Array.of(6)];
  assert.equal(uniformBigInt(0n, 9n, () => values.shift()), 6n);
});

test("drawPostId encodes a value inside the inclusive configured range", () => {
  const id = drawPostId("", () => Uint8Array.of(0, 0, 0, 0));
  assert.equal(id, "1");
  assert.equal(permalinkFor(id), "https://www.reddit.com/comments/1");
});

test("drawPostId redraws an immediately repeated ID when possible", () => {
  const values = [Uint8Array.of(0, 0, 0, 0), Uint8Array.of(0, 0, 0, 1)];
  assert.equal(drawPostId("1", () => values.shift()), "2");
});

test("marked permalink contains only the generated session identifier", () => {
  const session = createSessionId(() => new Uint8Array(16).fill(10));
  assert.equal(session, "0a".repeat(16));
  const url = new URL(markedPermalinkFor("abc", session));
  assert.equal(url.pathname, "/comments/abc");
  assert.equal(url.searchParams.get("rrp"), "1");
  assert.equal(url.searchParams.get("rrps"), session);
});
