import {
  UiCommandType,
  UiControlStatus,
  UiEventType,
  UiNodeKind,
  UiUpdateTrigger,
  type UiEvent
} from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { UnifoldRuntime } from "./index.js";
import { compositionNode, controlNode } from "./runtime.test-data.js";

it("applies every state command family", verifyStateCommands);
it("rejects invalid control commands atomically", verifyRejectedTransaction);
it("publishes an invalid form fact for required controls", verifyInvalidForm);
it("commits submit-deferred values before a valid form fact", verifyValidForm);
it("commits deferred values only at their configured trigger", verifyDeferredValues);
it("resets a form atomically to its initial aggregate", verifyFormReset);
it("excludes disabled controls and revalidates them when enabled", verifyDisabledControl);

function verifyStateCommands(): void {
  const runtime = createRuntime();
  runtime.execute([
    { type: UiCommandType.ControlSetValue, id: "field", value: "Edited" },
    { type: UiCommandType.ControlSetStatus, id: "field", status: UiControlStatus.Pending },
    { type: UiCommandType.NodePatchProperties, id: "field", properties: { label: "Name" } }
  ]);
  expect(runtime.getSnapshot("field")).toMatchObject({
    base: { disabled: false },
    control: { pending: true, status: UiControlStatus.Pending },
    properties: { label: "Name" }
  });
  const child = controlNode("child", "", "form");
  runtime.execute([{ type: UiCommandType.StructureInstantiate, node: child }]);
  expect(runtime.getSnapshot("child").parentId).toBe("form");
  runtime.execute([{ type: UiCommandType.StructureRemove, id: "child" }]);
  expect(() => runtime.getSnapshot("child")).toThrow("Unknown node: child");
  verifyReconcile(runtime);
}

function verifyReconcile(runtime: UnifoldRuntime): void {
  const reconciled = { ...controlNode("field", "Default", "form"), properties: { label: "Full" } };
  runtime.execute([
    {
      type: UiCommandType.StructureReconcile,
      compositionInstances: {},
      nodes: [compositionNode("form"), reconciled]
    }
  ]);
  expect(runtime.getSnapshot("field")).toMatchObject({
    control: { dirty: true, value: "Edited" },
    parentId: "form",
    properties: { label: "Full" }
  });
  const encodedId = "profile%3Aeditor::name%25field";
  runtime.execute([
    {
      type: UiCommandType.StructureReconcile,
      compositionInstances: {},
      nodeIdentityAliases: { [encodedId]: "field" },
      nodes: [compositionNode("form"), { ...reconciled, id: encodedId }]
    }
  ]);
  expect(runtime.getSnapshot(encodedId).control).toMatchObject({ dirty: true, value: "Edited" });
  expect(() => runtime.getSnapshot("field")).toThrow("Unknown node: field");
  verifyExplicitReset(runtime, reconciled, encodedId);
}

function verifyExplicitReset(
  runtime: UnifoldRuntime,
  reconciled: ReturnType<typeof controlNode>,
  encodedId: string
): void {
  runtime.execute([
    {
      type: UiCommandType.StructureReconcile,
      compositionInstances: {},
      nodes: [compositionNode("form"), { ...reconciled, id: encodedId }],
      resetNodeIds: [encodedId]
    }
  ]);
  expect(runtime.getSnapshot(encodedId).control).toMatchObject({
    dirty: false,
    pristine: true,
    value: "Default"
  });
}

function verifyRejectedTransaction(): void {
  const runtime = new UnifoldRuntime({
    documentId: "test",
    initialNodes: [compositionNode("form")]
  });
  const events: UiEvent[] = [];
  runtime.events$.subscribe((event) => events.push(event));
  expect(() =>
    runtime.execute([{ type: UiCommandType.ControlSetValue, id: "form", value: "invalid" }])
  ).toThrow("Node is not a control");
  expect(runtime.revision).toBe(0);
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ type: UiEventType.TransactionRejected, staterevision: 0 });
}

function createRuntime(): UnifoldRuntime {
  return new UnifoldRuntime({
    documentId: "test",
    initialNodes: [controlNode("field", "A"), compositionNode("form")]
  });
}

function verifyInvalidForm(): void {
  const invalidRuntime = formRuntime(requiredField("", UiUpdateTrigger.Input));
  const invalidEvents: UiEvent[] = [];
  invalidRuntime.events$.subscribe((event) => invalidEvents.push(event));
  invalidRuntime.execute([{ type: UiCommandType.FormSubmit, id: "form" }]);
  expect(invalidRuntime.getSnapshot("field").control).toMatchObject({
    status: UiControlStatus.Invalid,
    touched: true
  });
  expect(invalidEvents.at(-1)?.type).toBe(UiEventType.FormInvalid);
}

function verifyValidForm(): void {
  const validRuntime = formRuntime(requiredField("", UiUpdateTrigger.Submit));
  validRuntime.execute([{ type: UiCommandType.ControlSetValue, id: "field", value: "Ada" }]);
  expect(validRuntime.getSnapshot("field").control).toMatchObject({ rawValue: "Ada", value: "" });
  const validEvents: UiEvent[] = [];
  validRuntime.events$.subscribe((event) => validEvents.push(event));
  validRuntime.execute([{ type: UiCommandType.FormSubmit, id: "form" }]);
  expect(validRuntime.getSnapshot("form").control?.value).toEqual({ field: "Ada" });
  expect(validEvents.at(-1)?.type).toBe(UiEventType.FormSubmitted);
}

function verifyDeferredValues(): void {
  const runtime = new UnifoldRuntime({
    documentId: "test",
    initialNodes: [standaloneRequiredField(UiUpdateTrigger.Blur)]
  });
  runtime.execute([{ type: UiCommandType.ControlSetValue, id: "field", value: "Ada" }]);
  expect(runtime.getSnapshot("field").control).toMatchObject({ rawValue: "Ada", value: "" });
  runtime.execute([{ type: UiCommandType.ControlMarkTouched, id: "field" }]);
  expect(runtime.getSnapshot("field").control).toMatchObject({
    status: UiControlStatus.Valid,
    touched: true,
    value: "Ada"
  });
}

function verifyFormReset(): void {
  const runtime = formRuntime(requiredField("Initial", UiUpdateTrigger.Input));
  runtime.execute([{ type: UiCommandType.ControlSetValue, id: "field", value: "Edited" }]);
  runtime.execute([{ type: UiCommandType.FormSubmit, id: "form" }]);
  const events: UiEvent[] = [];
  runtime.events$.subscribe((event) => events.push(event));
  runtime.execute([{ type: UiCommandType.FormReset, id: "form" }]);
  expect(runtime.getSnapshot("field").control).toMatchObject({
    dirty: false,
    pristine: true,
    rawValue: "Initial",
    touched: false,
    value: "Initial"
  });
  expect(runtime.getSnapshot("form").control?.value).toEqual({ field: "Initial" });
  expect(events.at(-1)).toMatchObject({
    data: { change: { values: { field: "Initial" } } },
    type: UiEventType.FormReset
  });
}

function verifyDisabledControl(): void {
  const runtime = formRuntime(requiredField("", UiUpdateTrigger.Input));
  runtime.execute([{ type: UiCommandType.ControlSetDisabled, disabled: true, id: "field" }]);
  expect(runtime.getSnapshot("field").control).toMatchObject({
    errors: [],
    status: UiControlStatus.Disabled
  });
  expect(runtime.getSnapshot("form").control).toMatchObject({
    errors: [],
    rawValue: { field: "" },
    status: UiControlStatus.Disabled,
    value: {}
  });
  runtime.execute([{ type: UiCommandType.ControlSetDisabled, disabled: false, id: "field" }]);
  expect(runtime.getSnapshot("field").control?.status).toBe(UiControlStatus.Invalid);
  expect(runtime.getSnapshot("form").control?.value).toEqual({ field: "" });
}

function formRuntime(field: ReturnType<typeof controlNode>): UnifoldRuntime {
  const form = { ...compositionNode("form"), kind: UiNodeKind.Form };
  return new UnifoldRuntime({ documentId: "test", initialNodes: [form, field] });
}

function requiredField(value: string, updateOn: UiUpdateTrigger) {
  const node = controlNode("field", value, "form");
  if (node.control === undefined) throw new Error("Expected a control.");
  return {
    ...node,
    properties: { name: "field" },
    control: { ...node.control, required: true, updateOn }
  };
}

function standaloneRequiredField(updateOn: UiUpdateTrigger) {
  const node = requiredField("", updateOn);
  const copy = { ...node, scopePath: ["field"] };
  Reflect.deleteProperty(copy, "parentId");
  return copy;
}
