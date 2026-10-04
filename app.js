import { drawPostId, permalinkFor } from "./random.js";

const button = document.querySelector("#lucky-button");
let previousId = "";

button.addEventListener("click", () => {
  // Opening synchronously keeps this user-initiated tab out of popup blocking.
  const target = window.open("about:blank", "_blank");
  if (!target) return;
  target.opener = null;
  const id = drawPostId(previousId);
  previousId = id;
  // This is intentionally an unverified candidate. No Reddit API is called.
  target.location.replace(permalinkFor(id));
});
