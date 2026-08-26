import { readdir, readFile, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

export const DEFAULT_MAX_FILE_LINES = 350;

const ignoredDirectoryNames = new Set([
  ".cache",
  ".git",
  ".pnpm-store",
  ".tools",
  ".turbo",
  ".vite",
  "blob-report",
  "benchmark-results",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "report",
  "test-results"
]);
const ignoredGeneratedFileNames = new Set(["pnpm-lock.yaml"]);

function shouldIncludeEntry(entry) {
  if (!entry.isDirectory()) {
    return !ignoredGeneratedFileNames.has(entry.name);
  }
  return !isIgnoredDirectory(entry.name);
}

function isIgnoredDirectory(name) {
  return ignoredDirectoryNames.has(name) || name.startsWith("test-results");
}

async function listDirectory(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const includedEntries = entries.filter(shouldIncludeEntry);
  const nestedFiles = await Promise.all(
    includedEntries.map((entry) => listTarget(resolve(directoryPath, entry.name)))
  );
  return nestedFiles.flat();
}

async function listTarget(targetPath) {
  const targetStats = await stat(targetPath);
  if (targetStats.isDirectory()) {
    return listDirectory(targetPath);
  }
  return [targetPath];
}

function isMarkdown(filePath) {
  return extname(filePath).toLowerCase() === ".md";
}

function isBinary(content) {
  return content.subarray(0, 8192).includes(0);
}

export function countPhysicalLines(text) {
  if (text.length === 0) {
    return 0;
  }
  return countLineBreaks(text) + finalLineCount(text);
}

function countLineBreaks(text) {
  const matches = text.match(/\r\n|\r|\n/g);
  if (matches === null) {
    return 0;
  }
  return matches.length;
}

function finalLineCount(text) {
  if (/(?:\r\n|\r|\n)$/.test(text)) {
    return 0;
  }
  return 1;
}

async function inspectFile(filePath, maximumLines) {
  const content = await readFile(filePath);
  if (isBinary(content)) {
    return undefined;
  }
  const lineCount = countPhysicalLines(content.toString("utf8"));
  if (lineCount <= maximumLines) {
    return undefined;
  }
  return { filePath, lineCount, maximumLines };
}

export async function findLineLimitViolations(targetPaths, maximumLines = DEFAULT_MAX_FILE_LINES) {
  const nestedFiles = await Promise.all(targetPaths.map((targetPath) => listTarget(targetPath)));
  const checkedFiles = nestedFiles.flat().filter((filePath) => !isMarkdown(filePath));
  const inspections = await Promise.all(
    checkedFiles.map((filePath) => inspectFile(filePath, maximumLines))
  );
  return inspections.filter((inspection) => inspection !== undefined);
}
