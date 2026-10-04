// ==UserScript==
// @name         Random Reddit Posts - retry unavailable IDs
// @namespace    https://github.com/nowyoullnever/randomredditposts
// @version      1.0.0
// @description  Retries a bounded number of randomly generated Reddit submission IDs only after a definite unavailable-post page.
// @match        https://www.reddit.com/comments/*
// @match        https://www.reddit.com/r/*/comments/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  "use strict";
  const MAX_POST_ID_BASE36 = "1wfcc8u";
  const MIN_POST_ID = 1n;
  const MAX_ATTEMPTS = 5;
  const RETRY_DELAY_MS = 1500;
  const ATTEMPT_KEY = "random-reddit-posts-retry-count";

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

  function pageState() {
    const title = document.title.toLowerCase();
    const hasPost = Boolean(document.querySelector("shreddit-post, [data-testid='post-container'], [data-testid='post-content']"));
    if (hasPost) return "post";
    const explicitError = document.querySelector("shreddit-error-page, [data-testid='error-page'], [data-testid='not-found'], .ErrorPage");
    const unavailableTitle = /page not found|page unavailable|reddit server error/.test(title);
    return explicitError || unavailableTitle ? "unavailable" : "unknown";
  }

  function retry() {
    const attempts = Number(sessionStorage.getItem(ATTEMPT_KEY) || "0");
    if (attempts >= MAX_ATTEMPTS) {
      sessionStorage.removeItem(ATTEMPT_KEY);
      return;
    }
    sessionStorage.setItem(ATTEMPT_KEY, String(attempts + 1));
    setTimeout(() => location.replace(`https://www.reddit.com/comments/${randomId()}`), RETRY_DELAY_MS);
  }

  let polls = 0;
  const timer = setInterval(() => {
    const state = pageState();
    if (state === "post") {
      sessionStorage.removeItem(ATTEMPT_KEY);
      clearInterval(timer);
    } else if (state === "unavailable") {
      clearInterval(timer);
      retry();
    } else if (++polls >= 12) {
      // Unknown includes login and network/challenge states; never mislabel it
      // as an invalid ID and never start an unbounded retry loop.
      clearInterval(timer);
    }
  }, 500);
})();
