/**
 * Build distributables for Twivido.
 *
 *   dist/twivido-<version>.zip   — unpacked extension archive (Web Store / Load unpacked)
 *   dist/twivido-<version>.crx   — signed package (requires a private key)
 *
 * The signing key is resolved from (in order):
 *   1. $CRX_KEY         — PEM contents (used by CI via a repository secret)
 *   2. $CRX_KEY_PATH    — path to a PEM file
 *   3. ./signing-key.pem
 *
 * Without a key, only the .zip is produced.
 */
import crx3 from "crx3";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");
const distDir = path.join(root, "dist");

const manifest = JSON.parse(readFileSync(path.join(srcDir, "manifest.json"), "utf8"));
const version = manifest.version;
const base = `twivido-${version}`;

const files = [
  "manifest.json",
  "background.js",
  "content.js",
  "popup.html",
  "popup.js",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
];

// Resolve signing key.
let keyPath = null;
let tmpKey = null;
if (process.env.CRX_KEY) {
  tmpKey = path.join(tmpdir(), `twivido-key-${process.pid}.pem`);
  writeFileSync(tmpKey, process.env.CRX_KEY, { mode: 0o600 });
  keyPath = tmpKey;
} else if (process.env.CRX_KEY_PATH && existsSync(process.env.CRX_KEY_PATH)) {
  keyPath = process.env.CRX_KEY_PATH;
} else if (existsSync(path.join(root, "signing-key.pem"))) {
  keyPath = path.join(root, "signing-key.pem");
}

mkdirSync(distDir, { recursive: true });

const options = { zipPath: path.join(distDir, `${base}.zip`) };
if (keyPath) {
  options.keyPath = keyPath;
  options.crxPath = path.join(distDir, `${base}.crx`);
}

// crx3 stores files relative to cwd, so build from the source directory.
process.chdir(srcDir);
try {
  await crx3(files, options);
} finally {
  if (tmpKey) rmSync(tmpKey, { force: true });
}

console.log(`✓ built dist/${base}.zip`);
if (keyPath) console.log(`✓ built dist/${base}.crx`);
else console.log("• no signing key — skipped .crx (set CRX_KEY or CRX_KEY_PATH)");
