// Downloads the official EPUBCheck release into tools/epubcheck (git-ignored).
// Run with: npm run epubcheck:install
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";

const VERSION = "5.4.0";
const SHA256 =
    "33350c61038e71dfb3d45a76aed04bf5481e6d5500cb780f6e98db8bbd15a28c";
const DOWNLOAD_URL = `https://github.com/w3c/epubcheck/releases/download/v${VERSION}/epubcheck-${VERSION}.zip`;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const toolsDir = join(root, "tools", "epubcheck");
const jarPath = join(toolsDir, `epubcheck-${VERSION}`, "epubcheck.jar");

if (existsSync(jarPath)) {
    console.log(`EPUBCheck ${VERSION} already installed at ${jarPath}`);
    process.exit(0);
}

console.log(`Downloading EPUBCheck ${VERSION}...`);
const response = await fetch(DOWNLOAD_URL);
if (!response.ok) {
    throw new Error(
        `Download failed: ${response.status} ${response.statusText}`,
    );
}
const zipBytes = new Uint8Array(await response.arrayBuffer());

const actual = createHash("sha256").update(zipBytes).digest("hex");
if (actual !== SHA256) {
    throw new Error(
        `Checksum mismatch for epubcheck-${VERSION}.zip\n  expected ${SHA256}\n  actual   ${actual}`,
    );
}

for (const [name, data] of Object.entries(unzipSync(zipBytes))) {
    if (name.endsWith("/")) continue;
    const target = join(toolsDir, name);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
}

if (!existsSync(jarPath)) {
    throw new Error(`Expected ${jarPath} after extraction, but it is missing`);
}
console.log(`Installed EPUBCheck ${VERSION} at ${jarPath}`);
