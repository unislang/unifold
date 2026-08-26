import { UiCommandType, UiEventType, type UiEvent } from "@unislang/unifold-events";
import { createNodeSnapshot } from "@unislang/unifold-renderer-dom";
import { UnifoldRuntime } from "@unislang/unifold-runtime";
import { expect, it } from "vitest";

import { prepareUnifoldDocument } from "./compiler.js";
import { UiMachineCoordinator } from "./machine-coordinator.js";
import {
  authoredDocument,
  workflowCommandRegistry,
  workflowDefinition
} from "./application.test-data.js";

it("retains unchanged actors and emits causally linked runtime commands", () => {
  const prepared = requirePrepared(withMachine(authoredDocument()));
  const runtime = runtimeFor(prepared.document);
  const events: UiEvent[] = [];
  runtime.events$.subscribe((event) => events.push(event));
  const coordinator = new UiMachineCoordinator(runtime, workflowCommandRegistry());
  coordinator.replace(prepared.document.machines, prepared.document.nodesById);

  runtime.execute([{ id: "form", type: UiCommandType.FormSubmit }]);

  expect(coordinator.state("profile-workflow")).toBe("saved");
  expect(runtime.getSnapshot("name").properties["label"]).toBe("Saved name");
  coordinator.replace(prepared.document.machines, prepared.document.nodesById);
  expect(coordinator.state("profile-workflow")).toBe("saved");
  expectCausalCommand(events);
  coordinator.dispose();
  runtime.dispose();
});

function withMachine(source: ReturnType<typeof authoredDocument>) {
  return { ...source, machines: [workflowDefinition()] };
}

function requirePrepared(source: unknown) {
  const result = prepareUnifoldDocument(source);
  if (result.prepared === undefined) throw new Error("Expected a prepared document.");
  return result.prepared;
}

function runtimeFor(document: ReturnType<typeof requirePrepared>["document"]): UnifoldRuntime {
  return new UnifoldRuntime({
    documentId: document.documentId,
    initialNodes: document.renderOrder.map((id) => createNodeSnapshot(requireNode(document, id), 0))
  });
}

function requireNode(document: ReturnType<typeof requirePrepared>["document"], id: string) {
  const node = document.nodesById[id];
  if (node === undefined) throw new Error(`Missing node: ${id}.`);
  return node;
}

function expectCausalCommand(events: readonly UiEvent[]): void {
  const submitted = events.find(({ type }) => type === UiEventType.FormSubmitted);
  const command = events.find(
    (event) => event.type === UiEventType.CommandApplied && event.causationid === submitted?.id
  );
  expect(command?.data.change).toEqual({ commandType: UiCommandType.NodePatchProperties });
}
