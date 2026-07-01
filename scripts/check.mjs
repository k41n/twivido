/**
 * Lightweight integrity checks (no external deps):
 *  - manifest.json is valid JSON with required fields
 *  - every extension JS file parses
 *  - referenced files exist
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");
const fail = (m) => {
  console.error("✗ " + m);
  process.exitCode = 1;
};

let manifest;
try {
  manifest = JSON.parse(readFileSync(path.join(srcDir, "manifest.json"), "utf8"));
  console.log("✓ manifest.json is valid JSON");
} catch (e) {
  fail("manifest.json invalid: " + e.message);
  process.exit(1);
}

for (const field of ["manifest_version", "name", "version"]) {
  if (!manifest[field]) fail(`manifest.json missing "${field}"`);
}

const referenced = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...(manifest.content_scripts?.flatMap((c) => c.js) || []),
  ...Object.values(manifest.icons || {}),
].filter(Boolean);

for (const rel of referenced) {
  if (!existsSync(path.join(srcDir, rel))) fail(`referenced file missing: src/${rel}`);
}

for (const js of ["background.js", "content.js", "popup.js"]) {
  try {
    execFileSync(process.execPath, ["--check", path.join(srcDir, js)]);
    console.log(`✓ ${js} parses`);
  } catch {
    fail(`${js} has a syntax error`);
  }
}

if (!process.exitCode) console.log("All checks passed.");
