import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { copyConsumerFixture, tarballSpecifier, writeHostManifest } from "./host-fixture.mjs";
import {
  createPhysicalRegistrationCopies,
  registrationExternalDependencies
} from "./registration-fixture.mjs";
import {
  packageClosure,
  packClosure,
  readWorkspaceManifests,
  removeTemporaryRoot,
  runPnpm
} from "./package-fixture.mjs";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), "fixture");
const hostFixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../host-parity");
const reviewedPackages = Object.freeze([
  "@unislang/unifold",
  "@unislang/unifold-catalog",
  "@unislang/unifold-compositions",
  "@unislang/unifold-contracts",
  "@unislang/unifold-data",
  "@unislang/unifold-elements",
  "@unislang/unifold-events",
  "@unislang/unifold-forms",
  "@unislang/unifold-ir",
  "@unislang/unifold-jsonui",
  "@unislang/unifold-reactivity",
  "@unislang/unifold-renderer-dom",
  "@unislang/unifold-rules",
  "@unislang/unifold-runtime",
  "@unislang/unifold-semantics",
  "@unislang/unifold-theme",
  "@unislang/unifold-xstate"
]);
const reviewedHostSupport = Object.freeze([
  "@unislang/unifold-playwright",
  "@unislang/unifold-testkit"
]);

test(
  "installs and runs packed Unifold from outside the monorepo",
  { timeout: 300_000 },
  async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "unifold-consumer-"));
    try {
      await verifyPackedConsumer(temporaryRoot);
    } finally {
      await removeTemporaryRoot(temporaryRoot);
    }
  }
);

async function verifyPackedConsumer(temporaryRoot) {
  const manifests = await readWorkspaceManifests();
  const closure = productionClosure(manifests);
  assert.deepEqual([...closure.keys()].sort(), [...reviewedPackages].sort());
  const tarballRoot = join(temporaryRoot, "tarballs");
  const consumerRoot = join(temporaryRoot, "consumer");
  const tarballs = await packClosure(closure, tarballRoot);
  await cp(fixtureRoot, consumerRoot, { recursive: true });
  await writeConsumerManifest(consumerRoot, tarballs);
  await installConsumer(consumerRoot);
  await createPhysicalRegistrationCopies(consumerRoot);
  await inspectInstalledConsumer(consumerRoot, temporaryRoot, closure);
  await runConsumerChecks(consumerRoot);
  const hostSupport = packageClosure(manifests, ["@unislang/unifold-playwright"]);
  for (const name of closure.keys()) hostSupport.delete(name);
  assert.deepEqual([...hostSupport.keys()].sort(), [...reviewedHostSupport].sort());
  const supportTarballs = await packClosure(hostSupport, tarballRoot);
  await verifyPackedHosts(temporaryRoot, new Map([...tarballs, ...supportTarballs]));
}

async function verifyPackedHosts(temporaryRoot, tarballs) {
  const consumerRoot = join(temporaryRoot, "host-parity");
  await copyConsumerFixture(hostFixtureRoot, consumerRoot);
  await writeHostManifest(consumerRoot, tarballs);
  await installConsumer(consumerRoot);
  await inspectInstalledConsumer(consumerRoot, temporaryRoot, tarballs);
  await runHostChecks(consumerRoot);
}

function productionClosure(manifests) {
  return packageClosure(manifests, ["@unislang/unifold", "@unislang/unifold-theme"]);
}

async function writeConsumerManifest(consumerRoot, tarballs) {
  const specifications = Object.fromEntries(
    [...tarballs].map(([name, path]) => [name, tarballSpecifier(consumerRoot, path)])
  );
  const manifest = {
    name: "unifold-packed-consumer",
    version: "0.0.0",
    private: true,
    type: "module",
    packageManager: "pnpm@10.15.1",
    dependencies: { ...registrationExternalDependencies, ...specifications },
    devDependencies: {
      "@playwright/test": "1.62.1",
      "@types/node": "24.3.0",
      typescript: "5.9.2",
      vite: "7.3.6"
    },
    pnpm: { overrides: specifications }
  };
  await writeFile(join(consumerRoot, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function installConsumer(consumerRoot) {
  await runPnpm(
    ["install", "--prefer-offline", "--ignore-workspace", "--no-frozen-lockfile"],
    consumerRoot,
    { PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" }
  );
}

async function inspectInstalledConsumer(consumerRoot, temporaryRoot, closure) {
  await assertCleanLockfile(consumerRoot);
  for (const [name] of closure) {
    const packageRoot = join(consumerRoot, "node_modules", ...name.split("/"));
    await assertInstalledPackage(name, packageRoot, temporaryRoot);
  }
}

async function assertCleanLockfile(consumerRoot) {
  const lock = await readFile(join(consumerRoot, "pnpm-lock.yaml"), "utf8");
  assert(!lock.includes("workspace:"), "Consumer lockfile retained a workspace protocol.");
  assert(!lock.includes("link:"), "Consumer lockfile retained a workspace link.");
  assert(!lock.includes(workspaceRoot), "Consumer lockfile references the repository.");
}

async function assertInstalledPackage(name, packageRoot, temporaryRoot) {
  const resolved = await realpath(packageRoot);
  assert(isWithin(temporaryRoot, resolved), `${name} resolves outside the clean consumer.`);
  const manifestText = await readFile(join(packageRoot, "package.json"), "utf8");
  assert(!/workspace:|link:|file:/u.test(manifestText), `${name} retained a local dependency.`);
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.private, true, `${name} unexpectedly became publishable.`);
  await assertExportTargets(packageRoot, manifest.exports);
  await assertPackageFiles(packageRoot);
}

async function assertExportTargets(packageRoot, exports) {
  const targets = exportTargets(exports);
  assert(targets.length > 0, `${packageRoot} has no declared export targets.`);
  for (const target of targets) await stat(resolve(packageRoot, target));
}

function exportTargets(value) {
  if (typeof value === "string") return exportedPath(value);
  if (!isExportObject(value)) return [];
  return Object.values(value).flatMap(exportTargets);
}

function exportedPath(value) {
  return value.startsWith("./") ? [value] : [];
}

function isExportObject(value) {
  return value !== null && typeof value === "object";
}

async function assertPackageFiles(packageRoot) {
  const files = await walkFiles(packageRoot);
  assert(
    !files.some((path) => path.endsWith(".tsbuildinfo")),
    `${packageRoot} leaked build state.`
  );
  const maps = files.filter((path) => path.endsWith(".map"));
  assert(maps.length > 0, `${packageRoot} omitted source maps.`);
  for (const mapPath of maps) await assertSourceMap(mapPath);
}

async function assertSourceMap(mapPath) {
  const sourceMap = JSON.parse(await readFile(mapPath, "utf8"));
  if (Array.isArray(sourceMap.sourcesContent)) {
    return void assert.equal(
      sourceMap.sourcesContent.length,
      sourceMap.sources.length,
      `${mapPath} is incomplete.`
    );
  }
  await Promise.all(sourceMap.sources.map((source) => stat(resolve(dirname(mapPath), source))));
}

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => walkEntry(directory, entry)));
  return nested.flat();
}

async function walkEntry(directory, entry) {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? walkFiles(path) : [path];
}

async function runConsumerChecks(consumerRoot) {
  await runPnpm(["exec", "tsc", "-p", "tsconfig.json", "--noEmit"], consumerRoot);
  await runPnpm(["exec", "vite", "build"], consumerRoot);
  const port = await availablePort();
  await runPnpm(
    ["exec", "playwright", "test", "--config", "playwright.config.ts", "--project", "chromium"],
    consumerRoot,
    { CONSUMER_PORT: String(port) }
  );
}

async function runHostChecks(consumerRoot) {
  await runPnpm(["run", "build"], consumerRoot);
  await runPnpm(["run", "test:unit"], consumerRoot);
  const port = await availablePort();
  await runPnpm(
    ["exec", "playwright", "test", "--config", "playwright.config.ts", "--project", "chromium"],
    consumerRoot,
    { PLAYWRIGHT_HOST_PARITY_PORT: String(port) }
  );
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object", "Unable to reserve a consumer preview port.");
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

function isWithin(parent, candidate) {
  const nested = relative(resolve(parent), resolve(candidate));
  return nested !== "" && !nested.startsWith("..") && !isAbsolute(nested);
}
