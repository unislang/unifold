#!/usr/bin/env node

import { readdir } from "node:fs/promises";
import process from "node:process";
import { relative, resolve } from "node:path";
import { findColocationViolations } from "../src/colocated-tests.mjs";

const workspaceRoot = process.cwd();
const packagesRoot = resolve(workspaceRoot, "packages");
const entries = await readdir(packagesRoot, { withFileTypes: true });
const packagePaths = entries.filter((entry) => entry.isDirectory()).map(packagePath);
const violations = await findColocationViolations(packagePaths);

function packagePath(entry) {
  return resolve(packagesRoot, entry.name);
}

function displayPath(filePath) {
  return relative(workspaceRoot, filePath);
}

for (const violation of violations) {
  if (violation.kind === "not-colocated") {
    console.error(
      `${displayPath(violation.testPath)}: unit test must be under its package src or scripts`
    );
  } else if (violation.kind === "invalid-test-name") {
    console.error(`${displayPath(violation.testPath)}: unit test must use the .test file suffix`);
  } else if (violation.kind === "missing-test") {
    console.error(
      `${displayPath(violation.sourcePath)}: expected test ${displayPath(violation.testPath)}`
    );
  } else {
    console.error(
      `${displayPath(violation.testPath)}: expected source ${displayPath(violation.sourcePath)}`
    );
  }
}

if (violations.length === 0) {
  console.log("All package unit tests are colocated one-to-one with their source modules.");
} else {
  process.exitCode = 1;
}
