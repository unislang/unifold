import { CoreComponentType } from "@unislang/unifold-contracts";

import {
  definition,
  exampleNode as node,
  imageUrlProperty,
  visibleProperty
} from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";

export const cardSidecar = definition({
  behaviors: ["Uses a native article", "Preserves authored child order and token-only styling"],
  browserScenarios: ["renders bounded Image and Card content with native semantics"],
  componentType: CoreComponentType.Card,
  example: node(CoreComponentType.Card, "profile-card", {
    $children: [node(CoreComponentType.Text, "profile-summary", { content: "Profile summary" })],
    label: "Profile summary"
  }),
  pattern: ComponentAccessibilityPattern.Article,
  purpose: "Group one bounded, independently meaningful content item as a semantic article.",
  requirementIds: ["A11Y.CARD.ARTICLE", "A11Y.LAYOUT.DOM_ORDER", "THEME.TOKEN.LAYOUT"],
  semanticAttachmentPoints: [visibleProperty("label", "label")],
  sensitiveProperties: ["label"]
});

export const imageSidecar = definition({
  behaviors: [
    "Requires intentional alternative text, including an explicit empty decorative alternative",
    "Fetches only compiler-approved HTTP(S) or relative resources"
  ],
  browserScenarios: ["renders bounded Image and Card content with native semantics"],
  componentType: CoreComponentType.Image,
  example: node(CoreComponentType.Image, "profile-image", {
    alt: "Profile placeholder",
    height: 240,
    src: "/profile-placeholder.svg",
    width: 320
  }),
  pattern: ComponentAccessibilityPattern.NativeImage,
  purpose: "Render one dimensioned native image with an explicit alternative-text policy.",
  requirementIds: ["A11Y.IMAGE.ALT_REQUIRED", "SECURITY.IMAGE.SAFE_RESOURCE_URL"],
  semanticAttachmentPoints: [
    visibleProperty("alternative-text", "alt"),
    imageUrlProperty("content-url", "src")
  ],
  sensitiveProperties: ["alt", "src"]
});
