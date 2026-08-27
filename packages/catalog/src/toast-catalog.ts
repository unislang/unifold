import { CoreComponentType } from "@unislang/unifold-contracts";

import {
  catalogEnumProperty,
  catalogProperty,
  catalogTestIdProperty
} from "./catalog-properties.js";
import {
  CatalogConstraintKind,
  CatalogPropertyType,
  CoreElementTag,
  ToastStatus,
  ToastVariant
} from "./enums.js";
import type { ComponentDescriptor } from "./types.js";

export const MAXIMUM_TOAST_LABEL_LENGTH = 256;
export const MAXIMUM_TOAST_MESSAGE_LENGTH = 4_096;

const requiredText = (name: string, maximumLength: number) => ({
  maximumLength,
  minimumLength: 1,
  name,
  required: true,
  valueType: CatalogPropertyType.String
});

const optionalNonEmptyText = (name: string, defaultValue: string, maximumLength: number) => ({
  ...catalogProperty(name, CatalogPropertyType.String, defaultValue),
  maximumLength,
  minimumLength: 1
});

export const toastDescriptor: ComponentDescriptor = Object.freeze({
  componentType: CoreComponentType.Toast,
  constraints: Object.freeze([
    Object.freeze({ kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 })
  ]),
  properties: Object.freeze([
    catalogProperty("dismissible", CatalogPropertyType.Boolean, true),
    optionalNonEmptyText("dismissLabel", "Dismiss notification", MAXIMUM_TOAST_LABEL_LENGTH),
    requiredText("label", MAXIMUM_TOAST_LABEL_LENGTH),
    requiredText("message", MAXIMUM_TOAST_MESSAGE_LENGTH),
    catalogEnumProperty("status", ToastStatus.Info, Object.values(ToastStatus)),
    catalogEnumProperty("variant", ToastVariant.Subtle, Object.values(ToastVariant)),
    catalogProperty("visible", CatalogPropertyType.Boolean, true),
    catalogTestIdProperty
  ]),
  tagName: CoreElementTag.Toast,
  version: "1.0.0"
});
