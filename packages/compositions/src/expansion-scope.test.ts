import { expect, it } from "vitest";

import type { ExpansionScope } from "./expansion-context.js";
import { createSlotExpansionScope } from "./expansion-scope.js";

it("keeps logical attachment scope separate from the visual slot namespace", () => {
  const localIds = new Map([["group", "editor::group"]]);
  const scope = createSlotExpansionScope(ownerScope(localIds), "details", "/slot");

  expect(scope.prefix).toBe("editor::slot:details");
  expect(scope.controlAttachmentIds?.get("group")).toBe("editor::group");
});

function ownerScope(localIds: Map<string, string>): ExpansionScope {
  return {
    legacyCompatible: true,
    localIds,
    owner: {
      ancestry: [],
      definitionName: "Editor",
      definitionSourcePointer: "/compositions/0",
      definitionVersion: "2.0.0",
      instanceId: "editor",
      instanceSourcePointer: "/view"
    },
    rootId: "editor"
  };
}
