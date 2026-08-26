import { DataClassification } from "@unislang/unifold-contracts";
import {
  UiEventDisclosureMode,
  UiEventPhase,
  UiEventRedactionReason,
  createUiEvent
} from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { projectIntent, projectSnapshot } from "./event-disclosure.js";
import { controlNode } from "./runtime.test-data.js";

it.each([
  DataClassification.Internal,
  DataClassification.Confidential,
  DataClassification.Restricted,
  DataClassification.NeverExport
])("projects %s snapshots as metadata only", (classification) => {
  const snapshot = classifiedNode(classification);
  expect(projectSnapshot(snapshot)).toEqual({
    disclosure: {
      classification,
      mode: UiEventDisclosureMode.MetadataOnly,
      reason: UiEventRedactionReason.Classification,
      snapshotRevision: 0
    },
    source: expect.objectContaining({ id: "field" })
  });
});

it("retains public snapshots unless an explicit policy requires metadata only", () => {
  const snapshot = controlNode("field", "public-value");
  expect(projectSnapshot(snapshot).snapshot).toBe(snapshot);
  expect(
    projectSnapshot(snapshot, { reason: UiEventRedactionReason.StoreWrite }).disclosure?.mode
  ).toBe(UiEventDisclosureMode.MetadataOnly);
});

it("uses the authoritative snapshot to redact forged public intent data", () => {
  const event = intentEvent();
  const projected = projectIntent(event, classifiedNode(DataClassification.Restricted));
  expect(projected.data.snapshot).toBeUndefined();
  expect(projected.data.change).toBeUndefined();
  expect(projected.data.disclosure?.classification).toBe(DataClassification.Restricted);
  expect(JSON.stringify(projected)).not.toContain("secret-value");
});

function classifiedNode(classification: DataClassification) {
  const node = controlNode("field", "secret-value");
  return { ...node, base: { ...node.base, dataClassification: classification } };
}

function intentEvent() {
  return createUiEvent({
    data: {
      change: { value: "secret-value" },
      phase: UiEventPhase.Intent,
      runtime: { documentId: "test" }
    },
    id: "intent",
    source: "urn:unifold:component:field",
    time: "2026-08-25T00:00:00.000Z",
    type: "org.unifold.ui.control.input.v1",
    correlationid: "correlation",
    sequence: 1,
    staterevision: 0,
    transactionid: "transaction"
  });
}
