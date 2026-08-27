import {
  UiControlNodeKind,
  UiControlTopologyVersion,
  UiNodeKind
} from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  controlScopePath,
  controlTopologyFields,
  indexControlTopology
} from "./control-topology.js";

it("indexes ordered enum-backed control relationships independently of visual children", () => {
  const topology = indexControlTopology({
    contractVersion: UiControlTopologyVersion.Version1,
    nodes: [
      { id: "form", kind: UiControlNodeKind.Form },
      { id: "last", key: "last", kind: UiControlNodeKind.Control, parentId: "form" },
      { id: "first", key: "first", kind: UiControlNodeKind.Control, parentId: "form" }
    ]
  });

  expect(controlTopologyFields("form", topology)).toEqual({
    controlChildIds: ["last", "first"],
    kind: UiNodeKind.Form
  });
  expect(controlTopologyFields("first", topology)).toEqual({
    controlChildIds: [],
    controlKey: "first",
    controlParentId: "form",
    kind: UiNodeKind.Control
  });
  expect(controlTopologyFields("missing", topology)).toBeUndefined();
  expect(controlScopePath("first", ["page", "wrapper", "first"], topology)).toEqual([
    "page",
    "wrapper",
    "form",
    "first"
  ]);
});
