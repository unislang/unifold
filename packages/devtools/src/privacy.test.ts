import { DataClassification } from "@unislang/unifold-contracts";
import { UiEventDisclosureMode } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { event, node } from "./devtools.test-data.js";
import { projectNode, projectTimelineEvent } from "./privacy.js";
import { DevtoolsProjectionMode } from "./types.js";

it("projects public nodes fully and non-public nodes as metadata only", () => {
  expect(projectNode(node()).mode).toBe(DevtoolsProjectionMode.Full);
  const privateNode = projectNode(node("private", DataClassification.Restricted));
  expect(privateNode.mode).toBe(DevtoolsProjectionMode.MetadataOnly);
  expect(privateNode.snapshot).toBeUndefined();
  expect(privateNode.source.id).toBe("private");
});

it("defensively strips value-bearing fields from metadata-only events", () => {
  const candidate = event(1);
  const projected = projectTimelineEvent({
    ...candidate,
    data: {
      ...candidate.data,
      disclosure: {
        classification: DataClassification.Restricted,
        mode: UiEventDisclosureMode.MetadataOnly,
        snapshotRevision: 1
      }
    }
  });
  expect(projected.data.change).toBeUndefined();
  expect(projected.data.snapshot).toBeUndefined();
  expect(projected.data.sourceNode?.id).toBe("field");
  expect(Object.isFrozen(projected.data)).toBe(true);
});
