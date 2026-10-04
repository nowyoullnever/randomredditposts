const button = document.querySelector("#lucky-button");
const sfw = document.querySelector("#sfw");
const apiBase = String(window.RANDOM_REDDIT_API_BASE_URL || "").replace(/\/$/, "");
let lastId = null;

function randomEndpoint() {
  if (!apiBase) return null;
  const endpoint = new URL(`${apiBase}/random`);
  endpoint.searchParams.set("sfw", sfw.checked ? "1" : "0");
  if (lastId) endpoint.searchParams.set("exclude", lastId);
  return endpoint;
}

button.addEventListener("click", async () => {
  const endpoint = randomEndpoint();
  if (!endpoint || button.disabled) return;

  // Open synchronously to preserve the browser's user-gesture popup permission.
  const target = window.open("about:blank", "_blank");
  if (target) target.opener = null;
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "Finding…";
  try {
    const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`API request failed (${response.status})`);
    const result = await response.json();
    if (!result || typeof result.permalink !== "string" || !/^\/r\//.test(result.permalink)) throw new Error("Invalid API result");
    lastId = result.id;
    const url = new URL(result.permalink, "https://www.reddit.com").href;
    if (target) target.location.replace(url);
    else window.open(url, "_blank", "noopener");
  } catch {
    // Never navigate a blank tab to an unverified URL.
    if (target && !target.closed) target.close();
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
});
