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

test(
  "runs a clean starter and locked module artifact from the packed CLI",
  { timeout: 300_000 },
  async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "unifold-generated-starter-"));
    try {
      await verifyGeneratedStarter(temporaryRoot);
    } finally {
      await removeTemporaryRoot(temporaryRoot);
    }
  }
);

async function verifyGeneratedStarter(temporaryRoot) {
  const manifests = await readWorkspaceManifests();
  const closure = packageClosure(manifests, [
    "@unislang/unifold-cli",
    "@unislang/unifold-export",
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
  await compileStarterModule(host);
  const app = join(host, "app");
  await addTarballOverrides(app, tarballs);
  await install(app);
  await runPnpm(["exec", "node", "verify-module.mjs"], app);
  await runPnpm(["run", "test"], app);
  await runPnpm(["run", "typecheck"], app);
  await runPnpm(["run", "build"], app);
  await runPnpm(["run", "test:e2e", "--project", "chromium"], app);
}

async function compileStarterModule(host) {
  const app = join(host, "app");
  const definition = JSON.parse(await readFile(join(app, "src", "ui.json"), "utf8"));
  await writeModuleProject(app, definition);
  await runPnpm(
    ["exec", "unifold", "module", "validate", "app/modules/modules.project.json"],
    host
  );
  await runPnpm(
    moduleFlattenArguments("app/src/ui.module.json", "app/src/ui.module.lock.json"),
    host
  );
  await mkdir(join(app, "modules", "repeat"));
  await runPnpm(
    moduleFlattenArguments(
      "app/modules/repeat/ui.module.json",
      "app/modules/repeat/ui.module.lock.json"
    ),
    host
  );
  await consumeModuleArtifact(app);
  await assertModuleArtifacts(app);
  await writeFile(join(app, "verify-module.mjs"), MODULE_VERIFIER_SOURCE);
}

async function writeModuleProject(app, definition) {
  const modules = join(app, "modules");
  await mkdir(modules);
  await Promise.all([
    writeJson(join(modules, "application.module.json"), starterModule(definition)),
    writeJson(join(modules, "modules.project.json"), moduleProject())
  ]);
}

function moduleFlattenArguments(output, lock) {
  return [
    "exec",
    "unifold",
    "module",
    "flatten",
    "app/modules/modules.project.json",
    "--output",
    output,
    "--lock",
    lock
  ];
}

async function consumeModuleArtifact(app) {
  const path = join(app, "src", "main.ts");
  const source = await readFile(path, "utf8");
  const original = 'import definition from "./ui.json" with { type: "json" };';
  const replacement =
    'import artifact from "./ui.module.json" with { type: "json" };\n\nconst definition = artifact.resolvedArtifact.document;';
  const updated = source.replace(original, replacement);
  assert.notEqual(updated, source, "The generated starter import did not match the template.");
  assert.doesNotMatch(
    updated,
    /fetch\s*\(/u,
    "The static module preview performs a runtime fetch."
  );
  await writeFile(path, updated);
}

async function assertModuleArtifacts(app) {
  const artifact = JSON.parse(await readFile(join(app, "src", "ui.module.json"), "utf8"));
  const lock = JSON.parse(await readFile(join(app, "src", "ui.module.lock.json"), "utf8"));
  assert.equal(artifact.resolvedArtifact.document.id, "unifold-starter");
  assert.equal(artifact.resolvedArtifact.document.view.$comp, "Stack");
  assert.match(artifact.resolvedArtifact.integrity, /^sha256-[A-Za-z0-9_-]{43}$/u);
  assert.equal(lock.artifactIntegrity, artifact.resolvedArtifact.integrity);
  assert.equal(lock.modules.length, 1);
}

const MODULE_VERIFIER_SOURCE = `import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createPortableJsonExport, createStaticHtmlExport, UnifoldExportStatus } from "@unislang/unifold-export";
import { prepareUnifoldDocument, UnifoldPreparationStatus } from "@unislang/unifold";
import { createUiModuleApplicationInput, uiModuleIntegrity, validateUiModuleLock } from "@unislang/unifold-modules";

const artifactText = await readFile(new URL("./src/ui.module.json", import.meta.url), "utf8");
const lockText = await readFile(new URL("./src/ui.module.lock.json", import.meta.url), "utf8");
assert.equal(artifactText, await readFile(new URL("./modules/repeat/ui.module.json", import.meta.url), "utf8"));
assert.equal(lockText, await readFile(new URL("./modules/repeat/ui.module.lock.json", import.meta.url), "utf8"));
const artifact = JSON.parse(artifactText);
const lock = JSON.parse(lockText);
const resolved = artifact.resolvedArtifact;
assert.deepEqual(validateUiModuleLock(lock).diagnostics, []);
assert.equal(resolved.integrity, lock.artifactIntegrity);
assert.equal(artifact.irIntegrity, lock.irIntegrity);
const { integrity, ...content } = resolved;
assert.equal(await uiModuleIntegrity(content), integrity);
const preparation = prepareUnifoldDocument(resolved.document);
assert.equal(preparation.status, UnifoldPreparationStatus.Valid);
assert(preparation.prepared);
assert.equal(await uiModuleIntegrity(preparation.prepared.document), lock.irIntegrity);
const input = await createUiModuleApplicationInput(resolved, lock.artifactIntegrity);
assert.equal(prepareUnifoldDocument(input.document, { layoutRegistry: input.layoutRegistry }).status, UnifoldPreparationStatus.Valid);
const portable = await createPortableJsonExport(resolved.document);
const staticHtml = await createStaticHtmlExport(resolved.document);
assert.equal(portable.status, UnifoldExportStatus.Exported);
assert.equal(staticHtml.status, UnifoldExportStatus.Exported);
assert.deepEqual(JSON.parse(portable.output.content), resolved.document);
assert.match(staticHtml.output.content, /Profile starter/u);
assert.match(staticHtml.output.content, /data-unifold-static-component="TextField"/u);
`;

function starterModule(document) {
  return {
    $schema: "https://schemas.unifold.org/ui-module/1.0/schema.json",
    schemaVersion: "1.0.0",
    id: "org.unifold.starter.application",
    version: "1.0.0",
    imports: [],
    exports: { compositions: [], documents: [{ name: "application", document }], resources: [] }
  };
}

function moduleProject() {
  return {
    $schema: "https://schemas.unifold.org/ui-module-project/1.0/schema.json",
    schemaVersion: "1.0.0",
    entry: {
      moduleId: "org.unifold.starter.application",
      version: "1.0.0",
      exportName: "application"
    },
    sources: ["application.module.json"]
  };
}

function writeJson(path, value) {
  return writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
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
  manifest.dependencies["@unislang/unifold-export"] = "0.0.0";
  manifest.dependencies["@unislang/unifold-modules"] = "0.0.0";
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
