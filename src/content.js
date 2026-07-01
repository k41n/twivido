/**
 * Twivido — content script.
 *
 * Adds a download button to every tweet video and image (in the timeline and on
 * tweet pages). The tweet ID is read from the tweet's permalink at click time,
 * so it stays correct even as X recycles DOM nodes while scrolling.
 */
(function () {
  "use strict";

  const BTN_CLASS = "twivido-btn";
  const VIDEO_SELECTOR = '[data-testid="videoComponent"], [data-testid="videoPlayer"]';
  const PHOTO_SELECTOR = '[data-testid="tweetPhoto"]';

  // Media kinds, in the order X lays them out inside a tweet.
  const KINDS = [
    { kind: "video", selector: VIDEO_SELECTOR, label: "Download video" },
    { kind: "photo", selector: PHOTO_SELECTOR, label: "Download image" },
  ];

  const DOWNLOAD_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" ' +
    'stroke="#fff" stroke-width="2.4" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 4v12"/><path d="M6 11l6 6 6-6"/><path d="M5 20h14"/></svg>';

  /** Find the tweet ID that owns the given element. */
  function tweetIdFor(el) {
    const article = el.closest("article");
    if (article) {
      const links = article.querySelectorAll('a[href*="/status/"]');
      // Prefer the permalink that wraps the timestamp (<time>).
      for (const a of links) {
        const m = a.getAttribute("href").match(/\/status\/(\d+)/);
        if (m && a.querySelector("time")) return m[1];
      }
      for (const a of links) {
        const m = a.getAttribute("href").match(/\/status\/(\d+)/);
        if (m) return m[1];
      }
    }
    return location.pathname.match(/\/status\/(\d+)/)?.[1] || null;
  }

  /** Index of this container among same-kind media of the same tweet. */
  function indexFor(container, selector) {
    const article = container.closest("article");
    if (!article) return 0;
    const all = [...article.querySelectorAll(selector)];
    return Math.max(0, all.indexOf(container));
  }

  function buildButton(label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = BTN_CLASS;
    btn.innerHTML = DOWNLOAD_ICON;
    btn.title = label;
    btn.setAttribute("aria-label", label);
    Object.assign(btn.style, {
      position: "absolute",
      top: "10px",
      right: "10px",
      zIndex: "9999",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "36px",
      height: "36px",
      padding: "0",
      margin: "0",
      background: "rgba(15,20,25,.75)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,.4)",
      borderRadius: "9999px",
      cursor: "pointer",
      backdropFilter: "blur(4px)",
      transition: "background .15s ease",
    });
    btn.addEventListener("mouseenter", () => (btn.style.background = "#1d9bf0"));
    btn.addEventListener("mouseleave", () => (btn.style.background = "rgba(15,20,25,.75)"));
    return btn;
  }

  function flash(btn, html, revertMs = 2500) {
    btn.innerHTML = html;
    setTimeout(() => {
      btn.innerHTML = DOWNLOAD_ICON;
      btn.disabled = false;
    }, revertMs);
  }

  function onClick(container, btn, kind, selector, event) {
    event.preventDefault();
    event.stopPropagation();

    const tweetId = tweetIdFor(container);
    if (!tweetId) {
      flash(btn, "?");
      return;
    }
    btn.disabled = true;
    btn.textContent = "…";

    try {
      chrome.runtime.sendMessage(
        { type: "downloadMedia", tweetId, kind, index: indexFor(container, selector) },
        (resp) => {
          if (chrome.runtime.lastError || !resp) {
            flash(btn, "⚠");
          } else if (resp.ok) {
            flash(btn, "✓");
          } else {
            flash(btn, "⚠");
            console.warn("[Twivido]", resp.error);
          }
        }
      );
    } catch (_) {
      // Extension was reloaded/updated — the page needs a refresh.
      flash(btn, "⟳");
    }
  }

  /** Attach a button to a media container (idempotent). */
  function attach(container, kind, selector, label) {
    // Only tweet media, not unrelated media elsewhere on X.
    if (!container.closest("article") && !/\/status\/\d+/.test(location.pathname)) return;
    if (container.querySelector(`:scope > .${BTN_CLASS}`)) return; // already there

    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }
    const btn = buildButton(label);
    btn.addEventListener("click", (e) => onClick(container, btn, kind, selector, e));
    container.appendChild(btn);
  }

  function scan() {
    for (const { kind, selector, label } of KINDS) {
      document.querySelectorAll(selector).forEach((c) => {
        // A photo container nested inside a video (poster) — skip; it's the video.
        if (kind === "photo" && c.closest(VIDEO_SELECTOR)) return;
        attach(c, kind, selector, label);
      });
    }
  }

  // Initial pass + observe the infinite timeline (debounced to once per frame).
  scan();
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
