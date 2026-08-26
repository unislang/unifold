import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  ComponentAccessibilityPattern,
  ComponentDataClassification,
  ComponentEvidenceCheck,
  ComponentSemanticAttachmentKind,
  ComponentSemanticHiddenContentPolicy,
  ComponentSemanticNormalization,
  ComponentSemanticValueSource,
  ComponentStatus
} from "./definition-enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

it("represents a data-only component definition sidecar", () => {
  const sidecar = createSidecar();
  expect(sidecar.componentType).toBe(CoreComponentType.Button);
});

function createSidecar(): ComponentDefinitionSidecar {
  return {
    accessibility: {
      manualChecks: [ComponentEvidenceCheck.Keyboard],
      pattern: ComponentAccessibilityPattern.NativeButton,
      requirementIds: ["A11Y.BUTTON.NATIVE"]
    },
    behaviors: ["Uses native activation"],
    componentType: CoreComponentType.Button,
    examples: [],
    privacy: { classification: ComponentDataClassification.Inherit, sensitiveProperties: [] },
    purpose: "Activate an action.",
    semanticAttachmentPoints: [
      {
        hiddenContent: ComponentSemanticHiddenContentPolicy.Prohibited,
        id: "label",
        kind: ComponentSemanticAttachmentKind.Property,
        normalization: ComponentSemanticNormalization.None,
        sourceProperty: "label",
        valueSource: ComponentSemanticValueSource.VisibleText
      }
    ],
    status: ComponentStatus.Experimental,
    testManifest: {
      browserScenarios: ["activation"],
      requirementIds: ["A11Y.BUTTON.NATIVE"],
      unitFile: "src/button.test.ts"
    }
  };
}
