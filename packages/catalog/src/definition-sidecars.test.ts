import { CoreComponentType, UiContractSchemaUri } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { coreCatalog } from "./core-catalog.js";
import {
  componentDefinitionSidecars,
  getComponentDefinitionSidecar
} from "./definition-sidecars.js";
import {
  ComponentEvidenceCheck,
  ComponentSemanticHiddenContentPolicy,
  ComponentStatus
} from "./enums.js";

const coreTypes = Object.values(CoreComponentType);

it("defines a complete reviewed sidecar for every core component", () => {
  expect(Object.keys(componentDefinitionSidecars).sort()).toEqual([...coreTypes].sort());
  coreTypes.forEach(assertCompleteSidecar);
});

it("retrieves every definition by enum-backed component identity", () => {
  coreTypes.forEach((type) => {
    expect(getComponentDefinitionSidecar(type).componentType).toBe(type);
  });
});

it("binds privacy and semantic fields only to declared catalog properties", () => {
  coreTypes.forEach(assertDeclaredPropertyReferences);
});

it("publishes immutable sidecars, examples, and nested evidence", () => {
  const definition = getComponentDefinitionSidecar(CoreComponentType.Link);
  const values = [
    definition,
    definition.accessibility,
    definition.accessibility.requirementIds,
    definition.behaviors,
    definition.examples,
    definition.examples[0],
    definition.examples[0]?.view,
    definition.privacy,
    definition.privacy.sensitiveProperties,
    definition.semanticAttachmentPoints,
    definition.semanticAttachmentPoints[0],
    definition.testManifest,
    definition.testManifest.browserScenarios
  ];
  expect(values.every(Object.isFrozen)).toBe(true);
});

function assertCompleteSidecar(type: CoreComponentType): void {
  const definition = getComponentDefinitionSidecar(type);
  expect(definition.status).toBe(ComponentStatus.Experimental);
  expect(definition.purpose).not.toBe("");
  expect(definition.behaviors.length).toBeGreaterThan(0);
  expect(definition.accessibility.requirementIds.length).toBeGreaterThan(0);
  expect(definition.accessibility.manualChecks).toEqual(Object.values(ComponentEvidenceCheck));
  expect(definition.testManifest.requirementIds).toEqual(
    expect.arrayContaining([...definition.accessibility.requirementIds])
  );
  expect(definition.examples[0]?.$schema).toBe(UiContractSchemaUri.Version1);
  expect(definition.examples[0]?.view.$comp).toBe(type);
}

function assertDeclaredPropertyReferences(type: CoreComponentType): void {
  const definition = getComponentDefinitionSidecar(type);
  const descriptor = coreCatalog.components[type];
  const propertyNames = new Set(descriptor.properties.map(({ name }) => name));
  expect(definition.privacy.sensitiveProperties.every((name) => propertyNames.has(name))).toBe(
    true
  );
  expect(
    definition.semanticAttachmentPoints.every(({ hiddenContent, sourceProperty }) => {
      return (
        hiddenContent === ComponentSemanticHiddenContentPolicy.Prohibited &&
        propertyNames.has(sourceProperty)
      );
    })
  ).toBe(true);
}
