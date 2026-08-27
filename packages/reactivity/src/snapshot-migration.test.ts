import { UiControlStatus, UiValidationSeverity } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { migrateSnapshot } from "./snapshot-migration.js";
import { controlNode } from "./test-helpers.js";

it("preserves dirty values but clears obsolete in-flight async validation", () => {
  const current = controlNode("name", "Ada");
  const desired = controlNode("name", "Default");
  if (current.control === undefined || desired.control === undefined) throw new Error("control");
  const pending = {
    ...current,
    control: {
      ...current.control,
      asyncValidatorIds: ["available"],
      dirty: true,
      errors: [asyncError()],
      pending: true,
      pristine: false,
      status: UiControlStatus.Pending,
      validationRequestId: "request-1"
    }
  };

  expect(migrateSnapshot(pending, desired).control).toMatchObject({
    asyncValidatorIds: [],
    dirty: true,
    errors: [],
    pending: false,
    status: UiControlStatus.Valid,
    validationRequestId: null,
    value: "Ada"
  });
});

function asyncError() {
  return {
    code: "unavailable",
    messageKey: "validation.unavailable",
    ownerId: "name",
    severity: UiValidationSeverity.Error,
    validatorId: "available"
  };
}
