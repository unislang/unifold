import {
  ComponentDefinitionSchemaVersion,
  type CatalogPropertyDescriptor,
  type ComponentDefinition,
  type ComponentDefinitionDocument
} from "@unislang/unifold-catalog";
import type { JsonValue } from "@unislang/unifold-contracts";
import { prepareUnifoldDocument, UnifoldPreparationStatus } from "@unislang/unifold";

import { canonicalJson } from "./fingerprint.js";
import {
  AI_MUTABLE_ROOTS,
  AI_SUPPORTED_OPERATIONS,
  MAXIMUM_AI_CONTEXT_BYTES,
  MAXIMUM_AI_CONTEXT_DEFINITIONS,
  MAXIMUM_AI_CONTEXT_PROPERTIES,
  MAXIMUM_AI_PATCH_OPERATIONS,
  UiAiContextDiagnosticCode,
  UiAiContextStatus,
  UiAiContextVersion,
  UiAiRedactionStrategy,
  type BuildUiAiContextOptions,
  type BuildUiAiContextResult,
  type ReadyUiAiContextResult,
  type RejectedUiAiContextResult,
  type UiAiContext,
  type UiAiContextDiagnostic,
  type UiAiDefinitionContext,
  type UiAiPropertyContext
} from "./types.js";

export function buildUiAiContext(options: BuildUiAiContextOptions): BuildUiAiContextResult {
  const catalogDiagnostic = inspectCatalog(options.componentDefinitions);
  if (catalogDiagnostic !== undefined) return rejected(catalogDiagnostic);
  return buildValidatedContext(options);
}

function buildValidatedContext(options: BuildUiAiContextOptions): BuildUiAiContextResult {
  const preparation = prepareUnifoldDocument(options.document);
  if (preparation.status !== UnifoldPreparationStatus.Valid) return rejected(invalidDocument());
  const prepared = preparation.prepared as { readonly authored: JsonValue };
  return buildPreparedContext(prepared.authored, options.componentDefinitions);
}

function buildPreparedContext(
  authored: JsonValue,
  definitions: ComponentDefinitionDocument
): BuildUiAiContextResult {
  const identityDiagnostic = inspectCatalogIdentity(authored, definitions);
  if (identityDiagnostic !== undefined) return rejected(identityDiagnostic);
  return buildRedactedContext(authored, definitions);
}

function buildRedactedContext(
  authored: JsonValue,
  definitions: ComponentDefinitionDocument
): BuildUiAiContextResult {
  const definitionIndex = new Map(
    definitions.definitions.map((item) => [item.componentType, item])
  );
  const redaction = redactDocument(authored, definitionIndex);
  if (redaction.diagnostic !== undefined) return rejected(redaction.diagnostic);
  const context = structuredClone(createContext(definitions, redaction.value));
  const byteLength = new TextEncoder().encode(canonicalJson(context)).byteLength;
  if (byteLength <= MAXIMUM_AI_CONTEXT_BYTES) return ready(context);
  return rejected(contextBytesDiagnostic(byteLength));
}

function createContext(definitions: ComponentDefinitionDocument, document: JsonValue): UiAiContext {
  return {
    catalog: {
      definitions: definitions.definitions.map(projectDefinition).sort(compareDefinition),
      name: definitions.catalog.name,
      schemaVersion: definitions.schemaVersion,
      version: definitions.catalog.version
    },
    document,
    policy: {
      maximumOperations: MAXIMUM_AI_PATCH_OPERATIONS,
      mutableRoots: AI_MUTABLE_ROOTS,
      supportedOperations: AI_SUPPORTED_OPERATIONS
    },
    redaction: UiAiRedactionStrategy.OmitSensitiveProperties,
    version: UiAiContextVersion.Version1
  };
}

function projectDefinition(definition: ComponentDefinition): UiAiDefinitionContext {
  const constraints = definition.catalogDescriptor.constraints;
  const control = definition.control;
  return {
    accessibility: definition.accessibility,
    behaviors: definition.behaviors,
    commonCapabilities: definition.commonCapabilities,
    componentType: definition.componentType,
    ...(constraints === undefined ? {} : { constraints }),
    ...(control === undefined ? {} : { control: projectControl(control) }),
    privacy: definition.privacy,
    properties: definition.catalogDescriptor.properties.map(projectProperty),
    purpose: definition.purpose,
    semanticAttachmentPoints: definition.semanticAttachmentPoints,
    status: definition.status,
    tagName: definition.tagName,
    version: definition.version
  };
}

function projectProperty(property: CatalogPropertyDescriptor): UiAiPropertyContext {
  const context = { ...property };
  Reflect.deleteProperty(context, "defaultValue");
  return context;
}

function projectControl(control: NonNullable<ComponentDefinition["control"]>) {
  const context = { ...control };
  Reflect.deleteProperty(context, "valueSchema");
  return context;
}

function compareDefinition(left: UiAiDefinitionContext, right: UiAiDefinitionContext): number {
  return left.componentType.localeCompare(right.componentType);
}

function inspectCatalog(document: ComponentDefinitionDocument): UiAiContextDiagnostic | undefined {
  if (document.schemaVersion !== ComponentDefinitionSchemaVersion.Version1)
    return diagnostic(UiAiContextDiagnosticCode.UnsupportedDefinitionVersion, "/schemaVersion");
  if (document.definitions.length > MAXIMUM_AI_CONTEXT_DEFINITIONS)
    return diagnostic(UiAiContextDiagnosticCode.DefinitionLimitExceeded, "/definitions");
  return inspectDefinitions(document.definitions);
}

function inspectDefinitions(
  definitions: readonly ComponentDefinition[]
): UiAiContextDiagnostic | undefined {
  const oversized = definitions.findIndex(hasTooManyProperties);
  if (oversized >= 0)
    return diagnostic(UiAiContextDiagnosticCode.PropertyLimitExceeded, `/definitions/${oversized}`);
  const invalid = definitions.findIndex(hasInvalidIdentity);
  if (invalid >= 0)
    return diagnostic(UiAiContextDiagnosticCode.InvalidDefinition, `/definitions/${invalid}`);
  return duplicateDefinition(definitions);
}

function hasTooManyProperties(definition: ComponentDefinition): boolean {
  return definition.catalogDescriptor.properties.length > MAXIMUM_AI_CONTEXT_PROPERTIES;
}

function hasInvalidIdentity(definition: ComponentDefinition): boolean {
  return (
    definition.componentType !== definition.catalogDescriptor.componentType ||
    definition.tagName !== definition.catalogDescriptor.tagName
  );
}

function duplicateDefinition(
  definitions: readonly ComponentDefinition[]
): UiAiContextDiagnostic | undefined {
  const values = definitions.map((definition) => definition.componentType);
  if (new Set(values).size === values.length) return undefined;
  return diagnostic(UiAiContextDiagnosticCode.DuplicateDefinition, "/definitions");
}

function inspectCatalogIdentity(
  authored: JsonValue,
  definitions: ComponentDefinitionDocument
): UiAiContextDiagnostic | undefined {
  const catalog = (authored as { readonly catalog: Readonly<Record<string, JsonValue>> }).catalog;
  const matches = [
    catalog["name"] === definitions.catalog.name,
    catalog["version"] === definitions.catalog.version
  ];
  if (matches.every(Boolean)) return undefined;
  return diagnostic(UiAiContextDiagnosticCode.CatalogMismatch, "/catalog");
}

interface RedactionResult {
  readonly diagnostic?: UiAiContextDiagnostic;
  readonly value: JsonValue;
}

function redactDocument(
  value: JsonValue,
  definitions: ReadonlyMap<string, ComponentDefinition>
): RedactionResult {
  const state: { diagnostic?: UiAiContextDiagnostic } = {};
  const redacted = redactValue(value, definitions, state, "");
  return {
    ...(state.diagnostic === undefined ? {} : { diagnostic: state.diagnostic }),
    value: redacted
  };
}

function redactValue(
  value: JsonValue,
  definitions: ReadonlyMap<string, ComponentDefinition>,
  state: { diagnostic?: UiAiContextDiagnostic },
  path: string
): JsonValue {
  if (Array.isArray(value))
    return value.map((item, index) => redactValue(item, definitions, state, `${path}/${index}`));
  if (isRecord(value)) return redactRecord(value, definitions, state, path);
  return value;
}

function redactRecord(
  value: Readonly<Record<string, JsonValue | undefined>>,
  definitions: ReadonlyMap<string, ComponentDefinition>,
  state: { diagnostic?: UiAiContextDiagnostic },
  path: string
): JsonValue {
  const sensitive = sensitivePropertySet(value, definitions, state, path);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([name, item]) => item !== undefined && !sensitive.has(name))
      .map(([name, item]) => [
        name,
        redactValue(item as JsonValue, definitions, state, childPath(path, name))
      ])
  );
}

function sensitivePropertySet(
  value: Readonly<Record<string, JsonValue | undefined>>,
  definitions: ReadonlyMap<string, ComponentDefinition>,
  state: { diagnostic?: UiAiContextDiagnostic },
  path: string
): ReadonlySet<string> {
  const componentType = componentTypeOf(value);
  if (componentType === undefined) return new Set();
  return sensitiveProperties(componentType, value, definitions, state, path);
}

function componentTypeOf(
  value: Readonly<Record<string, JsonValue | undefined>>
): string | undefined {
  return typeof value["$comp"] === "string" ? value["$comp"] : undefined;
}

function sensitiveProperties(
  componentType: string,
  value: Readonly<Record<string, JsonValue | undefined>>,
  definitions: ReadonlyMap<string, ComponentDefinition>,
  state: { diagnostic?: UiAiContextDiagnostic },
  path: string
): ReadonlySet<string> {
  const definition = definitions.get(componentType);
  if (definition !== undefined) return new Set(definition.privacy.sensitiveProperties);
  recordUnknownComponent(state, path);
  return new Set(Object.keys(value));
}

function recordUnknownComponent(state: { diagnostic?: UiAiContextDiagnostic }, path: string): void {
  if (state.diagnostic !== undefined) return;
  state.diagnostic = diagnostic(
    UiAiContextDiagnosticCode.UnknownComponent,
    childPath(path, "$comp")
  );
}

function childPath(path: string, key: string): string {
  const token = key.replaceAll("~", "~0").replaceAll("/", "~1");
  return `${path}/${token}`;
}

function isRecord(value: unknown): value is Readonly<Record<string, JsonValue | undefined>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidDocument(): UiAiContextDiagnostic {
  return diagnostic(UiAiContextDiagnosticCode.InvalidDocument, "/");
}

function contextBytesDiagnostic(actual: number): UiAiContextDiagnostic {
  return diagnostic(
    UiAiContextDiagnosticCode.ContextBytesExceeded,
    "/",
    `AI context is ${actual} bytes; the maximum is ${MAXIMUM_AI_CONTEXT_BYTES}.`
  );
}

function diagnostic(
  code: UiAiContextDiagnosticCode,
  path: string,
  message = `AI context construction failed: ${code}.`
): UiAiContextDiagnostic {
  return { code, message, path };
}

function ready(context: UiAiContext): ReadyUiAiContextResult {
  return { context, diagnostics: [], status: UiAiContextStatus.Ready };
}

function rejected(diagnosticValue: UiAiContextDiagnostic): RejectedUiAiContextResult {
  return { diagnostics: [diagnosticValue], status: UiAiContextStatus.Rejected };
}
