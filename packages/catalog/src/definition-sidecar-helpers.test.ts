import { CoreComponentType, UiContractSchemaUri } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  definition,
  exampleNode,
  imageUrlProperty,
  urlProperty,
  visibleProperty,
  visibleSubject
} from "./definition-sidecar-helpers.js";
import {
  ComponentAccessibilityPattern,
  ComponentSemanticAttachmentKind,
  ComponentSemanticNormalization,
  ComponentSemanticValueSource
} from "./definition-enums.js";

it("builds a frozen full-document sidecar from enum-backed inputs", () => {
  const sidecar = definition({
    behaviors: ["Uses native navigation"],
    browserScenarios: ["navigates"],
    componentType: CoreComponentType.Link,
    example: exampleNode(CoreComponentType.Link, "docs", { href: "#docs" }),
    pattern: ComponentAccessibilityPattern.NativeLink,
    purpose: "Navigate.",
    requirementIds: ["A11Y.LINK.NATIVE", "SEMANTICS.URL"],
    semanticAttachmentPoints: [urlProperty("url", "href")],
    sensitiveProperties: ["href"]
  });
  expect(sidecar.examples[0]?.$schema).toBe(UiContractSchemaUri.Version1);
  expect(sidecar.accessibility.requirementIds).toEqual(["A11Y.LINK.NATIVE"]);
  expect(sidecar.semanticAttachmentPoints[0]).toMatchObject({
    normalization: ComponentSemanticNormalization.Url,
    valueSource: ComponentSemanticValueSource.PublicProperty
  });
  expect(Object.isFrozen(sidecar.semanticAttachmentPoints[0])).toBe(true);
});

it("builds visible property and subject attachment points", () => {
  expect(visibleProperty("content", "content").kind).toBe(ComponentSemanticAttachmentKind.Property);
  expect(visibleSubject("content", "content").kind).toBe(ComponentSemanticAttachmentKind.Subject);
});

it("builds an image URL attachment without treating it as visible text", () => {
  expect(imageUrlProperty("image", "src")).toMatchObject({
    normalization: ComponentSemanticNormalization.ImageUrl,
    valueSource: ComponentSemanticValueSource.PublicProperty
  });
});
