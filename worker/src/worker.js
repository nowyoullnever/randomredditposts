import { base36ToBigInt, candidateFullnames, isUsable, normalizedPost, uniformIndex } from "./random.js";

const REDDIT = "https://oauth.reddit.com";
const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const CACHE_TTL_SECONDS = 300;
const RANGE_TTL_SECONDS = 60;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" } });
const randomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));

async function cached(env, key, ttl, load) {
  if (env.POST_CACHE) {
    const value = await env.POST_CACHE.get(key, "json");
    if (value) return value;
  }
  const value = await load();
  if (env.POST_CACHE) await env.POST_CACHE.put(key, JSON.stringify(value), { expirationTtl: ttl });
  return value;
}

async function token(env) {
  return cached(env, "oauth-token", 3300, async () => {
    const basic = btoa(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`);
    const response = await fetch(TOKEN_URL, { method: "POST", headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded", "user-agent": env.REDDIT_USER_AGENT }, body: "grant_type=client_credentials" });
    if (!response.ok) throw new Error(`OAuth ${response.status}`);
    const body = await response.json();
    if (!body.access_token) throw new Error("OAuth response has no token");
    return body.access_token;
  });
}

async function reddit(env, path) {
  const accessToken = await token(env);
  const response = await fetch(`${REDDIT}${path}`, { headers: { authorization: `Bearer ${accessToken}`, "user-agent": env.REDDIT_USER_AGENT } });
  if (response.status === 429) throw new Error("Reddit rate limit");
  if (!response.ok) throw new Error(`Reddit ${response.status}`);
  return response.json();
}

async function upperBound(env) {
  return cached(env, "latest-post-id", RANGE_TTL_SECONDS, async () => {
    // This listing only advances the current global upper bound. It is never used
    // to choose a post, rank one, or weight a subreddit.
    const listing = await reddit(env, "/r/all/new.json?limit=100&raw_json=1");
    const ids = listing?.data?.children?.filter((item) => item.kind === "t3").map((item) => base36ToBigInt(item.data.id)) ?? [];
    if (!ids.length) throw new Error("No current post IDs");
    return ids.reduce((maximum, id) => id > maximum ? id : maximum, 1n).toString();
  });
}

async function batch(env, maxId) {
  const names = candidateFullnames(maxId, randomBytes);
  const listing = await reddit(env, `/api/info.json?id=${encodeURIComponent(names.join(","))}&raw_json=1`);
  return listing?.data?.children ?? [];
}

async function choose(env, sfw, excludedId) {
  const poolKey = `verified-post-pool-${sfw ? "sfw" : "all"}`;
  const pool = env.POST_CACHE ? await env.POST_CACHE.get(poolKey, "json") : null;
  const cached = Array.isArray(pool) ? pool.filter((post) => post.id !== excludedId) : [];
  if (cached.length) return cached[uniformIndex(cached.length, randomBytes)];

  const maxId = BigInt(await upperBound(env));
  // Each round draws uniformly from the same inclusive global integer range.
  // A returned t3 item is accepted only after official API metadata validation.
  for (let round = 0; round < 6; round += 1) {
    const candidates = await batch(env, maxId);
    const valid = candidates.filter((post) => isUsable(post, sfw, excludedId));
    if (valid.length) {
      const verified = valid.map(normalizedPost);
      // Every item entered here came from an independent uniform ID draw. A
      // uniform pick from this exchangeable pool preserves that distribution.
      if (env.POST_CACHE) await env.POST_CACHE.put(poolKey, JSON.stringify(verified), { expirationTtl: CACHE_TTL_SECONDS });
      return verified[uniformIndex(verified.length, randomBytes)];
    }
  }
  throw new Error("No valid post found");
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" } });
    const url = new URL(request.url);
    if (request.method !== "GET" || url.pathname !== "/random") return json({ error: "Not found" }, 404);
    if (!env.REDDIT_CLIENT_ID || !env.REDDIT_CLIENT_SECRET || !env.REDDIT_USER_AGENT) return json({ error: "Service is not configured" }, 503);
    try {
      const post = await choose(env, url.searchParams.get("sfw") === "1", url.searchParams.get("exclude") || "");
      return json({ id: post.id, permalink: post.permalink });
    } catch (error) {
      // Do not emit a guessed URL after API, network, or rate-limit failure.
      return json({ error: "No verified post is available" }, /rate limit/.test(String(error)) ? 429 : 503);
    }
  }
};
