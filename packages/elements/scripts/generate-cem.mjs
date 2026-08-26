#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createPackageManifest } from "./cem-manifest.mjs";
import { createComponentDefinitions } from "./component-definitions.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

if (isMain())
  await generateComponentArtifacts(resolve(packageRoot, "src"), resolve(packageRoot, "dist"));

export async function generateComponentArtifacts(sourceRoot, outputRoot) {
  const manifest = await createPackageManifest(sourceRoot);
  await mkdir(outputRoot, { recursive: true });
  await Promise.all([
    writeJson(resolve(outputRoot, "custom-elements.json"), manifest),
    writeJson(
      resolve(outputRoot, "component-definitions.json"),
      createComponentDefinitions(manifest)
    )
  ]);
}

function writeJson(path, value) {
  return writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function isMain() {
  return (
    process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])
  );
}
