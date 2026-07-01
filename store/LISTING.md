# Chrome Web Store listing

Copy-paste content for the store submission. Keep in sync with `src/manifest.json`.

## Name

Twivido — X (Twitter) Video & Image Downloader

## Summary (≤132 chars)

Download videos, GIFs and images from X (Twitter) in one click — right from your feed. Best quality, with audio. No servers.

## Category

Productivity

## Language

English

## Description

Twivido adds a ⬇ download button to every video, GIF and image on X (Twitter) —
in your timeline and on tweet pages. One click saves the file to your computer.

★ Download right from the feed — no need to open each tweet
★ Videos & GIFs in the best available quality, with audio
★ Images at their original resolution
★ No account, no login, no paste-the-link boxes
★ Private: everything runs locally in your browser; nothing is sent to any
  server except X itself
★ Free and open source (MIT)

HOW IT WORKS
X streams videos with separate audio and video tracks, so a naive download ends
up silent or picture-less. Twivido instead resolves the tweet's progressive MP4
(audio + video together) from X's public endpoint and saves the best quality —
no transcoding, no third-party service.

Works with public tweets.

Open source: https://github.com/k41n/twivido

Not affiliated with X Corp. For personal use — please respect copyright and X's
Terms of Service.

## Privacy

- Single purpose: download media from X.
- Does not collect or transmit user data. See PRIVACY_POLICY.md.
- Privacy policy URL: https://github.com/k41n/twivido/blob/main/PRIVACY_POLICY.md

### Permission justifications

- **downloads** — save the selected video/image to the user's device.
- **Host permissions (x.com, twitter.com, *.twimg.com)** — read the tweet ID on
  the page and fetch the media directly from X.
- **No remote code** is used; all logic ships in the package.

## Assets

- Icon: `src/icons/icon128.png`
- Screenshots (1280×800): `store/screenshots/`
- Small promo tile (440×280): `store/promo-440x280.png`
