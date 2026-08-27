#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import process from "node:process";

import { findImportedBindingReexports } from "../src/import-reexports.mjs";

const workspaceRoot = process.cwd();
const files = (
  await Promise.all([sourceFiles("packages"), sourceFiles("apps"), sourceFiles("examples")])
).flat();
const violations = [];

for (const file of files) violations.push(...(await inspectFile(file)));

for (const violation of violations) {
  console.error(
    `${relative(workspaceRoot, violation.file)}: imported binding ${violation.name} must not be re-exported`
  );
}

if (violations.length === 0) {
  console.log("No feature module re-exports an imported local binding.");
} else {
  process.exitCode = 1;
}

async function sourceFiles(folder) {
  const root = resolve(workspaceRoot, folder);
  const projects = (await readdir(root, { withFileTypes: true })).filter((entry) =>
    entry.isDirectory()
  );
  return (await Promise.all(projects.map((entry) => projectSourceFiles(root, entry.name)))).flat();
}

async function projectSourceFiles(root, project) {
  const sourceRoot = resolve(root, project, "src");
  const entries = await readdir(sourceRoot, { recursive: true });
  return entries.filter(isSourceFile).map((entry) => resolve(sourceRoot, entry));
}

function isSourceFile(entry) {
  return /\.(?:ts|tsx|mts)$/.test(entry) && !entry.includes(".test.");
}

async function inspectFile(file) {
  const source = await readFile(file, "utf8");
  return findImportedBindingReexports(source, file).map((violation) => ({
    file,
    name: violation.name
  }));
}
