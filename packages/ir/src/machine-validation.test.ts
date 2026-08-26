import { UiMachineSchemaVersion } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { DiagnosticCode, validateUiDocument } from "./index.js";
import { composedDocument } from "./composition-validation.test-data.js";

it("accepts a versioned machine owned by a known node", () => {
  const result = validateUiDocument(withMachine(validMachine()));

  expect(result.diagnostics).toEqual([]);
});

it("rejects duplicate ids, unknown owners, and unknown states", () => {
  const invalid = validMachine();
  invalid.ownerId = "missing";
  invalid.initial = "missing";
  invalid.states.editing.on.submit.target = "missing";
  const result = validateUiDocument(withMachine(invalid, validMachine()));

  expect(result.diagnostics.map(({ code }) => code)).toEqual(
    expect.arrayContaining([
      DiagnosticCode.DuplicateMachineId,
      DiagnosticCode.UnknownMachineOwner,
      DiagnosticCode.UnknownMachineState
    ])
  );
});

it("rejects undeclared executable-looking machine fields and empty events", () => {
  const invalid = validMachine();
  Object.assign(invalid.states.editing, { entry: ["unregistered-action"] });
  Object.assign(invalid.states.editing.on, { "": { commands: [], target: "editing" } });

  const result = validateUiDocument(withMachine(invalid));

  expect(result.diagnostics.map(({ code }) => code)).toEqual([
    DiagnosticCode.InvalidMachine,
    DiagnosticCode.InvalidMachine
  ]);
});

function withMachine(...machines: unknown[]) {
  return { ...composedDocument(), machines };
}

function validMachine() {
  return {
    id: "profile-workflow",
    initial: "editing",
    ownerId: "editor",
    schemaVersion: UiMachineSchemaVersion.Version1,
    states: {
      editing: { on: { submit: { commands: ["mark-saved"], target: "saved" } } },
      saved: {}
    },
    version: "1.0.0"
  };
}
