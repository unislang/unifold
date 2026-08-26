import { DataClassification } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { node } from "./devtools.test-data.js";
import { inspectNodes } from "./picker.js";
import { DevtoolsProjectionMode } from "./types.js";

const inspection = Object.freeze({
  nodes: Object.freeze([
    node("form"),
    node("public-name", DataClassification.Public, "form"),
    node("private-email", DataClassification.Confidential, "form")
  ]),
  revision: 0,
  selectionDispatch: Object.freeze({
    activeSelections: 0,
    candidateSelections: 0,
    changedNodeCount: 0,
    invalidatedSelections: 0
  })
});

it("filters normalized nodes by scope and search without exposing private snapshots", () => {
  expect(inspectNodes(inspection, { scopeId: "form" })).toHaveLength(3);
  expect(inspectNodes(inspection, { query: "email" })[0]?.mode).toBe(
    DevtoolsProjectionMode.MetadataOnly
  );
  expect(inspectNodes(inspection, { limit: 1 })).toHaveLength(1);
  expect(() => inspectNodes(inspection, { limit: 0 })).toThrow(RangeError);
  expect(() => inspectNodes(inspection, { query: "x".repeat(129) })).toThrow(RangeError);
});
