import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { lstat, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export async function readWorkspaceManifests() {
  const packagesRoot = resolve(workspaceRoot, "packages");
  const entries = await readdir(packagesRoot, { withFileTypes: true });
  const names = entries.filter((entry) => entry.isDirectory()).map(({ name }) => name);
  const records = await Promise.all(names.map((name) => readPackageRecord(packagesRoot, name)));
  return new Map(records.map((record) => [record.manifest.name, record]));
}

export function packageClosure(manifests, roots) {
  const closure = new Map();
  const pending = [...roots];
  for (const name of pending) {
    if (closure.has(name)) continue;
    const record = manifests.get(name);
    assert(record, `Missing workspace package: ${name}.`);
    closure.set(name, record);
    pending.push(...internalDependencies(record.manifest, manifests));
  }
  return closure;
}

export async function packClosure(closure, tarballRoot) {
  const results = await Promise.all(
    [...closure].map(async ([name, record]) => [name, await packPackage(record, tarballRoot)])
  );
  return new Map(results);
}

export function runPnpm(arguments_, cwd, extraEnvironment = {}) {
  const pnpmPath = process.env["npm_execpath"];
  assert(pnpmPath, "The packed-consumer test must be launched through pnpm.");
  return runCommand(process.execPath, [pnpmPath, ...arguments_], cwd, extraEnvironment);
}

export async function removeTemporaryRoot(temporaryRoot) {
  assert(isWithin(tmpdir(), temporaryRoot), "Refusing to remove a non-temporary consumer path.");
  const target = await lstat(temporaryRoot);
  assert(target.isDirectory(), "The consumer cleanup target is not a directory.");
  await rm(temporaryRoot, { force: true, maxRetries: 3, recursive: true, retryDelay: 100 });
}

async function readPackageRecord(packagesRoot, name) {
  const directory = resolve(packagesRoot, name);
  const manifest = JSON.parse(await readFile(resolve(directory, "package.json"), "utf8"));
  return { directory, manifest };
}

function internalDependencies(manifest, manifests) {
  return Object.keys(manifest.dependencies ?? {}).filter((name) => manifests.has(name));
}

async function packPackage(record, tarballRoot) {
  const result = await runPnpm(
    ["pack", "--pack-destination", tarballRoot, "--json"],
    record.directory
  );
  const packed = JSON.parse(result.stdout);
  assertPacklist(record.manifest.name, packed.files);
  return packed.filename;
}

function assertPacklist(name, files) {
  const paths = files.map(({ path }) => path);
  assert(paths.includes("package.json"), `${name} omitted package.json.`);
  assert(
    paths.some((path) => /^README(?:\.|$)/iu.test(path)),
    `${name} omitted its README.`
  );
  assert(!paths.some((path) => path.endsWith(".tsbuildinfo")), `${name} leaked build state.`);
  assert(!paths.some((path) => /(?:^|\/)src\/.*\.test\./u.test(path)), `${name} leaked tests.`);
  assert(
    !paths.some((path) => /(?:^|\/)src\/.*test-helpers\.ts$/u.test(path)),
    `${name} leaked test helpers.`
  );
}

async function runCommand(command, arguments_, cwd, extraEnvironment) {
  try {
    return await execFile(command, arguments_, {
      cwd,
      encoding: "utf8",
      env: { ...process.env, ...extraEnvironment },
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true
    });
  } catch (error) {
    throw commandError(command, arguments_, error);
  }
}

function commandError(command, arguments_, error) {
  const output = [error?.stdout, error?.stderr].filter(Boolean).join("\n");
  return new Error(`Command failed: ${command} ${arguments_.join(" ")}\n${output}`, {
    cause: error
  });
}

function isWithin(parent, candidate) {
  const nested = relative(resolve(parent), resolve(candidate));
  return nested !== "" && !nested.startsWith("..") && !isAbsolute(nested);
}
