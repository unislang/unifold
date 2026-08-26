#!/usr/bin/env node

import process from "node:process";
import { relative, resolve } from "node:path";
import { findLineLimitViolations } from "../src/file-lines.mjs";

const workspaceRoot = process.cwd();
const requestedPaths = process.argv.slice(2);
const targetPaths =
  requestedPaths.length === 0
    ? [workspaceRoot]
    : requestedPaths.map((requestedPath) => resolve(requestedPath));
const violations = await findLineLimitViolations(targetPaths);

if (violations.length === 0) {
  console.log("All authored non-Markdown files contain at most 350 physical lines.");
} else {
  for (const violation of violations) {
    const displayPath = relative(workspaceRoot, violation.filePath);
    console.error(
      `${displayPath}: ${violation.lineCount} lines (maximum ${violation.maximumLines})`
    );
  }
  process.exitCode = 1;
}
