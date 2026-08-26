import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { cardDescriptor, imageDescriptor, MAXIMUM_CARD_CHILDREN } from "./content-media-catalog.js";
import { CatalogConstraintKind, CatalogPropertyType, ImageFit, ImageLoading } from "./enums.js";

it("requires exact intrinsic and alternative image data", () => {
  expect(requiredProperties()).toEqual(["alt", "height", "src", "width"]);
  expect(property("src")).toMatchObject({ valueType: CatalogPropertyType.SafeResourceUrl });
  expect(property("fit")).toMatchObject({ defaultValue: ImageFit.Cover });
  expect(property("loading")).toMatchObject({ defaultValue: ImageLoading.Lazy });
  expect(imageDescriptor.constraints).toEqual([
    { kind: CatalogConstraintKind.ChildCount, maximum: 0, minimum: 0 }
  ]);
});

it("bounds Card to a non-empty authored child collection", () => {
  expect(cardDescriptor).toMatchObject({ componentType: CoreComponentType.Card });
  expect(cardDescriptor.constraints).toEqual([
    { kind: CatalogConstraintKind.ChildCount, maximum: MAXIMUM_CARD_CHILDREN, minimum: 1 }
  ]);
});

function property(name: string) {
  return imageDescriptor.properties.find((candidate) => candidate.name === name);
}

function requiredProperties(): readonly string[] {
  return imageDescriptor.properties.filter(({ required }) => required).map(({ name }) => name);
}
