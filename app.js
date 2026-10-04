import { isValidPost, pickPost } from "./picker.js";

const button = document.querySelector("#lucky-button");
const sfw = document.querySelector("#sfw");
let previousId = null;
const posts = fetch("./data/posts.json", { cache: "force-cache" })
  .then((response) => response.ok ? response.json() : Promise.reject(new Error("Catalog unavailable")))
  .then((catalog) => Array.isArray(catalog) ? catalog.filter(isValidPost) : []);

button.addEventListener("click", async () => {
  if (button.disabled) return;
  // This must happen inside the click event, before awaiting the local catalog.
  const target = window.open("about:blank", "_blank");
  if (target) target.opener = null;
  button.disabled = true;
  const label = button.textContent;
  button.textContent = "Finding…";
  try {
    const post = pickPost(await posts, sfw.checked, previousId);
    if (!post) throw new Error("No eligible verified post");
    previousId = post.id;
    target?.location.replace(new URL(post.permalink, "https://www.reddit.com").href);
  } catch {
    // Catalog and link failures never navigate a new tab to a guessed URL.
    if (target && !target.closed) target.close();
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
});
