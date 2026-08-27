import {
  UiCommandType,
  UiEventPhase,
  UiEventType,
  UiValidationCancellationReason,
  type UiCommand,
  type UiEvent
} from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { UnifoldRuntime } from "./index.js";
import { commandChange, commandType } from "./runtime-event.js";
import { controlNode } from "./runtime.test-data.js";

it("reports completed and failed post-commit effects", () => {
  const execute = vi.fn((command: UiCommand) => rejectSelectedEffects(command));
  const runtime = new UnifoldRuntime({
    commandPort: { execute },
    documentId: "test",
    initialNodes: [controlNode("field", "")]
  });
  const events: UiEvent[] = [];
  runtime.events$.subscribe((event) => events.push(event));
  runtime.execute(effectCommands());
  expect(events.map((event) => event.type)).toEqual(expectedEffectSequence());
  expect(events.filter(isEffectEvent).every(isEffectPhase)).toBe(true);
  expect(events.at(-1)?.data.change).toEqual({
    commandType: UiCommandType.AnnouncementRequest
  });
  expect(JSON.stringify(events)).not.toContain("offline");
  expect(JSON.stringify(events)).not.toContain("unavailable");
  expect(runtime.revision).toBe(0);
  expect(events.some(({ type }) => type === UiEventType.TransactionCommitted)).toBe(false);
});

it("exposes async validation lifecycle identity and failure details", () => {
  const command = {
    error: "offline",
    id: "field",
    reason: UiValidationCancellationReason.Failed,
    requestId: "validation-1",
    type: UiCommandType.ControlValidationCancel
  } as const;

  expect(commandType(command)).toBe(UiEventType.ValidationFailed);
  expect(commandChange(command)).toEqual({
    commandType: UiCommandType.ControlValidationCancel,
    error: "offline",
    reason: UiValidationCancellationReason.Failed,
    requestId: "validation-1"
  });
});

function rejectSelectedEffects(command: UiCommand): void {
  if (command.type === UiCommandType.NavigationRequest) throw new Error("offline");
  if (command.type === UiCommandType.AnnouncementRequest) throw "unavailable";
}

function effectCommands() {
  return [
    { type: UiCommandType.FocusRequest, id: "field" },
    { type: UiCommandType.NavigationRequest, target: "/next" },
    { type: UiCommandType.AnnouncementRequest, messageKey: "saved" }
  ] as const;
}

function expectedEffectSequence(): UiEventType[] {
  return [
    UiEventType.CommandApplied,
    UiEventType.CommandApplied,
    UiEventType.CommandApplied,
    UiEventType.EffectRequested,
    UiEventType.EffectCompleted,
    UiEventType.EffectRequested,
    UiEventType.EffectFailed,
    UiEventType.EffectRequested,
    UiEventType.EffectFailed
  ];
}

function isEffectEvent(event: UiEvent): boolean {
  return event.type.startsWith("org.unifold.ui.effect.");
}

function isEffectPhase(event: UiEvent): boolean {
  return event.data.phase === UiEventPhase.Effect;
}
