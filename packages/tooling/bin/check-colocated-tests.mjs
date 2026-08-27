#!/usr/bin/env node

import { readdir } from "node:fs/promises";
import process from "node:process";
import { relative, resolve } from "node:path";
import { findColocationViolations } from "../src/colocated-tests.mjs";
import { colocationExemptionPaths } from "../src/colocated-test-policy.mjs";

const workspaceRoot = process.cwd();
const collectionNames = ["apps", "examples", "packages"];
const projectPaths = (await Promise.all(collectionNames.map(projectsIn))).flat();
const exemptions = colocationExemptionPaths(workspaceRoot);
const violations = await findColocationViolations(projectPaths, exemptions);

async function projectsIn(collectionName) {
  const collectionPath = resolve(workspaceRoot, collectionName);
  const entries = await readdir(collectionPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(collectionPath, entry.name));
}

function displayPath(filePath) {
  return relative(workspaceRoot, filePath);
}

for (const violation of violations) {
  if (violation.kind === "not-colocated") {
    console.error(
      `${displayPath(violation.testPath)}: unit test must be under its project src or scripts`
    );
  } else if (violation.kind === "invalid-test-name") {
    console.error(`${displayPath(violation.testPath)}: unit test must use the .test file suffix`);
  } else if (violation.kind === "missing-test") {
    console.error(
      `${displayPath(violation.sourcePath)}: expected test ${displayPath(violation.testPath)}`
    );
  } else if (violation.kind === "stale-exemption") {
    console.error(`${displayPath(violation.sourcePath)}: obsolete test-colocation exemption`);
  } else {
    console.error(
      `${displayPath(violation.testPath)}: expected source ${displayPath(violation.sourcePath)}`
    );
  }
}

if (violations.length === 0) {
  console.log("All repository unit tests are colocated one-to-one with their source modules.");
} else {
  process.exitCode = 1;
}
