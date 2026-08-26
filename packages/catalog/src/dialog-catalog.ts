import { CoreComponentType } from "@unislang/unifold-contracts";

import {
  catalogProperty as property,
  catalogTestIdProperty as testId
} from "./catalog-properties.js";
import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import type { ComponentDescriptor } from "./types.js";

export const MAXIMUM_DIALOG_CHILDREN = 64;

export const dialogDescriptor: ComponentDescriptor = {
  componentType: CoreComponentType.Dialog,
  constraints: [
    { kind: CatalogConstraintKind.ChildCount, maximum: MAXIMUM_DIALOG_CHILDREN, minimum: 1 }
  ],
  properties: [
    property("dialogLabel", CatalogPropertyType.String, undefined, true),
    property("disabled", CatalogPropertyType.Boolean, false),
    property("dismissLabel", CatalogPropertyType.String, "Close dialog"),
    property("label", CatalogPropertyType.String, undefined, true),
    testId
  ],
  tagName: CoreElementTag.Dialog,
  version: "1.0.0"
};
