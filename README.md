# Random Reddit Posts

GitHub Pages front end and a minimal Cloudflare Worker that opens one verified Reddit submission in a new tab. The page contains only the logo, button, and `only swf contents` checkbox required by the product.

## Randomness model

The Worker takes a uniformly random integer from `1` through the latest observed global Reddit submission ID, encodes it in base 36, and requests up to 80 generated `t3_` fullnames in one official OAuth `/api/info` request. Missing, deleted, inaccessible, malformed, and (when requested) NSFW/ambiguous entries are rejected. Repeating this operation until a valid entry is found is rejection sampling: conditional on acceptance, every accessible post ID in that integer range has equal probability. No listing is used to select posts or apply subreddit, score, date, or popularity weighting.

`/r/all/new` is used only once per minute to discover an advancing upper bound; the selection range is otherwise the complete interval from the first ID. This makes very recently created IDs unavailable until the next refresh. Reddit does not publish a canonical global maximum-ID endpoint, so this is an explicit, small freshness limitation rather than an invented weighting rule.

The Worker does not retain a permanent selection history. It keeps a five-minute pool of minimal verified records (`id`, `permalink`, NSFW flag, check time), a five-minute OAuth token, and one-minute range bound in KV. The pool consists solely of independently drawn accepted IDs and is picked uniformly, so it does not introduce popularity or time weighting. The browser sends only the immediately prior returned ID as an exclusion to reduce consecutive duplicates. It never sends or displays post title/body data.

## Deploy

1. Create an approved Reddit OAuth application and follow Reddit's API terms. Use a descriptive `REDDIT_USER_AGENT`.
2. Create a Cloudflare KV namespace and replace the placeholder `id` in `worker/wrangler.toml`.
3. From `worker/`, deploy the Worker and set secrets:

   ```powershell
   npx wrangler secret put REDDIT_CLIENT_ID
   npx wrangler secret put REDDIT_CLIENT_SECRET
   npx wrangler secret put REDDIT_USER_AGENT
   npx wrangler deploy
   ```

4. Set `window.RANDOM_REDDIT_API_BASE_URL` in `config.js` to the deployed Worker HTTPS origin, for example `https://random-reddit-posts-api.example.workers.dev`.
5. Push `main`, then enable **Settings → Pages → GitHub Actions** in the repository.

The Worker has no static fallback. If approved API access is unavailable, it returns a failure status and the page opens no URL. A static list could be substituted only with clear disclosure that it cannot provide uniform sampling over all Reddit posts.

## Test

```powershell
npm test
```

Tests cover base-36 range boundaries, rejection of modulo-biased byte draws, inclusive candidate generation, and strict SFW metadata rejection. Integration tests require live, approved OAuth credentials and are intentionally not run against public Reddit without them.
