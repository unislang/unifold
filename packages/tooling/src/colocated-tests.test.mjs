import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { findColocationViolations } from "./colocated-tests.mjs";

const temporaryDirectories = [];

async function createPackage(prefix = "unifold-tests-") {
  const packagePath = await mkdtemp(join(tmpdir(), prefix));
  temporaryDirectories.push(packagePath);
  await mkdir(join(packagePath, "src"));
  return packagePath;
}

async function createFile(filePath) {
  await writeFile(filePath, "export {};\n", "utf8");
}

afterEach(async () => {
  const removals = temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true }));
  await Promise.all(removals);
});

test("accepts one colocated test for its source module", async () => {
  const packagePath = await createPackage();
  await createFile(join(packagePath, "src", "feature.ts"));
  await createFile(join(packagePath, "src", "feature.test.ts"));
  assert.deepEqual(await findColocationViolations([packagePath]), []);
});

test("accepts a script test colocated with its script source", async () => {
  const packagePath = await createPackage();
  await mkdir(join(packagePath, "scripts"));
  await createFile(join(packagePath, "scripts", "generate.mjs"));
  await createFile(join(packagePath, "scripts", "generate.test.mjs"));
  assert.deepEqual(await findColocationViolations([packagePath]), []);
});

test("rejects a package script without its one-to-one test", async () => {
  const packagePath = await createPackage();
  await mkdir(join(packagePath, "scripts"));
  await createFile(join(packagePath, "scripts", "generate.mjs"));
  const violations = await findColocationViolations([packagePath]);
  assert.equal(violations[0]?.kind, "missing-test");
});

test("rejects centralized tests", async () => {
  const packagePath = await createPackage();
  await mkdir(join(packagePath, "test"));
  await createFile(join(packagePath, "test", "feature.test.ts"));
  const violations = await findColocationViolations([packagePath]);
  assert.equal(violations[0]?.kind, "not-colocated");
});

test("rejects a colocated test without its source module", async () => {
  const packagePath = await createPackage();
  await createFile(join(packagePath, "src", "orphan.test.ts"));
  const violations = await findColocationViolations([packagePath]);
  assert.equal(violations[0]?.kind, "missing-source");
});

test("rejects alternate test names that the unit-test runner does not execute", async () => {
  const packagePath = await createPackage();
  await createFile(join(packagePath, "src", "feature.ts"));
  await createFile(join(packagePath, "src", "feature.spec.ts"));
  const violations = await findColocationViolations([packagePath]);
  assert.equal(violations[0]?.kind, "invalid-test-name");
});

test("rejects a source module without its one-to-one test", async () => {
  const packagePath = await createPackage();
  await createFile(join(packagePath, "src", "untested.ts"));
  const violations = await findColocationViolations([packagePath]);
  assert.equal(violations[0]?.kind, "missing-test");
  assert.equal(violations[0]?.sourcePath, join(packagePath, "src", "untested.ts"));
});

test("allows named test-data support without a recursive test requirement", async () => {
  const packagePath = await createPackage();
  await createFile(join(packagePath, "src", "feature.test-data.ts"));
  assert.deepEqual(await findColocationViolations([packagePath]), []);
});

test("does not exempt a source that only contains the test-data marker", async () => {
  const packagePath = await createPackage();
  await createFile(join(packagePath, "src", "feature.test-data.generated.ts"));
  const violations = await findColocationViolations([packagePath]);
  assert.equal(violations[0]?.kind, "missing-test");
});

test("exempts declaration-only modules", async () => {
  const packagePath = await createPackage();
  await createFile(join(packagePath, "src", "ambient.d.ts"));
  assert.deepEqual(await findColocationViolations([packagePath]), []);
});

test("does not infer test-data status from parent directories", async () => {
  const packagePath = await createPackage("unifold.test-data.checkout-");
  await createFile(join(packagePath, "src", "untested.ts"));
  const violations = await findColocationViolations([packagePath]);
  assert.equal(violations[0]?.kind, "missing-test");
});

test("checks authored modules below root-only ignored directory names", async () => {
  const packagePath = await createPackage();
  const directoryNames = ["coverage", "dist", "node_modules"];
  for (const name of directoryNames) {
    await mkdir(join(packagePath, "src", name));
    await createFile(join(packagePath, "src", name, "adapter.ts"));
  }
  const violations = await findColocationViolations([packagePath]);
  assert.equal(violations.length, directoryNames.length);
  assert.ok(violations.every(({ kind }) => kind === "missing-test"));
});

test("accepts a same-directory pair in a nested source directory", async () => {
  const packagePath = await createPackage();
  await mkdir(join(packagePath, "src", "features"));
  await createFile(join(packagePath, "src", "features", "nested.ts"));
  await createFile(join(packagePath, "src", "features", "nested.test.ts"));
  assert.deepEqual(await findColocationViolations([packagePath]), []);
});
