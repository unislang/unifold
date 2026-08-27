import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  MAXIMUM_TOAST_LABEL_LENGTH,
  MAXIMUM_TOAST_MESSAGE_LENGTH,
  toastDescriptor
} from "./toast-catalog.js";
import { CatalogConstraintKind, CoreElementTag, ToastStatus, ToastVariant } from "./enums.js";

it("publishes a persistent bounded Toast contract", () => {
  expect(toastDescriptor).toMatchObject({
    componentType: CoreComponentType.Toast,
    tagName: CoreElementTag.Toast
  });
  expect(property("label")).toMatchObject({
    maximumLength: MAXIMUM_TOAST_LABEL_LENGTH,
    minimumLength: 1,
    required: true
  });
  expect(property("message")).toMatchObject({
    maximumLength: MAXIMUM_TOAST_MESSAGE_LENGTH,
    minimumLength: 1,
    required: true
  });
  expect(property("status")).toMatchObject({
    defaultValue: ToastStatus.Info,
    enumValues: Object.values(ToastStatus)
  });
  expect(property("variant")).toMatchObject({
    defaultValue: ToastVariant.Subtle,
    enumValues: Object.values(ToastVariant)
  });
  expect(property("visible")?.defaultValue).toBe(true);
});

it("requires no children and exposes no auto-dismiss duration", () => {
  expect(toastDescriptor.constraints).toEqual([
    { kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 }
  ]);
  expect(property("dismissible")?.defaultValue).toBe(true);
  expect(property("dismissLabel")).toMatchObject({
    defaultValue: "Dismiss notification",
    maximumLength: MAXIMUM_TOAST_LABEL_LENGTH,
    minimumLength: 1
  });
  expect(property("duration")).toBeUndefined();
});

function property(name: string) {
  return toastDescriptor.properties.find((candidate) => candidate.name === name);
}
