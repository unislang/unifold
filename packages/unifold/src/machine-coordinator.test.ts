import { UiCommandType, UiEventType, type UiEvent } from "@unislang/unifold-events";
import { createNodeSnapshot } from "@unislang/unifold-renderer-dom";
import { UnifoldRuntime } from "@unislang/unifold-runtime";
import { expect, it, vi } from "vitest";

import { prepareUnifoldDocument } from "./compiler.js";
import { UiMachineConfigurationError, UiMachineCoordinator } from "./machine-coordinator.js";
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

it("cleans staged registrations and retains exact old routes after replacement fails", () => {
  const definitions = repeatableWorkflowDefinitions("1.0.0");
  const prepared = requirePrepared({ ...authoredDocument(), machines: definitions });
  const runtime = runtimeFor(prepared.document);
  const coordinator = new UiMachineCoordinator(runtime, workflowCommandRegistry());
  coordinator.replace(definitions, prepared.document.nodesById);
  const events: UiEvent[] = [];
  runtime.events$.subscribe((event) => events.push(event));
  const registration = failSecondRegistration(runtime);

  expect(() =>
    coordinator.replace(
      repeatableWorkflowDefinitions("2.0.0"),
      prepared.document.nodesById,
      registration.registrar
    )
  ).toThrow(UiMachineConfigurationError);
  expect(registration.unregister).toHaveBeenCalledOnce();
  expect([coordinator.state("workflow-one"), coordinator.state("workflow-two")]).toEqual([
    "editing",
    "editing"
  ]);

  runtime.execute([{ id: "form", type: UiCommandType.FormSubmit }]);
  expect(patchCommandCount(events)).toBe(2);
  coordinator.replace(repeatableWorkflowDefinitions("2.0.0"), prepared.document.nodesById);
  events.length = 0;
  runtime.execute([{ id: "form", type: UiCommandType.FormSubmit }]);
  expect(patchCommandCount(events)).toBe(2);
  coordinator.dispose();
  runtime.dispose();
});

it("does not register any candidate when later actor creation fails", () => {
  const definitions = repeatableWorkflowDefinitions("1.0.0");
  const prepared = requirePrepared({ ...authoredDocument(), machines: definitions });
  const runtime = runtimeFor(prepared.document);
  const coordinator = new UiMachineCoordinator(runtime, workflowCommandRegistry());
  coordinator.replace(definitions, prepared.document.nodesById);
  const register = vi.spyOn(runtime, "registerActor");
  const invalid = [repeatableWorkflowDefinition("workflow-one", "2.0.0"), invalidWorkflow()];

  expect(() => coordinator.replace(invalid, prepared.document.nodesById)).toThrow(
    UiMachineConfigurationError
  );
  expect(register).not.toHaveBeenCalled();
  expect([coordinator.state("workflow-one"), coordinator.state("workflow-two")]).toEqual([
    "editing",
    "editing"
  ]);
  coordinator.dispose();
  runtime.dispose();
});

it("keeps the committed replacement when obsolete actor shutdown fails", () => {
  const definition = repeatableWorkflowDefinition("workflow-one", "1.0.0");
  const prepared = requirePrepared({ ...authoredDocument(), machines: [definition] });
  const runtime = runtimeFor(prepared.document);
  const coordinator = new UiMachineCoordinator(runtime, workflowCommandRegistry());
  coordinator.replace([definition], prepared.document.nodesById);
  failActorStop(coordinator, "workflow-one");

  expect(() =>
    coordinator.replace(
      [repeatableWorkflowDefinition("workflow-one", "2.0.0")],
      prepared.document.nodesById
    )
  ).not.toThrow();
  runtime.execute([{ id: "form", type: UiCommandType.FormSubmit }]);
  expect(coordinator.state("workflow-one")).toBe("saved");
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

function repeatableWorkflowDefinitions(version: string) {
  return [
    repeatableWorkflowDefinition("workflow-one", version),
    repeatableWorkflowDefinition("workflow-two", version)
  ];
}

function repeatableWorkflowDefinition(id: string, version: string) {
  const definition = workflowDefinition();
  return {
    ...definition,
    id,
    states: {
      ...definition.states,
      saved: {
        on: {
          [UiEventType.FormSubmitted]: { commands: ["show-saved"], target: "saved" }
        }
      }
    },
    version
  };
}

function invalidWorkflow() {
  const definition = repeatableWorkflowDefinition("workflow-two", "2.0.0");
  return {
    ...definition,
    states: {
      ...definition.states,
      editing: {
        on: {
          [UiEventType.FormSubmitted]: { commands: ["missing-command"], target: "saved" }
        }
      }
    }
  };
}

function failSecondRegistration(runtime: UnifoldRuntime) {
  const register = runtime.registerActor.bind(runtime);
  const unregister = vi.fn();
  let attempts = 0;
  const registrar = {
    registerActor(id: string, actor: Parameters<UnifoldRuntime["registerActor"]>[1]) {
      attempts += 1;
      if (attempts === 2) throw new Error("Injected registration failure.");
      const remove = register(id, actor);
      return () => {
        unregister();
        remove();
      };
    }
  };
  return { registrar, unregister };
}

function failActorStop(coordinator: UiMachineCoordinator, id: string): void {
  const records = Reflect.get(coordinator, "records") as Map<
    string,
    { readonly actor: { stop(): void } }
  >;
  const record = requireValue(records.get(id), "machine record");
  vi.spyOn(record.actor, "stop").mockImplementationOnce(() => {
    throw new Error("Injected obsolete actor failure.");
  });
}

function patchCommandCount(events: readonly UiEvent[]): number {
  return events.filter(
    (event) => commandType(event.data.change) === UiCommandType.NodePatchProperties
  ).length;
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
