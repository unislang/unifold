import { UiCommandType } from "@unislang/unifold-events";
import { UnifoldRuntime } from "@unislang/unifold-runtime";
import { expect, it } from "vitest";

import { afterDocument, beforeDocument, node } from "./devtools.test-data.js";
import { UnifoldDevtoolsSession } from "./session.js";
import type { DevtoolsNodeInspection, DevtoolsTimelineEntry } from "./types.js";

it(
  "integrates bounded inspection, events, transactions, and diffs with the runtime",
  verifySession
);

async function verifySession(): Promise<void> {
  const runtime = runtimeFixture();
  const session = new UnifoldDevtoolsSession(runtime, {
    capacity: 10,
    now: () => "2026-08-25T12:00:01.000Z"
  });
  runtime.execute([{ id: "field", type: UiCommandType.ControlSetValue, value: "updated" }]);
  expect(nodeValue(requiredNode(session.nodes({ query: "field" })[0]))).toBe("updated");
  expect(session.events().entries).toHaveLength(2);
  expect(transactionRevision(requiredEntry(session.events().entries[0]))).toBe(1);
  await expect(session.diff(beforeDocument, afterDocument)).resolves.toMatchObject({
    operations: expect.any(Array)
  });
  session.dispose();
  runtime.execute([{ id: "field", type: UiCommandType.ControlSetValue, value: "ignored" }]);
  expect(session.events().entries).toEqual([]);
  runtime.dispose();
}

function runtimeFixture(): UnifoldRuntime {
  let id = 0;
  return new UnifoldRuntime({
    createId: () => `runtime-event-${++id}`,
    documentId: "document-1",
    initialNodes: [node()],
    now: () => "2026-08-25T12:00:00.000Z"
  });
}

function requiredNode(value: DevtoolsNodeInspection | undefined): DevtoolsNodeInspection {
  if (value === undefined) throw new Error("Expected one inspected node.");
  return value;
}

function requiredEntry(value: DevtoolsTimelineEntry | undefined): DevtoolsTimelineEntry {
  if (value === undefined) throw new Error("Expected one timeline entry.");
  return value;
}

function nodeValue(value: DevtoolsNodeInspection): unknown {
  return value.snapshot?.control?.value;
}

function transactionRevision(value: DevtoolsTimelineEntry): number | undefined {
  return value.transaction?.revision;
}
