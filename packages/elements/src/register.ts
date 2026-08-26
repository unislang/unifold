import { CoreCatalogMajor, CoreElementTag, coreCatalog } from "@unislang/unifold-catalog";

import { coreElementDefinitions } from "./core-element-definitions.js";
import { ElementRegistrationDiagnosticCode, ElementRegistrationStatus } from "./enums.js";

export const UNIFOLD_ELEMENT_DEFINITION = Symbol.for("org.unifold.element-definition");

export interface ElementCatalogIdentity {
  readonly catalogMajor: string;
  readonly catalogName: string;
  readonly catalogVersion: string;
}

export interface ElementDefinitionMetadata extends ElementCatalogIdentity {
  readonly tagName: CoreElementTag;
}

export interface ElementRegistrationDiagnostic {
  readonly code: ElementRegistrationDiagnosticCode;
  readonly expected?: ElementDefinitionMetadata;
  readonly found?: ElementDefinitionMetadata;
  readonly message: string;
  readonly tagName?: CoreElementTag;
}

export interface RegisteredElementsResult {
  readonly catalog: ElementCatalogIdentity;
  readonly definedTags: readonly CoreElementTag[];
  readonly diagnostics: readonly [];
  readonly status: ElementRegistrationStatus.Registered;
}

export interface RejectedElementsResult {
  readonly definedTags: readonly CoreElementTag[];
  readonly diagnostics: readonly ElementRegistrationDiagnostic[];
  readonly status: ElementRegistrationStatus.Rejected;
}

export type ElementRegistrationResult = RegisteredElementsResult | RejectedElementsResult;

export interface ElementRegistryPort {
  define(name: string, constructor: CustomElementConstructor): void;
  get(name: string): CustomElementConstructor | undefined;
  getName?(constructor: CustomElementConstructor): string | null;
}

interface DefinitionOutcome {
  readonly definedTags: readonly CoreElementTag[];
  readonly failedTag?: CoreElementTag;
  readonly message?: string;
}

const catalogIdentity = Object.freeze({
  catalogMajor: CoreCatalogMajor.Version1,
  catalogName: coreCatalog.name,
  catalogVersion: coreCatalog.version
});

coreElementDefinitions.forEach(([tagName, constructor]) => markDefinition(tagName, constructor));

export function defineUnifoldElements(
  registry: ElementRegistryPort | null = defaultElementRegistry()
): ElementRegistrationResult {
  if (registry === null) return rejected([registryUnavailableDiagnostic()], []);
  return defineInRegistry(registry);
}

function defineInRegistry(registry: ElementRegistryPort): ElementRegistrationResult {
  const diagnostics = registrationDiagnostics(registry);
  if (diagnostics.length > 0) return rejected(diagnostics, []);
  return defineAfterPreflight(registry);
}

function defineAfterPreflight(registry: ElementRegistryPort): ElementRegistrationResult {
  const outcome = defineMissing(registry);
  if (outcome.failedTag !== undefined) return failedDefinition(outcome);
  return {
    catalog: catalogIdentity,
    definedTags: outcome.definedTags,
    diagnostics: [],
    status: ElementRegistrationStatus.Registered
  };
}

/** @deprecated Use defineUnifoldElements. */
export function registerCoreElements(
  registry: ElementRegistryPort | null = defaultElementRegistry()
): ElementRegistrationResult {
  return defineUnifoldElements(registry);
}
export function readElementDefinition(
  constructor: CustomElementConstructor
): ElementDefinitionMetadata | undefined {
  const candidate = Reflect.get(constructor, UNIFOLD_ELEMENT_DEFINITION) as unknown;
  return isDefinitionMetadata(candidate) ? Object.freeze({ ...candidate }) : undefined;
}

function registrationDiagnostics(
  registry: ElementRegistryPort
): readonly ElementRegistrationDiagnostic[] {
  return coreElementDefinitions.flatMap(([tagName, constructor]) => {
    const diagnostic = definitionDiagnostic(registry, tagName, constructor);
    return diagnostic === undefined ? [] : [diagnostic];
  });
}

function definitionDiagnostic(
  registry: ElementRegistryPort,
  tagName: CoreElementTag,
  expectedConstructor: CustomElementConstructor
): ElementRegistrationDiagnostic | undefined {
  const registered = registry.get(tagName);
  if (registered === undefined)
    return boundConstructorDiagnostic(registry, tagName, expectedConstructor);
  return registeredDefinitionDiagnostic(registered, tagName, expectedConstructor);
}

function registeredDefinitionDiagnostic(
  registered: CustomElementConstructor,
  tagName: CoreElementTag,
  expectedConstructor: CustomElementConstructor
): ElementRegistrationDiagnostic | undefined {
  if (registered === expectedConstructor) return undefined;
  const found = readElementDefinition(registered);
  if (found === undefined) return foreignDefinitionDiagnostic(tagName);
  return metadataDiagnostic(tagName, found);
}

function boundConstructorDiagnostic(
  registry: ElementRegistryPort,
  tagName: CoreElementTag,
  expectedConstructor: CustomElementConstructor
): ElementRegistrationDiagnostic | undefined {
  const registeredName = registeredConstructorName(registry, expectedConstructor);
  if (registeredName === undefined) return undefined;
  return boundNameDiagnostic(tagName, registeredName);
}

function boundNameDiagnostic(
  tagName: CoreElementTag,
  registeredName: string
): ElementRegistrationDiagnostic | undefined {
  if (registeredName === tagName) return undefined;
  return {
    code: ElementRegistrationDiagnosticCode.ConstructorAlreadyDefined,
    expected: metadataFor(tagName),
    message: `${tagName}'s constructor is already registered as ${registeredName}.`,
    tagName
  };
}

function registeredConstructorName(
  registry: ElementRegistryPort,
  constructor: CustomElementConstructor
): string | undefined {
  if (registry.getName === undefined) return undefined;
  const name = registry.getName(constructor);
  return name === null ? undefined : name;
}

function metadataDiagnostic(
  tagName: CoreElementTag,
  found: ElementDefinitionMetadata
): ElementRegistrationDiagnostic | undefined {
  if (found.tagName !== tagName) return tagMismatchDiagnostic(tagName, found);
  if (!sameCatalogRelease(found)) return catalogMismatchDiagnostic(tagName, found);
  return undefined;
}

function foreignDefinitionDiagnostic(tagName: CoreElementTag): ElementRegistrationDiagnostic {
  return {
    code: ElementRegistrationDiagnosticCode.ForeignDefinition,
    expected: metadataFor(tagName),
    message: `${tagName} is already registered by an unmarked constructor.`,
    tagName
  };
}

function tagMismatchDiagnostic(
  tagName: CoreElementTag,
  found: ElementDefinitionMetadata
): ElementRegistrationDiagnostic {
  return {
    code: ElementRegistrationDiagnosticCode.TagMismatch,
    expected: metadataFor(tagName),
    found,
    message: `${tagName} is registered with metadata for ${found.tagName}.`,
    tagName
  };
}

function catalogMismatchDiagnostic(
  tagName: CoreElementTag,
  found: ElementDefinitionMetadata
): ElementRegistrationDiagnostic {
  return {
    code: ElementRegistrationDiagnosticCode.CatalogMismatch,
    expected: metadataFor(tagName),
    found,
    message: `${tagName} uses incompatible catalog ${found.catalogName}@${found.catalogVersion}.`,
    tagName
  };
}

function defineMissing(registry: ElementRegistryPort): DefinitionOutcome {
  const missing = coreElementDefinitions.filter(([tagName]) => registry.get(tagName) === undefined);
  const definedTags: CoreElementTag[] = [];
  for (const [tagName, constructor] of missing) {
    try {
      registry.define(tagName, constructor);
      definedTags.push(tagName);
    } catch (error) {
      return { definedTags, failedTag: tagName, message: errorMessage(error) };
    }
  }
  return { definedTags };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown registry failure.";
}

function failedDefinition(outcome: DefinitionOutcome): RejectedElementsResult {
  const tagName = outcome.failedTag;
  if (tagName === undefined) return rejected([], outcome.definedTags);
  const diagnostic: ElementRegistrationDiagnostic = {
    code: ElementRegistrationDiagnosticCode.DefinitionFailed,
    expected: metadataFor(tagName),
    message: `Failed to define ${tagName}: ${outcome.message ?? "Unknown registry failure."}`,
    tagName
  };
  return rejected([diagnostic], outcome.definedTags);
}

function rejected(
  diagnostics: readonly ElementRegistrationDiagnostic[],
  definedTags: readonly CoreElementTag[]
): RejectedElementsResult {
  return { definedTags, diagnostics, status: ElementRegistrationStatus.Rejected };
}

function registryUnavailableDiagnostic(): ElementRegistrationDiagnostic {
  return {
    code: ElementRegistrationDiagnosticCode.RegistryUnavailable,
    message: "No CustomElementRegistry is associated with this realm."
  };
}

function defaultElementRegistry(): ElementRegistryPort | null {
  return typeof customElements === "undefined" ? null : customElements;
}

function markDefinition(tagName: CoreElementTag, constructor: CustomElementConstructor): void {
  if (Object.prototype.hasOwnProperty.call(constructor, UNIFOLD_ELEMENT_DEFINITION)) return;
  Object.defineProperty(constructor, UNIFOLD_ELEMENT_DEFINITION, {
    value: Object.freeze(metadataFor(tagName))
  });
}

function metadataFor(tagName: CoreElementTag): ElementDefinitionMetadata {
  return { ...catalogIdentity, tagName };
}

function sameCatalogRelease(found: ElementDefinitionMetadata): boolean {
  return (
    found.catalogName === catalogIdentity.catalogName &&
    found.catalogMajor === catalogIdentity.catalogMajor &&
    found.catalogVersion === catalogIdentity.catalogVersion
  );
}

function isDefinitionMetadata(value: unknown): value is ElementDefinitionMetadata {
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const candidate = value as Readonly<Record<string, unknown>>;
  return hasCatalogFields(candidate) && isCoreElementTag(candidate["tagName"]);
}

function isCoreElementTag(value: unknown): value is CoreElementTag {
  return (
    typeof value === "string" && Object.values(CoreElementTag).includes(value as CoreElementTag)
  );
}
function hasCatalogFields(candidate: Readonly<Record<string, unknown>>): boolean {
  return (
    isNonEmptyString(candidate["catalogMajor"]) &&
    isNonEmptyString(candidate["catalogName"]) &&
    isNonEmptyString(candidate["catalogVersion"])
  );
}
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
