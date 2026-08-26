import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { ComponentAccessibilityPattern } from "./definition-enums.js";
import {
  errorSummarySidecar,
  fieldsetSidecar,
  fieldSidecar,
  formSidecar
} from "./form-structure-sidecars.js";

it("documents native form structure, grouping, and error-navigation evidence", () => {
  expect(errorSummarySidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.ErrorSummary },
    componentType: CoreComponentType.ErrorSummary,
    privacy: { sensitiveProperties: ["errors", "title"] }
  });
  expect(fieldSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.FieldGroup },
    componentType: CoreComponentType.Field,
    privacy: { sensitiveProperties: ["errorMessage", "helpText", "label"] }
  });
  expect(fieldsetSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.NativeFieldset },
    componentType: CoreComponentType.Fieldset,
    privacy: { sensitiveProperties: ["helpText", "label"] }
  });
  expect(formSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.NativeForm },
    componentType: CoreComponentType.Form,
    privacy: { sensitiveProperties: ["errorMessages"] }
  });
  expect(fieldSidecar.examples[0]?.view.$children).toHaveLength(1);
  expect(fieldsetSidecar.examples[0]?.view.$children).toHaveLength(1);
});
