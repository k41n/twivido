# Changelog

## 1.1.2

- **Fix:** videos that X renders as a photo *poster* (a still frame with a play
  overlay and no `<video>` element yet) were given an image button, so clicking
  to download the video failed with "This tweet has no image". Such posters are
  now detected as video/GIF and get the correct button.
- Fallback: if the requested media kind isn't present but the other kind is, the
  download now uses whatever media the tweet actually has instead of erroring.

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
