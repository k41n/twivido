# Changelog

## 1.1.1

- Fix: the download button now also appears where X renders a bare `<video>`
  without its usual container (e.g. logged-out tweet pages), restoring the
  fallback and making detection more robust across layouts.
- Add a real, reproducible demo recording (`npm run demo` → `docs/demo.gif`).

## 1.1.0

- **Images:** download button now appears on tweet images too, saved at original
  resolution.
- **GIFs:** animated GIFs download as MP4 (X serves them that way).
- Unified media handling (video / GIF / image) behind one button.

## 1.0.0

First public release.

- Download button on every tweet video, in the timeline and on tweet pages.
- Resolves the tweet's progressive MP4 (audio + video muxed) from X's public
  syndication endpoint and saves the highest bitrate.
- Popup with a one-click download for the currently open tweet.
- Works in Arc, Chrome, Edge, Brave and other Chromium browsers.
