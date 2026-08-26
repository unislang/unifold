import { readdir, stat } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";

const sourceExtensions = [".ts", ".mjs"];
const supportedTestSuffixes = sourceExtensions.map((extension) => `.test${extension}`);
const unsupportedTestSuffixes = sourceExtensions.map((extension) => `.spec${extension}`);
const testSuffixes = [...supportedTestSuffixes, ...unsupportedTestSuffixes];
const ignoredDirectories = new Set(["coverage", "dist", "node_modules"]);
const moduleDirectories = ["src", "scripts"];

async function listFiles(targetPath, packagePath = targetPath) {
  const target = await stat(targetPath);
  if (!target.isDirectory()) {
    return [targetPath];
  }
  const entries = await readdir(targetPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => listEntry(packagePath, targetPath, entry))
  );
  return nested.flat();
}

function listEntry(packagePath, parentPath, entry) {
  if (entry.isDirectory() && isIgnoredRootDirectory(packagePath, parentPath, entry.name)) {
    return [];
  }
  return listFiles(resolve(parentPath, entry.name), packagePath);
}

function isIgnoredRootDirectory(packagePath, parentPath, name) {
  return parentPath === packagePath && ignoredDirectories.has(name);
}

function testSuffix(filePath) {
  return testSuffixes.find((suffix) => filePath.endsWith(suffix));
}

function supportedTestSuffix(filePath) {
  return supportedTestSuffixes.find((suffix) => filePath.endsWith(suffix));
}

function expectedSourcePath(testPath, suffix) {
  const sourceExtension = extname(suffix);
  const sourceName = basename(testPath, suffix) + sourceExtension;
  return resolve(dirname(testPath), sourceName);
}

function expectedTestPath(sourcePath) {
  const extension = extname(sourcePath);
  return sourcePath.slice(0, -extension.length) + `.test${extension}`;
}

function isTestSupport(filePath) {
  return /\.test-data\.(?:ts|mjs)$/u.test(basename(filePath));
}

function isDeclaration(filePath) {
  return filePath.endsWith(".d.ts") || filePath.endsWith(".d.mts") || filePath.endsWith(".d.cts");
}

function isAuthoredModule(filePath) {
  return testSuffix(filePath) === undefined && !isDeclaration(filePath);
}

function isSourceModule(packagePath, filePath) {
  return (
    moduleDirectories.some((name) => !isOutside(resolve(packagePath, name), filePath)) &&
    sourceExtensions.includes(extname(filePath)) &&
    isAuthoredModule(filePath)
  );
}

function isOutside(parentPath, nestedPath) {
  const path = relative(parentPath, nestedPath);
  return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path);
}

function outsideSourceViolation(packagePath, testPath) {
  if (moduleDirectories.some((name) => !isOutside(resolve(packagePath, name), testPath))) {
    return undefined;
  }
  return { kind: "not-colocated", testPath };
}

async function missingSourceViolation(testPath, suffix) {
  const sourcePath = expectedSourcePath(testPath, suffix);
  try {
    const source = await stat(sourcePath);
    return source.isFile() ? undefined : { kind: "missing-source", testPath, sourcePath };
  } catch {
    return { kind: "missing-source", testPath, sourcePath };
  }
}

async function inspectTest(packagePath, testPath) {
  const outsideViolation = outsideSourceViolation(packagePath, testPath);
  if (outsideViolation !== undefined) {
    return outsideViolation;
  }
  const suffix = testSuffix(testPath);
  if (supportedTestSuffix(testPath) === undefined) {
    return {
      kind: "invalid-test-name",
      testPath,
      sourcePath: expectedSourcePath(testPath, suffix)
    };
  }
  return missingSourceViolation(testPath, suffix);
}

async function missingTestViolation(sourcePath) {
  const expectedPath = expectedTestPath(sourcePath);
  try {
    const testFile = await stat(expectedPath);
    return testFile.isFile()
      ? undefined
      : { kind: "missing-test", sourcePath, testPath: expectedPath };
  } catch {
    return { kind: "missing-test", sourcePath, testPath: expectedPath };
  }
}

export async function findColocationViolations(packagePaths) {
  const nestedFiles = await Promise.all(packagePaths.map((packagePath) => listFiles(packagePath)));
  const files = nestedFiles.flat();
  const tests = files.filter((filePath) => testSuffix(filePath) !== undefined);
  const packagesByTest = tests.map((testPath) =>
    packagePaths.find((packagePath) => !isOutside(packagePath, testPath))
  );
  const testInspections = await Promise.all(
    tests.map((testPath, index) => inspectTest(packagesByTest[index], testPath))
  );
  const sources = files.filter((filePath) => {
    const packagePath = packagePaths.find((path) => !isOutside(path, filePath));
    return isSourceModule(packagePath, filePath) && !isTestSupport(filePath);
  });
  const sourceInspections = await Promise.all(sources.map(missingTestViolation));
  return [...testInspections, ...sourceInspections].filter((violation) => violation !== undefined);
}
