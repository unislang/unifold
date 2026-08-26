import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  CatalogBindingKind,
  componentDefinitionSidecars,
  coreCatalog,
  getCoreDescriptor
} from "@unislang/unifold-catalog";

import { createPackageManifest, packageTags } from "./cem-manifest.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("generates all schema-valid core custom elements", async () => {
  const declarations = await packageDeclarations();
  assert.deepEqual(
    declarations.map(({ tagName }) => tagName).toSorted(),
    [...packageTags].toSorted()
  );
  assert(declarations.every(({ customElement, description }) => customElement && description));
});

test("retains generated attributes, events, slots, parts, and CSS tokens", async () => {
  const declarations = await packageDeclarations();
  assert(hasNamed(requireDeclaration(declarations, "unifold-button").events, "unifold-event"));
  assert(hasNamed(requireDeclaration(declarations, "unifold-box").slots, ""));
  assert(hasNamed(requireDeclaration(declarations, "unifold-alert").cssParts, "container"));
  assert(hasNamed(requireDeclaration(declarations, "unifold-icon").cssParts, "icon"));
  assert(
    hasNamed(
      requireDeclaration(declarations, "unifold-grid").cssProperties,
      "--unifold-grid-columns"
    )
  );
  assert(hasNamed(requireDeclaration(declarations, "unifold-text").cssParts, "text"));
});

test("covers every catalog property and attribute binding", async () => {
  const declarations = await packageDeclarations();
  for (const descriptor of Object.values(coreCatalog.components)) {
    const declaration = requireDeclaration(declarations, descriptor.tagName);
    assert.deepEqual(missingPropertyNames(descriptor, declaration), [], descriptor.tagName);
    assert.deepEqual(missingAttributeNames(descriptor, declaration), [], descriptor.tagName);
  }
});

test("joins every generated tag to a reviewed definition and executable evidence", async () => {
  const sidecars = Object.values(componentDefinitionSidecars);
  const tags = sidecars.map(({ componentType }) => getCoreDescriptor(componentType)?.tagName);
  assert.deepEqual(tags.toSorted(), [...packageTags].toSorted());
  const evidence = await evidenceSources();
  await Promise.all(sidecars.map((sidecar) => assertEvidence(sidecar, evidence)));
});

async function packageDeclarations() {
  const manifest = await createPackageManifest(resolve(packageRoot, "src"));
  return manifest.modules.flatMap((module) => module.declarations ?? []);
}

function requireDeclaration(declarations, tagName) {
  const declaration = declarations.find((item) => item.tagName === tagName);
  assert(declaration, `Missing generated declaration for ${tagName}.`);
  return declaration;
}

function hasNamed(values, name) {
  return (values ?? []).some((item) => item.name === name);
}

function missingPropertyNames(descriptor, declaration) {
  const actual = publicFieldNames(declaration);
  return descriptor.properties
    .filter(({ bindingKind }) => bindingKind === CatalogBindingKind.Property)
    .map(({ name }) => name)
    .filter((name) => !actual.has(name));
}

function missingAttributeNames(descriptor, declaration) {
  const actual = new Set((declaration.attributes ?? []).map(({ name }) => name));
  return descriptor.properties
    .filter(({ bindingKind }) => bindingKind === CatalogBindingKind.Attribute)
    .map(({ bindingName }) => bindingName)
    .filter((name) => !actual.has(name));
}

function publicFieldNames(declaration) {
  return new Set(
    (declaration.members ?? [])
      .filter(
        (item) =>
          item.kind === "field" && item.privacy !== "private" && item.privacy !== "protected"
      )
      .map(({ name }) => name)
  );
}

async function evidenceSources() {
  const e2eRoot = resolve(packageRoot, "../../tests/e2e");
  const entries = await readdir(e2eRoot, { withFileTypes: true });
  const paths = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".spec.ts"))
    .map((entry) => resolve(e2eRoot, entry.name));
  return {
    browserScenarios: (await Promise.all(paths.map((path) => readFile(path, "utf8")))).join("\n"),
    componentDocs: await readFile(resolve(packageRoot, "../../docs/components.md"), "utf8")
  };
}

async function assertEvidence(sidecar, evidence) {
  const descriptor = getCoreDescriptor(sidecar.componentType);
  assert(descriptor, `Missing descriptor: ${sidecar.componentType}.`);
  await access(resolve(packageRoot, sidecar.testManifest.unitFile));
  assert(
    evidence.componentDocs.includes(descriptor.tagName),
    `Missing docs: ${descriptor.tagName}.`
  );
  for (const scenario of sidecar.testManifest.browserScenarios) {
    assert(evidence.browserScenarios.includes(scenario), `Missing browser scenario: ${scenario}.`);
  }
}
