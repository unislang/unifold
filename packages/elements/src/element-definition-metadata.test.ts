import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import {
  UNIFOLD_ELEMENT_DEFINITION,
  isDefinitionMetadata,
  markDefinition,
  metadataFor,
  readDefinitionMetadata,
  sameCatalogRelease
} from "./element-definition-metadata.js";

it("marks constructors with exact catalog metadata", () => {
  class TestElement {
    readonly marker = true;
  }
  const constructor = TestElement as unknown as CustomElementConstructor;
  markDefinition(CoreElementTag.Button, constructor);
  const found = Reflect.get(TestElement, UNIFOLD_ELEMENT_DEFINITION) as unknown;
  expect(found).toEqual(metadataFor(CoreElementTag.Button));
  expect(readDefinitionMetadata(constructor)).toEqual(found);
  expect(isDefinitionMetadata(found)).toBe(true);
  expect(sameCatalogRelease(metadataFor(CoreElementTag.Button))).toBe(true);
  expect(isDefinitionMetadata({ catalogMajor: "1" })).toBe(false);
});
