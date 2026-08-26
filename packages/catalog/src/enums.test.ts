import { expect, it } from "vitest";

import {
  ComponentAccessibilityPattern,
  ComponentCapability,
  ComponentDataClassification,
  ComponentDefinitionSchemaVersion,
  ComponentEvidenceCheck,
  ComponentSemanticAttachmentKind,
  ComponentSemanticHiddenContentPolicy,
  ComponentSemanticNormalization,
  ComponentSemanticValueSource,
  ComponentStatus,
  DialogActivationReason
} from "./enums.js";

it("exports enum-backed component-definition vocabulary", () => {
  expect(ComponentAccessibilityPattern.NativeButton).toBe("native-button");
  expect(ComponentCapability.CanonicalEventSnapshot).toBe("canonical-event-snapshot");
  expect(ComponentDataClassification.Inherit).toBe("inherit");
  expect(ComponentDefinitionSchemaVersion.Version1).toBe("1.0.0");
  expect(ComponentEvidenceCheck.ScreenReader).toBe("screen-reader");
  expect(ComponentSemanticAttachmentKind.OrderedCollectionPosition).toBe(
    "ordered-collection-position"
  );
  expect(ComponentSemanticHiddenContentPolicy.Prohibited).toBe("prohibited");
  expect(ComponentSemanticNormalization.ImageUrl).toBe("image-url");
  expect(ComponentSemanticValueSource.VisibleText).toBe("visible-text");
  expect(ComponentStatus.Experimental).toBe("experimental");
  expect(DialogActivationReason.Escape).toBe("escape");
});
