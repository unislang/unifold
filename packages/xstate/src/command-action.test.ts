import { UiCommandType } from "@unislang/unifold-events";
import { expect, it, vi } from "vitest";

import { createCommandAction } from "./command-action.js";
import { createMachineCommandRegistry } from "./command-registry.js";
import { exampleEvent } from "./effect-actor.test-data.js";
import { createRegisteredCommandAction } from "./command-action.js";
import { UiEventType } from "@unislang/unifold-events";

it("forwards typed commands through the registered action", () => {
  const sink = vi.fn();
  const action = createCommandAction(sink);
  const command = { type: UiCommandType.ControlSetValue, id: "field", value: "Ada" } as const;
  action(undefined, { command });
  expect(sink).toHaveBeenCalledWith(command);
});

it("resolves portable command IDs and retains the causing event", () => {
  const registry = createMachineCommandRegistry();
  registry.register("reset", () => ({ type: UiCommandType.FormReset, id: "form" }));
  const sink = vi.fn();
  const action = createRegisteredCommandAction(registry, sink);
  const cause = exampleEvent(UiEventType.FormSubmitted);

  action({ event: { type: cause.type, uiEvent: cause } }, { commandId: "reset" });

  expect(sink).toHaveBeenCalledWith({ type: UiCommandType.FormReset, id: "form" }, cause);
});
