# Privacy Policy — Twivido

_Last updated: 2026-07-01_

Twivido is designed to do one thing — download media from X — and to do it
entirely on your device.

## What we collect

**Nothing.** Twivido does not collect, store, transmit, or sell any personal
information. There are no analytics, no tracking, no accounts, and no
third-party servers operated by us.

## What the extension accesses

- **The page you're on (x.com / twitter.com):** the content script reads the
  tweet's ID from the page so it knows which media to fetch. This never leaves
  your browser except as the request described below.
- **X's own servers:** to resolve a downloadable file, Twivido calls X's public
  endpoints (`cdn.syndication.twimg.com`) and downloads the media from
  `video.twimg.com` / `pbs.twimg.com`. These requests go directly from your
  browser to X, exactly as they would when you use X normally.
- **Downloads:** the `downloads` permission is used solely to save the file you
  asked for to your computer.

No data is sent to any destination other than X.

## Permissions

| Permission | Why |
|------------|-----|
| `downloads` | Save the selected video/image to your device. |
| Host access to `x.com`, `twitter.com`, `*.twimg.com` | Read the tweet ID on the page and fetch the media from X. |

## Data retention

Twivido keeps no data. Downloaded files live on your device under your control.

## Changes

Any changes to this policy will be published in this file in the project
repository.

## Contact

Questions or concerns: open an issue at
<https://github.com/k41n/twivido/issues>.
