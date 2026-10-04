export const MIN_POST_ID = 1n;
export const BATCH_SIZE = 80;

export function base36ToBigInt(value) {
  if (!/^[0-9a-z]+$/i.test(value)) throw new TypeError("Invalid base36 ID");
  let result = 0n;
  for (const character of value.toLowerCase()) result = result * 36n + BigInt(parseInt(character, 36));
  return result;
}

export function uniformBigInt(min, max, randomBytes) {
  if (max < min) throw new RangeError("Invalid range");
  const range = max - min + 1n;
  const bitLength = range.toString(2).length;
  const byteLength = Math.ceil(bitLength / 8);
  const limit = 1n << BigInt(byteLength * 8);
  const cutoff = limit - (limit % range);
  for (;;) {
    const bytes = randomBytes(byteLength);
    let value = 0n;
    for (const byte of bytes) value = (value << 8n) | BigInt(byte);
    if (value < cutoff) return min + (value % range);
  }
}

export function candidateFullnames(maxId, randomBytes, count = BATCH_SIZE) {
  return Array.from({ length: count }, () => `t3_${uniformBigInt(MIN_POST_ID, maxId, randomBytes).toString(36)}`);
}

export function uniformIndex(length, randomBytes) {
  if (!Number.isSafeInteger(length) || length < 1) throw new RangeError("Invalid collection length");
  return Number(uniformBigInt(0n, BigInt(length - 1), randomBytes));
}

export function isUsable(post, requireSfw, excludedId) {
  if (!post || post.kind !== "t3" || !post.data) return false;
  const data = post.data;
  if (data.name === excludedId || !data.id || typeof data.permalink !== "string" || !data.permalink.startsWith("/r/")) return false;
  if (data.removed_by_category || data.author === "[deleted]") return false;
  if (requireSfw && (data.over_18 !== false || data.subreddit_type !== "public")) return false;
  return true;
}

export function normalizedPost(post) {
  return { id: post.data.name, permalink: post.data.permalink, over18: post.data.over_18 === true, checkedAt: Date.now() };
}
