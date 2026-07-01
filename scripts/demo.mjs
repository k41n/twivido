/**
 * Record a real demo of Twivido on x.com and export docs/demo.gif.
 *
 * Loads the unpacked extension into Chromium, opens a public tweet, waits for
 * the injected ⬇ button, animates a synthetic cursor to it, hovers, and clicks
 * (a real download). The session is recorded and converted to a GIF with ffmpeg.
 *
 *   npm run demo
 *
 * Requires: playwright (dev dep) + ffmpeg on PATH.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extDir = path.join(root, "src");
const docsDir = path.join(root, "docs");
const TWEET =
  process.env.DEMO_TWEET ||
  "https://x.com/Oyee_grace/status/2071826400768589924";

const W = 500;
const H = 780;
const userDataDir = mkdtempSync(path.join(tmpdir(), "twivido-demo-"));
const videoDir = mkdtempSync(path.join(tmpdir(), "twivido-vid-"));
const dlDir = mkdtempSync(path.join(tmpdir(), "twivido-dl-"));
mkdirSync(docsDir, { recursive: true });

// A synthetic cursor + click ripple, so the recording reads clearly.
const CURSOR = `
  const dot = document.createElement('div');
  Object.assign(dot.style, {position:'fixed',zIndex:2147483647,width:'22px',height:'22px',
    marginLeft:'-4px',marginTop:'-4px',pointerEvents:'none',transition:'transform .04s linear',
    background:'rgba(255,255,255,.95)',border:'2px solid #1d9bf0',borderRadius:'50%',
    boxShadow:'0 2px 8px rgba(0,0,0,.4)',left:'0',top:'0'});
  const add = () => document.documentElement.appendChild(dot);
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', add) : add();
  addEventListener('mousemove', e => { dot.style.left = e.clientX+'px'; dot.style.top = e.clientY+'px'; }, true);
  addEventListener('mousedown', () => dot.style.transform = 'scale(.7)', true);
  addEventListener('mouseup', () => dot.style.transform = 'scale(1)', true);
`;

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false, // MV3 extensions (service worker) require headful Chromium
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  acceptDownloads: true,
  locale: "en-US",
  timezoneId: "America/New_York",
  recordVideo: { dir: videoDir, size: { width: W, height: H } },
  args: [
    "--no-sandbox",
    "--lang=en-US",
    `--disable-extensions-except=${extDir}`,
    `--load-extension=${extDir}`,
    "--force-color-profile=srgb",
  ],
});

const page = context.pages()[0] || (await context.newPage());
await page.addInitScript(CURSOR);
context.on("download", (d) => d.saveAs(path.join(dlDir, d.suggestedFilename())).catch(() => {}));

try {
  await page.goto(TWEET, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Wait for the cookie banner to render, click "Refuse", then hide any residue.
  await page.waitForTimeout(1800);
  for (let i = 0; i < 3; i++) {
    const clicked = await page.evaluate(() => {
      const b = [...document.querySelectorAll("button,[role=button]")].find(
        (el) => /refuse non-essential|accept all cookies/i.test(el.textContent || "") && el.offsetParent
      );
      if (b) { b.click(); return true; }
      return false;
    });
    if (clicked) { await page.waitForTimeout(350); break; }
    await page.waitForTimeout(350);
  }
  await page.evaluate(() => {
    const marker = [...document.querySelectorAll("span,div")].find((e) =>
      /Did someone say|use cookies to provide/i.test(e.textContent || "")
    );
    let n = marker;
    while (n && n.parentElement) {
      const pos = getComputedStyle(n).position;
      if (pos === "fixed" || pos === "absolute") { n.style.display = "none"; return; }
      n = n.parentElement;
    }
  });

  const btn = page.locator(".twivido-btn").first();
  await btn.waitFor({ state: "visible", timeout: 25000 });
  console.log("✓ Twivido button injected on the real tweet");

  await page.waitForTimeout(1200);
  const box = await btn.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Animate the cursor in from the middle of the video.
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.move(cx, cy, { steps: 30 });
  await page.waitForTimeout(1000); // hover: button turns blue
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  await btn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(2600); // show the ✓ confirmation
} finally {
  await context.close(); // flushes the video file
}

// Locate the recorded video and convert to GIF.
const webm = readdirSync(videoDir)
  .filter((f) => f.endsWith(".webm"))
  .map((f) => path.join(videoDir, f))[0];
if (!webm) throw new Error("No video was recorded");

const gif = path.join(docsDir, "demo.gif");
const palette = path.join(videoDir, "palette.png");
const vf = "fps=15,scale=440:-1:flags=lanczos";
execFileSync("ffmpeg", ["-y", "-i", webm, "-vf", `${vf},palettegen=stats_mode=diff`, palette], { stdio: "ignore" });
execFileSync(
  "ffmpeg",
  ["-y", "-i", webm, "-i", palette, "-lavfi", `${vf}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`, gif],
  { stdio: "ignore" }
);

console.log(`✓ wrote ${path.relative(root, gif)}`);

// Cleanup temp dirs.
for (const d of [userDataDir, videoDir, dlDir]) rmSync(d, { recursive: true, force: true });
