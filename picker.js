export function randomIndex(length, getBytes = (bytes) => crypto.getRandomValues(new Uint8Array(bytes))) {
  if (!Number.isSafeInteger(length) || length < 1) throw new RangeError("A non-empty collection is required");
  const limit = 0x1_0000_0000;
  const cutoff = limit - (limit % length);
  for (;;) {
    const bytes = getBytes(4);
    const value = (bytes[0] * 0x1_000000) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3];
    if (value < cutoff) return value % length;
  }
}

export function isSfw(post) {
  return post?.over18 === false && post?.subredditOver18 === false;
}

export function pickPost(posts, requireSfw, previousId, getBytes) {
  const eligible = posts.filter((post) => !requireSfw || isSfw(post));
  if (!eligible.length) return null;
  const withoutPrevious = eligible.filter((post) => post.id !== previousId);
  const choices = withoutPrevious.length ? withoutPrevious : eligible;
  return choices[randomIndex(choices.length, getBytes)];
}

export function isValidPost(post) {
  return typeof post?.id === "string"
    && /^\/r\/[A-Za-z0-9_]+\/comments\/[a-z0-9]+(?:\/[^/]+)?\/?$/.test(post.permalink)
    && typeof post.over18 === "boolean"
    && typeof post.subredditOver18 === "boolean";
}
