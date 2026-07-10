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
  // X renders some videos/GIFs as a photo *poster* with a play overlay and no
  // <video>/videoComponent in the DOM yet. These markers identify such a poster.
  const PLAY_SELECTOR =
    '[data-testid="playButton"], [aria-label="Play"], [aria-label*="Embedded video" i], ' +
    '[aria-label*="GIF" i], [aria-label*="Play" i]';

  /** True when a `tweetPhoto` is actually a video/GIF preview, not a still image. */
  function isVideoPoster(photo) {
    if (photo.querySelector(PLAY_SELECTOR)) return true;
    // The play control is sometimes a sibling inside the shared media wrapper.
    const wrap = photo.parentElement;
    return !!(wrap && wrap !== photo && wrap.querySelector(PLAY_SELECTOR));
  }

  /** Elements in `scope` sorted by their position in the document. */
  function inDomOrder(elements) {
    return [...elements].sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );
  }

  /**
   * Video "roots" in `scope`: known X containers, plus a fallback for bare
   * <video> elements (X's markup varies — e.g. logged-out tweet pages don't use
   * data-testid="videoComponent").
   */
  function videoRoots(scope) {
    const set = new Set(scope.querySelectorAll(VIDEO_SELECTOR));
    for (const v of scope.querySelectorAll("video")) {
      if (!v.closest(VIDEO_SELECTOR)) set.add(v.parentElement || v);
    }
    // Videos/GIFs that X renders as a photo poster (no <video> yet).
    for (const p of scope.querySelectorAll(PHOTO_SELECTOR)) {
      if (!p.closest(VIDEO_SELECTOR) && isVideoPoster(p)) set.add(p);
    }
    return inDomOrder(set);
  }

  /** Image roots in `scope` (skip video containers and video/GIF posters). */
  function photoRoots(scope) {
    return inDomOrder(
      [...scope.querySelectorAll(PHOTO_SELECTOR)].filter(
        (c) => !c.closest(VIDEO_SELECTOR) && !isVideoPoster(c)
      )
    );
  }

  const KINDS = [
    { kind: "video", roots: videoRoots, label: "Download video" },
    { kind: "photo", roots: photoRoots, label: "Download image" },
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

  /** Index of this root among same-kind media of the same tweet. */
  function indexFor(root, rootsOf) {
    const article = root.closest("article");
    if (!article) return 0;
    return Math.max(0, rootsOf(article).indexOf(root));
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

  function onClick(root, btn, kind, rootsOf, event) {
    event.preventDefault();
    event.stopPropagation();

    const tweetId = tweetIdFor(root);
    if (!tweetId) {
      flash(btn, "?");
      return;
    }
    btn.disabled = true;
    btn.textContent = "…";

    try {
      chrome.runtime.sendMessage(
        { type: "downloadMedia", tweetId, kind, index: indexFor(root, rootsOf) },
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

  /** Attach a button to a media root (idempotent). */
  function attach(root, kind, rootsOf, label) {
    // Only tweet media, not unrelated media elsewhere on X.
    if (!root.closest("article") && !/\/status\/\d+/.test(location.pathname)) return;
    if (root.querySelector(`:scope > .${BTN_CLASS}`)) return; // already there

    if (getComputedStyle(root).position === "static") {
      root.style.position = "relative";
    }
    const btn = buildButton(label);
    btn.addEventListener("click", (e) => onClick(root, btn, kind, rootsOf, e));
    root.appendChild(btn);
  }

  function scan() {
    for (const { kind, roots, label } of KINDS) {
      roots(document).forEach((r) => attach(r, kind, roots, label));
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
