import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REFERENCE_BUNDLE_LIMIT_BYTES = 190 * 1024;
const FORBIDDEN_TEST_HOOKS = [
  "__unifoldMigrateProfile",
  "__unifoldStoreFixture",
  "__unifoldUpdateDocument"
];
const applicationRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

if (isMain()) {
  const evidence = await checkReferenceBundle(resolve(applicationRoot, "dist"));
  console.log(
    `Reference initial JavaScript: ${evidence.gzipBytes} gzip bytes ` +
      `(${(evidence.gzipBytes / 1024).toFixed(2)} KiB / ` +
      `${(REFERENCE_BUNDLE_LIMIT_BYTES / 1024).toFixed(2)} KiB); ` +
      `${evidence.deferredGzipBytes} deferred gzip bytes.`
  );
}

export async function checkReferenceBundle(outputRoot, limitBytes = REFERENCE_BUNDLE_LIMIT_BYTES) {
  const manifest = JSON.parse(
    await readFile(resolve(outputRoot, ".vite", "manifest.json"), "utf8")
  );
  const initialKeys = initialManifestKeys(manifest);
  const files = manifestFiles(manifest, initialKeys);
  const allFiles = manifestFiles(manifest, Object.keys(manifest));
  const deferredFiles = allFiles.filter((file) => !files.includes(file));
  const allAssets = await readAssets(outputRoot, allFiles);
  assertNoTestHooks(allAssets);
  const sizes = await gzipSizes(outputRoot, files);
  const gzipBytes = sizes.reduce((total, size) => total + size, 0);
  if (gzipBytes > limitBytes) {
    throw new Error(
      `Reference initial JavaScript is ${gzipBytes} gzip bytes; limit is ${limitBytes}.`
    );
  }
  const deferredSizes = await gzipSizes(outputRoot, deferredFiles);
  const deferredGzipBytes = deferredSizes.reduce((total, size) => total + size, 0);
  return { deferredFiles, deferredGzipBytes, files, gzipBytes, limitBytes };
}

function initialManifestKeys(manifest) {
  const entries = Object.entries(manifest)
    .filter(([, value]) => value.isEntry === true)
    .map(([key]) => key);
  const visited = new Set();
  entries.forEach((key) => collectStaticImports(manifest, key, visited));
  return [...visited];
}

function collectStaticImports(manifest, key, visited) {
  if (visited.has(key)) return;
  visited.add(key);
  const record = requireManifestRecord(manifest, key);
  (record.imports ?? []).forEach((dependency) =>
    collectStaticImports(manifest, dependency, visited)
  );
}

function requireManifestRecord(manifest, key) {
  const record = manifest[key];
  if (record === undefined) throw new Error(`Bundle manifest import is missing: ${key}.`);
  return record;
}

function manifestFiles(manifest, keys) {
  return [...new Set(keys.map((key) => manifest[key]?.file).filter(isJavaScript))].sort();
}

function isJavaScript(value) {
  return typeof value === "string" && value.endsWith(".js");
}

function readAssets(outputRoot, files) {
  return Promise.all(files.map((file) => readFile(resolve(outputRoot, file))));
}

async function gzipSizes(outputRoot, files) {
  return (await readAssets(outputRoot, files)).map((asset) => gzipSync(asset).byteLength);
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
