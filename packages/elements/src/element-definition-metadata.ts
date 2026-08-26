import { CoreCatalogMajor, CoreElementTag, coreCatalog } from "@unislang/unifold-catalog";

import type { ElementDefinitionMetadata } from "./register-types.js";

export const UNIFOLD_ELEMENT_DEFINITION = Symbol.for("org.unifold.element-definition");
export const catalogIdentity = Object.freeze({
  catalogMajor: CoreCatalogMajor.Version1,
  catalogName: coreCatalog.name,
  catalogVersion: coreCatalog.version
});

export function markDefinition(
  tagName: CoreElementTag,
  constructor: CustomElementConstructor
): void {
  if (Object.prototype.hasOwnProperty.call(constructor, UNIFOLD_ELEMENT_DEFINITION)) return;
  Object.defineProperty(constructor, UNIFOLD_ELEMENT_DEFINITION, {
    value: Object.freeze(metadataFor(tagName))
  });
}

export function metadataFor(tagName: CoreElementTag): ElementDefinitionMetadata {
  return { ...catalogIdentity, tagName };
}

export function sameCatalogRelease(found: ElementDefinitionMetadata): boolean {
  return hasCatalogIdentity(found, catalogIdentity);
}

export function isDefinitionMetadata(value: unknown): value is ElementDefinitionMetadata {
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const candidate = value as Readonly<Record<string, unknown>>;
  return hasCatalogFields(candidate) && isCoreElementTag(candidate["tagName"]);
}

export function readDefinitionMetadata(
  constructor: CustomElementConstructor
): ElementDefinitionMetadata | undefined {
  const value = Reflect.get(constructor, UNIFOLD_ELEMENT_DEFINITION) as unknown;
  return isDefinitionMetadata(value) ? Object.freeze({ ...value }) : undefined;
}

function hasCatalogIdentity(
  found: ElementDefinitionMetadata,
  expected: typeof catalogIdentity
): boolean {
  if (found.catalogName !== expected.catalogName) return false;
  return (
    found.catalogMajor === expected.catalogMajor && found.catalogVersion === expected.catalogVersion
  );
}

function isCoreElementTag(value: unknown): value is CoreElementTag {
  return (
    typeof value === "string" && Object.values(CoreElementTag).includes(value as CoreElementTag)
  );
}

function hasCatalogFields(candidate: Readonly<Record<string, unknown>>): boolean {
  return [candidate["catalogMajor"], candidate["catalogName"], candidate["catalogVersion"]].every(
    isNonEmptyString
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
