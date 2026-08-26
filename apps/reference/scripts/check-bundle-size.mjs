import { readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REFERENCE_BUNDLE_LIMIT_BYTES = 180 * 1024;
const FORBIDDEN_TEST_HOOKS = [
  "__unifoldMigrateProfile",
  "__unifoldStoreFixture",
  "__unifoldUpdateDocument"
];
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
  const assets = await Promise.all(names.map((name) => readFile(resolve(assetsRoot, name))));
  assertNoTestHooks(assets);
  const sizes = assets.map((asset) => gzipSync(asset).byteLength);
  const gzipBytes = sizes.reduce((total, size) => total + size, 0);
  if (gzipBytes > limitBytes) {
    throw new Error(`Reference JavaScript is ${gzipBytes} gzip bytes; limit is ${limitBytes}.`);
  }
  return { files: names, gzipBytes, limitBytes };
}

function assertNoTestHooks(assets) {
  const source = Buffer.concat(assets).toString("utf8");
  if (FORBIDDEN_TEST_HOOKS.some((hook) => source.includes(hook))) {
    throw new Error("Reference production JavaScript contains an end-to-end test hook.");
  }
}

function isMain() {
  return (
    process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])
  );
}
