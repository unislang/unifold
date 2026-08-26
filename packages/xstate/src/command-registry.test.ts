import { UiCommandType, UiEventType } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import { createMachineCommandRegistry } from "./command-registry.js";
import { exampleEvent } from "./effect-actor.test-data.js";

it("creates typed commands through trusted registered factories", () => {
  const registry = createMachineCommandRegistry();
  const unregister = registry.register("rename", () => ({
    id: "save",
    properties: { label: "Saved" },
    type: UiCommandType.NodePatchProperties
  }));

  expect(registry.create("rename", exampleEvent(UiEventType.FormSubmitted))).toMatchObject({
    id: "save",
    type: UiCommandType.NodePatchProperties
  });
  expect(() =>
    registry.register("rename", () => ({ type: UiCommandType.FormReset, id: "form" }))
  ).toThrow("already registered");
  unregister();
  expect(() => registry.create("rename", exampleEvent(UiEventType.FormSubmitted))).toThrow(
    "Unknown machine command"
  );
});
