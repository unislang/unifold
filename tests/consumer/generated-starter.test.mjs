import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { tarballSpecifier } from "./host-fixture.mjs";
import {
  packageClosure,
  packClosure,
  readWorkspaceManifests,
  removeTemporaryRoot,
  runPnpm
} from "./package-fixture.mjs";

test("generates and runs a clean starter from the packed CLI", { timeout: 300_000 }, async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "unifold-generated-starter-"));
  try {
    await verifyGeneratedStarter(temporaryRoot);
  } finally {
    await removeTemporaryRoot(temporaryRoot);
  }
});

async function verifyGeneratedStarter(temporaryRoot) {
  const manifests = await readWorkspaceManifests();
  const closure = packageClosure(manifests, [
    "@unislang/unifold-cli",
    "@unislang/unifold-playwright",
    "@unislang/unifold-theme"
  ]);
  const tarballs = await packClosure(closure, join(temporaryRoot, "tarballs"));
  const host = join(temporaryRoot, "host");
  await writeHostManifest(host, tarballs);
  await install(host);
  await runPnpm(["exec", "unifold", "generate", "starter", "app", "--no-install"], host);
  await assertGeneratedFiles(host);
  await runPnpm(["exec", "unifold", "validate", "app/src/ui.json"], host);
  const app = join(host, "app");
  await addTarballOverrides(app, tarballs);
  await install(app);
  await runPnpm(["run", "test"], app);
  await runPnpm(["run", "typecheck"], app);
  await runPnpm(["run", "build"], app);
  await runPnpm(["run", "test:e2e", "--project", "chromium"], app);
}

async function writeHostManifest(host, tarballs) {
  await mkdir(host);
  const specifications = tarballSpecifications(host, tarballs);
  const manifest = {
    name: "unifold-cli-host",
    version: "0.0.0",
    private: true,
    type: "module",
    dependencies: { "@unislang/unifold-cli": specifications["@unislang/unifold-cli"] },
    pnpm: { overrides: specifications }
  };
  await writeFile(join(host, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function addTarballOverrides(app, tarballs) {
  const path = join(app, "package.json");
  const manifest = JSON.parse(await readFile(path, "utf8"));
  manifest.pnpm = { overrides: tarballSpecifications(app, tarballs) };
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

function tarballSpecifications(consumerRoot, tarballs) {
  return Object.fromEntries(
    [...tarballs].map(([name, path]) => [name, tarballSpecifier(consumerRoot, path)])
  );
}

async function install(directory) {
  await runPnpm(
    ["install", "--prefer-offline", "--ignore-workspace", "--no-frozen-lockfile"],
    directory,
    { PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" }
  );
}

async function assertGeneratedFiles(host) {
  const manifest = JSON.parse(await readFile(join(host, "app", "package.json"), "utf8"));
  assert.equal(manifest.dependencies["@unislang/unifold"], "0.0.0");
  const config = await readFile(join(host, "app", "playwright.config.ts"), "utf8");
  assert.match(config, /vite preview/u);
  assert.doesNotMatch(config, /\.template/u);
}
