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
  ImageFit,
  ImageLoading,
  LayoutSpace,
  SurfaceTone
} from "./enums.js";
import type { ComponentDescriptor } from "./types.js";

export const MAXIMUM_CARD_CHILDREN = 100;

export const cardDescriptor: ComponentDescriptor = Object.freeze({
  componentType: CoreComponentType.Card,
  constraints: Object.freeze([
    Object.freeze({
      kind: CatalogConstraintKind.ChildCount,
      maximum: MAXIMUM_CARD_CHILDREN,
      minimum: 1
    })
  ]),
  properties: Object.freeze([
    catalogProperty("label", CatalogPropertyType.String, ""),
    catalogEnumProperty("padding", LayoutSpace.Medium, Object.values(LayoutSpace)),
    catalogEnumProperty("surface", SurfaceTone.Default, Object.values(SurfaceTone)),
    catalogTestIdProperty
  ]),
  tagName: CoreElementTag.Card,
  version: "1.0.0"
});

export const imageDescriptor: ComponentDescriptor = Object.freeze({
  componentType: CoreComponentType.Image,
  constraints: Object.freeze([
    Object.freeze({ kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 })
  ]),
  properties: Object.freeze([
    catalogProperty("alt", CatalogPropertyType.String, undefined, true),
    catalogEnumProperty("fit", ImageFit.Cover, Object.values(ImageFit)),
    catalogProperty("height", CatalogPropertyType.PositiveInteger, undefined, true),
    catalogEnumProperty("loading", ImageLoading.Lazy, Object.values(ImageLoading)),
    catalogProperty("src", CatalogPropertyType.SafeResourceUrl, undefined, true),
    catalogProperty("width", CatalogPropertyType.PositiveInteger, undefined, true),
    catalogTestIdProperty
  ]),
  tagName: CoreElementTag.Image,
  version: "1.0.0"
});
