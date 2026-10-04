import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../data/posts.json", import.meta.url)));
let failures = 0;
for (const post of catalog) {
  const url = new URL(post.permalink, "https://www.reddit.com");
  try {
    const response = await fetch(`https://www.reddit.com/oembed?url=${encodeURIComponent(url.href)}`, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(`oEmbed returned ${response.status}`);
  } catch (error) {
    failures += 1;
    console.error(`${post.id}: ${error.message}`);
  }
  // Manual maintenance only; never use this as a crawler.
  await new Promise((resolve) => setTimeout(resolve, 1100));
}
if (failures) process.exitCode = 1;
else console.log(`Verified ${catalog.length} Reddit permalinks through oEmbed.`);
