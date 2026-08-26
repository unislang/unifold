import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { breadcrumbSidecar } from "./breadcrumb-sidecar.js";
import { ComponentAccessibilityPattern, ComponentSemanticAttachmentKind } from "./enums.js";

it("publishes Breadcrumb accessibility, event, and ordered semantic evidence", () => {
  expect(breadcrumbSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.Breadcrumb },
    componentType: CoreComponentType.Breadcrumb,
    semanticAttachmentPoints: [
      { kind: ComponentSemanticAttachmentKind.OrderedCollectionPosition, sourceProperty: "items" }
    ],
    testManifest: {
      browserScenarios: ["navigates a semantic Breadcrumb and recovers without losing identity"]
    }
  });
});
