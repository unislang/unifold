import { readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REFERENCE_BUNDLE_LIMIT_BYTES = 180 * 1024;
const applicationRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

if (isMain()) {
  const evidence = await checkReferenceBundle(resolve(applicationRoot, "dist", "assets"));
  console.log(
    `Reference JavaScript: ${evidence.gzipBytes} gzip bytes ` +
      `(${(evidence.gzipBytes / 1024).toFixed(2)} KiB / 180.00 KiB).`
  );
}

export async function checkReferenceBundle(assetsRoot, limitBytes = REFERENCE_BUNDLE_LIMIT_BYTES) {
  const names = (await readdir(assetsRoot)).filter((name) => name.endsWith(".js")).sort();
  const sizes = await Promise.all(
    names.map(async (name) => gzipSync(await readFile(resolve(assetsRoot, name))).byteLength)
  );
  const gzipBytes = sizes.reduce((total, size) => total + size, 0);
  if (gzipBytes > limitBytes) {
    throw new Error(`Reference JavaScript is ${gzipBytes} gzip bytes; limit is ${limitBytes}.`);
  }
  return { files: names, gzipBytes, limitBytes };
}

function isMain() {
  return (
    process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])
  );
}
