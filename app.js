import { createSessionId, drawPostId, markedPermalinkFor } from "./random.js";

const button = document.querySelector("#lucky-button");
const validationStatus = document.querySelector("#validation-status");
let previousId = "";

function enableValidation() {
  validationStatus.textContent = "Automatic validation enabled.";
}

if (document.documentElement.dataset.randomredditUserscript === "1") enableValidation();
window.addEventListener("randomreddit:userscript-ready", (event) => {
  if (event instanceof CustomEvent && event.detail?.protocol === "randomreddit-userscript-v1") enableValidation();
});

button.addEventListener("click", () => {
  // Opening synchronously keeps this user-initiated tab out of popup blocking.
  const target = window.open("about:blank", "_blank");
  if (!target) return;
  target.opener = null;
  const id = drawPostId(previousId);
  previousId = id;
  // This is intentionally an unverified candidate. No Reddit API is called.
  target.location.replace(markedPermalinkFor(id, createSessionId()));
});
