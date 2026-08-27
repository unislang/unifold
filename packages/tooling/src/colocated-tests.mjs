import { readdir, stat } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";

const sourceExtensions = [".ts", ".mjs"];
const supportedTestSuffixes = sourceExtensions.map((extension) => `.test${extension}`);
const unsupportedTestSuffixes = sourceExtensions.map((extension) => `.spec${extension}`);
const testSuffixes = [...supportedTestSuffixes, ...unsupportedTestSuffixes];
const ignoredDirectories = new Set(["coverage", "dist", "node_modules"]);
const moduleDirectories = ["src", "scripts"];

async function listFiles(targetPath, projectPath = targetPath) {
  const target = await stat(targetPath);
  if (!target.isDirectory()) {
    return [targetPath];
  }
  const entries = await readdir(targetPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => listEntry(projectPath, targetPath, entry))
  );
  return nested.flat();
}

function listEntry(projectPath, parentPath, entry) {
  if (entry.isDirectory() && isIgnoredRootDirectory(projectPath, parentPath, entry.name)) {
    return [];
  }
  return listFiles(resolve(parentPath, entry.name), projectPath);
}

function isIgnoredRootDirectory(projectPath, parentPath, name) {
  return parentPath === projectPath && ignoredDirectories.has(name);
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

function isSourceModule(projectPath, filePath) {
  return (
    moduleDirectories.some((name) => !isOutside(resolve(projectPath, name), filePath)) &&
    sourceExtensions.includes(extname(filePath)) &&
    isAuthoredModule(filePath)
  );
}

function isOutside(parentPath, nestedPath) {
  const path = relative(parentPath, nestedPath);
  return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path);
}

function outsideSourceViolation(projectPath, testPath) {
  if (moduleDirectories.some((name) => !isOutside(resolve(projectPath, name), testPath))) {
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

async function inspectTest(projectPath, testPath) {
  const outsideViolation = outsideSourceViolation(projectPath, testPath);
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

export async function findColocationViolations(projectPaths, exemptSourcePaths = []) {
  const nestedFiles = await Promise.all(projectPaths.map((projectPath) => listFiles(projectPath)));
  const files = nestedFiles.flat();
  const tests = files.filter((filePath) => testSuffix(filePath) !== undefined);
  const projectsByTest = tests.map((testPath) =>
    projectPaths.find((projectPath) => !isOutside(projectPath, testPath))
  );
  const testInspections = await Promise.all(
    tests.map((testPath, index) => inspectTest(projectsByTest[index], testPath))
  );
  const exemptions = new Set(exemptSourcePaths.map((filePath) => resolve(filePath)));
  const sources = files.filter((filePath) => {
    const owner = projectPaths.find((path) => !isOutside(path, filePath));
    return isSourceModule(owner, filePath) && !isTestSupport(filePath);
  });
  const sourcePaths = new Set(sources.map((filePath) => resolve(filePath)));
  const staleExemptions = [...exemptions]
    .filter((filePath) => !sourcePaths.has(filePath))
    .map((sourcePath) => ({ kind: "stale-exemption", sourcePath }));
  const inspectedSources = sources.filter((filePath) => !exemptions.has(resolve(filePath)));
  const sourceInspections = await Promise.all(inspectedSources.map(missingTestViolation));
  return [...testInspections, ...sourceInspections, ...staleExemptions].filter(
    (violation) => violation !== undefined
  );
}
