import type { JsonObject, JsonValue } from "@unislang/unifold-contracts";
import type { CompositionDefinition } from "@unislang/unifold-compositions";

import { UiModuleDiagnosticCode, type UiModule, type UiModuleDiagnostic } from "./types.js";

interface NamespaceContext {
  readonly imports: ReadonlyMap<string, string>;
  readonly localCompositions: ReadonlySet<string>;
  readonly prefix: string;
  readonly sourceId: string;
}

interface NamespacedUiModuleContents {
  readonly compositions: readonly CompositionDefinition[];
  readonly diagnostics: readonly UiModuleDiagnostic[];
  readonly rewriteDocument: (document: JsonObject) => JsonObject;
}

export function namespaceUiModuleContents(
  module: UiModule,
  prefix: string,
  sourceId: string
): NamespacedUiModuleContents {
  const diagnostics: UiModuleDiagnostic[] = [];
  const context = namespaceContext(module, prefix, sourceId);
  return {
    compositions: module.exports.compositions.map((definition, index) =>
      namespaceDefinition(definition, `/exports/compositions/${index}`, context, diagnostics)
    ),
    diagnostics,
    rewriteDocument: (document) =>
      rewriteValue(document, "/exports/documents", context, diagnostics) as JsonObject
  };
}

export function qualifiedModuleName(prefix: string, name: string): string {
  return prefix.length === 0 ? name : `${prefix}/${name}`;
}

function namespaceContext(module: UiModule, prefix: string, sourceId: string): NamespaceContext {
  return {
    imports: new Map(
      module.imports.map(({ namespace }) => [namespace, qualifiedModuleName(prefix, namespace)])
    ),
    localCompositions: new Set(module.exports.compositions.map(({ name }) => name)),
    prefix,
    sourceId
  };
}

function namespaceDefinition(
  definition: CompositionDefinition,
  path: string,
  context: NamespaceContext,
  diagnostics: UiModuleDiagnostic[]
): CompositionDefinition {
  return {
    ...definition,
    name: qualifiedModuleName(context.prefix, definition.name),
    template: rewriteValue(
      definition.template,
      `${path}/template`,
      context,
      diagnostics
    ) as JsonObject
  };
}

function rewriteValue(
  value: JsonValue,
  path: string,
  context: NamespaceContext,
  diagnostics: UiModuleDiagnostic[]
): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item, index) => rewriteValue(item, `${path}/${index}`, context, diagnostics));
  }
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([name, item]) => [
      name,
      rewriteProperty(
        name,
        item as JsonValue,
        `${path}/${pointerToken(name)}`,
        context,
        diagnostics
      )
    ])
  );
}

function rewriteProperty(
  name: string,
  value: JsonValue,
  path: string,
  context: NamespaceContext,
  diagnostics: UiModuleDiagnostic[]
): JsonValue {
  if (name !== "$compose" || typeof value !== "string") {
    return rewriteValue(value, path, context, diagnostics);
  }
  return compositionReference(value, path, context, diagnostics);
}

function compositionReference(
  value: string,
  path: string,
  context: NamespaceContext,
  diagnostics: UiModuleDiagnostic[]
): string {
  if (context.localCompositions.has(value)) return qualifiedModuleName(context.prefix, value);
  const imported = importedCompositionReference(value, context);
  if (imported !== undefined) return imported;
  return invalidCompositionReference(value, path, context, diagnostics);
}

function importedCompositionReference(
  value: string,
  context: NamespaceContext
): string | undefined {
  const [namespace, ...rest] = value.split("/");
  const importedPrefix = context.imports.get(namespace as string);
  if (importedPrefix === undefined) return undefined;
  if (rest.length === 0) return undefined;
  return `${importedPrefix}/${rest.join("/")}`;
}

function invalidCompositionReference(
  value: string,
  path: string,
  context: NamespaceContext,
  diagnostics: UiModuleDiagnostic[]
): string {
  diagnostics.push({
    code: UiModuleDiagnosticCode.InvalidNamespaceReference,
    message: `Composition reference is not local or imported: ${value}.`,
    path,
    sourceId: context.sourceId
  });
  return value;
}

function pointerToken(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
