import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { cardSidecar, imageSidecar } from "./content-media-sidecars.js";
import {
  ComponentAccessibilityPattern,
  ComponentSemanticNormalization
} from "./definition-enums.js";

it("publishes reviewed native Image and Card accessibility contracts", () => {
  expect(imageSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.NativeImage },
    componentType: CoreComponentType.Image
  });
  expect(imageSidecar.semanticAttachmentPoints[1]).toMatchObject({
    normalization: ComponentSemanticNormalization.ImageUrl,
    sourceProperty: "src"
  });
  expect(cardSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.Article },
    componentType: CoreComponentType.Card
  });
});
