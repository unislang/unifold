import type { CoreElementTag } from "@unislang/unifold-catalog";

import type { ElementRegistrationDiagnosticCode, ElementRegistrationStatus } from "./enums.js";
import type {
  ElementDefinitionMetadata,
  ElementRegistrationDiagnostic,
  ElementRegistrationResult,
  ElementRegistryPort
} from "./register-types.js";

const definitionSymbol = Symbol.for("org.unifold.element-definition");
const codes = {
  catalogMismatch: "element-catalog-mismatch" as ElementRegistrationDiagnosticCode,
  constructorAlreadyDefined:
    "element-constructor-already-defined" as ElementRegistrationDiagnosticCode,
  definitionFailed: "element-definition-failed" as ElementRegistrationDiagnosticCode,
  foreignDefinition: "foreign-element-definition" as ElementRegistrationDiagnosticCode,
  registryUnavailable: "element-registry-unavailable" as ElementRegistrationDiagnosticCode,
  tagMismatch: "element-tag-mismatch" as ElementRegistrationDiagnosticCode
};
const registeredStatus = "registered" as ElementRegistrationStatus.Registered;
const rejectedStatus = "rejected" as ElementRegistrationStatus.Rejected;
const catalogIdentity = Object.freeze({
  catalogMajor: "1",
  catalogName: "unifold-core",
  catalogVersion: "1.0.0"
});

export function defineOptionalElement(
  tagName: CoreElementTag,
  constructor: CustomElementConstructor,
  registry: ElementRegistryPort | null
): ElementRegistrationResult {
  const expected = metadata(tagName);
  mark(constructor, expected);
  if (registry === null) return unavailable();
  return defineWithRegistry(registry, constructor, expected);
}

function defineWithRegistry(
  registry: ElementRegistryPort,
  constructor: CustomElementConstructor,
  expected: ElementDefinitionMetadata
): ElementRegistrationResult {
  const existing = registry.get(expected.tagName);
  if (existing !== undefined) return validateExisting(existing, expected);
  return defineNew(registry, constructor, expected);
}

function defineNew(
  registry: ElementRegistryPort,
  constructor: CustomElementConstructor,
  expected: ElementDefinitionMetadata
): ElementRegistrationResult {
  const registeredName = registeredConstructorName(registry, constructor);
  if (registeredName !== null)
    return rejected(
      codes.constructorAlreadyDefined,
      `${expected.tagName}'s constructor is already registered as ${registeredName}.`,
      expected
    );
  return defineSafely(registry, constructor, expected);
}

function defineSafely(
  registry: ElementRegistryPort,
  constructor: CustomElementConstructor,
  expected: ElementDefinitionMetadata
): ElementRegistrationResult {
  try {
    registry.define(expected.tagName, constructor);
    return registered([expected.tagName]);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown registry failure.";
    return rejected(
      codes.definitionFailed,
      `Failed to define ${expected.tagName}: ${reason}`,
      expected
    );
  }
}

function validateExisting(
  foundConstructor: CustomElementConstructor,
  expected: ElementDefinitionMetadata
): ElementRegistrationResult {
  const found = readMetadata(foundConstructor);
  if (found === undefined)
    return rejected(
      codes.foreignDefinition,
      `${expected.tagName} is already registered by an unmarked constructor.`,
      expected
    );
  return validateMetadata(found, expected);
}

function validateMetadata(
  found: ElementDefinitionMetadata,
  expected: ElementDefinitionMetadata
): ElementRegistrationResult {
  if (found.tagName !== expected.tagName)
    return rejected(
      codes.tagMismatch,
      `${expected.tagName} is registered with metadata for ${found.tagName}.`,
      expected,
      found
    );
  if (!sameRelease(found, expected))
    return rejected(
      codes.catalogMismatch,
      `${expected.tagName} uses incompatible catalog ${found.catalogName}@${found.catalogVersion}.`,
      expected,
      found
    );
  return registered([]);
}

function registered(definedTags: readonly CoreElementTag[]): ElementRegistrationResult {
  return {
    catalog: catalogIdentity,
    definedTags,
    diagnostics: [],
    status: registeredStatus
  };
}

function unavailable(): ElementRegistrationResult {
  return {
    definedTags: [],
    diagnostics: [
      {
        code: codes.registryUnavailable,
        message: "No CustomElementRegistry is associated with this realm."
      }
    ],
    status: rejectedStatus
  };
}

function rejected(
  code: ElementRegistrationDiagnosticCode,
  message: string,
  expected: ElementDefinitionMetadata,
  found?: ElementDefinitionMetadata
): ElementRegistrationResult {
  const diagnostic: ElementRegistrationDiagnostic =
    found === undefined
      ? { code, expected, message, tagName: expected.tagName }
      : { code, expected, found, message, tagName: expected.tagName };
  return { definedTags: [], diagnostics: [diagnostic], status: rejectedStatus };
}

function metadata(tagName: CoreElementTag): ElementDefinitionMetadata {
  return { ...catalogIdentity, tagName };
}

function mark(constructor: CustomElementConstructor, value: ElementDefinitionMetadata): void {
  if (Object.prototype.hasOwnProperty.call(constructor, definitionSymbol)) return;
  Object.defineProperty(constructor, definitionSymbol, { value: Object.freeze(value) });
}

function readMetadata(
  constructor: CustomElementConstructor
): ElementDefinitionMetadata | undefined {
  const value = Reflect.get(constructor, definitionSymbol) as unknown;
  if (Object.prototype.toString.call(value) !== "[object Object]") return undefined;
  return value as ElementDefinitionMetadata;
}

function sameRelease(
  found: ElementDefinitionMetadata,
  expected: ElementDefinitionMetadata
): boolean {
  if (found.catalogName !== expected.catalogName) return false;
  return (
    found.catalogMajor === expected.catalogMajor && found.catalogVersion === expected.catalogVersion
  );
}

function registeredConstructorName(
  registry: ElementRegistryPort,
  constructor: CustomElementConstructor
): string | null {
  if (registry.getName === undefined) return null;
  return registry.getName(constructor);
}
