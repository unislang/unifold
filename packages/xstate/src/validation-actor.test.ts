import {
  DataClassification,
  UiControlStatus,
  UiNodeKind,
  UiUpdateTrigger,
  type UiNodeSnapshot
} from "@unislang/unifold-events";
import type { UiAsyncValidatorRegistryPort } from "@unislang/unifold-forms";
import { expect, it, vi } from "vitest";

import { createValidationActor } from "./validation-actor.js";

it("resolves validation through an XState promise actor", async () => {
  const registry: UiAsyncValidatorRegistryPort = { validate: vi.fn(async () => []) };
  const actor = createValidationActor(registry, controlNode());
  const done = completion(actor);

  actor.start();
  await expect(done).resolves.toEqual([]);
});

it("aborts validation when the actor stops", () => {
  let signal: AbortSignal | undefined;
  const registry: UiAsyncValidatorRegistryPort = {
    validate: vi.fn(async (_node, nextSignal) => {
      signal = nextSignal;
      await new Promise(() => undefined);
      return [];
    })
  };
  const actor = createValidationActor(registry, controlNode());

  actor.start();
  actor.stop();
  expect(signal?.aborted).toBe(true);
});

function completion(actor: ReturnType<typeof createValidationActor>) {
  return new Promise<readonly unknown[]>((resolve, reject) => {
    actor.subscribe({ complete: () => resolve(actor.getSnapshot().output ?? []), error: reject });
  });
}

const fixtureNode: UiNodeSnapshot = {
  attributes: {},
  base: {
    busy: false,
    dataClassification: DataClassification.Public,
    disabled: false,
    focused: false,
    interactive: true,
    mounted: true,
    readonly: false,
    visible: true
  },
  control: {
    asyncValidatorIds: ["available"],
    dirty: false,
    errors: [],
    initialValue: "Ada",
    pending: false,
    pristine: true,
    rawValue: "Ada",
    required: false,
    status: UiControlStatus.Valid,
    touched: false,
    updateOn: UiUpdateTrigger.Input,
    validationRequestId: null,
    validatorIds: [],
    value: "Ada"
  },
  definitionVersion: "1.0.0",
  id: "name",
  instanceId: "name",
  kind: UiNodeKind.Control,
  properties: {},
  revision: 0,
  scopePath: ["name"],
  type: "TextField"
};

function controlNode(): UiNodeSnapshot {
  return fixtureNode;
}
