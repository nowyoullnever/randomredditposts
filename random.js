// Latest manually observed, publicly opening submission ID on 2026-10-04:
// https://www.reddit.com/r/WLED/comments/1wfcc8u/wledashboard/
// Update only after confirming a newer real submission.
export const MAX_POST_ID_BASE36 = "1wfcc8u";
export const MIN_POST_ID = 1n;

export function base36ToBigInt(value) {
  if (!/^[0-9a-z]+$/i.test(value)) throw new TypeError("Invalid base-36 ID");
  let result = 0n;
  for (const character of value.toLowerCase()) result = (result * 36n) + BigInt(parseInt(character, 36));
  return result;
}

export function uniformBigInt(minimum, maximum, getBytes = (length) => crypto.getRandomValues(new Uint8Array(length))) {
  if (maximum < minimum) throw new RangeError("Invalid ID range");
  const range = maximum - minimum + 1n;
  const byteLength = Math.ceil(range.toString(2).length / 8);
  const limit = 1n << BigInt(byteLength * 8);
  const cutoff = limit - (limit % range);
  for (;;) {
    let value = 0n;
    for (const byte of getBytes(byteLength)) value = (value << 8n) | BigInt(byte);
    if (value < cutoff) return minimum + (value % range);
  }
}

export function drawPostId(previousId = "", getBytes) {
  const maximum = base36ToBigInt(MAX_POST_ID_BASE36);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const id = uniformBigInt(MIN_POST_ID, maximum, getBytes).toString(36);
    if (id !== previousId) return id;
  }
  return uniformBigInt(MIN_POST_ID, maximum, getBytes).toString(36);
}

export function permalinkFor(id) {
  if (!/^[0-9a-z]+$/i.test(id)) throw new TypeError("Invalid base-36 ID");
  return `https://www.reddit.com/comments/${id.toLowerCase()}`;
}

export function createSessionId(getBytes = (length) => crypto.getRandomValues(new Uint8Array(length))) {
  return Array.from(getBytes(16), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function markedPermalinkFor(id, sessionId) {
  if (!/^[a-f0-9]{32}$/i.test(sessionId)) throw new TypeError("Invalid session ID");
  const url = new URL(permalinkFor(id));
  url.searchParams.set("rrp", "1");
  url.searchParams.set("rrps", sessionId.toLowerCase());
  return url.href;
}
