import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  ComponentAccessibilityPattern,
  ComponentSemanticAttachmentKind
} from "./definition-enums.js";
import { paginationSidecar } from "./pagination-sidecar.js";

it("publishes Pagination accessibility, event, and ordered semantic evidence", () => {
  expect(paginationSidecar).toMatchObject({
    accessibility: { pattern: ComponentAccessibilityPattern.PaginationNavigation },
    componentType: CoreComponentType.Pagination,
    semanticAttachmentPoints: [
      { kind: ComponentSemanticAttachmentKind.OrderedCollectionPosition, sourceProperty: "items" }
    ],
    testManifest: {
      browserScenarios: ["navigates explicit Pagination items through one canonical event stream"]
    }
  });
});
