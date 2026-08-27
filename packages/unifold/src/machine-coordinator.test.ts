import { UiCommandType, UiEventType, type UiEvent } from "@unislang/unifold-events";
import { createNodeSnapshot } from "@unislang/unifold-renderer-dom";
import { UnifoldRuntime } from "@unislang/unifold-runtime";
import { expect, it, vi } from "vitest";

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

it("commits one XState command batch and does not write effect-only state", () => {
  const prepared = requirePrepared(withMachine(authoredDocument(), batchedWorkflowDefinition()));
  const execute = vi.fn();
  const runtime = runtimeFor(prepared.document, { execute });
  const events: UiEvent[] = [];
  runtime.events$.subscribe((event) => events.push(event));
  const coordinator = new UiMachineCoordinator(runtime, batchedWorkflowCommands());
  coordinator.replace(prepared.document.machines, prepared.document.nodesById);

  runtime.execute([{ id: "form", type: UiCommandType.FormSubmit }]);

  const submitted = events.find(({ type }) => type === UiEventType.FormSubmitted);
  const caused = events.filter(({ causationid }) => causationid === submitted?.id);
  expect(caused.map(({ type }) => type)).toEqual([
    UiEventType.CommandApplied,
    UiEventType.CommandApplied,
    UiEventType.TransactionCommitted,
    UiEventType.EffectRequested,
    UiEventType.EffectCompleted
  ]);
  expect(runtime.revision).toBe(2);
  expect(execute).toHaveBeenCalledTimes(1);
  expectMachineEffectIdentity(caused, execute);
  coordinator.dispose();
  runtime.dispose();
});

function withMachine(
  source: ReturnType<typeof authoredDocument>,
  definition = workflowDefinition()
) {
  return { ...source, machines: [definition] };
}

function expectMachineEffectIdentity(
  caused: readonly UiEvent[],
  execute: ReturnType<typeof vi.fn>
): void {
  const command = requireValue(caused.find(isAnnouncementCommand), "announcement command");
  const subject = requireValue(command.subject, "effect subject");
  const lifecycle = caused.filter(({ data }) => data.phase === "effect");
  const call = requireValue(execute.mock.calls[0], "effect port call");
  expect(lifecycle.map(({ subject: id }) => id)).toEqual([subject, subject]);
  expect(lifecycle.map(effectSourceId)).toEqual(["form", "form"]);
  expect(call[1]).toMatchObject({ effectId: subject });
}

function isAnnouncementCommand(event: UiEvent): boolean {
  return (
    event.type === UiEventType.CommandApplied &&
    commandType(event.data.change) === UiCommandType.AnnouncementRequest
  );
}

function effectSourceId(event: UiEvent): string | undefined {
  return event.data.sourceNode?.id;
}

function commandType(change: unknown): unknown {
  if (!isRecord(change)) return undefined;
  return Reflect.get(change, "commandType");
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null) return false;
  if (typeof value !== "object") return false;
  return !Array.isArray(value);
}

function requirePrepared(source: unknown) {
  const result = prepareUnifoldDocument(source);
  if (result.prepared === undefined) throw new Error("Expected a prepared document.");
  return result.prepared;
}

function runtimeFor(
  document: ReturnType<typeof requirePrepared>["document"],
  commandPort?: { execute: ReturnType<typeof vi.fn> }
): UnifoldRuntime {
  return new UnifoldRuntime({
    ...(commandPort === undefined ? {} : { commandPort }),
    documentId: document.documentId,
    initialNodes: document.renderOrder.map((id) => createNodeSnapshot(requireNode(document, id), 0))
  });
}

function batchedWorkflowDefinition() {
  const definition = workflowDefinition();
  const editing = requireValue(definition.states["editing"], "editing state");
  const transitions = requireValue(editing.on, "editing transitions");
  const transition = requireValue(transitions[UiEventType.FormSubmitted], "submit transition");
  return {
    ...definition,
    states: {
      ...definition.states,
      editing: {
        ...editing,
        on: {
          ...editing.on,
          [UiEventType.FormSubmitted]: {
            ...transition,
            commands: ["show-saved", "announce-saved"]
          }
        }
      }
    }
  };
}

function requireValue<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`Missing ${name}.`);
  return value;
}

function batchedWorkflowCommands() {
  const registry = workflowCommandRegistry();
  registry.register("announce-saved", () => ({
    messageKey: "profile.saved",
    type: UiCommandType.AnnouncementRequest
  }));
  return registry;
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
