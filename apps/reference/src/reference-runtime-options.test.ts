import type { UiEvent } from "@unislang/unifold-events";
import { expect, it } from "vitest";

import {
  referenceCompositionMigrations,
  referenceMachineCommands
} from "./reference-runtime-options.js";

it("builds namespaced migration edges and trusted machine commands", () => {
  expect(referenceCompositionMigrations()).toMatchObject([
    {
      from: { name: "profile/ProfileEditor", version: "1.0.0" },
      preserve: [{ source: "name", target: "fullName" }]
    },
    { preserve: [], to: { name: "profile/ProfileEditor", version: "3.0.0" } }
  ]);
  const commands = referenceMachineCommands();
  expect(commands.create("show-submitted", {} as UiEvent)).toMatchObject({
    properties: { label: "Submitted" }
  });
  expect(commands.has("show-layout-details")).toBe(true);
});
