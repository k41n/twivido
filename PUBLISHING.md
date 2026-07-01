# Publishing Twivido to the Chrome Web Store

This is a one-time setup. After it, `.github/workflows/publish.yml` publishes a
new version automatically whenever you push a `vX.Y.Z` tag (or run the workflow
manually). Everything that can be automated already is — the steps below are the
ones that require a **human with a Google account and the $5 developer fee**, so
they can't be scripted.

## 1. Create a developer account (one-time, $5)

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Sign in and pay the one-time **$5** registration fee.
3. Accept the developer agreement.

## 2. First upload (creates the item + its ID)

Build the store zip locally and upload it once by hand:

```bash
npm run build   # → dist/twivido-<version>.zip
```

1. In the dashboard, **Add new item** and upload `dist/twivido-<version>.zip`.
2. Fill the listing using **[store/LISTING.md](store/LISTING.md)**:
   - Description, category (Productivity), language (English)
   - Screenshots: `store/screenshots/01-headline.png`, `02-features.png`
   - Small promo tile: `store/promo-440x280.png`
   - Icon is bundled (`src/icons/icon128.png`)
   - Privacy policy URL: link to `PRIVACY_POLICY.md` (raw GitHub URL)
   - Data-use disclosures: “does not collect user data”
3. Submit for review. First review typically takes a few days.
4. Copy the **Item ID** — you'll need it as `CWS_EXTENSION_ID`.

## 3. API credentials (for automated publishing)

Follow Google's guide: <https://developer.chrome.com/docs/webstore/using-api>

1. In Google Cloud Console, enable the **Chrome Web Store API**.
2. Create an **OAuth client ID** (type: Desktop) → note the client ID/secret.
3. Generate a **refresh token** (one-time OAuth consent). The
   `chrome-webstore-upload-cli` docs have a short script for this.

## 4. Add repository secrets

`Settings → Secrets and variables → Actions` (or via `gh`):

```bash
gh secret set CWS_EXTENSION_ID  --repo k41n/twivido
gh secret set CWS_CLIENT_ID     --repo k41n/twivido
gh secret set CWS_CLIENT_SECRET --repo k41n/twivido
gh secret set CWS_REFRESH_TOKEN --repo k41n/twivido
```

## 5. Publish future versions automatically

Bump the version in `src/manifest.json` (and `package.json`), commit, then:

```bash
git tag v1.1.1 && git push origin v1.1.1
```

The **Publish** workflow builds the zip and pushes it to the store with
`--auto-publish`. That's it.
