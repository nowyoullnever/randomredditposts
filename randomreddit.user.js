// ==UserScript==
// @name         Random Reddit Posts validation
// @namespace    https://github.com/nowyoullnever/randomredditposts
// @version      2.0.0
// @description  Retries only definitely unavailable Reddit posts opened by Random Reddit Posts.
// @match        https://nowyoullnever.github.io/randomredditposts/*
// @match        https://www.reddit.com/comments/*
// @match        https://www.reddit.com/r/*/comments/*
// @downloadURL  https://nowyoullnever.github.io/randomredditposts/randomreddit.user.js
// @updateURL    https://nowyoullnever.github.io/randomredditposts/randomreddit.user.js
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  "use strict";
  const SITE_ORIGIN = "https://nowyoullnever.github.io";
  const SITE_PATH = "/randomredditposts/";
  const MAX_POST_ID_BASE36 = "1wfcc8u";
  const MIN_POST_ID = 1n;
  const MAX_ATTEMPTS = 15;
  const RETRY_DELAY_MS = 1800;
  const POLL_INTERVAL_MS = 400;
  const MAX_POLLS = 30;

  if (location.origin === SITE_ORIGIN && location.pathname === SITE_PATH) {
    document.documentElement.dataset.randomredditUserscript = "1";
    window.dispatchEvent(new CustomEvent("randomreddit:userscript-ready", {
      detail: { protocol: "randomreddit-userscript-v1" },
    }));
    return;
  }

  const query = new URLSearchParams(location.search);
  const sessionId = query.get("rrps") || "";
  if (query.get("rrp") !== "1" || !/^[a-f0-9]{32}$/i.test(sessionId)) return;

  const stateKey = `randomreddit:session:${sessionId.toLowerCase()}`;
  const statusKey = `${stateKey}:status`;

  function setStatus(reason) {
    sessionStorage.setItem(statusKey, reason);
    console.info("[Random Reddit Posts]", reason);
  }

  function base36ToBigInt(value) {
    let result = 0n;
    for (const character of value.toLowerCase()) result = (result * 36n) + BigInt(parseInt(character, 36));
    return result;
  }

  function randomId() {
    const maximum = base36ToBigInt(MAX_POST_ID_BASE36);
    const range = maximum - MIN_POST_ID + 1n;
    const byteLength = Math.ceil(range.toString(2).length / 8);
    const limit = 1n << BigInt(byteLength * 8);
    const cutoff = limit - (limit % range);
    for (;;) {
      let value = 0n;
      for (const byte of crypto.getRandomValues(new Uint8Array(byteLength))) value = (value << 8n) | BigInt(byte);
      if (value < cutoff) return (MIN_POST_ID + (value % range)).toString(36);
    }
  }

  function hasPostContainer() {
    return document.querySelector("shreddit-post, [data-testid='post-container'], [data-testid='post-content']");
  }

  function hasDeletedPost(post) {
    if (!post) return false;
    if (post.matches("[author='[deleted]'], [author='[deleted by user]']")) return true;
    if (post.querySelector("[data-testid='deleted-post'], [data-testid='deleted-content'], [data-testid='deleted-author']")) return true;
    // Reddit's current shreddit DOM renders a deleted submission as an exact
    // deleted title and omits the normal author profile link. Both conditions
    // are required; a title string alone never decides the state.
    const title = post.querySelector("[slot='title']")?.textContent?.trim().toLowerCase();
    const hasAuthorLink = Boolean(post.querySelector("a[href*='/user/']"));
    return /^\[deleted(?: by user)?\]$/.test(title || "") && !hasAuthorLink;
  }

  function hasRateLimitOrBlock() {
    const error = document.querySelector("shreddit-error-page, [data-testid='error-page'], [role='alert']");
    if (!error) return false;
    return /too many requests|rate limit|error 429|access denied|temporarily blocked/i.test(error.textContent || "");
  }

  function hasExplicitUnavailablePage() {
    const error = document.querySelector("shreddit-error-page, [data-testid='error-page'], [data-testid='not-found'], [data-testid='page-not-found'], .ErrorPage");
    if (!error) return false;
    return /not found|unavailable|does not exist|private|banned|not accessible/i.test(error.textContent || "");
  }

  function state() {
    const post = hasPostContainer();
    if (post) return hasDeletedPost(post) ? "unavailable" : "post";
    if (hasRateLimitOrBlock()) return "blocked";
    if (hasExplicitUnavailablePage()) return "unavailable";
    return "unknown";
  }

  function retry() {
    const attempts = Number(sessionStorage.getItem(stateKey) || "0");
    if (attempts >= MAX_ATTEMPTS) {
      setStatus("Stopped after maximum retries.");
      sessionStorage.removeItem(stateKey);
      return;
    }
    sessionStorage.setItem(stateKey, String(attempts + 1));
    setStatus(`Retrying unavailable post (${attempts + 1}/${MAX_ATTEMPTS}).`);
    const next = new URL(`https://www.reddit.com/comments/${randomId()}`);
    next.searchParams.set("rrp", "1");
    next.searchParams.set("rrps", sessionId.toLowerCase());
    setTimeout(() => location.replace(next.href), RETRY_DELAY_MS);
  }

  let polls = 0;
  const observer = new MutationObserver(check);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const timer = setInterval(check, POLL_INTERVAL_MS);

  function finish(reason) {
    clearInterval(timer);
    observer.disconnect();
    setStatus(reason);
  }

  function check() {
    const pageState = state();
    if (pageState === "post") finish("Validated post loaded.");
    else if (pageState === "unavailable") {
      clearInterval(timer);
      observer.disconnect();
      retry();
    } else if (pageState === "blocked") finish("Stopped: Reddit access is limited or blocked.");
    else if (++polls >= MAX_POLLS) finish("Stopped: page state could not be determined.");
  }
})();
