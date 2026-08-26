import { create, ts } from "@custom-elements-manifest/analyzer";
import { litPlugin } from "@custom-elements-manifest/analyzer/src/features/framework-plugins/lit/lit.js";
import Ajv from "ajv";
import manifestSchema from "custom-elements-manifest" with { type: "json" };
import { readFile, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { CoreElementTag } from "@unislang/unifold-catalog";

export const packageTags = Object.freeze(Object.values(CoreElementTag));

const validateManifest = new Ajv({ allErrors: true, strict: false }).compile(manifestSchema);

export async function createPackageManifest(sourceRoot) {
  const modules = await sourceModules(sourceRoot);
  const analyzed = create({ context: { dev: false }, modules, plugins: litPlugin() });
  const manifest = projectManifest(analyzed);
  assertValidManifest(manifest);
  return manifest;
}

async function sourceModules(sourceRoot) {
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const paths = entries
    .filter((entry) => entry.isFile() && isProductionSource(entry.name))
    .map((entry) => resolve(sourceRoot, entry.name))
    .toSorted();
  return Promise.all(paths.map((path) => sourceModule(sourceRoot, path)));
}

function isProductionSource(name) {
  return name.endsWith(".ts") && !name.includes(".test.") && !name.endsWith(".d.ts");
}

async function sourceModule(sourceRoot, path) {
  const source = await readFile(path, "utf8");
  const fileName = `src/${basename(path)}`;
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function projectManifest(manifest) {
  return {
    modules: manifest.modules.flatMap(projectModule),
    readme: "Generated Custom Elements Manifest for the complete Unifold core catalog.",
    schemaVersion: manifest.schemaVersion
  };
}

function projectModule(module) {
  const declarations = declarationsFor(module);
  if (declarations.length === 0) return [];
  const declarationNames = new Set(declarations.map(({ name }) => name));
  const exports = exportsFor(module, declarationNames);
  return [{ ...module, declarations, exports, path: module.path.replace(/\.ts$/u, ".js") }];
}

function declarationsFor(module) {
  return (module.declarations ?? []).filter(isPackageDeclaration);
}

function exportsFor(module, declarationNames) {
  return (module.exports ?? []).filter((item) => selectedExport(item, declarationNames));
}

function isPackageDeclaration(declaration) {
  return packageTags.includes(declaration.tagName);
}

function selectedExport(item, declarationNames) {
  if (item.kind === "custom-element-definition") return packageTags.includes(item.name);
  return item.kind === "js" && declarationNames.has(declarationName(item));
}

function declarationName(item) {
  return item.declaration?.name;
}

export function assertValidManifest(manifest) {
  if (validateManifest(manifest)) return;
  throw new Error(`Generated Custom Elements Manifest is invalid: ${validationDetail()}.`);
}

function validationDetail() {
  const errors = validateManifest.errors ?? [];
  const detail = errors.map(({ instancePath, message }) => `${instancePath} ${message}`).join("; ");
  return detail === "" ? "unknown error" : detail;
}
